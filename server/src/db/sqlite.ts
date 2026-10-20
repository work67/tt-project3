import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Database } from './types.js';

// server/migrations, from both src/db (tsx) and dist/db (built)
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

/** Local SQLite file via Node's built-in node:sqlite. Applies pending migrations on open. */
export function createSqliteDatabase(file: string): Database {
  mkdirSync(dirname(file), { recursive: true });
  const sqlite = new DatabaseSync(file);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  applyMigrations(sqlite);

  const prepare = (sql: string) => sqlite.prepare(sql);
  const args = (params: unknown[]) => params as SQLInputValue[];

  return {
    async all<T>(sql: string, ...params: unknown[]) {
      return prepare(sql).all(...args(params)) as T[];
    },
    async get<T>(sql: string, ...params: unknown[]) {
      return prepare(sql).get(...args(params)) as T | undefined;
    },
    async run(sql: string, ...params: unknown[]) {
      const result = prepare(sql).run(...args(params));
      return { changes: Number(result.changes), lastRowId: Number(result.lastInsertRowid) };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        for (const { sql, params = [] } of statements) prepare(sql).run(...args(params));
        sqlite.exec('COMMIT');
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

/** Same bookkeeping idea as wrangler's d1_migrations table: run each .sql file once, in order. */
function applyMigrations(sqlite: DatabaseSync) {
  sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)');
  // Databases created before migrations existed already have the 0001 tables.
  const hasUsers = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE name = 'users'").get();
  if (hasUsers) sqlite.exec("INSERT OR IGNORE INTO _migrations (name) VALUES ('0001_init.sql')");

  const applied = new Set(
    (sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
  );
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !applied.has(f))
    .sort();

  for (const name of pending) {
    sqlite.exec('BEGIN');
    try {
      sqlite.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
      sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }
}
