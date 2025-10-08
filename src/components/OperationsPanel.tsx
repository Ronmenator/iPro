import React, { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { usePendingStore } from '../store/pendingStore';
import { useOutlineStore } from '../store/outlineStore';
import { DocEditBatch, EditOp, DiffBlock } from '../types/ops';
import { simulateOps, applyOps } from '../utils/operations';
import { PendingBatch, PendingOperation } from '../types/pending';
import { DeleteGuardResult } from '../types/outline';
import DiffViewer from './DiffViewer';
import InlineDiff from './InlineDiff';
import DeleteGuardDialog from './DeleteGuardDialog';

export default function OperationsPanel({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [selectedOp, setSelectedOp] = useState<string>('replace');
  const [blockId, setBlockId] = useState('');
  const [text, setText] = useState('');
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [afterBlockId, setAfterBlockId] = useState('');
  const [note, setNote] = useState('');
  const [useExpectHash, setUseExpectHash] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  const [diff, setDiff] = useState<DiffBlock[]>([]);
  const [result, setResult] = useState<string>('');
  const [showInlineDiff, setShowInlineDiff] = useState(false);
  const [currentPendingBatchId, setCurrentPendingBatchId] = useState<string | null>(null);
  const [deleteGuard, setDeleteGuard] = useState<DeleteGuardResult | null>(null);
  const [pendingDeleteOp, setPendingDeleteOp] = useState<EditOp | null>(null);

  const currentDoc = useDocumentStore(state => state.getCurrentDoc());
  const updateDocument = useDocumentStore(state => state.updateDocument);
  const addBatch = usePendingStore(state => state.addBatch);
  const currentBatch = usePendingStore(state => state.getCurrentBatch());
  const checkDeleteGuard = useOutlineStore(state => state.checkDeleteGuard);

  if (!isOpen) {
    return null;
  }

  if (!currentDoc) {
    return (
      <div className="fixed bottom-20 right-4 z-40 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Operations Panel</h3>
          <button onClick={onToggle} className="text-gray-500" aria-label="Close operations panel">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500">Please select a scene or chapter first.</p>
      </div>
    );
  }

  const handleSimulate = async () => {
    try {
      const op = buildOperation();
      if (!op) return;

      // Check delete guard for deleteBlock operations
      if (op.op === 'deleteBlock' && currentDoc) {
        const guard = checkDeleteGuard(currentDoc.id, op.blockId);
        if (!guard.allowed) {
          setDeleteGuard(guard);
          setPendingDeleteOp(op);
          return;
        }
      }

      const batch: DocEditBatch = {
        type: 'DocEditBatch',
        docId: currentDoc.id,
        baseVersion: currentDoc.baseVersion,
        ops: [op],
        simulate: true,
        notes: 'Manual operation test',
      };

      const simResult = await simulateOps(batch, currentDoc);
      
      if (simResult.ok) {
        // Create pending batch for review
        const pendingBatch: PendingBatch = {
          id: `batch_${Date.now()}`,
          docId: currentDoc.id,
          baseVersion: currentDoc.baseVersion,
          operations: simResult.diff.map((diff, index) => ({
            id: `op_${Date.now()}_${index}`,
            op,
            diff,
            status: 'pending' as const,
            timestamp: Date.now(),
          })),
          notes: 'Manual operation test',
          timestamp: Date.now(),
        };

        addBatch(pendingBatch);
        setCurrentPendingBatchId(pendingBatch.id);
        setShowInlineDiff(true);
        setResult(`✅ Simulation successful. Review ${simResult.diff.length} change(s).`);
      } else {
        setResult(`❌ Simulation failed: ${simResult.code}`);
        if (simResult.conflicts) {
          setResult(prev => prev + `\nConflicts: ${JSON.stringify(simResult.conflicts, null, 2)}`);
        }
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
  };

  const handleApply = async () => {
    try {
      const op = buildOperation();
      if (!op) return;

      const batch: DocEditBatch = {
        type: 'DocEditBatch',
        docId: currentDoc.id,
        baseVersion: currentDoc.baseVersion,
        ops: [op],
        simulate: false,
        notes: 'Manual operation application',
      };

      const applyResult = await applyOps(batch, currentDoc);
      
      if (applyResult.result.ok) {
        if (applyResult.newBlocks) {
          await updateDocument(currentDoc.id, applyResult.newBlocks);
          setResult(`✅ Applied successfully! New version: ${applyResult.result.newVersion.slice(0, 12)}...`);
        }
      } else {
        setResult(`❌ Apply failed: ${applyResult.result.code}`);
        const conflicts = applyResult.result.conflicts;
        if (conflicts) {
          setResult(prev => prev + `\nConflicts: ${JSON.stringify(conflicts, null, 2)}`);
        }
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    }
  };

  const buildOperation = (): EditOp | null => {
    const block = currentDoc.blocks.find(b => b.id === blockId);
    const expectHash = useExpectHash && block ? block.hash : undefined;

    switch (selectedOp) {
      case 'replace':
        return {
          op: 'replace',
          blockId,
          range: { start: rangeStart, end: rangeEnd },
          expectHash,
          text,
        };
      case 'replaceBlock':
        return {
          op: 'replaceBlock',
          blockId,
          expectHash,
          text,
        };
      case 'insertAfter':
        return {
          op: 'insertAfter',
          blockId,
          text,
        };
      case 'deleteBlock':
        return {
          op: 'deleteBlock',
          blockId,
        };
      case 'moveBlock':
        return {
          op: 'moveBlock',
          blockId,
          afterBlockId,
        };
      case 'annotate':
        return {
          op: 'annotate',
          blockId,
          note,
        };
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Operations Panel
          </h3>
          <button onClick={onToggle} className="text-gray-500" aria-label="Close operations panel">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Operation Type</label>
            <select
              value={selectedOp}
              onChange={(e) => setSelectedOp(e.target.value)}
              className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              aria-label="Select operation type"
            >
              <option value="replace">Replace Text Range</option>
              <option value="replaceBlock">Replace Entire Block</option>
              <option value="insertAfter">Insert After Block</option>
              <option value="deleteBlock">Delete Block</option>
              <option value="moveBlock">Move Block</option>
              <option value="annotate">Annotate Block</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Block ID</label>
            <select
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              className="w-full mt-1 px-2 py-1 text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              aria-label="Select block"
            >
              <option value="">Select a block...</option>
              {currentDoc.blocks.map((block, idx) => (
                <option key={block.id} value={block.id}>
                  #{idx + 1} - {block.id} - {block.text.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          {selectedOp === 'replace' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Start</label>
                  <input
                    type="number"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(parseInt(e.target.value))}
                    className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    aria-label="Range start"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">End</label>
                  <input
                    type="number"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(parseInt(e.target.value))}
                    className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    aria-label="Range end"
                  />
                </div>
              </div>
            </>
          )}

          {(selectedOp === 'replace' || selectedOp === 'replaceBlock' || selectedOp === 'insertAfter') && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">New Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                rows={3}
                aria-label="New text"
              />
            </div>
          )}

          {selectedOp === 'moveBlock' && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">After Block ID</label>
              <select
                value={afterBlockId}
                onChange={(e) => setAfterBlockId(e.target.value)}
                className="w-full mt-1 px-2 py-1 text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                aria-label="Target block for move operation"
              >
                <option value="">Select target...</option>
                {currentDoc.blocks.map((block, idx) => (
                  <option key={block.id} value={block.id}>
                    #{idx + 1} - {block.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedOp === 'annotate' && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Annotation Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                rows={2}
                aria-label="Annotation note"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="expectHash"
              checked={useExpectHash}
              onChange={(e) => setUseExpectHash(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="expectHash" className="text-xs text-gray-600 dark:text-gray-400">
              Use expectHash (conflict detection)
            </label>
          </div>

          {result && (
            <div className={`p-2 rounded text-xs font-mono whitespace-pre-wrap ${
              result.startsWith('✅') 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {result}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={handleSimulate}
            disabled={!blockId}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simulate
          </button>
          <button
            onClick={handleApply}
            disabled={!blockId}
            className="flex-1 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>

      {showDiff && (
        <DiffViewer diff={diff} onClose={() => setShowDiff(false)} />
      )}

      {showInlineDiff && currentPendingBatchId && (
        <InlineDiff batchId={currentPendingBatchId} />
      )}

      {deleteGuard && !deleteGuard.allowed && (
        <DeleteGuardDialog
          guard={deleteGuard}
          onConfirm={async () => {
            // User confirmed, proceed with delete
            if (pendingDeleteOp && currentDoc) {
              const batch: DocEditBatch = {
                type: 'DocEditBatch',
                docId: currentDoc.id,
                baseVersion: currentDoc.baseVersion,
                ops: [pendingDeleteOp],
                simulate: true,
                notes: 'Manual operation test (guard overridden)',
              };

              const simResult = await simulateOps(batch, currentDoc);
              
              if (simResult.ok) {
                const pendingBatch: PendingBatch = {
                  id: `batch_${Date.now()}`,
                  docId: currentDoc.id,
                  baseVersion: currentDoc.baseVersion,
                  operations: simResult.diff.map((diff, index) => ({
                    id: `op_${Date.now()}_${index}`,
                    op: pendingDeleteOp,
                    diff,
                    status: 'pending' as const,
                    timestamp: Date.now(),
                  })),
                  notes: 'Manual operation test (guard overridden)',
                  timestamp: Date.now(),
                };

                addBatch(pendingBatch);
                setCurrentPendingBatchId(pendingBatch.id);
                setShowInlineDiff(true);
                setResult(`✅ Simulation successful (guard overridden). Review ${simResult.diff.length} change(s).`);
              }
            }
            setDeleteGuard(null);
            setPendingDeleteOp(null);
          }}
          onCancel={() => {
            setDeleteGuard(null);
            setPendingDeleteOp(null);
            setResult('❌ Delete cancelled by user');
          }}
        />
      )}
    </>
  );
}

