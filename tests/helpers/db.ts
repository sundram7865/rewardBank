import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';

export function setupTestDb() {
  runMigrations();
}

export function clearDb() {
  db.exec(`
    DELETE FROM ledger_entries;
    DELETE FROM usage_sessions;
    DELETE FROM tasks;
    DELETE FROM children;
    DELETE FROM parents;
  `);
}