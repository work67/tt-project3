import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { todosRouter } from './todos.routes.js';
import { expensesRouter } from './expenses.routes.js';
import { settlementsRouter } from './settlements.routes.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { listUsers } from '../services/users.service.js';
import { computeBalances } from '../services/balances.service.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

// Everything below needs a logged-in trip member.
apiRouter.use(requireAuth);
apiRouter.get('/users', async (_req, res) => {
  res.json(await listUsers());
});
apiRouter.use('/todos', todosRouter);
apiRouter.use('/expenses', expensesRouter);
apiRouter.use('/settlements', settlementsRouter);
apiRouter.get('/balances', async (_req, res) => {
  res.json(await computeBalances());
});
