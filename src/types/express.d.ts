import { AuthUser } from './api';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}