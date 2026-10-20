import type { NextFunction, Request, Response } from 'express';
import { userForSession } from '../services/auth.service.js';
import { HttpError } from './errorHandler.js';

export const SESSION_COOKIE = 'sid';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  const user = token ? await userForSession(token) : null;
  if (!user) throw new HttpError(401, 'Not logged in');
  req.user = user;
  next();
}
