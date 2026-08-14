import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const PARENT_A_TOKEN = 'parent-token-1';
const PARENT_B_TOKEN = 'parent-token-2';
const CHILD_A_TOKEN = 'child-token-1';
const CHILD_A_ID = 'child-1';

const api = axios.create({ baseURL: BASE_URL });

async function getBalance() {
  const res = await api.get(`/children/${CHILD_A_ID}/balance`, {
    headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` },
  });
  return res.data.balance;
}

async function main() {
  console.log('--- Chaos Day Simulation ---\n');
  const printBalance = async (label: string) => {
    console.log(`${label}: balance = ${await getBalance()}`);
  };

  const now = Date.now();

  // 1. Double-click approve 200ms apart
  console.log('1. Double-click approve 200ms apart');
  const task1 = (await api.post('/tasks', {
    childId: CHILD_A_ID,
    title: 'Test task',
    rewardMinutes: 30,
  }, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } })).data;
  await api.post(`/tasks/${task1.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  await api.post(`/tasks/${task1.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } });
  await new Promise(res => setTimeout(res, 200));
  const res1 = await api.post(`/tasks/${task1.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } });
  console.log(`   Second approve status: ${res1.status}, entry? ${!!res1.data.entry}`);
  await printBalance('   Balance');

  // 2. Concurrent double-click approve
  console.log('\n2. Concurrent double-click approve');
  const task2 = (await api.post('/tasks', {
    childId: CHILD_A_ID,
    title: 'Concurrent task',
    rewardMinutes: 20,
  }, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } })).data;
  await api.post(`/tasks/${task2.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  const responses = await Promise.all([
    api.post(`/tasks/${task2.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } }),
    api.post(`/tasks/${task2.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } }),
    api.post(`/tasks/${task2.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } }),
  ]);
  console.log(`   Approvals with entry: ${responses.filter(r => r.data.entry).length}`);
  await printBalance('   Balance');

  // 3. Same session reported 3 times sequentially (all past)
  console.log('\n3. Same session reported 3 times sequentially');
  const sEnd = now - 60_000;               // 1 min ago
  const sStart = sEnd - 10 * 60_000;       // 10 min before end
  const sessionPayload = { sessions: [{ appId: 'game', start: sStart, end: sEnd }] };
  for (let i = 0; i < 3; i++) {
    const r = await api.post(`/children/${CHILD_A_ID}/usage`, sessionPayload, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
    console.log(`   Report ${i+1} status: ${r.data.results[0].status}`);
  }
  await printBalance('   After triple duplicate');

  // 4. Same session twice concurrently (all past)
  console.log('\n4. Same session twice concurrently');
  const cEnd = now - 60_000;
  const cStart = cEnd - 5 * 60_000;
  const cPayload = { sessions: [{ appId: 'youtube', start: cStart, end: cEnd }] };
  const cRes = await Promise.all([
    api.post(`/children/${CHILD_A_ID}/usage`, cPayload, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } }),
    api.post(`/children/${CHILD_A_ID}/usage`, cPayload, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } }),
  ]);
  console.log(`   Statuses: ${cRes.map(r => r.data.results[0].status).join(', ')}`);
  await printBalance('   Balance');

  // 5. Late session (1 hour ago)
  console.log('\n5. Late session from 1 hour ago');
  const lateEnd = now - 60 * 60_000;
  const lateStart = lateEnd - 15 * 60_000;
  await api.post(`/children/${CHILD_A_ID}/usage`, {
    sessions: [{ appId: 'tiktok', start: lateStart, end: lateEnd }],
  }, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  await printBalance('   After late session');

  // 6. Two sessions exceeding balance
  console.log('\n6. Two sessions exceeding balance');
  const batchEnd = now - 60_000;
  const batchStart = batchEnd - 20 * 60_000;
  await api.post(`/children/${CHILD_A_ID}/usage`, {
    sessions: [
      { appId: 'app1', start: batchStart, end: batchEnd },
      { appId: 'app2', start: batchStart, end: batchEnd },
    ],
  }, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  await printBalance('   After two sessions');

  // 7. Undo approval after spending more than previous balance to force negative
  console.log('\n7. Undo approval after large spend');
  const task3 = (await api.post('/tasks', {
    childId: CHILD_A_ID,
    title: 'Undo test',
    rewardMinutes: 40,
  }, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } })).data;
  await api.post(`/tasks/${task3.id}/done`, {}, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  await api.post(`/tasks/${task3.id}/approve`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } });
  await printBalance('   After approve for undo');

  // Spend 50 minutes (more than previous balance of 45) -> balance becomes 0
  const spendEnd = now - 60_000;
  const spendStart = spendEnd - 50 * 60_000;
  const spendRes = await api.post(`/children/${CHILD_A_ID}/usage`, {
    sessions: [{ appId: 'game', start: spendStart, end: spendEnd }],
  }, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  console.log(`   Spend 50 min covered: ${spendRes.data.results[0].detail.coveredMinutes}`);
  await printBalance('   After spending 50 min');

  await api.post(`/tasks/${task3.id}/undo`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } });
  await printBalance('   After undo (should be negative)');

  // 8. Double undo
  console.log('\n8. Double undo');
  await api.post(`/tasks/${task3.id}/undo`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } });
  await printBalance('   After second undo (no change)');

  // 9. Parent B tries to access child A
  console.log('\n9. Parent B tries to access child A');
  try {
    await api.post('/tasks', {
      childId: CHILD_A_ID,
      title: 'Unauthorized',
      rewardMinutes: 10,
    }, { headers: { Authorization: `Bearer ${PARENT_B_TOKEN}` } });
    console.log('   Should have thrown 403');
  } catch (err: any) {
    console.log(`   Status: ${err.response.status}`);
  }

  // 10. Invalid sessions
  console.log('\n10. Invalid sessions');
  await api.post(`/children/${CHILD_A_ID}/usage`, {
    sessions: [
      { appId: 'bad1', start: now, end: now },
      { appId: 'bad2', start: now, end: now - 1000 },
    ],
  }, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });

  // 11. Reject already-approved task
  console.log('\n11. Reject already-approved task');
  try {
    await api.post(`/tasks/${task1.id}/reject`, {}, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } });
  } catch (err: any) {
    console.log(`   Status: ${err.response.status}`);
  }

  // 12. Batch with one valid, one duplicate, one invalid
  console.log('\n12. Batch mixed');
  const validEnd = now - 60_000;
  const validStart = validEnd - 5 * 60_000;
  const dupSession = { appId: 'mixed', start: validStart, end: validEnd };
  await api.post(`/children/${CHILD_A_ID}/usage`, { sessions: [dupSession] }, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  const batchRes = await api.post(`/children/${CHILD_A_ID}/usage`, {
    sessions: [
      { appId: 'mixed2', start: validStart, end: validEnd },
      dupSession,
      { appId: 'invalid', start: now, end: now },
    ],
  }, { headers: { Authorization: `Bearer ${CHILD_A_TOKEN}` } });
  console.log('   Batch results:', JSON.stringify(batchRes.data, null, 2));

  console.log('\n--- Final Ledger ---');
  const ledger = (await api.get(`/children/${CHILD_A_ID}/ledger`, { headers: { Authorization: `Bearer ${PARENT_A_TOKEN}` } })).data.entries;
  console.log(JSON.stringify(ledger, null, 2));
}

main().catch(console.error);