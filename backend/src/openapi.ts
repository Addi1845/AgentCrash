export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "AgentCrash API",
    version: "1.0.0",
    description: "Deterministic AI-agent reliability evaluation API.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": { get: { summary: "Service health" } },
    "/contract": { get: { summary: "Read the immutable demo contract" } },
    "/agents": { get: { summary: "List agents" }, post: { summary: "Register an agent manifest" } },
    "/agents/{agentId}": { get: { summary: "Read an agent" } },
    "/runs": {
      get: { summary: "List persisted runs" },
      post: { summary: "Execute the immutable suite" },
    },
    "/runs/{runId}": { get: { summary: "Read a complete report" } },
    "/runs/{runId}/events": { get: { summary: "Read ordered execution events" } },
    "/runs/{runId}/retest": {
      post: { summary: "Run the complete suite against the patched adapter" },
    },
    "/findings/{findingId}": { get: { summary: "Read finding evidence and state" } },
  },
} as const;
