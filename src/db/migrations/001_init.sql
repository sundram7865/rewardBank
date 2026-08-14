CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id),
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  title TEXT NOT NULL,
  reward_minutes INTEGER NOT NULL CHECK (reward_minutes > 0),
  status TEXT NOT NULL CHECK (status IN ('pending','done','approved','rejected','undone')),
  created_at INTEGER NOT NULL,
  done_at INTEGER,
  approved_at INTEGER,
  rejected_at INTEGER,
  undone_at INTEGER
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  type TEXT NOT NULL CHECK (type IN ('EARN','SPEND','REVERSAL_EARN')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  UNIQUE (child_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS usage_sessions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  app_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  covered_minutes INTEGER,
  ran_out_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('processing','processed','duplicate','invalid')),
  reported_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_child_seq ON ledger_entries(child_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_ledger_child_created ON ledger_entries(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_child_status ON tasks(child_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_child_time ON usage_sessions(child_id, started_at, ended_at);