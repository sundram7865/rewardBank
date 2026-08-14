import request from 'supertest';
import app from '../../src/app';
import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';
import { createParent, createChild } from '../helpers/factories';

describe('Concurrency', () => {
  let parentToken: string;
  let childToken: string;
  let childId: string;

  beforeAll(() => runMigrations());

  beforeEach(async () => {
    db.exec('DELETE FROM ledger_entries; DELETE FROM usage_sessions; DELETE FROM tasks; DELETE FROM children; DELETE FROM parents;');
    const parent = createParent();
    parentToken = parent.token;
    const child = createChild(parent.id);
    childToken = child.token;
    childId = child.id;
  });

  async function giveBalance(minutes: number) {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Balance', rewardMinutes: minutes });
    const taskId = createRes.body.id;
    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();
    await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();
  }

  it('should handle concurrent approvals on same task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Task', rewardMinutes: 30 });
    const taskId = createRes.body.id;

    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();

    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post(`/api/tasks/${taskId}/approve`)
          .set('Authorization', `Bearer ${parentToken}`)
          .send()
      );
    }
    const responses = await Promise.all(promises);
    const withEntry = responses.filter(r => r.body.entry !== undefined);
    expect(withEntry).toHaveLength(1);

    const ledgerRes = await request(app)
      .get(`/api/children/${childId}/ledger`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(ledgerRes.body.entries).toHaveLength(1);
  });

  it('should handle concurrent duplicate sessions', async () => {
    await giveBalance(30);

    // Past timestamps to avoid future-skew validation
    const end = Date.now() - 1000;
    const start = end - 10 * 60000;
    const payload = { sessions: [{ appId: 'game', start, end }] };
    const promises = [
      request(app).post(`/api/children/${childId}/usage`).set('Authorization', `Bearer ${childToken}`).send(payload),
      request(app).post(`/api/children/${childId}/usage`).set('Authorization', `Bearer ${childToken}`).send(payload),
    ];
    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.body.results[0].status);
    expect(statuses).toContain('processed');
    expect(statuses).toContain('duplicate');

    const ledgerRes = await request(app)
      .get(`/api/children/${childId}/ledger`)
      .set('Authorization', `Bearer ${parentToken}`);
    const spendEntries = ledgerRes.body.entries.filter((e: any) => e.type === 'SPEND');
    expect(spendEntries).toHaveLength(1);

    // Invariant verification after concurrent operations
    const balanceRes = await request(app)
      .get(`/api/children/${childId}/balance`)
      .set('Authorization', `Bearer ${parentToken}`);
    const sum = ledgerRes.body.entries.reduce((acc: number, e: any) => acc + e.amount, 0);
    expect(sum).toBe(balanceRes.body.balance);
  });
});