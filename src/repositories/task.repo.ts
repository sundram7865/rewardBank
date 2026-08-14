import db from '../db/connection';
import { Task, TaskStatus } from '../types/domain';

export function createTask(task: Task): void {
  db.prepare(`
    INSERT INTO tasks (id, child_id, title, reward_minutes, status, created_at, done_at, approved_at, rejected_at, undone_at)
    VALUES (@id, @child_id, @title, @reward_minutes, @status, @created_at, @done_at, @approved_at, @rejected_at, @undone_at)
  `).run(task);
}

export function getTaskById(id: string): Task | undefined {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
}

export function updateTaskStatus(
  id: string,
  newStatus: TaskStatus,
  timestampField: 'done_at' | 'approved_at' | 'rejected_at' | 'undone_at',
  timestamp: number,
  expectedCurrentStatus?: TaskStatus
): number {
  const sql = expectedCurrentStatus
    ? `UPDATE tasks SET status = ?, ${timestampField} = ? WHERE id = ? AND status = ?`
    : `UPDATE tasks SET status = ?, ${timestampField} = ? WHERE id = ?`;
  const params = expectedCurrentStatus
    ? [newStatus, timestamp, id, expectedCurrentStatus]
    : [newStatus, timestamp, id];
  return db.prepare(sql).run(...params).changes;
}

export function getTaskStatus(id: string): TaskStatus | undefined {
  const row = db.prepare('SELECT status FROM tasks WHERE id = ?').get(id) as { status: TaskStatus } | undefined;
  return row?.status;
}