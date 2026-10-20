// Cloudflare Workers entry point: same Express app, backed by D1. (Local uses src/index.ts.)
// Requests to /api/* reach Express; everything else is the built React app (wrangler.jsonc assets).
import { env as bindings } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { setDb } from './db/index.js';
import { createD1Database, type D1Database } from './db/d1.js';
import { createApp } from './app.js';

setDb(createD1Database((bindings as { DB: D1Database }).DB));

const PORT = 8080; // internal only: httpServerHandler routes Worker requests to this "port"
createApp({ seedOnFirstRequest: true, trustCfConnectingIp: true }).listen(PORT);

export default httpServerHandler({ port: PORT });
