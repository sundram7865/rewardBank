import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import * as userRepo from '../repositories/user.repo';
import * as taskRepo from '../repositories/task.repo';

export function requireParent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'parent') {
    throw new ForbiddenError('Parent role required');
  }
  next();
}

export function requireChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'child') {
    throw new ForbiddenError('Child role required');
  }
  next();
}

export function requireChildOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const childId = String(req.params.id);
  if (!childId) throw new ForbiddenError('Child id missing');
  if (req.user?.role === 'child' && String(req.user.id) !== childId) {
    throw new ForbiddenError('Not your child');
  }
  if (req.user?.role === 'parent') {
    const child = userRepo.findChildById(childId);
    if (!child || child.parent_id !== String(req.user.id)) {
      throw new ForbiddenError('Not your child');
    }
  }
  next();
}

export function requireParentOwnsChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const childId = req.body?.childId || req.params?.id;
  if (!childId) throw new ForbiddenError('Child id missing');
  const child = userRepo.findChildById(String(childId));
  if (!child || req.user?.id !== child.parent_id) {
    throw new ForbiddenError('Not your child');
  }
  next();
}

export function requireParentOwnsTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const taskId = String(req.params.id);
  if (!taskId) throw new ForbiddenError('Task id missing');
  const task = taskRepo.getTaskById(taskId);
  if (!task) throw new NotFoundError('Task not found');
  const child = userRepo.findChildById(task.child_id);
  if (!child || child.parent_id !== req.user!.id) {
    throw new ForbiddenError('Not your child');
  }
  next();
}