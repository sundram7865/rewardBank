export type LedgerEntryType = 'EARN' | 'SPEND' | 'REVERSAL_EARN';
export type TaskStatus = 'pending' | 'done' | 'approved' | 'rejected' | 'undone';
export type SessionStatus = 'processing' | 'processed' | 'duplicate' | 'invalid';

export interface Parent {
  id: string;
  token: string;
  name: string;
  created_at: number;
}

export interface Child {
  id: string;
  parent_id: string;
  token: string;
  name: string;
  created_at: number;
}

export interface Task {
  id: string;
  child_id: string;
  title: string;
  reward_minutes: number;
  status: TaskStatus;
  created_at: number;
  done_at: number | null;
  approved_at: number | null;
  rejected_at: number | null;
  undone_at: number | null;
}

export interface LedgerEntry {
  id: string;
  child_id: string;
  type: LedgerEntryType;
  amount: number;
  balance_after: number;
  ref_type: string;
  ref_id: string;
  created_at: number;
  sequence_number: number;
}

export interface UsageSession {
  id: string;
  child_id: string;
  app_id: string;
  started_at: number;
  ended_at: number;
  dedupe_key: string;
  covered_minutes: number | null;
  ran_out_at: number | null;
  status: SessionStatus;
  reported_at: number;
}