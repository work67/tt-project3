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
export function login(username: string, password: string): { token: string; user: User } | null {
  const row = db
    .prepare('SELECT id, username, display_name, password_hash FROM users WHERE username = ?')
    .get(username.toLowerCase()) as
    | { id: number; username: string; display_name: string; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;

  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    row.id,
    Date.now() + SESSION_TTL_MS,
  );
  return { token, user: { id: row.id, username: row.username, displayName: row.display_name } };
}

export function logout(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function userForSession(token: string): User | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.display_name AS displayName
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now()) as User | undefined;
  return row ?? null;
}

export function changePassword(userId: number, current: string, next: string): boolean {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined;
  if (!row || !verifyPassword(current, row.password_hash)) return false;
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), userId);
  return true;
}
