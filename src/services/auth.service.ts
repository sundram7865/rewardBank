import * as userRepo from '../repositories/user.repo';
import { AuthUser } from '../types/api';
import { UnauthorizedError } from '../utils/errors';

export function authenticateToken(token: string): AuthUser {
  const parent = userRepo.findParentByToken(token);
  if (parent) {
    return { id: parent.id, role: 'parent' };
  }
  const child = userRepo.findChildByToken(token);
  if (child) {
    return { id: child.id, role: 'child', parentId: child.parent_id };
  }
  throw new UnauthorizedError('Invalid token');
}