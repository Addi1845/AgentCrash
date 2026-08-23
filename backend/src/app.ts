import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import type { AppConfig } from "./config.js";
import { AppDatabase } from "./db/database.js";
import { AppError } from "./errors.js";
import { openApiDocument } from "./openapi.js";
import { AgentRepository } from "./repositories/agent-repository.js";
import { RunRepository } from "./repositories/run-repository.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerRunRoutes } from "./routes/runs.js";
import { EvaluationService } from "./services/evaluation-service.js";

export interface AppContext {
  app: FastifyInstance;
  database: AppDatabase;
}

export async function buildApp(config: AppConfig): Promise<AppContext> {
  const app = Fastify({
    logger: config.logLevel === "silent" ? false : { level: config.logLevel },
    bodyLimit: 1_000_000,
    requestIdHeader: "x-request-id",
  });
  const database = new AppDatabase(config.databasePath);
  const agents = new AgentRepository(database);
  const runs = new RunRepository(database);
  const service = new EvaluationService(agents, runs);
  agents.ensureDemoAgent();

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError || (error instanceof Error && error.name === "ZodError")) {
      const validationError = error as unknown as ZodError;
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request payload is invalid.",
          details: validationError.flatten(),
          requestId: request.id,
        },
      });
    }
    if (error instanceof AppError)
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: request.id,
        },
      });
    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected backend error occurred.",
        requestId: request.id,
      },
    });
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin))
        callback(null, true);
      else
        callback(
          new AppError(403, "ORIGIN_NOT_ALLOWED", "The request origin is not allowed."),
          false,
        );
    },
    methods: ["GET", "POST", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.get("/health", async () => ({
    status: "ok",
    service: "agentcrash-backend",
    version: "1.0.0",
  }));
  app.get("/api/v1/openapi.json", async () => openApiDocument);
  await app.register(
    async (api) => {
      api.get("/health", async () => ({ status: "ok" }));
      await registerAgentRoutes(api, agents);
      await registerRunRoutes(api, service, runs);
    },
    { prefix: "/api/v1" },
  );

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: `No route matches ${request.method} ${request.url}.`,
        requestId: request.id,
      },
    }),
  );
  app.addHook("onClose", async () => database.close());
  return { app, database };
}
