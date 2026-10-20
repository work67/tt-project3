import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';
import type { User } from '../types/models.js';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

/** Returns a new session token if the credentials are valid, otherwise null. */
export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: User } | null> {
  const row = await db().get<{
    id: number;
    username: string;
    display_name: string;
    password_hash: string;
  }>(
    'SELECT id, username, display_name, password_hash FROM users WHERE username = ?',
    username.toLowerCase(),
  );
  if (!row || !verifyPassword(password, row.password_hash)) return null;

  const token = randomBytes(32).toString('hex');
  await db().run(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    token,
    row.id,
    Date.now() + SESSION_TTL_MS,
  );
  return { token, user: { id: row.id, username: row.username, displayName: row.display_name } };
}

export async function logout(token: string) {
  await db().run('DELETE FROM sessions WHERE token = ?', token);
}

export async function userForSession(token: string): Promise<User | null> {
  const row = await db().get<User>(
    `SELECT u.id, u.username, u.display_name AS displayName
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    Date.now(),
  );
  return row ?? null;
}

export async function changePassword(userId: number, current: string, next: string) {
  const row = await db().get<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = ?',
    userId,
  );
  if (!row || !verifyPassword(current, row.password_hash)) return false;
  await db().run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(next), userId);
  return true;
}
