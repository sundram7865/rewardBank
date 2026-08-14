import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import * as taskRepo from '../repositories/task.repo';
import { ledgerService } from './ledger.service';
import { Task, TaskStatus, LedgerEntry } from '../types/domain';
import { AppError, InvalidStateError, NotFoundError, ForbiddenError } from '../utils/errors';
import { withChildLock } from '../locks/perChildLock';

export class TaskService {
  createTask(childId: string, title: string, rewardMinutes: number): Task {
    const task: Task = {
      id: uuidv4(),
      child_id: childId,
      title,
      reward_minutes: rewardMinutes,
      status: 'pending',
      created_at: Date.now(),
      done_at: null,
      approved_at: null,
      rejected_at: null,
      undone_at: null,
    };
    taskRepo.createTask(task);
    return task;
  }

  markDone(taskId: string, childId: string): Task {
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    if (task.child_id !== childId) throw new ForbiddenError('Not your task');

    const changes = taskRepo.updateTaskStatus(taskId, 'done', 'done_at', Date.now(), 'pending');
    if (changes === 0) {
      const current = taskRepo.getTaskStatus(taskId);
      throw new InvalidStateError(`Task is in state: ${current}`, { currentState: current });
    }
    return taskRepo.getTaskById(taskId)!;
  }

  async approve(taskId: string, parentId: string): Promise<{ task: Task; entry?: LedgerEntry }> {
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');
    // Ownership check done in controller

    return withChildLock(task.child_id, () => {
      const tx = db.transaction(() => {
        const changes = taskRepo.updateTaskStatus(taskId, 'approved', 'approved_at', Date.now(), 'done');
        if (changes === 1) {
          const entry = ledgerService.postLedgerEntry(
            task.child_id,
            'EARN',
            task.reward_minutes,
            'task',
            taskId,
            db
          );
          return { task: taskRepo.getTaskById(taskId)!, entry };
        } else {
          const current = taskRepo.getTaskStatus(taskId);
          if (current === 'approved') {
            // Idempotent success: return existing state, no new entry
            return { task: taskRepo.getTaskById(taskId)!, entry: undefined };
          }
          throw new InvalidStateError(`Task is in state: ${current}`, { currentState: current });
        }
      });
      return tx();
    });
  }

  async reject(taskId: string, parentId: string): Promise<Task> {
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');

    return withChildLock(task.child_id, () => {
      const tx = db.transaction(() => {
        const changes = taskRepo.updateTaskStatus(taskId, 'rejected', 'rejected_at', Date.now(), 'done');
        if (changes === 0) {
          const current = taskRepo.getTaskStatus(taskId);
          throw new InvalidStateError(`Task is in state: ${current}`, { currentState: current });
        }
        return taskRepo.getTaskById(taskId)!;
      });
      return tx();
    });
  }

  async undoApproval(taskId: string, parentId: string): Promise<{ task: Task; entry?: LedgerEntry }> {
    const task = taskRepo.getTaskById(taskId);
    if (!task) throw new NotFoundError('Task not found');

    return withChildLock(task.child_id, () => {
      const tx = db.transaction(() => {
        const changes = taskRepo.updateTaskStatus(taskId, 'undone', 'undone_at', Date.now(), 'approved');
        if (changes === 1) {
          const entry = ledgerService.postLedgerEntry(
            task.child_id,
            'REVERSAL_EARN',
            -task.reward_minutes,
            'task_undo',
            taskId,
            db
          );
          return { task: taskRepo.getTaskById(taskId)!, entry };
        } else {
          const current = taskRepo.getTaskStatus(taskId);
          if (current === 'undone') {
            return { task: taskRepo.getTaskById(taskId)!, entry: undefined };
          }
          throw new InvalidStateError(`Task is in state: ${current}`, { currentState: current });
        }
      });
      return tx();
    });
  }
}

export const taskService = new TaskService();