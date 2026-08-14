import db from '../db/connection';
import { UsageSession, SessionStatus } from '../types/domain';

export function insertSession(session: UsageSession): boolean {
  try {
    db.prepare(`
      INSERT INTO usage_sessions (id, child_id, app_id, started_at, ended_at, dedupe_key, covered_minutes, ran_out_at, status, reported_at)
      VALUES (@id, @child_id, @app_id, @started_at, @ended_at, @dedupe_key, @covered_minutes, @ran_out_at, @status, @reported_at)
    `).run(session);
    return true;
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return false; // duplicate
    }
    throw err;
  }
}

export function getSessionByDedupeKey(dedupeKey: string): UsageSession | undefined {
  return db.prepare('SELECT * FROM usage_sessions WHERE dedupe_key = ?').get(dedupeKey) as UsageSession | undefined;
}

export function updateSessionResult(
  id: string,
  coveredMinutes: number | null,
  ranOutAt: number | null,
  status: SessionStatus
): void {
  db.prepare(`
    UPDATE usage_sessions SET covered_minutes = ?, ran_out_at = ?, status = ? WHERE id = ?
  `).run(coveredMinutes, ranOutAt, status, id);
}