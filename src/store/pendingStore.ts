import { create } from 'zustand';
import { PendingBatch, PendingOperation } from '../types/pending';

interface PendingStore {
  batches: Map<string, PendingBatch>;
  currentBatchId: string | null;
  
  // Actions
  addBatch: (batch: PendingBatch) => void;
  setCurrentBatch: (batchId: string | null) => void;
  getCurrentBatch: () => PendingBatch | null;
  acceptOperation: (batchId: string, opId: string) => void;
  rejectOperation: (batchId: string, opId: string) => void;
  acceptAll: (batchId: string) => void;
  rejectAll: (batchId: string) => void;
  clearBatch: (batchId: string) => void;
  getPendingOperations: (batchId: string) => PendingOperation[];
}

export const usePendingStore = create<PendingStore>((set, get) => ({
  batches: new Map(),
  currentBatchId: null,

  addBatch: (batch) => {
    const { batches } = get();
    batches.set(batch.id, batch);
    set({ batches: new Map(batches), currentBatchId: batch.id });
  },

  setCurrentBatch: (batchId) => {
    set({ currentBatchId: batchId });
  },

  getCurrentBatch: () => {
    const { batches, currentBatchId } = get();
    if (!currentBatchId) return null;
    return batches.get(currentBatchId) || null;
  },

  acceptOperation: (batchId, opId) => {
    const { batches } = get();
    const batch = batches.get(batchId);
    if (!batch) return;

    const updatedOps = batch.operations.map(op =>
      op.id === opId ? { ...op, status: 'accepted' as const } : op
    );

    batches.set(batchId, { ...batch, operations: updatedOps });
    set({ batches: new Map(batches) });
  },

  rejectOperation: (batchId, opId) => {
    const { batches } = get();
    const batch = batches.get(batchId);
    if (!batch) return;

    const updatedOps = batch.operations.map(op =>
      op.id === opId ? { ...op, status: 'rejected' as const } : op
    );

    batches.set(batchId, { ...batch, operations: updatedOps });
    set({ batches: new Map(batches) });
  },

  acceptAll: (batchId) => {
    const { batches } = get();
    const batch = batches.get(batchId);
    if (!batch) return;

    const updatedOps = batch.operations.map(op => ({ ...op, status: 'accepted' as const }));
    batches.set(batchId, { ...batch, operations: updatedOps });
    set({ batches: new Map(batches) });
  },

  rejectAll: (batchId) => {
    const { batches } = get();
    const batch = batches.get(batchId);
    if (!batch) return;

    const updatedOps = batch.operations.map(op => ({ ...op, status: 'rejected' as const }));
    batches.set(batchId, { ...batch, operations: updatedOps });
    set({ batches: new Map(batches) });
  },

  clearBatch: (batchId) => {
    const { batches } = get();
    batches.delete(batchId);
    set({ 
      batches: new Map(batches),
      currentBatchId: get().currentBatchId === batchId ? null : get().currentBatchId
    });
  },

  getPendingOperations: (batchId) => {
    const batch = get().batches.get(batchId);
    if (!batch) return [];
    return batch.operations.filter(op => op.status === 'pending');
  },
}));

