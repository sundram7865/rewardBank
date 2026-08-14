import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import * as usageRepo from '../repositories/usage.repo';
import { ledgerService } from './ledger.service';
import { UsageSession, SessionStatus } from '../types/domain';
import { withChildLock } from '../locks/perChildLock';
import { buildSessionDedupeKey } from '../utils/idempotency';
import { msToMinutes, minutesToMs } from '../utils/time';
import { ValidationError, InvalidStateError } from '../utils/errors';
import { MAX_SESSION_DURATION_MINUTES, FUTURE_SKEW_MS } from '../config/constants';

export interface SessionResult {
  index: number;
  status: 'processed' | 'duplicate' | 'invalid';
  detail?: any;
}

export class UsageService {
  async processBatch(
    childId: string,
    sessions: Array<{ appId: string; start: number; end: number }>
  ): Promise<SessionResult[]> {
    const results: SessionResult[] = [];
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      try {
        const result = await this.processSingle(childId, session);
        results.push({ index: i, status: result.status, detail: result.detail });
      } catch (err: any) {
        if (err instanceof ValidationError) {
          results.push({ index: i, status: 'invalid', detail: err.message });
        } else {
          throw err; // unexpected
        }
      }
    }
    return results;
  }

  async processSingle(
    childId: string,
    session: { appId: string; start: number; end: number }
  ): Promise<{ status: 'processed' | 'duplicate' | 'invalid'; detail?: any }> {
    // 1. Validate
    this.validateSession(session);

    // 2. Dedupe (quick check before lock)
    const dedupeKey = buildSessionDedupeKey(childId, session.appId, session.start, session.end);
    const existing = usageRepo.getSessionByDedupeKey(dedupeKey);
    if (existing) {
      return { status: 'duplicate', detail: existing };
    }

    // 3. Process under child lock
    return await withChildLock(childId, () => {
      const tx = db.transaction(() => {
        // Insert session with status 'processing' (will be updated)
        const sessionId = uuidv4();
        const newSession: UsageSession = {
          id: sessionId,
          child_id: childId,
          app_id: session.appId,
          started_at: session.start,
          ended_at: session.end,
          dedupe_key: dedupeKey,
          covered_minutes: null,
          ran_out_at: null,
          status: 'processing',
          reported_at: Date.now(),
        };
        const inserted = usageRepo.insertSession(newSession);
        if (!inserted) {
          // duplicate due to race
          const dup = usageRepo.getSessionByDedupeKey(dedupeKey);
          return { status: 'duplicate' as const, detail: dup };
        }

        // Calculate duration
        const durationMinutes = msToMinutes(session.end - session.start);
        const balance = ledgerService.getBalance(childId);

        let covered = 0;
        let ranOutAt: number | null = null;

        if (balance > 0) {
          covered = Math.min(durationMinutes, balance);
          if (covered < durationMinutes) {
            // Balance ran out exactly at start + covered minutes
            ranOutAt = session.start + minutesToMs(covered);
          } else {
            // Fully covered
            ranOutAt = null;
          }
        } else {
          // Balance <= 0: no coverage; ran out at session start
          covered = 0;
          ranOutAt = session.start;
        }

        // Post ledger entry only if covered > 0
        if (covered > 0) {
          ledgerService.postLedgerEntry(childId, 'SPEND', -covered, 'session', sessionId, db);
        }

        // Update session with result (status = processed)
        usageRepo.updateSessionResult(sessionId, covered, ranOutAt, 'processed');
        return { status: 'processed' as const, detail: { coveredMinutes: covered, ranOutAt } };
      });
      return tx();
    });
  }

  private validateSession(session: { appId: string; start: number; end: number }): void {
    if (session.end <= session.start) {
      throw new ValidationError('end must be greater than start');
    }
    const durationMinutes = msToMinutes(session.end - session.start);
    if (durationMinutes > MAX_SESSION_DURATION_MINUTES) {
      throw new ValidationError(`Session duration exceeds maximum of ${MAX_SESSION_DURATION_MINUTES} minutes`);
    }
    const now = Date.now();
    if (session.start > now + FUTURE_SKEW_MS || session.end > now + FUTURE_SKEW_MS) {
      throw new ValidationError('Session timestamps are too far in the future');
    }
  }
}

export const usageService = new UsageService();