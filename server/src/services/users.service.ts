import { db } from '../db/index.js';
import type { User } from '../types/models.js';

export function listUsers(): User[] {
  return db
    .prepare('SELECT id, username, display_name AS displayName FROM users ORDER BY id')
    .all() as unknown as User[];
}

export function userExists(id: unknown): id is number {
  if (!Number.isInteger(id)) return false;
  return db.prepare('SELECT 1 FROM users WHERE id = ?').get(id as number) !== undefined;
}
