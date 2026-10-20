import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';

mkdirSync(dirname(env.dbFile), { recursive: true });

export const db = new DatabaseSync(env.dbFile);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS todos (
    id          INTEGER PRIMARY KEY,
    title       TEXT NOT NULL,
    notes       TEXT NOT NULL DEFAULT '',
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date    TEXT,
    done        INTEGER NOT NULL DEFAULT 0,
    created_by  INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id           INTEGER PRIMARY KEY,
    description  TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    paid_by      INTEGER NOT NULL REFERENCES users(id),
    created_by   INTEGER NOT NULL REFERENCES users(id),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expense_shares (
    expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    share_cents INTEGER NOT NULL,
    PRIMARY KEY (expense_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id           INTEGER PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id   INTEGER NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    created_by   INTEGER NOT NULL REFERENCES users(id),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Run `fn` inside a transaction, rolling back if it throws. */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
