import request from 'supertest';
import app from '../../src/app';
import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';
import { createParent, createChild } from '../helpers/factories';

describe('Usage API', () => {
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

    // Give the child 30 minutes by creating and approving a task
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, title: 'Setup task', rewardMinutes: 30 });
    const taskId = createRes.body.id;
    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childToken}`)
      .send();
    await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send();
  });

  it('should process session and reduce balance', async () => {
    const end = Date.now() - 1000; // 1 second in past
    const start = end - 10 * 60000; // 10 minutes before end
    const res = await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessions: [{ appId: 'game', start, end }] });

    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe('processed');
    expect(res.body.results[0].detail.coveredMinutes).toBe(10);

    const balanceRes = await request(app)
      .get(`/api/children/${childId}/balance`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(balanceRes.body.balance).toBe(20);
  });

  it('should handle duplicate session', async () => {
    const end = Date.now() - 1000;
    const start = end - 5 * 60000;
    const payload = { sessions: [{ appId: 'app', start, end }] };

    await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send(payload);

    const second = await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send(payload);

    expect(second.body.results[0].status).toBe('duplicate');
  });

  it('should handle two sessions exceeding balance', async () => {
    const end = Date.now() - 1000;
    const start = end - 20 * 60000;
    const payload = {
      sessions: [
        { appId: 'app1', start, end },
        { appId: 'app2', start, end }
      ]
    };
    const res = await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send(payload);

    expect(res.body.results[0].status).toBe('processed');
    expect(res.body.results[0].detail.coveredMinutes).toBe(20);
    expect(res.body.results[1].status).toBe('processed');
    expect(res.body.results[1].detail.coveredMinutes).toBe(10);
    expect(res.body.results[1].detail.ranOutAt).toBeDefined();
  });

  it('should reject invalid sessions', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessions: [
        { appId: 'bad1', start: Date.now(), end: Date.now() },
        { appId: 'bad2', start: Date.now(), end: Date.now() - 1000 },
      ] });
    expect(res.body.results[0].status).toBe('invalid');
    expect(res.body.results[1].status).toBe('invalid');
  });

  it('should never make balance negative from spend', async () => {
    const end = Date.now() - 1000;
    const start = end - 50 * 60000;
    const res = await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessions: [{ appId: 'game', start, end }] });

    expect(res.body.results[0].detail.coveredMinutes).toBe(30);
    const balanceRes = await request(app)
      .get(`/api/children/${childId}/balance`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(balanceRes.body.balance).toBe(0);
  });

  it('should process late session against current balance', async () => {
    // Use the existing 30-minute balance (from beforeEach)
    // Simulate a session that started 1 hour ago and lasted 10 minutes
    const end = Date.now() - 60 * 60000; // 1 hour ago
    const start = end - 10 * 60000;
    const res = await request(app)
      .post(`/api/children/${childId}/usage`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessions: [{ appId: 'late-app', start, end }] });

    expect(res.body.results[0].status).toBe('processed');
    expect(res.body.results[0].detail.coveredMinutes).toBe(10);

    const balanceRes = await request(app)
      .get(`/api/children/${childId}/balance`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(balanceRes.body.balance).toBe(20); // 30 - 10 = 20
  });
});