import { v4 as uuidv4 } from 'uuid';
import db from '../../src/db/connection';

export function createParent(name = 'Parent') {
  const id = uuidv4();
  const token = uuidv4();
  db.prepare('INSERT INTO parents (id, token, name, created_at) VALUES (?, ?, ?, ?)').run(id, token, name, Date.now());
  return { id, token, name };
}

export function createChild(parentId: string, name = 'Child') {
  const id = uuidv4();
  const token = uuidv4();
  db.prepare('INSERT INTO children (id, parent_id, token, name, created_at) VALUES (?, ?, ?, ?, ?)').run(id, parentId, token, name, Date.now());
  return { id, parentId, token, name };
}