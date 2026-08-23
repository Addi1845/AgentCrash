import type { AppDatabase } from "../db/database.js";
import type { CreateAgentInput } from "../contracts/api.js";
import { createAgentId, DEMO_AGENT } from "../domain/catalog.js";

interface AgentRow {
  id: string;
  name: string;
  version: string;
  adapter_type: "BUILT_IN" | "HTTP";
  endpoint: string;
  description: string;
  system_prompt: string;
  tools_json: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRecord extends CreateAgentInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

function mapAgent(row: AgentRow): AgentRecord {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    adapterType: row.adapter_type,
    endpoint: row.endpoint,
    description: row.description,
    systemPrompt: row.system_prompt,
    tools: JSON.parse(row.tools_json) as CreateAgentInput["tools"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AgentRepository {
  constructor(private readonly db: AppDatabase) {}

  ensureDemoAgent(): AgentRecord {
    const existing = this.findById(DEMO_AGENT.id);
    if (existing) return existing;
    return this.create(DEMO_AGENT, DEMO_AGENT.id);
  }

  create(input: CreateAgentInput, id = createAgentId()): AgentRecord {
    const now = new Date().toISOString();
    this.db.connection
      .prepare(
        `INSERT INTO agents (
        id, name, version, adapter_type, endpoint, description, system_prompt,
        tools_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.version,
        input.adapterType,
        input.endpoint,
        input.description,
        input.systemPrompt,
        JSON.stringify(input.tools),
        now,
        now,
      );
    return this.findById(id)!;
  }

  findById(id: string): AgentRecord | null {
    const row = this.db.connection.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
      AgentRow | undefined;
    return row ? mapAgent(row) : null;
  }

  list(): AgentRecord[] {
    const rows = this.db.connection
      .prepare("SELECT * FROM agents ORDER BY created_at DESC")
      .all() as unknown as AgentRow[];
    return rows.map(mapAgent);
  }
}
