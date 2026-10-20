import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';
import type { Me } from '../types/models.js';

// Sliding expiry: a session ends after a week without use. It's pushed back at most once
// a day, so most requests don't write to the database.
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000; // 1 day

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

function newSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    sql: 'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    params: [token, userId, Date.now() + SESSION_TTL_MS],
  };
}

/** Returns a new session token if the credentials are valid, otherwise null. */
export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: Me } | null> {
  const row = await db().get<{
    id: number;
    username: string;
    display_name: string;
    password_hash: string;
    must_change_password: number;
  }>(
    `SELECT id, username, display_name, password_hash, must_change_password
     FROM users WHERE username = ?`,
    username.toLowerCase(),
  );
  if (!row || !verifyPassword(password, row.password_hash)) return null;

  const { token, sql, params } = newSession(row.id);
  await db().batch([
    { sql: 'DELETE FROM sessions WHERE expires_at <= ?', params: [Date.now()] },
    { sql, params },
  ]);
  return {
    token,
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      mustChangePassword: row.must_change_password === 1,
    },
  };
}

export async function logout(token: string) {
  await db().run('DELETE FROM sessions WHERE token = ?', token);
}

/** The session's user, or null if it's unknown or expired. `renewed`: expiry was pushed back. */
export async function userForSession(token: string): Promise<{ user: Me; renewed: boolean } | null> {
  const now = Date.now();
  const row = await db().get<{
    id: number;
    username: string;
    displayName: string;
    mustChangePassword: number;
    expiresAt: number;
  }>(
    `SELECT u.id, u.username, u.display_name AS displayName,
            u.must_change_password AS mustChangePassword, s.expires_at AS expiresAt
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    now,
  );
  if (!row) return null;

  const { expiresAt, mustChangePassword, ...user } = row;
  const renewed = expiresAt - now < SESSION_TTL_MS - SESSION_RENEW_AFTER_MS;
  if (renewed) {
    await db().run('UPDATE sessions SET expires_at = ? WHERE token = ?', now + SESSION_TTL_MS, token);
  }
  return { user: { ...user, mustChangePassword: mustChangePassword === 1 }, renewed };
}

/**
 * Sets a new password and logs the user out everywhere else: all their sessions are
 * deleted and a fresh one is issued for the caller. Returns its token, or null if
 * `current` is wrong.
 */
export async function changePassword(
  userId: number,
  current: string,
  next: string,
): Promise<string | null> {
  const row = await db().get<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = ?',
    userId,
  );
  if (!row || !verifyPassword(current, row.password_hash)) return null;

  const { token, sql, params } = newSession(userId);
  await db().batch([
    {
      sql: 'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      params: [hashPassword(next), userId],
    },
    { sql: 'DELETE FROM sessions WHERE user_id = ?', params: [userId] },
    { sql, params },
  ]);
  return token;
}
