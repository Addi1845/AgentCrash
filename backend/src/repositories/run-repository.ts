import type { AppDatabase } from "../db/database.js";
import type { EngineEvent, EngineFinding, RunSummary, ScenarioResult } from "../engine/types.js";

export interface RunRecord {
  id: string;
  agentId: string;
  agentVersion: "buggy" | "fixed";
  status: "RUNNING" | "COMPLETED" | "FAILED";
  suiteVersion: string;
  seed: number;
  engineVersion: string;
  summary: RunSummary | null;
  baselineRunId: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface RunRow {
  id: string;
  agent_id: string;
  agent_version: "buggy" | "fixed";
  status: "RUNNING" | "COMPLETED" | "FAILED";
  suite_version: string;
  seed: number;
  engine_version: string;
  score: number | null;
  pass_percentage: number | null;
  verdict: RunSummary["verdict"] | null;
  earned_weight: number | null;
  total_weight: number | null;
  counts_json: string | null;
  severity_counts_json: string | null;
  baseline_run_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

function mapRun(row: RunRow): RunRecord {
  const summary =
    row.score === null || row.verdict === null
      ? null
      : {
          score: row.score,
          pass_percentage: row.pass_percentage ?? 0,
          verdict: row.verdict,
          earned_weight: row.earned_weight ?? 0,
          total_weight: row.total_weight ?? 0,
          counts: JSON.parse(row.counts_json ?? "{}") as RunSummary["counts"],
          severity_counts: JSON.parse(
            row.severity_counts_json ?? "{}",
          ) as RunSummary["severity_counts"],
        };
  return {
    id: row.id,
    agentId: row.agent_id,
    agentVersion: row.agent_version,
    status: row.status,
    suiteVersion: row.suite_version,
    seed: row.seed,
    engineVersion: row.engine_version,
    summary,
    baselineRunId: row.baseline_run_id,
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export class RunRepository {
  constructor(private readonly db: AppDatabase) {}

  findById(id: string): RunRecord | null {
    const row = this.db.connection.prepare("SELECT * FROM runs WHERE id = ?").get(id) as
      RunRow | undefined;
    return row ? mapRun(row) : null;
  }

  findByIdempotencyKey(key: string): RunRecord | null {
    const row = this.db.connection
      .prepare("SELECT * FROM runs WHERE idempotency_key = ?")
      .get(key) as RunRow | undefined;
    return row ? mapRun(row) : null;
  }

  create(input: {
    id: string;
    agentId: string;
    agentVersion: "buggy" | "fixed";
    suiteVersion: string;
    seed: number;
    engineVersion: string;
    baselineRunId?: string;
    idempotencyKey?: string;
  }): RunRecord {
    const createdAt = new Date().toISOString();
    this.db.connection
      .prepare(
        `INSERT INTO runs (
      id, agent_id, agent_version, status, suite_version, seed, engine_version,
      baseline_run_id, idempotency_key, created_at
    ) VALUES (?, ?, ?, 'RUNNING', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        input.agentId,
        input.agentVersion,
        input.suiteVersion,
        input.seed,
        input.engineVersion,
        input.baselineRunId ?? null,
        input.idempotencyKey ?? null,
        createdAt,
      );
    return this.findById(input.id)!;
  }

  complete(
    runId: string,
    summary: RunSummary,
    results: ScenarioResult[],
    definitions: Array<{ stable_key: string; sort: number; weight: number }>,
  ): void {
    const completeRun = this.db.connection.prepare(`UPDATE runs SET
      status = 'COMPLETED', score = ?, pass_percentage = ?, verdict = ?, earned_weight = ?,
      total_weight = ?, counts_json = ?, severity_counts_json = ?, completed_at = ?
      WHERE id = ?`);
    const insertResult = this.db.connection.prepare(`INSERT INTO scenario_results (
      run_id, scenario_key, scenario_sort, outcome, weight, earned_weight, result_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertEvent = this.db.connection.prepare(`INSERT INTO events (
      run_id, scenario_key, seq, t_ms, event_type, message, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertFinding = this.db.connection.prepare(`INSERT INTO findings (
      id, run_id, scenario_key, fingerprint, finding_type, title, severity,
      severity_score, blocks_deployment, finding_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    this.db.connection.exec("BEGIN IMMEDIATE");
    try {
      for (const [index, result] of results.entries()) {
        const definition = definitions[index]!;
        insertResult.run(
          runId,
          result.scenario_key,
          definition.sort,
          result.outcome,
          definition.weight,
          result.earned_weight,
          JSON.stringify(result),
        );
        for (const event of result.events)
          insertEvent.run(
            runId,
            result.scenario_key,
            event.seq,
            event.t_ms,
            event.type,
            event.message,
            JSON.stringify(event),
          );
        for (const finding of result.findings)
          insertFinding.run(
            `${runId}:${finding.fingerprint}`,
            runId,
            result.scenario_key,
            finding.fingerprint,
            finding.type,
            finding.title,
            finding.severity,
            finding.severity_score,
            finding.blocks_deployment ? 1 : 0,
            JSON.stringify(finding),
          );
      }
      completeRun.run(
        summary.score,
        summary.pass_percentage,
        summary.verdict,
        summary.earned_weight,
        summary.total_weight,
        JSON.stringify(summary.counts),
        JSON.stringify(summary.severity_counts),
        new Date().toISOString(),
        runId,
      );
      this.db.connection.exec("COMMIT");
    } catch (error) {
      this.db.connection.exec("ROLLBACK");
      throw error;
    }
  }

  fail(runId: string, error: string): void {
    this.db.connection
      .prepare("UPDATE runs SET status = 'FAILED', error = ?, completed_at = ? WHERE id = ?")
      .run(error, new Date().toISOString(), runId);
  }

  list(limit: number, cursor?: string): RunRecord[] {
    const rows = cursor
      ? this.db.connection
          .prepare("SELECT * FROM runs WHERE created_at < ? ORDER BY created_at DESC LIMIT ?")
          .all(cursor, limit)
      : this.db.connection
          .prepare("SELECT * FROM runs ORDER BY created_at DESC LIMIT ?")
          .all(limit);
    return (rows as unknown as RunRow[]).map(mapRun);
  }

  scenarioResults(runId: string): ScenarioResult[] {
    const rows = this.db.connection
      .prepare("SELECT result_json FROM scenario_results WHERE run_id = ? ORDER BY scenario_sort")
      .all(runId) as unknown as Array<{ result_json: string }>;
    return rows.map((row) => JSON.parse(row.result_json) as ScenarioResult);
  }

  findings(runId: string): Array<{ scenarioKey: string; finding: EngineFinding }> {
    const rows = this.db.connection
      .prepare(
        "SELECT scenario_key, finding_json FROM findings WHERE run_id = ? ORDER BY severity_score DESC",
      )
      .all(runId) as unknown as Array<{ scenario_key: string; finding_json: string }>;
    return rows.map((row) => ({
      scenarioKey: row.scenario_key,
      finding: JSON.parse(row.finding_json) as EngineFinding,
    }));
  }

  findingById(id: string): { runId: string; scenarioKey: string; finding: EngineFinding } | null {
    const row = this.db.connection
      .prepare("SELECT run_id, scenario_key, finding_json FROM findings WHERE id = ?")
      .get(id) as { run_id: string; scenario_key: string; finding_json: string } | undefined;
    return row
      ? {
          runId: row.run_id,
          scenarioKey: row.scenario_key,
          finding: JSON.parse(row.finding_json) as EngineFinding,
        }
      : null;
  }

  events(
    runId: string,
    afterSeq: number,
    limit: number,
  ): Array<{ cursor: number; scenarioKey: string; event: EngineEvent }> {
    const rows = this.db.connection
      .prepare(
        `SELECT id, scenario_key, payload_json FROM events
      WHERE run_id = ? AND id > ? ORDER BY id LIMIT ?`,
      )
      .all(runId, afterSeq, limit) as unknown as Array<{
      scenario_key: string;
      payload_json: string;
    }>;
    return (rows as Array<{ id: number; scenario_key: string; payload_json: string }>).map(
      (row) => ({
        cursor: row.id,
        scenarioKey: row.scenario_key,
        event: JSON.parse(row.payload_json) as EngineEvent,
      }),
    );
  }
}
