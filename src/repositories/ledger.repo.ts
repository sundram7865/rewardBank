import db from '../db/connection';
import { LedgerEntry, LedgerEntryType } from '../types/domain';

export function getLatestEntry(childId: string): LedgerEntry | undefined {
  return db.prepare(
    'SELECT * FROM ledger_entries WHERE child_id = ? ORDER BY sequence_number DESC LIMIT 1'
  ).get(childId) as LedgerEntry | undefined;
}

export function getBalanceFromSum(childId: string): number {
  const row = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM ledger_entries WHERE child_id = ?'
  ).get(childId) as { total: number };
  return row.total;
}

export function insertLedgerEntry(entry: LedgerEntry): void {
  db.prepare(`
    INSERT INTO ledger_entries (id, child_id, type, amount, balance_after, ref_type, ref_id, created_at, sequence_number)
    VALUES (@id, @child_id, @type, @amount, @balance_after, @ref_type, @ref_id, @created_at, @sequence_number)
  `).run(entry);
}

export function getLedgerEntries(childId: string): LedgerEntry[] {
  return db.prepare(
    'SELECT * FROM ledger_entries WHERE child_id = ? ORDER BY sequence_number ASC'
  ).all(childId) as LedgerEntry[];
}

export function getNextSequenceNumber(childId: string): number {
  const row = db.prepare(
    'SELECT COALESCE(MAX(sequence_number), 0) + 1 as nextSeq FROM ledger_entries WHERE child_id = ?'
  ).get(childId) as { nextSeq: number };
  return row.nextSeq;
}