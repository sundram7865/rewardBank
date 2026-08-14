import { Response } from 'express';
import { AuthenticatedRequest } from '../types/api';
import { taskService } from '../services/task.service';
import * as taskRepo from '../repositories/task.repo';
import { findChildById } from '../repositories/user.repo';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export class TaskController {
  createTask(req: AuthenticatedRequest, res: Response) {
    const { childId, title, rewardMinutes } = req.body;
    const task = taskService.createTask(childId, title, rewardMinutes);
    res.status(201).json(task);
  }

  markDone(req: AuthenticatedRequest, res: Response) {
    const taskId = String(req.params.id);
    const childId = req.user!.id;
    const task = taskService.markDone(taskId, childId);
    res.json(task);
  }

  async approve(req: AuthenticatedRequest, res: Response) {
    const taskId = String(req.params.id);
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    this.assertParentOwnsTask(req, task.child_id);
    const result = await taskService.approve(taskId, req.user!.id);
    res.json(result);
  }

  async reject(req: AuthenticatedRequest, res: Response) {
    const taskId = String(req.params.id);
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    this.assertParentOwnsTask(req, task.child_id);
    const taskResult = await taskService.reject(taskId, req.user!.id);
    res.json(taskResult);
  }

  async undo(req: AuthenticatedRequest, res: Response) {
    const taskId = String(req.params.id);
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    this.assertParentOwnsTask(req, task.child_id);
    const result = await taskService.undoApproval(taskId, req.user!.id);
    res.json(result);
  }

  private assertParentOwnsTask(req: AuthenticatedRequest, childId: string) {
    if (req.user?.role !== 'parent') {
      throw new ForbiddenError('Parent role required');
    }
    const child = findChildById(childId);
    if (!child || child.parent_id !== req.user.id) {
      throw new ForbiddenError('Not your child');
    }
  }
}

export const taskController = new TaskController();