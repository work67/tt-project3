// Set every account's password to SEED_PASSWORD and log everyone out.
// The seed only runs on an empty database, so use this after changing SEED_PASSWORD.
import { db, transaction } from './index.js';
import { env } from '../config/env.js';
import { hashPassword } from '../services/auth.service.js';

const users = db.prepare('SELECT id FROM users').all() as { id: number }[];

transaction(() => {
  const update = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  for (const { id } of users) update.run(hashPassword(env.seedPassword), id);
  db.exec('DELETE FROM sessions');
});

console.log(`Reset ${users.length} passwords to "${env.seedPassword}" and cleared sessions`);
