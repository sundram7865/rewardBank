import { ledgerService } from '../../src/services/ledger.service';
import { withChildLock } from '../../src/locks/perChildLock';
import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';
import { createParent, createChild } from '../helpers/factories';
import { v4 as uuidv4 } from 'uuid';

describe('Ledger invariant fuzz test', () => {
  beforeAll(() => runMigrations());

  beforeEach(() => {
    db.exec('DELETE FROM ledger_entries; DELETE FROM usage_sessions; DELETE FROM tasks; DELETE FROM children; DELETE FROM parents;');
  });

  it('should hold invariant after 500 random operations', () => {
    const parent = createParent();
    const child = createChild(parent.id);

    for (let i = 0; i < 500; i++) {
      withChildLock(child.id, () => {
        const tx = db.transaction(() => {
          const op = Math.random();
          if (op < 0.5) {
            // earn
            const amount = Math.floor(Math.random() * 100) + 1;
            ledgerService.postLedgerEntry(child.id, 'EARN', amount, 'fuzz', uuidv4(), db);
          } else if (op < 0.9) {
            // spend
            const current = ledgerService.getBalance(child.id);
            const amount = Math.floor(Math.random() * Math.min(current, 50)) + 1;
            ledgerService.postLedgerEntry(child.id, 'SPEND', -amount, 'fuzz', uuidv4(), db);
          } else {
            // reversal earn (negative)
            const amount = Math.floor(Math.random() * 50) + 1;
            ledgerService.postLedgerEntry(child.id, 'REVERSAL_EARN', -amount, 'fuzz', uuidv4(), db);
          }
        });
        tx();
      });
      expect(ledgerService.verifyInvariant(child.id)).toBe(true);
    }
  });
});