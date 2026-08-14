import db from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrate';

beforeAll(() => {
  runMigrations();
});

afterAll(() => {
  db.close();
});