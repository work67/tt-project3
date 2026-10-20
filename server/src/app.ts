import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { seedIfEmpty } from './db/seed.js';

interface AppOptions {
  /** Workers have no startup hook, so seed a fresh database lazily instead. */
  seedOnFirstRequest?: boolean;
  /** Behind Cloudflare: take the client's address (for login rate limits) from CF-Connecting-IP. */
  trustCfConnectingIp?: boolean;
}

export function createApp({ seedOnFirstRequest = false, trustCfConnectingIp = false }: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trustCfConnectingIp', trustCfConnectingIp);

  // API responses are JSON only. (Workers serves the React app itself; see client/public/_headers.)
  app.use((_req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    next();
  });

  // The client is served from the same origin (Vite's dev proxy locally, one Worker on
  // Cloudflare), so CORS is only needed if CLIENT_ORIGIN names a separate origin.
  if (env.clientOrigin) app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  if (seedOnFirstRequest) {
    let seeding: Promise<unknown> | undefined;
    app.use(async (_req, _res, next) => {
      seeding ??= seedIfEmpty().catch((err) => {
        seeding = undefined; // try again on the next request
        throw err;
      });
      await seeding;
      next();
    });
  }

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
