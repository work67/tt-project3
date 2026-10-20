import { Router, type Request } from 'express';
import * as auth from '../services/auth.service.js';
import * as loginLimit from '../services/loginLimit.service.js';
import { requireAuth, setSessionCookie, SESSION_COOKIE } from '../middleware/requireAuth.js';
import { HttpError } from '../middleware/errorHandler.js';

export const authRouter = Router();

/** On Workers, Cloudflare sets CF-Connecting-IP; locally there's no proxy in front. */
function clientIp(req: Request): string {
  const cfIp = req.app.get('trustCfConnectingIp') ? req.get('cf-connecting-ip') : undefined;
  return cfIp ?? req.ip ?? 'unknown';
}

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Username and password are required');
  }
  const name = username.trim();
  const ip = clientIp(req);

  const retryAfter = await loginLimit.loginRetryAfter(name, ip);
  if (retryAfter > 0) {
    res.set('Retry-After', String(retryAfter));
    const minutes = Math.ceil(retryAfter / 60);
    throw new HttpError(
      429,
      `Too many failed logins. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    );
  }

  const result = await auth.login(name, password);
  if (!result) {
    await loginLimit.recordLoginFailure(name, ip);
    throw new HttpError(401, 'Wrong username or password');
  }
  await loginLimit.clearLoginFailures(name);

  setSessionCookie(res, result.token);
  res.json(result.user);
});

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await auth.logout(token);
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

authRouter.post('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new HttpError(400, 'New password must be at least 8 characters');
  }
  if (newPassword === currentPassword) {
    throw new HttpError(400, 'New password must be different from the current one');
  }
  const token = await auth.changePassword(req.user!.id, String(currentPassword ?? ''), newPassword);
  if (!token) throw new HttpError(401, 'Current password is wrong');

  // Every other session was just logged out; this one continues on a fresh token.
  setSessionCookie(res, token);
  res.json({ ...req.user!, mustChangePassword: false });
});
