import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

interface ApiEnvelope<T> {
  data: T;
}

describe("AgentCrash API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    ({ app } = await buildApp({
      host: "127.0.0.1",
      port: 0,
      databasePath: ":memory:",
      corsOrigins: ["http://localhost:8080"],
      logLevel: "silent",
    }));
  });

  afterEach(async () => app.close());

  it("exposes health and the immutable contract", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    const response = await app.inject({ method: "GET", url: "/api/v1/contract" });
    expect(response.statusCode).toBe(200);
    const body =
      response.json<ApiEnvelope<{ scenarios: unknown[]; runContract: { totalWeight: number } }>>();
    expect(body.data.scenarios).toHaveLength(15);
    expect(body.data.runContract.totalWeight).toBe(66);
  });

  it("persists a baseline report with events and findings", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { agentVersion: "buggy" },
      headers: { "idempotency-key": "baseline-test" },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json<
      ApiEnvelope<{
        run: { id: string; summary: { score: number; verdict: string } };
        scenarios: unknown[];
        findings: unknown[];
      }>
    >();
    expect(body.data.run.summary).toMatchObject({ score: 68, verdict: "NOT_READY" });
    expect(body.data.scenarios).toHaveLength(15);
    expect(body.data.findings.length).toBeGreaterThanOrEqual(4);

    const events = await app.inject({
      method: "GET",
      url: `/api/v1/runs/${body.data.run.id}/events`,
    });
    expect(events.statusCode).toBe(200);
    expect(events.json<ApiEnvelope<unknown[]>>().data.length).toBeGreaterThan(20);
  });

  it("honors idempotency keys", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { agentVersion: "buggy" },
      headers: { "idempotency-key": "same-run" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { agentVersion: "buggy" },
      headers: { "idempotency-key": "same-run" },
    });
    expect(second.json<ApiEnvelope<{ run: { id: string } }>>().data.run.id).toBe(
      first.json<ApiEnvelope<{ run: { id: string } }>>().data.run.id,
    );
  });

  it("runs a full patched re-test and returns a comparison", async () => {
    const baselineResponse = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { agentVersion: "buggy" },
    });
    const baselineId = baselineResponse.json<ApiEnvelope<{ run: { id: string } }>>().data.run.id;
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/runs/${baselineId}/retest`,
      payload: {},
    });
    expect(response.statusCode).toBe(201);
    const body = response.json<
      ApiEnvelope<{
        run: { summary: { score: number; verdict: string } };
        comparison: Array<{ status: string }>;
      }>
    >();
    expect(body.data.run.summary).toMatchObject({ score: 94, verdict: "READY" });
    expect(body.data.comparison).toHaveLength(15);
    expect(body.data.comparison.filter((item) => item.status === "RESOLVED")).toHaveLength(4);
    expect(body.data.comparison.filter((item) => item.status === "REGRESSED")).toHaveLength(3);
  });

  it("returns structured validation and not-found errors", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { agentVersion: "unknown" },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json<{ error: { code: string } }>().error.code).toBe("VALIDATION_ERROR");
    const missing = await app.inject({ method: "GET", url: "/api/v1/runs/run_missing" });
    expect(missing.statusCode).toBe(404);
    expect(missing.json<{ error: { code: string } }>().error.code).toBe("NOT_FOUND");
  });
});
