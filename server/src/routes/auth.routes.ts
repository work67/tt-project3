import { Router } from 'express';
import * as auth from '../services/auth.service.js';
import { requireAuth, SESSION_COOKIE } from '../middleware/requireAuth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Username and password are required');
  }
  const result = auth.login(username.trim(), password);
  if (!result) throw new HttpError(401, 'Wrong username or password');

  res.cookie(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: auth.SESSION_TTL_MS,
  });
  res.json(result.user);
});

authRouter.post('/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) auth.logout(token);
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

authRouter.post('/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new HttpError(400, 'New password must be at least 6 characters');
  }
  if (!auth.changePassword(req.user!.id, String(currentPassword ?? ''), newPassword)) {
    throw new HttpError(401, 'Current password is wrong');
  }
  res.status(204).end();
});
