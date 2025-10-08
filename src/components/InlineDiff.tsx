import React from 'react';
import { PendingOperation } from '../types/pending';
import { usePendingStore } from '../store/pendingStore';

interface InlineDiffProps {
  batchId: string;
}

export default function InlineDiff({ batchId }: InlineDiffProps) {
  const batch = usePendingStore(state => state.batches.get(batchId));
  const acceptOperation = usePendingStore(state => state.acceptOperation);
  const rejectOperation = usePendingStore(state => state.rejectOperation);
  const acceptAll = usePendingStore(state => state.acceptAll);
  const rejectAll = usePendingStore(state => state.rejectAll);
  const clearBatch = usePendingStore(state => state.clearBatch);

  if (!batch) return null;

  const pendingCount = batch.operations.filter(op => op.status === 'pending').length;
  const acceptedCount = batch.operations.filter(op => op.status === 'accepted').length;
  const rejectedCount = batch.operations.filter(op => op.status === 'rejected').length;

  const handleAccept = (opId: string) => {
    acceptOperation(batchId, opId);
  };

  const handleReject = (opId: string) => {
    rejectOperation(batchId, opId);
  };

  const handleAcceptAll = () => {
    acceptAll(batchId);
  };

  const handleRejectAll = () => {
    rejectAll(batchId);
  };

  const handleClose = () => {
    clearBatch(batchId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">Review Changes</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {pendingCount} pending · {acceptedCount} accepted · {rejectedCount} rejected
            </p>
            {batch.notes && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 italic">
                "{batch.notes}"
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close review panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Operations List */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {batch.operations.map((operation) => (
            <OperationCard
              key={operation.id}
              operation={operation}
              onAccept={() => handleAccept(operation.id)}
              onReject={() => handleReject(operation.id)}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleAcceptAll}
              disabled={pendingCount === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept All ({pendingCount})
            </button>
            <button
              onClick={handleRejectAll}
              disabled={pendingCount === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject All
            </button>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface OperationCardProps {
  operation: PendingOperation;
  onAccept: () => void;
  onReject: () => void;
}

function OperationCard({ operation, onAccept, onReject }: OperationCardProps) {
  const { diff, status, op } = operation;

  const statusColor = 
    status === 'accepted' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
    status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
    diff.type === 'modified' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
    diff.type === 'inserted' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
    diff.type === 'deleted' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
    diff.type === 'moved' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' :
    'bg-gray-50 dark:bg-gray-900/20 border-gray-500';

  return (
    <div className={`rounded-lg border-l-4 p-4 ${statusColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`
            text-xs font-semibold uppercase px-2 py-1 rounded
            ${diff.type === 'modified' ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100' : ''}
            ${diff.type === 'inserted' ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100' : ''}
            ${diff.type === 'deleted' ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' : ''}
            ${diff.type === 'moved' ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : ''}
            ${diff.type === 'unchanged' ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : ''}
          `}>
            {diff.type}
          </span>
          <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">
            {diff.blockId.slice(0, 20)}...
          </code>
          {status !== 'pending' && (
            <span className={`
              text-xs font-semibold px-2 py-1 rounded
              ${status === 'accepted' ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100' : ''}
              ${status === 'rejected' ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' : ''}
            `}>
              {status.toUpperCase()}
            </span>
          )}
        </div>
        {status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={onReject}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              title="Reject this change"
            >
              ✕ Reject
            </button>
            <button
              onClick={onAccept}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              title="Accept this change"
            >
              ✓ Accept
            </button>
          </div>
        )}
      </div>

      {/* Operation Details */}
      <div className="text-xs text-gray-700 dark:text-gray-300 mb-2">
        <strong>Operation:</strong> {op.op}
        {op.op === 'replace' && ' (range: ' + (op as any).range.start + '-' + (op as any).range.end + ')'}
      </div>

      {/* Annotation */}
      {diff.annotation && (
        <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">Note: </span>
          <span className="text-sm text-blue-800 dark:text-blue-200">{diff.annotation}</span>
        </div>
      )}

      {/* Diff Content */}
      <div className="space-y-2">
        {diff.oldText && (
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Before:
            </div>
            <div className="text-sm bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
              <span className="line-through text-red-600 dark:text-red-400">
                {diff.oldText}
              </span>
            </div>
          </div>
        )}

        {diff.newText && (
          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              After:
            </div>
            <div className="text-sm bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-green-700 dark:text-green-300">
                {diff.newText}
              </span>
            </div>
          </div>
        )}

        {diff.type === 'moved' && (
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Block will be moved to a new position
          </div>
        )}
      </div>
    </div>
  );
}

