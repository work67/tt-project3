import { Router } from 'express';
import * as settlements from '../services/settlements.service.js';
import { HttpError } from '../middleware/errorHandler.js';
import { idParam, requireCents, requireUserId } from '../middleware/validate.js';

export const settlementsRouter = Router();

settlementsRouter.get('/', async (_req, res) => {
  res.json(await settlements.listSettlements());
});

settlementsRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  const fromUserId = await requireUserId(body.fromUserId, 'fromUserId');
  const toUserId = await requireUserId(body.toUserId, 'toUserId');
  if (fromUserId === toUserId) throw new HttpError(400, "Can't pay yourself");

  const settlement = await settlements.createSettlement(
    fromUserId,
    toUserId,
    requireCents(body.amountCents, 'amountCents'),
    req.user!.id,
  );
  res.status(201).json(settlement);
});

settlementsRouter.delete('/:id', async (req, res) => {
  const id = idParam(req.params.id);
  const settlement = await settlements.getSettlement(id);
  if (!settlement) throw new HttpError(404, 'Payment not found');
  const allowed = [settlement.createdBy, settlement.fromUserId, settlement.toUserId];
  if (!allowed.includes(req.user!.id)) {
    throw new HttpError(403, 'Only people involved in this payment can delete it');
  }
  await settlements.deleteSettlement(id);
  res.status(204).end();
});
