import type { NextFunction, Request, Response } from 'express';
import { SESSION_TTL_MS, userForSession } from '../services/auth.service.js';
import { HttpError } from './errorHandler.js';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'sid';

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: SESSION_TTL_MS,
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = token ? await userForSession(token) : null;
  if (!session) throw new HttpError(401, 'Not logged in');
  if (session.renewed) setSessionCookie(res, token);
  req.user = session.user;
  next();
}

/** For everything but /api/auth: accounts still on the shared seed password can't act yet. */
export function requirePasswordChanged(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    throw new HttpError(403, 'Change your password before using the app');
  }
  next();
}
