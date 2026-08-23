import type { FastifyInstance } from "fastify";
import { createAgentSchema } from "../contracts/api.js";
import type { AgentRepository } from "../repositories/agent-repository.js";
import { notFound } from "../errors.js";

export async function registerAgentRoutes(
  app: FastifyInstance,
  agents: AgentRepository,
): Promise<void> {
  app.get("/agents", async () => ({ data: agents.list() }));
  app.get<{ Params: { agentId: string } }>("/agents/:agentId", async (request) => {
    const agent = agents.findById(request.params.agentId);
    if (!agent) throw notFound("Agent", request.params.agentId);
    return { data: agent };
  });
  app.post(
    "/agents",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = createAgentSchema.parse(request.body);
      const agent = agents.create(input);
      return reply.status(201).send({ data: agent });
    },
  );
}
