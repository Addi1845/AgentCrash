import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_VERSION, schemaStatements } from "./schema.js";

export class AppDatabase {
  readonly connection: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.connection = new DatabaseSync(databasePath);
    this.connection.exec("PRAGMA foreign_keys = ON");
    this.connection.exec("PRAGMA journal_mode = WAL");
    this.connection.exec("PRAGMA busy_timeout = 5000");
    this.migrate();
  }

  private migrate(): void {
    this.connection.exec("BEGIN IMMEDIATE");
    try {
      for (const statement of schemaStatements) this.connection.prepare(statement).run();
      this.connection
        .prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)")
        .run(SCHEMA_VERSION, new Date().toISOString());
      this.connection.exec("PRAGMA optimize");
      this.connection.exec("COMMIT");
    } catch (error) {
      this.connection.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.connection.close();
  }
}
