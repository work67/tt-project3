import { db } from '../db/index.js';
import type { User } from '../types/models.js';

export function listUsers(): Promise<User[]> {
  return db().all<User>('SELECT id, username, display_name AS displayName FROM users ORDER BY id');
}

export async function userExists(id: unknown): Promise<boolean> {
  if (!Number.isInteger(id)) return false;
  return (await db().get('SELECT 1 AS found FROM users WHERE id = ?', id as number)) !== undefined;
}
