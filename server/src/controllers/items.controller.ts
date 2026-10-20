import type { Request, Response } from 'express';
import * as itemsService from '../services/items.service.js';
import { HttpError } from '../middleware/errorHandler.js';

export function list(_req: Request, res: Response) {
  res.json(itemsService.findAll());
}

export function getById(req: Request<{ id: string }>, res: Response) {
  const item = itemsService.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Item not found');
  res.json(item);
}

export function create(req: Request, res: Response) {
  const { name } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, '"name" is required');
  }
  res.status(201).json(itemsService.create(name.trim()));
}
