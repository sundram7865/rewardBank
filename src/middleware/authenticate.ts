import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { authenticateToken } from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }
  const token = authHeader.substring(7);
  const user = authenticateToken(token);
  req.user = user;
  next();
}