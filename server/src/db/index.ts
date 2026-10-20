import type { Database } from './types.js';

export type { Database, SqlValue, Statement } from './types.js';

let current: Database | undefined;

/** Called once by the entry point: src/index.ts (local SQLite) or src/worker.ts (D1). */
export function setDb(db: Database) {
  current = db;
}

export function db(): Database {
  if (!current) throw new Error('Database not configured: call setDb() in the entry point');
  return current;
}
