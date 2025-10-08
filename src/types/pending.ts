import { EditOp, DiffBlock } from './ops';

/**
 * Pending operation tracking for accept/reject workflow
 */

export interface PendingOperation {
  id: string;
  op: EditOp;
  diff: DiffBlock;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface PendingBatch {
  id: string;
  docId: string;
  baseVersion: string;
  operations: PendingOperation[];
  notes?: string;
  timestamp: number;
}

