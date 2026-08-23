import { executeScenario } from "../engine/orchestrator.js";
import {
  ENGINE_VERSION,
  SCENARIO_DEFS,
  SUITE_SEED,
  SUITE_VERSION_LABEL,
} from "../engine/scenarios.js";
import { summarizeRun } from "../engine/scoring.js";
import type { Outcome, ScenarioResult } from "../engine/types.js";
import { AppError, notFound } from "../errors.js";
import { createRunId, DEMO_AGENT_ID } from "../domain/catalog.js";
import type { AgentRepository } from "../repositories/agent-repository.js";
import type { RunRepository } from "../repositories/run-repository.js";

const outcomeRank: Record<Outcome, number> = {
  PASS: 4,
  WARNING: 3,
  FAIL: 2,
  ERROR: 1,
  CANCELLED: 0,
};

export class EvaluationService {
  constructor(
    private readonly agents: AgentRepository,
    private readonly runs: RunRepository,
  ) {}

  contract() {
    return {
      agent: this.agents.ensureDemoAgent(),
      scenarios: SCENARIO_DEFS,
      runContract: {
        suite: SUITE_VERSION_LABEL,
        seed: SUITE_SEED,
        engine: ENGINE_VERSION,
        totalWeight: SCENARIO_DEFS.reduce((sum, scenario) => sum + scenario.weight, 0),
      },
    };
  }

  createRun(input: {
    agentId?: string;
    agentVersion: "buggy" | "fixed";
    idempotencyKey?: string;
    baselineRunId?: string;
  }) {
    if (input.idempotencyKey) {
      const existing = this.runs.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return this.report(existing.id);
    }

    const agent = this.agents.findById(input.agentId ?? DEMO_AGENT_ID);
    if (!agent) throw notFound("Agent", input.agentId ?? DEMO_AGENT_ID);
    if (agent.adapterType !== "BUILT_IN") {
      throw new AppError(
        422,
        "ADAPTER_NOT_EXECUTABLE",
        "The MVP runner accepts built-in sandbox adapters only. HTTP manifests can be registered for analysis but cannot receive sandbox credentials.",
      );
    }

    if (input.baselineRunId) {
      const baseline = this.runs.findById(input.baselineRunId);
      if (!baseline) throw notFound("Baseline run", input.baselineRunId);
      if (baseline.status !== "COMPLETED")
        throw new AppError(
          409,
          "BASELINE_INCOMPLETE",
          "A re-test requires a completed baseline run.",
        );
    }

    const id = createRunId();
    this.runs.create({
      id,
      agentId: agent.id,
      agentVersion: input.agentVersion,
      suiteVersion: SUITE_VERSION_LABEL,
      seed: SUITE_SEED,
      engineVersion: ENGINE_VERSION,
      ...(input.baselineRunId ? { baselineRunId: input.baselineRunId } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    try {
      const results = SCENARIO_DEFS.map((scenario) =>
        executeScenario(scenario, input.agentVersion),
      );
      const summary = summarizeRun(
        results.map((result, index) => ({
          weight: SCENARIO_DEFS[index]!.weight,
          outcome: result.outcome,
        })),
        results.flatMap((result) => result.findings),
        { runComplete: true, hadError: results.some((result) => result.outcome === "ERROR") },
      );
      this.runs.complete(id, summary, results, SCENARIO_DEFS);
      return this.report(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown evaluation failure";
      this.runs.fail(id, message);
      throw new AppError(500, "RUN_FAILED", "The evaluation run failed.", { runId: id });
    }
  }

  retest(baselineRunId: string, idempotencyKey?: string) {
    const baseline = this.runs.findById(baselineRunId);
    if (!baseline) throw notFound("Baseline run", baselineRunId);
    const patched = this.createRun({
      agentId: baseline.agentId,
      agentVersion: "fixed",
      baselineRunId,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    return { ...patched, comparison: this.compare(baselineRunId, patched.run.id) };
  }

  report(runId: string) {
    const run = this.runs.findById(runId);
    if (!run) throw notFound("Run", runId);
    const agent = this.agents.findById(run.agentId);
    if (!agent) throw notFound("Agent", run.agentId);
    const results = this.runs.scenarioResults(runId);
    const findings = this.runs.findings(runId).map(({ scenarioKey, finding }) => ({
      id: `${runId}:${finding.fingerprint}`,
      scenarioKey,
      ...finding,
    }));
    return {
      run,
      agent,
      contract: { suite: run.suiteVersion, seed: run.seed, engine: run.engineVersion },
      scenarios: SCENARIO_DEFS.map((definition, index) => ({
        definition,
        result: results[index] ?? null,
      })),
      findings,
    };
  }

  compare(baselineRunId: string, patchedRunId: string) {
    const before = this.runs.scenarioResults(baselineRunId);
    const after = this.runs.scenarioResults(patchedRunId);
    if (before.length !== SCENARIO_DEFS.length || after.length !== SCENARIO_DEFS.length) {
      throw new AppError(
        409,
        "RUN_INCOMPLETE",
        "Both runs must contain the complete immutable suite.",
      );
    }
    return SCENARIO_DEFS.map((scenario, index) => {
      const baseline = before[index]!.outcome;
      const patched = after[index]!.outcome;
      const status =
        outcomeRank[patched] > outcomeRank[baseline]
          ? "RESOLVED"
          : outcomeRank[patched] < outcomeRank[baseline]
            ? "REGRESSED"
            : "UNCHANGED";
      return {
        scenarioKey: scenario.stable_key,
        sort: scenario.sort,
        title: scenario.title,
        before: baseline,
        after: patched,
        status,
      };
    });
  }

  events(runId: string, afterSeq: number, limit: number) {
    if (!this.runs.findById(runId)) throw notFound("Run", runId);
    return this.runs.events(runId, afterSeq, limit);
  }

  finding(id: string) {
    const record = this.runs.findingById(id);
    if (!record) throw notFound("Finding", id);
    const result = this.runs
      .scenarioResults(record.runId)
      .find((item) => item.scenario_key === record.scenarioKey) as ScenarioResult | undefined;
    return {
      ...record,
      trace: result?.events ?? [],
      initialState: result?.initial_state ?? null,
      finalState: result?.final_state ?? null,
    };
  }
}
