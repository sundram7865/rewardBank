# RewardBank — Writeup

## 1. Assumptions made and why
- **Device authenticates using the child's token.**  
  A device belongs to a child and reports usage on their behalf; using the child's token is the simplest secure model.
- **Task creation requires explicit `childId`.**  
  The parent must specify which child the task is for, avoiding ambiguity in multi‑child families.
- **Session duration cap = 24 hours.**  
  Anything longer is considered invalid device data (e.g., a device left on overnight).
- **Future timestamp skew tolerance = 5 minutes.**  
  Allows minor clock drift on devices while rejecting obvious future timestamps.
- **Processing order = arrival order, not event time.**  
  Mirrors real banking and avoids retroactive recomputation. A session reported late is applied against current balance.
- **Session duration rounded up to nearest minute (`ceil`).**  
  “Each minute of usage spends one minute” → a 10.5‑minute session spends 11 minutes.

## 2. Double‑click approve 200ms apart
Approve uses an atomic state transition:  
`UPDATE tasks SET status='approved' WHERE id=? AND status='done'`.  
Only one request gets `changes===1` and posts the ledger entry. The second request gets `changes===0` and returns the existing approved state without duplicate credit.  
**Proven by:** `tests/integration/concurrency.test.ts` → `should handle concurrent approvals on same task`.

## 3. Two sessions exceeding balance — entry by entry
Initial balance = 30 minutes.
- Session A (20 min): `SPEND -20`, `balance_after=10`
- Session B (20 min): `SPEND -10`, `balance_after=0`
- Session B `ran_out_at = start + 10 minutes`
**Proven by:** `tests/integration/api.usage.test.ts` → `should handle two sessions exceeding balance`.

## 4. Undo approval & negative balance
We allow balance to go negative. Clamping would break the exact‑inverse property and create a “spend fast before parent notices” incentive. Negative balance blocks future usage until earned back, same as zero.  
**Proven by:** `tests/integration/api.tasks.test.ts` → `should allow negative balance after undo when minutes already spent`.

## 5. Scaling to 100,000 children
First bottleneck: **single SQLite file = one global write lock serializing all children**.  
Fix: **shard by `childId`.** Use partitioned Postgres with row‑level locking, or event‑sourced log with Kafka partition key = `childId` and async per‑child balance projections. Our per‑child lock already maps to per‑partition ordering.

## 6. What was deliberately not built
- Partial‑session reversal (undoing a spend)
- Dispute/audit workflow for negative balances
- General idempotency‑key header (we rely on state machines and dedupe keys)
- Device push/webhook ingestion instead of poll/batch
- Rate limiting
- Session duration cap tuning based on real device telemetry