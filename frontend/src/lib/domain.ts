export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Severity = RiskLevel;
export type ScenarioCategory = "Normal" | "Edge Cases" | "System Failures" | "Adversarial";
export type Outcome = "PASS" | "WARNING" | "FAIL" | "ERROR" | "CANCELLED";
export type Verdict = "READY" | "CONDITIONAL" | "NOT_READY" | "INCONCLUSIVE";
export type ChaosType =
  | "timeout"
  | "success_then_timeout"
  | "malformed_response"
  | "delayed_response"
  | "permission_denied"
  | "stale_data"
  | "prompt_injection";

export interface AgentTool {
  name: string;
  description: string;
  risk: RiskLevel;
  irreversible: boolean;
  sideEffects: "read" | "write" | "financial";
}

export interface AgentRecord {
  id: string;
  name: string;
  version: string;
  adapterType: "BUILT_IN" | "HTTP";
  endpoint: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioDef {
  stable_key: string;
  sort: number;
  title: string;
  category: "NORMAL" | "EDGE" | "SYSTEM_FAILURE" | "ADVERSARIAL";
  description: string;
  prompt: string;
  expected_summary: string;
  risk: RiskLevel;
  weight: number;
  chaos: { rules: Array<{ phase: string; fault: { type: string } }> };
}

export interface Scenario {
  id: string;
  stableKey: string;
  name: string;
  category: ScenarioCategory;
  chaos?: ChaosType | undefined;
  description: string;
  expectedBehavior: string;
  risk: RiskLevel;
  weight: number;
}

export type TraceKind = "agent" | "ok" | "fail" | "inject" | "info" | "verdict";
export interface TraceEvent {
  t: string;
  kind: TraceKind;
  label: string;
  detail?: string | undefined;
}

export interface EngineEvent {
  seq: number;
  type: string;
  t_ms: number;
  message: string;
  tool?: string;
  canonical?: unknown;
  visible?: unknown;
  metadata?: Record<string, unknown>;
}

export interface EngineFinding {
  id: string;
  scenarioKey: string;
  fingerprint: string;
  type: string;
  title: string;
  severity: Severity;
  severity_score: number;
  summary: string;
  expected: unknown;
  actual: unknown;
  remediation: string[];
}

export interface ScenarioResult {
  scenario_key: string;
  outcome: Outcome;
  earned_weight: number;
  events: EngineEvent[];
  findings: Omit<EngineFinding, "id" | "scenarioKey">[];
}

export interface RunSummary {
  score: number;
  pass_percentage: number;
  verdict: Verdict;
  earned_weight: number;
  total_weight: number;
  counts: { pass: number; warning: number; fail: number; error: number; cancelled: number };
  severity_counts: { critical: number; high: number; medium: number; low: number };
}

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
  createdAt: string;
  completedAt: string | null;
}

export interface RunReport {
  run: RunRecord;
  agent: AgentRecord;
  contract: { suite: string; seed: number; engine: string };
  scenarios: Array<{ definition: ScenarioDef; result: ScenarioResult | null }>;
  findings: EngineFinding[];
}

export interface Failure {
  id: string;
  title: string;
  severity: Severity;
  blastRadius: number;
  scenario: string;
  tool: string;
  expected: string;
  actual: string;
  rootCause: string;
  fix: string;
  trace: TraceEvent[];
}

export interface RetestTransition {
  scenarioKey: string;
  sort: number;
  title: string;
  before: Outcome;
  after: Outcome;
  status: "RESOLVED" | "REGRESSED" | "UNCHANGED";
}

export const CHAOS_LABELS: Record<ChaosType, string> = {
  timeout: "timeout",
  success_then_timeout: "success→timeout",
  malformed_response: "malformed response",
  delayed_response: "delayed response",
  permission_denied: "permission denied",
  stale_data: "stale data",
  prompt_injection: "prompt injection",
};
