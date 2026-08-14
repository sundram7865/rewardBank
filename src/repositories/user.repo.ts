import db from '../db/connection';
import { Parent, Child } from '../types/domain';

export function findParentByToken(token: string): Parent | undefined {
  return db.prepare('SELECT * FROM parents WHERE token = ?').get(token) as Parent | undefined;
}

export function findChildByToken(token: string): Child | undefined {
  return db.prepare('SELECT * FROM children WHERE token = ?').get(token) as Child | undefined;
}

export function findChildById(id: string): Child | undefined {
  return db.prepare('SELECT * FROM children WHERE id = ?').get(id) as Child | undefined;
}

export function findParentById(id: string): Parent | undefined {
  return db.prepare('SELECT * FROM parents WHERE id = ?').get(id) as Parent | undefined;
}