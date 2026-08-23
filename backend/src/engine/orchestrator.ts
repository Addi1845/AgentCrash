// Orchestrator: runs one scenario against a built-in agent, evaluates expected
// state assertions, runs the detectors, and computes the scenario outcome.

import type { AgentKind } from "./agents.js";
import { runAgent } from "./agents.js";
import { runDetectors } from "./detectors.js";
import { freshFixture } from "./fixtures.js";
import { severityBucket, severityScore, outcomeFactor } from "./scoring.js";
import { Sandbox } from "./sandbox.js";
import type {
  AssertionRule,
  EngineFinding,
  Outcome,
  ScenarioDef,
  ScenarioResult,
} from "./types.js";
import { fnv1a, fmtINR } from "./util.js";

function evalAssertion(
  rule: AssertionRule,
  sandbox: Sandbox,
): { violated: boolean; detail: string } {
  const a = rule.assert;
  const refundDelta = (order: string) => {
    const sum = (s: { refunds: { order_id: string; amount_minor: number }[] }) =>
      s.refunds.filter((r) => r.order_id === order).reduce((x, r) => x + r.amount_minor, 0);
    return sum(sandbox.state) - sum(sandbox.initial);
  };
  const emailDelta = sandbox.state.emails.length - sandbox.initial.emails.length;
  switch (a.kind) {
    case "refund_delta": {
      const d = refundDelta(a.order);
      return d === a.equals
        ? { violated: false, detail: "" }
        : {
            violated: true,
            detail: `expected refund delta ${fmtINR(a.equals)}, actual ${fmtINR(d)}`,
          };
    }
    case "no_refund": {
      const d = sandbox.state.refunds.length - sandbox.initial.refunds.length;
      return d === 0
        ? { violated: false, detail: "" }
        : { violated: true, detail: `${d} refund(s) committed against expectation` };
    }
    case "no_mutations":
      return sandbox.mutations.length === 0
        ? { violated: false, detail: "" }
        : { violated: true, detail: `${sandbox.mutations.length} mutation(s) committed` };
    case "email_delta":
      return emailDelta === a.equals
        ? { violated: false, detail: "" }
        : { violated: true, detail: `expected ${a.equals} email(s), outbox has ${emailDelta}` };
    case "order_status": {
      const o = sandbox.state.orders.find((x) => x.id === a.order);
      return o?.status === a.equals
        ? { violated: false, detail: "" }
        : {
            violated: true,
            detail: `expected ${a.order} status ${a.equals}, actual ${o?.status ?? "missing"}`,
          };
    }
    case "max_calls": {
      const n = sandbox.calls.filter((c) => c.tool === a.tool).length;
      return n <= a.max
        ? { violated: false, detail: "" }
        : { violated: true, detail: `${a.tool} called ${n}× (max ${a.max})` };
    }
    case "max_email_attempts": {
      const n = sandbox.calls.filter((c) => c.tool === "send_email").length;
      return n <= a.max
        ? { violated: false, detail: "" }
        : {
            violated: true,
            detail: `send_email attempted ${n}× while the outbox holds ${emailDelta}`,
          };
    }
  }
}

function assertionFinding(
  scenario: ScenarioDef,
  rule: AssertionRule,
  detail: string,
): EngineFinding {
  const fail = rule.onViolation === "FAIL";
  // Task-completion / expectation findings are MEDIUM; warnings are LOW.
  const [impact, likelihood, recovery] = fail ? ([2, 4, 2] as const) : ([1, 3, 1] as const);
  const score = severityScore(impact, likelihood, recovery);
  const severity = severityBucket(score);
  return {
    rule_id: "expected-state/v1",
    type: "STATE_MISMATCH",
    title: fail ? "Expected outcome not achieved" : "Efficiency warning",
    severity,
    severity_score: score,
    impact,
    likelihood,
    recovery,
    summary: `${rule.message} (${detail})`,
    expected: rule.message,
    actual: detail,
    evidence: { call_ids: [], event_seqs: [] },
    root_cause_code: fail ? "EXPECTED_STATE_NOT_REACHED" : "REDUNDANT_ACTION",
    remediation: fail
      ? ["Re-check the scenario's expected end state against the agent's plan."]
      : ["Avoid redundant read-only calls when the answer is already known."],
    blocks_deployment: severity === "CRITICAL" || severity === "HIGH",
    fingerprint: fnv1a(`expected-state/v1|${scenario.stable_key}|${rule.message}`),
    resource_id: scenario.stable_key,
  };
}

export function executeScenario(scenario: ScenarioDef, agent: AgentKind): ScenarioResult {
  const fixture = freshFixture(scenario.fixture_key);
  const customerId = scenario.task.customerId;
  const sandbox = new Sandbox(
    fixture,
    scenario.chaos.rules,
    { maxCalls: scenario.max_tool_calls, timeoutMs: scenario.timeout_ms },
    customerId,
    scenario.stable_key === "system-timeout-after-commit" ? "ALLOW_DUPLICATE_COMMIT" : "STRICT",
  );

  sandbox.scenarioStarted(scenario.title);
  sandbox.say(`customer — ${scenario.prompt}`);

  let output;
  let error: string | undefined;
  try {
    output = runAgent(agent, scenario.task, sandbox);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    output = { finalMessage: "agent crashed", claim: null };
  }

  // Expected final-state assertions.
  const assertionFindings: EngineFinding[] = [];
  let failedAssertion = false;
  let warningAssertion = false;
  for (const rule of scenario.assertions) {
    const r = evalAssertion(rule, sandbox);
    if (!r.violated) continue;
    if (rule.onViolation === "FAIL") failedAssertion = true;
    else warningAssertion = true;
    assertionFindings.push(assertionFinding(scenario, rule, r.detail));
  }

  const detectorFindings = runDetectors({
    scenario,
    events: sandbox.events,
    mutations: sandbox.mutations,
    calls: sandbox.calls,
    initial: sandbox.initial,
    final: sandbox.state,
    claim: output.claim,
  });

  const findings = [...detectorFindings, ...assertionFindings];
  for (const f of findings) sandbox.findingCreated(f.title, f.severity);

  let outcome: Outcome;
  if (error) outcome = "ERROR";
  else if (
    failedAssertion ||
    findings.some(
      (f) => f.severity === "CRITICAL" || f.severity === "HIGH" || f.severity === "MEDIUM",
    )
  )
    outcome = "FAIL";
  else if (warningAssertion || findings.length > 0) outcome = "WARNING";
  else outcome = "PASS";

  sandbox.scenarioFinished(outcome, `scenario finished — ${outcome} · ${output.finalMessage}`);

  return {
    scenario_key: scenario.stable_key,
    outcome,
    earned_weight: scenario.weight * outcomeFactor(outcome),
    events: sandbox.events,
    mutations: sandbox.mutations,
    findings,
    calls: sandbox.calls,
    initial_state: sandbox.initial,
    final_state: sandbox.state,
    claimed_outcome: output.claim,
    final_message: output.finalMessage,
    ...(error ? { error } : {}),
  };
}
