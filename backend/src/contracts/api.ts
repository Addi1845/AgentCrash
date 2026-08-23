import { z } from "zod";

const toolSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  risk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  irreversible: z.boolean(),
  sideEffects: z.enum(["read", "write", "financial"]),
});

export const createAgentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  version: z.string().trim().min(1).max(40).default("1.0.0"),
  adapterType: z.enum(["BUILT_IN", "HTTP"]).default("BUILT_IN"),
  endpoint: z.string().trim().min(1).max(500),
  description: z.string().trim().min(10).max(2_000),
  systemPrompt: z.string().trim().min(10).max(30_000),
  tools: z.array(toolSchema).min(1).max(50),
});

export const createRunSchema = z.object({
  agentId: z.string().uuid().optional(),
  agentVersion: z.enum(["buggy", "fixed"]).default("buggy"),
});

export const retestSchema = z.object({
  agentVersion: z.literal("fixed").default("fixed"),
});

export const listRunsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().datetime().optional(),
});

export const eventQuerySchema = z.object({
  afterSeq: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(2_000).default(1_000),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
