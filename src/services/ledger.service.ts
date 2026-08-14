import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import * as ledgerRepo from '../repositories/ledger.repo';
import { LedgerEntry, LedgerEntryType } from '../types/domain';
import { AppError } from '../utils/errors';

export class LedgerService {
  /**
   * THE single writer. Only this method may change balance.
   * Must be called within a transaction context if used with other DB writes.
   */
  postLedgerEntry(
    childId: string,
    type: LedgerEntryType,
    amount: number,
    refType: string,
    refId: string,
    tx: any = db  // Use `any` to avoid naming the Database type in .d.ts files
  ): LedgerEntry {
    const latest = ledgerRepo.getLatestEntry(childId);
    const currentBalance = latest ? latest.balance_after : 0;
    const newBalance = currentBalance + amount;

   

    const nextSeq = ledgerRepo.getNextSequenceNumber(childId);
    const entry: LedgerEntry = {
      id: uuidv4(),
      child_id: childId,
      type,
      amount,
      balance_after: newBalance,
      ref_type: refType,
      ref_id: refId,
      created_at: Date.now(),
      sequence_number: nextSeq,
    };

    // Insert using the provided transaction object (or default db)
    (tx || db).prepare(`
      INSERT INTO ledger_entries (id, child_id, type, amount, balance_after, ref_type, ref_id, created_at, sequence_number)
      VALUES (@id, @child_id, @type, @amount, @balance_after, @ref_type, @ref_id, @created_at, @sequence_number)
    `).run(entry);

    return entry;
  }

  getBalance(childId: string): number {
    const sum = ledgerRepo.getBalanceFromSum(childId);
    const latest = ledgerRepo.getLatestEntry(childId);
    if (latest && latest.balance_after !== sum) {
      throw new AppError(500, 'INVARIANT_VIOLATION', 'Balance mismatch between sum and latest entry');
    }
    return sum;
  }

  getLedger(childId: string): LedgerEntry[] {
    return ledgerRepo.getLedgerEntries(childId);
  }

  verifyInvariant(childId: string): boolean {
    const entries = this.getLedger(childId);
    let calculated = 0;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].sequence_number !== entries[i-1].sequence_number + 1) {
        return false;
      }
      calculated += entries[i].amount;
      if (calculated !== entries[i].balance_after) {
        return false;
      }
    }
    const stored = this.getBalance(childId);
    return calculated === stored;
  }
}

export const ledgerService = new LedgerService();