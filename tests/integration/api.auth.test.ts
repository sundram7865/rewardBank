import request from 'supertest';
import app from '../../src/app';
import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';
import { createParent, createChild } from '../helpers/factories';

interface TestUser {
  id: string;
  token: string;
  name: string;
}

interface TestChild {
  id: string;
  parentId: string;
  token: string;
  name: string;
}

describe('Auth', () => {
  let parentA: TestUser;
  let childA: TestChild;
  let parentB: TestUser;
  let childB: TestChild;

  beforeAll(() => runMigrations());

  beforeEach(() => {
    db.exec('DELETE FROM ledger_entries; DELETE FROM usage_sessions; DELETE FROM tasks; DELETE FROM children; DELETE FROM parents;');
    parentA = createParent('ParentA') as TestUser;
    childA = createChild(parentA.id, 'ChildA') as TestChild;
    parentB = createParent('ParentB') as TestUser;
    childB = createChild(parentB.id, 'ChildB') as TestChild;
  });

  it('parent A cannot approve child B task', async () => {
    // create task for child B by parent B
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentB.token}`)
      .send({ childId: childB.id, title: 'Task', rewardMinutes: 30 });
    const taskId = createRes.body.id;

    // child B marks done
    await request(app)
      .post(`/api/tasks/${taskId}/done`)
      .set('Authorization', `Bearer ${childB.token}`)
      .send();

    // parent A tries to approve
    const res = await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send();
    expect(res.status).toBe(403);
  });

  it('child A cannot access child B balance', async () => {
    const res = await request(app)
      .get(`/api/children/${childB.id}/balance`)
      .set('Authorization', `Bearer ${childA.token}`);
    expect(res.status).toBe(403);
  });
});