import type {
  AgentRecord,
  AgentTool,
  EngineEvent,
  EngineFinding,
  RetestTransition,
  RunRecord,
  RunReport,
  ScenarioDef,
} from "./domain";

const API_BASE =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://127.0.0.1:8787/api/v1";

interface Envelope<T> {
  data: T;
}
interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as Envelope<T> & ApiErrorBody;
  if (!response.ok)
    throw new Error(body.error?.message ?? `Backend request failed (${response.status}).`);
  return body.data;
}

export interface ContractResponse {
  agent: AgentRecord;
  scenarios: ScenarioDef[];
  runContract: { suite: string; seed: number; engine: string; totalWeight: number };
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  contract: () => request<ContractResponse>("/contract"),
  agents: () => request<AgentRecord[]>("/agents"),
  agent: (id: string) => request<AgentRecord>(`/agents/${encodeURIComponent(id)}`),
  createAgent: (input: {
    name: string;
    version: string;
    adapterType: "BUILT_IN" | "HTTP";
    endpoint: string;
    description: string;
    systemPrompt: string;
    tools: AgentTool[];
  }) => request<AgentRecord>("/agents", { method: "POST", body: JSON.stringify(input) }),
  runs: async () => {
    const response = await fetch(`${API_BASE}/runs`);
    if (!response.ok) throw new Error("Could not load run history.");
    return ((await response.json()) as Envelope<RunRecord[]>).data;
  },
  run: (id: string) => request<RunReport>(`/runs/${encodeURIComponent(id)}`),
  createRun: (agentId: string, agentVersion: "buggy" | "fixed", idempotencyKey: string) =>
    request<RunReport>("/runs", {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      body: JSON.stringify({ agentId, agentVersion }),
    }),
  retest: (baselineRunId: string, idempotencyKey: string) =>
    request<RunReport & { comparison: RetestTransition[] }>(
      `/runs/${encodeURIComponent(baselineRunId)}/retest`,
      { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: "{}" },
    ),
  finding: (id: string) =>
    request<{
      runId: string;
      scenarioKey: string;
      finding: Omit<EngineFinding, "id" | "scenarioKey">;
      trace: EngineEvent[];
    }>(`/findings/${encodeURIComponent(id)}`),
};

const keys = {
  agent: "agentcrash:selected-agent",
  baseline: "agentcrash:baseline-run",
  patched: "agentcrash:patched-run",
};

export const sessionPointers = {
  getAgent: () => (typeof window === "undefined" ? null : window.localStorage.getItem(keys.agent)),
  setAgent: (id: string) => window.localStorage.setItem(keys.agent, id),
  getBaseline: () =>
    typeof window === "undefined" ? null : window.localStorage.getItem(keys.baseline),
  setBaseline: (id: string) => window.localStorage.setItem(keys.baseline, id),
  getPatched: () =>
    typeof window === "undefined" ? null : window.localStorage.getItem(keys.patched),
  setPatched: (id: string) => window.localStorage.setItem(keys.patched, id),
};
