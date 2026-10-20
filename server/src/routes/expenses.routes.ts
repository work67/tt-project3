import { Router } from 'express';
import * as expenses from '../services/expenses.service.js';
import { HttpError } from '../middleware/errorHandler.js';
import { idParam, requireCents, requireString, requireUserId } from '../middleware/validate.js';

export const expensesRouter = Router();

expensesRouter.get('/', (_req, res) => {
  res.json(expenses.listExpenses());
});

expensesRouter.post('/', (req, res) => {
  const body = req.body ?? {};
  if (!Array.isArray(body.participantIds) || body.participantIds.length === 0) {
    throw new HttpError(400, 'Pick at least one person to split with');
  }
  const participantIds = [...new Set(body.participantIds)].map((id) =>
    requireUserId(id, 'participantIds'),
  );

  const expense = expenses.createExpense(
    {
      description: requireString(body.description, 'description'),
      amountCents: requireCents(body.amountCents, 'amountCents'),
      paidBy: requireUserId(body.paidBy, 'paidBy'),
      participantIds,
    },
    req.user!.id,
  );
  res.status(201).json(expense);
});

expensesRouter.delete('/:id', (req, res) => {
  const id = idParam(req.params.id);
  const owners = expenses.getExpenseOwners(id);
  if (!owners) throw new HttpError(404, 'Expense not found');
  if (req.user!.id !== owners.paidBy && req.user!.id !== owners.createdBy) {
    throw new HttpError(403, 'Only the payer or whoever added it can delete this expense');
  }
  expenses.deleteExpense(id);
  res.status(204).end();
});
