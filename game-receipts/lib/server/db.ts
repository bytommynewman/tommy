import fs from "node:fs";
import path from "node:path";
import type { DB } from "../domain";
import { buildSeed } from "./seed";

/**
 * Local development store: one JSON file, loaded once per process and
 * written atomically after each mutation. This is a MOCK persistence
 * adapter — production uses the Postgres schema in supabase/migrations.
 */
export const dataDir = () => process.env.GR_DATA_DIR ?? path.join(process.cwd(), ".data");
const file = () => path.join(dataDir(), "db.json");

const g = globalThis as unknown as { __grdb?: DB };

export function db(): DB {
  if (g.__grdb) return g.__grdb;
  if (fs.existsSync(file())) {
    g.__grdb = JSON.parse(fs.readFileSync(file(), "utf8")) as DB;
  } else {
    g.__grdb = buildSeed();
    persist();
  }
  return g.__grdb;
}

function persist() {
  fs.mkdirSync(dataDir(), { recursive: true });
  const tmp = `${file()}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(g.__grdb));
  fs.renameSync(tmp, file());
}

/** Run a mutation against the store; changes are persisted only if fn doesn't throw. */
export function mutate<T>(fn: (d: DB) => T): T {
  const current = db();
  const draft = structuredClone(current);
  const result = fn(draft);
  g.__grdb = draft;
  persist();
  return result;
}

/** Test helper: reset to an in-memory DB without touching disk. */
export function __setDb(d: DB | undefined) {
  g.__grdb = d;
}
