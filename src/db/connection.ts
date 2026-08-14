import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './rewardbank.db';
const db: Database.Database = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;