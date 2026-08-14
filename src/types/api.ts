import { Request } from 'express';
import { Parent, Child } from './domain';

export interface AuthUser {
  id: string;
  role: 'parent' | 'child';
  parentId?: string; // for child, their parent's id
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}