// Local entry point: Node + SQLite file. (Cloudflare uses src/worker.ts.)
import 'dotenv/config';
import { env } from './config/env.js';
import { setDb } from './db/index.js';
import { createSqliteDatabase } from './db/sqlite.js';
import { seedIfEmpty } from './db/seed.js';
import { createApp } from './app.js';

setDb(createSqliteDatabase(env.dbFile));
await seedIfEmpty();

createApp().listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port} (SQLite: ${env.dbFile})`);
});
