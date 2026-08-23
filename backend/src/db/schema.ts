export const SCHEMA_VERSION = 1;

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    adapter_type TEXT NOT NULL CHECK(adapter_type IN ('BUILT_IN', 'HTTP')),
    endpoint TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    tools_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    agent_version TEXT NOT NULL CHECK(agent_version IN ('buggy', 'fixed')),
    status TEXT NOT NULL CHECK(status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    suite_version TEXT NOT NULL,
    seed INTEGER NOT NULL,
    engine_version TEXT NOT NULL,
    score INTEGER,
    pass_percentage INTEGER,
    verdict TEXT,
    earned_weight REAL,
    total_weight REAL,
    counts_json TEXT,
    severity_counts_json TEXT,
    baseline_run_id TEXT REFERENCES runs(id) ON DELETE SET NULL,
    idempotency_key TEXT UNIQUE,
    error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS scenario_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    scenario_key TEXT NOT NULL,
    scenario_sort INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    weight REAL NOT NULL,
    earned_weight REAL NOT NULL,
    result_json TEXT NOT NULL,
    UNIQUE(run_id, scenario_key)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    scenario_key TEXT NOT NULL,
    seq INTEGER NOT NULL,
    t_ms INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    UNIQUE(run_id, scenario_key, seq)
  )`,
  `CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    scenario_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    finding_type TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    severity_score INTEGER NOT NULL,
    blocks_deployment INTEGER NOT NULL CHECK(blocks_deployment IN (0, 1)),
    finding_json TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_runs_agent_created ON runs(agent_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_runs_baseline ON runs(baseline_run_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scenario_results_run_sort ON scenario_results(run_id, scenario_sort)`,
  `CREATE INDEX IF NOT EXISTS idx_events_run_scenario_seq ON events(run_id, scenario_key, seq)`,
  `CREATE INDEX IF NOT EXISTS idx_findings_run_severity ON findings(run_id, severity_score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_findings_fingerprint ON findings(fingerprint)`,
] as const;
