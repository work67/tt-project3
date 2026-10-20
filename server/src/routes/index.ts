import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { itemsRouter } from './items.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/items', itemsRouter);
