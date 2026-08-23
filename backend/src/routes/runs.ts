import type { FastifyInstance } from "fastify";
import {
  createRunSchema,
  eventQuerySchema,
  listRunsQuerySchema,
  retestSchema,
} from "../contracts/api.js";
import type { RunRepository } from "../repositories/run-repository.js";
import type { EvaluationService } from "../services/evaluation-service.js";

export async function registerRunRoutes(
  app: FastifyInstance,
  service: EvaluationService,
  runs: RunRepository,
): Promise<void> {
  app.get("/contract", async () => ({ data: service.contract() }));

  app.get("/runs", async (request) => {
    const query = listRunsQuerySchema.parse(request.query);
    const records = runs.list(query.limit, query.cursor);
    return {
      data: records,
      nextCursor: records.length === query.limit ? (records.at(-1)?.createdAt ?? null) : null,
    };
  });

  app.post(
    "/runs",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = createRunSchema.parse(request.body);
      const idempotencyKey = request.headers["idempotency-key"];
      const report = service.createRun({
        agentVersion: input.agentVersion,
        ...(input.agentId ? { agentId: input.agentId } : {}),
        ...(typeof idempotencyKey === "string" ? { idempotencyKey } : {}),
      });
      return reply.status(201).send({ data: report });
    },
  );

  app.get<{ Params: { runId: string } }>("/runs/:runId", async (request) => ({
    data: service.report(request.params.runId),
  }));

  app.get<{ Params: { runId: string } }>("/runs/:runId/events", async (request) => {
    const query = eventQuerySchema.parse(request.query);
    return { data: service.events(request.params.runId, query.afterSeq, query.limit) };
  });

  app.post<{ Params: { runId: string } }>(
    "/runs/:runId/retest",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      retestSchema.parse(request.body ?? {});
      const idempotencyKey = request.headers["idempotency-key"];
      const report = service.retest(
        request.params.runId,
        typeof idempotencyKey === "string" ? idempotencyKey : undefined,
      );
      return reply.status(201).send({ data: report });
    },
  );

  app.get<{ Params: { findingId: string } }>("/findings/:findingId", async (request) => ({
    data: service.finding(request.params.findingId),
  }));
}
