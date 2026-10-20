import { Router } from 'express';
import * as itemsController from '../controllers/items.controller.js';

export const itemsRouter = Router();

itemsRouter.get('/', itemsController.list);
itemsRouter.get('/:id', itemsController.getById);
itemsRouter.post('/', itemsController.create);
