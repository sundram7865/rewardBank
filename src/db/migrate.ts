import fs from 'fs';
import path from 'path';
import db from './connection';

const migrationsDir = path.join(__dirname, 'migrations');

export function runMigrations() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    console.log(`Applied migration: ${file}`);
  }
}

if (require.main === module) {
  runMigrations();
  console.log('Migrations complete');
}