import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
