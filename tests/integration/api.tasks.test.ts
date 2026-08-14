import request from 'supertest';
import app from '../../src/app';
import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';
import { createParent, createChild } from '../helpers/factories';
import { v4 as uuidv4 } from 'uuid';

describe('Task API', () => {
  let parentToken: string;
  let childToken: string;
  let childId: string;

  beforeAll(() => {
    runMigrations();
  });

  beforeEach(() => {
    db.exec('DELETE FROM ledger_entries; DELETE FROM usage_sessions; DELETE FROM tasks; DELETE FROM children; DELETE FROM parents;');
    const parent = createParent();
    parentToken = parent.token;
    const child = createChild(parent.id);
    childToken = child.token;
    childId = child.id;
  });

  it('should create task, approve, and create ledger entry', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Homework', rewardMinutes: 30 });
    expect(createRes.status).toBe(201);
    const taskId = createRes.body.id;

    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();

    const approveRes = await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.entry).toBeDefined();

    const balanceRes = await request(app)
      .get(`/api/children/${childId}/balance`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(balanceRes.body.balance).toBe(30);
  });

  it('should double-approve idempotently', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Homework', rewardMinutes: 30 });
    const taskId = createRes.body.id;

    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();

    await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();

    const secondRes = await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.entry).toBeUndefined();

    const ledgerRes = await request(app)
      .get(`/api/children/${childId}/ledger`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(ledgerRes.body.entries).toHaveLength(1);
    expect(ledgerRes.body.entries[0].amount).toBe(30);
  });

  it('should undo approval and create reversal entry', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Homework', rewardMinutes: 30 });
    const taskId = createRes.body.id;

    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();

    await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();

    const undoRes = await request(app)
      .post(`/api/tasks/${taskId}/undo`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();

    expect(undoRes.status).toBe(200);
    expect(undoRes.body.entry).toBeDefined();
    expect(undoRes.body.entry.amount).toBe(-30);

    const balanceRes = await request(app)
      .get(`/api/children/${childId}/balance`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(balanceRes.body.balance).toBe(0);
  });

  it('should reject done task and not create ledger entry', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Homework', rewardMinutes: 30 });
    const taskId = createRes.body.id;

    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();

    const rejectRes = await request(app)
      .post(`/api/tasks/${taskId}/reject`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('rejected');

    const ledgerRes = await request(app)
      .get(`/api/children/${childId}/ledger`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(ledgerRes.body.entries).toHaveLength(0);
  });

  it('should return 409 for approve on pending task', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Homework', rewardMinutes: 30 });
    const taskId = createRes.body.id;

    const res = await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();
    expect(res.status).toBe(409);
  });
  it('should double-undo idempotently', async () => {
  const createRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId, title: 'Undo Test', rewardMinutes: 30 });
  const taskId = createRes.body.id;

  await request(app)
    .post(`/api/tasks/${taskId}/done`)
    .set('Authorization', `Bearer ${childToken}`)
    .send();
  await request(app)
    .post(`/api/tasks/${taskId}/approve`)
    .set('Authorization', `Bearer ${parentToken}`)
    .send();

  const firstUndo = await request(app)
    .post(`/api/tasks/${taskId}/undo`)
    .set('Authorization', `Bearer ${parentToken}`)
    .send();
  expect(firstUndo.status).toBe(200);
  expect(firstUndo.body.entry).toBeDefined();

  const secondUndo = await request(app)
    .post(`/api/tasks/${taskId}/undo`)
    .set('Authorization', `Bearer ${parentToken}`)
    .send();
  expect(secondUndo.status).toBe(200);
  expect(secondUndo.body.entry).toBeUndefined();

  const ledgerRes = await request(app)
    .get(`/api/children/${childId}/ledger`)
    .set('Authorization', `Bearer ${parentToken}`);
  const reversalEntries = ledgerRes.body.entries.filter((e: any) => e.type === 'REVERSAL_EARN');
  expect(reversalEntries).toHaveLength(1);
});
 it('should allow negative balance after undo when minutes already spent', async () => {
  // Create and approve 30 minutes
  const createRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId, title: 'Undo Negative', rewardMinutes: 30 });
  const taskId = createRes.body.id;
  await request(app).post(`/api/tasks/${taskId}/done`).set('Authorization', `Bearer ${childToken}`).send();
  await request(app).post(`/api/tasks/${taskId}/approve`).set('Authorization', `Bearer ${parentToken}`).send();

  // Spend 20 minutes
  const end = Date.now() - 1000;
  const start = end - 20 * 60000;
  await request(app)
    .post(`/api/children/${childId}/usage`)
    .set('Authorization', `Bearer ${childToken}`)
    .send({ sessions: [{ appId: 'game', start, end }] });

  // Undo approval
  const undoRes = await request(app)
    .post(`/api/tasks/${taskId}/undo`)
    .set('Authorization', `Bearer ${parentToken}`)
    .send();
  expect(undoRes.status).toBe(200);
  expect(undoRes.body.entry.amount).toBe(-30);

  const balanceRes = await request(app)
    .get(`/api/children/${childId}/balance`)
    .set('Authorization', `Bearer ${parentToken}`);
  expect(balanceRes.body.balance).toBe(-20);

  // Future usage should be blocked
  const newEnd = Date.now() - 500;
  const newStart = newEnd - 5 * 60000;
  const usageRes = await request(app)
    .post(`/api/children/${childId}/usage`)
    .set('Authorization', `Bearer ${childToken}`)
    .send({ sessions: [{ appId: 'blocked', start: newStart, end: newEnd }] });
  expect(usageRes.body.results[0].detail.coveredMinutes).toBe(0);
});

});