import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config";

let db: Database.Database | null = null;

const SCHEMA_CANDIDATES = ["CONTEXT_ENG/sqlite-schema.sql", "../CONTEXT_ENG/sqlite-schema.sql"];

function findSchemaPath(): string {
  const cwd = process.cwd();
  for (const candidate of SCHEMA_CANDIDATES) {
    const resolved = path.resolve(cwd, candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  throw new Error(
    `Schema not found. Tried from cwd (${cwd}): ${SCHEMA_CANDIDATES.join(", ")}. Run from project root or backend/.`
  );
}

/**
 * Returns the SQLite database instance. Creates the DB file and runs the schema
 * from CONTEXT_ENG/sqlite-schema.sql on first call.
 */
export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), config.DATABASE_PATH);
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir) && dbDir !== ".") {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const schemaPath = findSchemaPath();
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return db;
}

/**
 * Close the database connection (e.g. for graceful shutdown).
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
