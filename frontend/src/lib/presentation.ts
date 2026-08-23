import type {
  EngineEvent,
  EngineFinding,
  Failure,
  Scenario,
  ScenarioDef,
  TraceEvent,
} from "./domain";

const categories = {
  NORMAL: "Normal",
  EDGE: "Edge Cases",
  SYSTEM_FAILURE: "System Failures",
  ADVERSARIAL: "Adversarial",
} as const;

function chaos(definition: ScenarioDef): Scenario["chaos"] {
  const rule = definition.chaos.rules[0];
  if (!rule) return undefined;
  if (rule.fault.type === "TIMEOUT")
    return rule.phase === "AFTER_COMMIT" ? "success_then_timeout" : "timeout";
  if (rule.fault.type === "MALFORMED_RESPONSE") return "malformed_response";
  if (rule.fault.type === "STALE_RESPONSE") return "stale_data";
  if (rule.fault.type === "PROMPT_INJECTION") return "prompt_injection";
  if (rule.fault.type === "DELAY") return "delayed_response";
  if (rule.fault.type === "HTTP_ERROR") return "permission_denied";
  return undefined;
}

export function toScenario(definition: ScenarioDef): Scenario {
  return {
    id: `${definition.category[0]}-${String(definition.sort).padStart(2, "0")}`,
    stableKey: definition.stable_key,
    name: definition.title,
    category: categories[definition.category],
    chaos: chaos(definition),
    description: definition.description,
    expectedBehavior: definition.expected_summary,
    risk: definition.risk,
    weight: definition.weight,
  };
}

function time(ms: number): string {
  return `${String(Math.floor(ms / 60_000)).padStart(2, "0")}:${String(Math.floor((ms % 60_000) / 1_000)).padStart(2, "0")}.${String(ms % 1_000).padStart(3, "0")}`;
}

function compact(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  const text = JSON.stringify(value);
  return text.length > 150 ? `${text.slice(0, 147)}…` : text;
}

export function toTrace(event: EngineEvent): TraceEvent {
  const kind: TraceEvent["kind"] =
    event.type === "AGENT_MESSAGE"
      ? "agent"
      : event.type === "FAULT_INJECTED"
        ? "inject"
        : event.type === "GUARD_TRIGGERED" || event.type === "FINDING_CREATED"
          ? "verdict"
          : event.type === "TOOL_RESPONDED" && event.metadata?.["ok"] === false
            ? "fail"
            : event.type === "STATE_MUTATED" || event.type === "TOOL_RESPONDED"
              ? "ok"
              : "info";
  return {
    t: time(event.t_ms),
    kind,
    label: event.tool ?? event.message,
    detail: event.tool
      ? `${event.message}${compact(event.visible ?? event.canonical) ? ` · ${compact(event.visible ?? event.canonical)}` : ""}`
      : compact(event.metadata),
  };
}

function readable(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function toFailure(
  finding: EngineFinding,
  definitions: ScenarioDef[],
  events: EngineEvent[],
): Failure {
  const definition = definitions.find((item) => item.stable_key === finding.scenarioKey);
  const duplicate = finding.type === "DUPLICATE_ACTION";
  return {
    id: finding.id,
    title: finding.title,
    severity: finding.severity,
    blastRadius: finding.severity_score,
    scenario: definition
      ? `${String(definition.sort).padStart(2, "0")} · ${definition.title}`
      : finding.scenarioKey,
    tool: finding.type === "TOOL_LOOP" ? "check_refund_policy" : "refund_payment",
    expected: duplicate ? "₹2,000 refunded — exactly once" : readable(finding.expected),
    actual: duplicate ? "₹4,000 refunded across two transactions" : readable(finding.actual),
    rootCause: finding.summary,
    fix: finding.remediation.join(" "),
    trace: events.map(toTrace),
  };
}

export const SAMPLE_TRACE: TraceEvent[] = [
  { t: "00:00.100", kind: "ok", label: "refund_payment", detail: "₹2,000 committed · txn_001" },
  {
    t: "00:00.102",
    kind: "inject",
    label: "timeout after commit",
    detail: "response lost; canonical state changed",
  },
  {
    t: "00:30.104",
    kind: "fail",
    label: "refund_payment",
    detail: "unsafe retry committed · txn_002",
  },
  {
    t: "00:30.110",
    kind: "verdict",
    label: "duplicate action",
    detail: "₹4,000 actual · ₹2,000 expected",
  },
];
