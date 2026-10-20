-- Login hardening (issue #2).

-- Seeded accounts all start with the shared SEED_PASSWORD, so each person must pick
-- their own on first login. Accounts that already exist never had a way to change it.
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
UPDATE users SET must_change_password = 1;

-- Failed-login counters for rate limiting, keyed by 'user:<username>' or 'ip:<address>'.
CREATE TABLE login_attempts (
  key          TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX sessions_user_id ON sessions (user_id);
CREATE INDEX sessions_expires_at ON sessions (expires_at);
