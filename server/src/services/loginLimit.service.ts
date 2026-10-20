import { db } from '../db/index.js';

// Failed logins allowed per window before that username or address is locked out.
// The lockout lasts at least as long as the window, so the count starts over after it.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_USER = 5;
const MAX_FAILURES_PER_IP = 20;

const userKey = (username: string) => `user:${username.toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;

/** Seconds until this username and address may try again, or 0 if they may now. */
export async function loginRetryAfter(username: string, ip: string): Promise<number> {
  const row = await db().get<{ lockedUntil: number | null }>(
    'SELECT MAX(locked_until) AS lockedUntil FROM login_attempts WHERE key IN (?, ?)',
    userKey(username),
    ipKey(ip),
  );
  const waitMs = (row?.lockedUntil ?? 0) - Date.now();
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

export async function recordLoginFailure(username: string, ip: string) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  // Count a failure, starting a new window if the old one has passed, and lock the key
  // once it reaches its limit. (UPDATE expressions see the row's old values.)
  const upsert = (key: string, maxFailures: number) => ({
    sql: `INSERT INTO login_attempts (key, failures, window_start) VALUES (?, 1, ?)
          ON CONFLICT (key) DO UPDATE SET
            failures     = CASE WHEN window_start <= ? THEN 1 ELSE failures + 1 END,
            window_start = CASE WHEN window_start <= ? THEN ? ELSE window_start END,
            locked_until = CASE WHEN window_start > ? AND failures + 1 >= ? THEN ?
                                ELSE locked_until END`,
    params: [key, now, windowStart, windowStart, now, windowStart, maxFailures, now + LOCKOUT_MS],
  });
  await db().batch([
    upsert(userKey(username), MAX_FAILURES_PER_USER),
    upsert(ipKey(ip), MAX_FAILURES_PER_IP),
    {
      sql: 'DELETE FROM login_attempts WHERE window_start <= ? AND locked_until <= ?',
      params: [windowStart, now],
    },
  ]);
}

/** A correct password clears that username's failures (not the address's). */
export async function clearLoginFailures(username: string) {
  await db().run('DELETE FROM login_attempts WHERE key = ?', userKey(username));
}
