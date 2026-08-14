import db from '../src/db/connection';
import { runMigrations } from '../src/db/migrate';

runMigrations();

// Clear all tables in correct order
db.exec(`
  DELETE FROM ledger_entries;
  DELETE FROM usage_sessions;
  DELETE FROM tasks;
  DELETE FROM children;
  DELETE FROM parents;
`);

// Family A
db.prepare('INSERT OR REPLACE INTO parents (id, token, name, created_at) VALUES (?, ?, ?, ?)')
  .run('parent-1', 'parent-token-1', 'Parent One', Date.now());
db.prepare('INSERT OR REPLACE INTO children (id, parent_id, token, name, created_at) VALUES (?, ?, ?, ?, ?)')
  .run('child-1', 'parent-1', 'child-token-1', 'Child One', Date.now());

// Family B
db.prepare('INSERT OR REPLACE INTO parents (id, token, name, created_at) VALUES (?, ?, ?, ?)')
  .run('parent-2', 'parent-token-2', 'Parent Two', Date.now());
db.prepare('INSERT OR REPLACE INTO children (id, parent_id, token, name, created_at) VALUES (?, ?, ?, ?, ?)')
  .run('child-2', 'parent-2', 'child-token-2', 'Child Two', Date.now());

console.log('Cleared all data and seeded families A and B.');
console.log('Parent A token: parent-token-1, Child A token: child-token-1');
console.log('Parent B token: parent-token-2, Child B token: child-token-2');
process.exit(0);