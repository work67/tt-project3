// Locally, src/index.ts loads server/.env first. On Cloudflare, process.env holds the
// Worker's vars and secrets (wrangler.jsonc `vars`, `wrangler secret put`).
const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv,
  // Only for a client on another origin; unset = same-origin only (no CORS headers).
  clientOrigin: process.env.CLIENT_ORIGIN || undefined,
  dbFile: process.env.DB_FILE ?? 'data/trip.db',
  // Fallbacks are public in the repo: set a real SEED_PASSWORD secret before deploying.
  seedPassword: process.env.SEED_PASSWORD ?? (nodeEnv === 'production' ? 'P@ssw0rd!@#' : 'password'),
};
