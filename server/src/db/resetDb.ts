// Delete the local database and recreate it from the seed. ALL local trip data is lost.
// Stop the dev server first: Windows won't delete a database file that's open.
// (Cloudflare D1 is not touched; see README for resetting that.)
import 'dotenv/config';
import { rmSync } from 'node:fs';
import { env } from '../config/env.js';
import { setDb } from './index.js';
import { createSqliteDatabase } from './sqlite.js';
import { seedIfEmpty } from './seed.js';

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(env.dbFile + suffix, { force: true });
}

setDb(createSqliteDatabase(env.dbFile));
await seedIfEmpty();
