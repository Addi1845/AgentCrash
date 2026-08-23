// AgentCrash deterministic evaluation engine — domain types.
// This module tree is pure: no IO, no Date.now(), no Math.random().

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Severity = RiskLevel;
export type ScenarioCategory = "NORMAL" | "EDGE" | "SYSTEM_FAILURE" | "ADVERSARIAL";
export type Outcome = "PASS" | "WARNING" | "FAIL" | "ERROR" | "CANCELLED";
export type Verdict = "READY" | "CONDITIONAL" | "NOT_READY" | "INCONCLUSIVE";

export type ToolName =
  "get_order" | "check_refund_policy" | "refund_payment" | "cancel_order" | "send_email";

export const TOOL_NAMES: ToolName[] = [
  "get_order",
  "check_refund_policy",
  "refund_payment",
  "cancel_order",
  "send_email",
];

/* ------------------------------- sandbox state ------------------------------ */

export type OrderStatus = "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  customer_id: string;
  status: OrderStatus;
  paid_amount_minor: number;
  currency: string;
  refunded_total_minor: number;
  version: number;
  created_days_ago: number;
  customer_note: string;
}

export interface Payment {
  id: string;
  order_id: string;
  captured_amount_minor: number;
  currency: string;
  status: string;
}

export interface Refund {
  id: string;
  order_id: string;
  amount_minor: number;
  currency: string;
  idempotency_key: string;
}

export interface EmailMessage {
  id: string;
  customer_id: string;
  template: string;
  dedupe_key: string;
}

export interface Confirmation {
  customer_id: string;
  action: string;
  order_id: string;
}

export interface AuditEntry {
  seq: number;
  entity: string;
  entity_id: string;
  operation: string;
  detail: string;
}

export interface SandboxState {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  refunds: Refund[];
  emails: EmailMessage[];
  confirmations: Confirmation[];
  audit: AuditEntry[];
}

export interface Fixture {
  key: string;
  state: SandboxState;
  /** Older order snapshots served by STALE_RESPONSE faults. */
  staleOrders?: Record<string, Order>;
}

/* ------------------------------ chaos / faults ------------------------------ */

export type ChaosPhase = "BEFORE_EXECUTION" | "AFTER_COMMIT" | "RESPONSE";

export type Fault =
  | { type: "TIMEOUT"; latencyMs: number }
  | { type: "HTTP_ERROR"; status: number; code: string }
  | { type: "MALFORMED_RESPONSE"; payload: unknown }
  | { type: "STALE_RESPONSE"; snapshotOffset: number }
  | { type: "DELAY"; latencyMs: number }
  | { type: "PARTIAL_SUCCESS"; committed: string[]; failed: string[] }
  | {
      type: "PROMPT_INJECTION";
      field: string;
      content: string;
      effect?: { tool: ToolName; args: Record<string, unknown> };
    }
  | {
      type: "CONCURRENT_MUTATION";
      mutation: { entity: string; id: string; patch: Record<string, unknown> };
    };

export interface ChaosRule {
  id: string;
  tool: ToolName;
  phase: ChaosPhase;
  occurrence: number;
  repeat?: boolean;
  fault: Fault;
}

export interface ChaosPlan {
  seed: number;
  rules: ChaosRule[];
}

/* ------------------------------ scenario model ------------------------------ */

export type Task =
  | { kind: "refund"; orderId: string; customerId: string; amountMinor: number }
  | { kind: "cancel"; orderId: string; customerId: string }
  | { kind: "status"; orderId: string; customerId: string };

export type Assertion =
  | { kind: "refund_delta"; order: string; equals: number }
  | { kind: "no_refund" }
  | { kind: "no_mutations" }
  | { kind: "email_delta"; equals: number }
  | { kind: "order_status"; order: string; equals: OrderStatus }
  | { kind: "max_calls"; tool: ToolName; max: number }
  | { kind: "max_email_attempts"; max: number };

export interface AssertionRule {
  assert: Assertion;
  onViolation: "FAIL" | "WARNING";
  message: string;
}

export interface ScenarioDef {
  stable_key: string;
  sort: number;
  title: string;
  category: ScenarioCategory;
  description: string;
  prompt: string;
  expected_summary: string;
  fixture_key: string;
  risk: RiskLevel;
  weight: number;
  max_tool_calls: number;
  timeout_ms: number;
  tags: string[];
  task: Task;
  chaos: ChaosPlan;
  assertions: AssertionRule[];
}

/* ------------------------------ execution records --------------------------- */

export type EventType =
  | "SCENARIO_STARTED"
  | "AGENT_MESSAGE"
  | "TOOL_REQUESTED"
  | "FAULT_INJECTED"
  | "STATE_MUTATED"
  | "TOOL_RESPONDED"
  | "GUARD_TRIGGERED"
  | "FINDING_CREATED"
  | "SCENARIO_FINISHED"
  | "RUN_FINISHED";

export interface EngineEvent {
  seq: number;
  type: EventType;
  t_ms: number;
  message: string;
  tool?: ToolName;
  call_id?: string;
  canonical?: unknown;
  visible?: unknown;
  metadata?: Record<string, unknown>;
}

export interface Mutation {
  entity: "order" | "refund" | "email" | "payment" | "customer";
  entity_id: string;
  operation: "INSERT" | "UPDATE";
  before: unknown;
  after: unknown;
  semantic_action_key: string;
  idempotency_key?: string;
  call_id: string;
}

export interface CallRecord {
  call_id: string;
  tool: ToolName;
  args: Record<string, unknown>;
  ok: boolean;
  error_kind?: string;
  committed: boolean;
}

export type ToolErrorKind =
  | "TIMEOUT"
  | "MALFORMED"
  | "POLICY_DENIED"
  | "HTTP_ERROR"
  | "INVALID_ARGS"
  | "NOT_FOUND"
  | "GUARD_HALT";

export interface ToolError {
  kind: ToolErrorKind;
  code: string;
  message: string;
  status?: number;
}

export type ToolResult =
  | { ok: true; data: Record<string, unknown>; meta: { call_id: string; duplicate?: boolean } }
  | { ok: false; error: ToolError; meta: { call_id: string } };

export interface ClaimedOutcome {
  order_id?: string;
  refunded_amount_minor?: number;
  refund_status?: "SUCCEEDED" | "NONE" | "ESCALATED" | "INFO_ONLY";
  emails_sent?: number;
  order_status?: string;
}

export type FindingType =
  | "DUPLICATE_ACTION"
  | "TOOL_LOOP"
  | "UNAUTHORIZED_ACTION"
  | "STATE_MISMATCH"
  | "PROMPT_INJECTION_FOLLOWED";

export interface EngineFinding {
  rule_id: string;
  type: FindingType;
  title: string;
  severity: Severity;
  severity_score: number;
  impact: number;
  likelihood: number;
  recovery: number;
  summary: string;
  expected: unknown;
  actual: unknown;
  evidence: { call_ids: string[]; event_seqs: number[]; refund_ids?: string[] };
  root_cause_code: string;
  remediation: string[];
  blocks_deployment: boolean;
  fingerprint: string;
  resource_id: string;
}

export interface ScenarioResult {
  scenario_key: string;
  outcome: Outcome;
  earned_weight: number;
  events: EngineEvent[];
  mutations: Mutation[];
  findings: EngineFinding[];
  calls: CallRecord[];
  initial_state: SandboxState;
  final_state: SandboxState;
  claimed_outcome: ClaimedOutcome | null;
  final_message: string;
  error?: string;
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
