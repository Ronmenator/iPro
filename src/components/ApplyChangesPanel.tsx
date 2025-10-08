import React, { useState } from 'react';
import { usePendingStore } from '../store/pendingStore';
import { useDocumentStore } from '../store/documentStore';
import { applyOps } from '../utils/operations';
import { DocEditBatch, EditOp } from '../types/ops';

export default function ApplyChangesPanel() {
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<string>('');

  const currentBatch = usePendingStore(state => state.getCurrentBatch());
  const clearBatch = usePendingStore(state => state.clearBatch);
  const updateDocument = useDocumentStore(state => state.updateDocument);
  const currentDoc = useDocumentStore(state => state.getCurrentDoc());

  if (!currentBatch) return null;

  const acceptedOps = currentBatch.operations.filter(op => op.status === 'accepted');

  const handleApplyAccepted = async () => {
    if (!currentDoc || acceptedOps.length === 0) return;

    setIsApplying(true);
    setResult('');

    try {
      const batch: DocEditBatch = {
        type: 'DocEditBatch',
        docId: currentDoc.id,
        baseVersion: currentBatch.baseVersion,
        ops: acceptedOps.map(op => op.op),
        simulate: false,
        notes: currentBatch.notes,
      };

      const applyResult = await applyOps(batch, currentDoc);

      if (applyResult.result.ok) {
        if (applyResult.newBlocks) {
          await updateDocument(currentDoc.id, applyResult.newBlocks);
          setResult(`✅ Applied ${acceptedOps.length} operation(s) successfully!`);
          
          // Clear batch after successful application
          setTimeout(() => {
            clearBatch(currentBatch.id);
          }, 2000);
        }
      } else {
        setResult(`❌ Apply failed: ${applyResult.result.code}`);
        const conflicts = applyResult.result.conflicts;
        if (conflicts) {
          setResult(prev => prev + `\nConflicts detected. Please review.`);
        }
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-96">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">Ready to Apply Changes</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {acceptedOps.length} operation(s) accepted
          </p>
        </div>
      </div>

      {result && (
        <div className={`mb-3 p-2 rounded text-xs ${
          result.startsWith('✅') 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {result}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleApplyAccepted}
          disabled={acceptedOps.length === 0 || isApplying}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? 'Applying...' : `Apply ${acceptedOps.length} Change(s)`}
        </button>
        <button
          onClick={() => clearBatch(currentBatch.id)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

