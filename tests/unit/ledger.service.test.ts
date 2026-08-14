import { ledgerService } from '../../src/services/ledger.service';
import { withChildLock } from '../../src/locks/perChildLock';
import { runMigrations } from '../../src/db/migrate';
import db from '../../src/db/connection';
import { v4 as uuidv4 } from 'uuid';
import { createChild, createParent } from '../helpers/factories';

describe('LedgerService', () => {
  beforeAll(() => {
    runMigrations();
  });

  beforeEach(() => {
    db.exec('DELETE FROM ledger_entries; DELETE FROM children; DELETE FROM parents;');
  });

  it('should add earn and spend correctly', async () => {
    const parent = createParent();
    const child = createChild(parent.id);

    await withChildLock(child.id, () => {
      const tx = db.transaction(() => {
        ledgerService.postLedgerEntry(child.id, 'EARN', 30, 'task', uuidv4(), db);
        ledgerService.postLedgerEntry(child.id, 'SPEND', -10, 'session', uuidv4(), db);
      });
      tx();
    });

    expect(ledgerService.getBalance(child.id)).toBe(20);
  });

  it('should maintain invariant after multiple operations', async () => {
    const parent = createParent();
    const child = createChild(parent.id);

    await withChildLock(child.id, () => {
      const tx = db.transaction(() => {
        for (let i = 0; i < 100; i++) {
          const amount = i % 2 === 0 ? i : -i;
          ledgerService.postLedgerEntry(child.id, amount > 0 ? 'EARN' : 'SPEND', amount, 'test', uuidv4(), db);
        }
      });
      tx();
    });

    expect(ledgerService.verifyInvariant(child.id)).toBe(true);
  });
});