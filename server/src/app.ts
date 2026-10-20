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
}

export function createApp({ seedOnFirstRequest = false }: AppOptions = {}) {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
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
