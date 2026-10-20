import { Router } from 'express';
import * as todos from '../services/todos.service.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  idParam,
  optionalDate,
  optionalString,
  optionalUserId,
  requireString,
} from '../middleware/validate.js';

export const todosRouter = Router();

todosRouter.get('/', async (_req, res) => {
  res.json(await todos.listTodos());
});

todosRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  const todo = await todos.createTodo(
    {
      title: requireString(body.title, 'title'),
      notes: optionalString(body.notes, 'notes'),
      assigneeId: await optionalUserId(body.assigneeId, 'assigneeId'),
      dueDate: optionalDate(body.dueDate, 'dueDate'),
    },
    req.user!.id,
  );
  res.status(201).json(todo);
});

todosRouter.patch('/:id', async (req, res) => {
  const body = req.body ?? {};
  const changes: Partial<todos.TodoInput> = {};
  if ('title' in body) changes.title = requireString(body.title, 'title');
  if ('notes' in body) changes.notes = optionalString(body.notes, 'notes');
  if ('assigneeId' in body) changes.assigneeId = await optionalUserId(body.assigneeId, 'assigneeId');
  if ('dueDate' in body) changes.dueDate = optionalDate(body.dueDate, 'dueDate');
  if ('done' in body) {
    if (typeof body.done !== 'boolean') throw new HttpError(400, '"done" must be true or false');
    changes.done = body.done;
  }

  const todo = await todos.updateTodo(idParam(req.params.id), changes);
  if (!todo) throw new HttpError(404, 'To-do not found');
  res.json(todo);
});

todosRouter.delete('/:id', async (req, res) => {
  if (!(await todos.deleteTodo(idParam(req.params.id)))) throw new HttpError(404, 'To-do not found');
  res.status(204).end();
});
