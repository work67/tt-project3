// Delete the database and recreate it from the seed. ALL trip data is lost.
// Stop the dev server first: Windows won't delete a database file that's open.
import { rmSync } from 'node:fs';
import { env } from '../config/env.js';

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(env.dbFile + suffix, { force: true });
}

// Imported after the delete, because opening the db module creates the file.
const { seedIfEmpty } = await import('./seed.js');
seedIfEmpty();
