import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const PARENT_TOKEN = 'parent-token-1';
const CHILD_TOKEN = 'child-token-1';
const CHILD_ID = 'child-1';

const api = axios.create({ baseURL: BASE_URL });

async function getBalance() {
  const res = await api.get(`/children/${CHILD_ID}/balance`, {
    headers: { Authorization: `Bearer ${PARENT_TOKEN}` },
  });
  return res.data.balance;
}

async function main() {
  console.log('--- Normal Day Simulation ---\n');
  const printBalance = async (label: string) => {
    console.log(`${label}: balance = ${await getBalance()}`);
  };

  // Create tasks
  console.log('Creating 3 tasks...');
  const task1 = (await api.post('/tasks', {
    childId: CHILD_ID,
    title: 'Homework',
    rewardMinutes: 15,
  }, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } })).data;
  const task2 = (await api.post('/tasks', {
    childId: CHILD_ID,
    title: 'Chores',
    rewardMinutes: 30,
  }, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } })).data;
  const task3 = (await api.post('/tasks', {
    childId: CHILD_ID,
    title: 'Reading',
    rewardMinutes: 45,
  }, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } })).data;

  // Child marks all three done
  await api.post(`/tasks/${task1.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });
  await api.post(`/tasks/${task2.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });
  await api.post(`/tasks/${task3.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });

  // Parent approves two, rejects one
  await api.post(`/tasks/${task1.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } });
  await api.post(`/tasks/${task2.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } });
  await api.post(`/tasks/${task3.id}/reject`, {}, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } });
  await printBalance('After approvals (15+30)');

  // Usage sessions – both timestamps in the past
  const now = Date.now();
  // 25 min session fully in past: end = now - 1 min, start = end - 25 min
  let end = now - 60_000;
  let start = end - 25 * 60_000;
  await api.post(`/children/${CHILD_ID}/usage`, {
    sessions: [{ appId: 'game', start, end }],
  }, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });
  await printBalance('After 25 min session');

  // 30 min session, will be partially covered
  end = now - 60_000;
  start = end - 30 * 60_000;
  await api.post(`/children/${CHILD_ID}/usage`, {
    sessions: [{ appId: 'video', start, end }],
  }, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });
  await printBalance('After 30 min session (partial)');

  // Evening task
  const task4 = (await api.post('/tasks', {
    childId: CHILD_ID,
    title: 'Evening reading',
    rewardMinutes: 30,
  }, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } })).data;
  await api.post(`/tasks/${task4.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });
  await api.post(`/tasks/${task4.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_TOKEN}` } });
  await printBalance('After evening approval');

  // 15 min session in past
  end = now - 60_000;
  start = end - 15 * 60_000;
  await api.post(`/children/${CHILD_ID}/usage`, {
    sessions: [{ appId: 'game', start, end }],
  }, { headers: { Authorization: `Bearer ${CHILD_TOKEN}` } });
  await printBalance('Final balance');
}

main().catch(console.error);