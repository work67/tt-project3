import type { Me } from './models.js';

declare global {
  namespace Express {
    interface Request {
      user?: Me;
    }
  }
}
