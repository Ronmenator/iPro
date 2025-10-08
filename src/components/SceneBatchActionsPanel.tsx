import React, { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { orchestrateSceneEdit, orchestrateSceneEditProgressive } from '../lib/orchestrator';
import { createToolSurface } from '../ai/toolSurface';
import { getLLMClient } from '../ai/providers';
import { Intent } from '../lib/retrieval';
import { DocEditBatch } from '../types/ops';

interface SceneBatchActionsPanelProps {
  currentDocId: string | null;
}

export default function SceneBatchActionsPanel({ currentDocId }: SceneBatchActionsPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [diffHtml, setDiffHtml] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState<DocEditBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [selectedIntent, setSelectedIntent] = useState<Intent>('reduce-adverbs');
  const [customInstruction, setCustomInstruction] = useState('');
  const [maxBlocks, setMaxBlocks] = useState(5);

  const toolSurface = createToolSurface();
  const isScene = currentDocId?.startsWith('scene/');

  const handleBatchAction = async (intent: Intent) => {
    if (!currentDocId || !isScene) {
      setError('Please open a scene document');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDiffHtml(null);
    setCurrentBatch(null);
    setStats(null);
    setProgress(null);

    try {
      const llm = getLLMClient();
      if (!llm) {
        throw new Error('AI is not configured. Please configure in settings.');
      }

      // Use progressive orchestration
      const generator = orchestrateSceneEditProgressive(llm, {
        sceneId: currentDocId,
        intent,
        instruction: intent === 'custom' ? customInstruction : undefined,
        maxBlocks,
      });

      for await (const update of generator) {
        if (update.type === 'progress') {
          setProgress({
            current: update.current!,
            total: update.total!,
          });
        } else if (update.type === 'complete') {
          const result = update.result!;
          
          // Simulate to get diff
          const preview = await toolSurface.simulateOps({
            ...result.batch,
            simulate: true,
          });

          setDiffHtml(preview.diffHtml);
          setCurrentBatch(result.batch);
          setStats(result.stats);
          setProgress(null);
        }
      }
    } catch (err: any) {
      console.error('Batch action failed:', err);
      setError(err.message || 'Failed to process batch action');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleApply = async () => {
    if (!currentBatch) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await toolSurface.applyOps(currentBatch);
      
      if (!result.ok) {
        throw new Error(`Failed to apply changes: ${result.code}`);
      }

      setDiffHtml(null);
      setCurrentBatch(null);
      setStats(null);
      
      window.location.reload();
    } catch (err: any) {
      console.error('Apply failed:', err);
      setError(err.message || 'Failed to apply changes');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    setDiffHtml(null);
    setCurrentBatch(null);
    setStats(null);
    setError(null);
  };

  if (!isScene) {
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold">Scene Batch Actions</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3">
          Open a scene to use batch actions
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Scene Batch Actions</h3>
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-3">
          {error}
        </div>
      )}

      {/* Configuration */}
      {!diffHtml && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Configure Batch Action
          </div>

          {/* Intent Selection */}
          <div>
            <label htmlFor="batch-intent" className="block text-sm font-medium mb-1">Action Type</label>
            <select
              id="batch-intent"
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value as Intent)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={isProcessing}
            >
              <option value="reduce-adverbs">Reduce Adverbs</option>
              <option value="fix-passive">Fix Passive Voice</option>
              <option value="tighten">Tighten Prose</option>
              <option value="expand">Expand Descriptions</option>
              <option value="simplify">Simplify Language</option>
              <option value="fix-grammar">Fix Grammar</option>
              <option value="custom">Custom Instruction</option>
            </select>
          </div>

          {/* Custom Instruction */}
          {selectedIntent === 'custom' && (
            <div>
              <label htmlFor="custom-instruction" className="block text-sm font-medium mb-1">Custom Instruction</label>
              <textarea
                id="custom-instruction"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Enter your instruction..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded resize-none bg-white dark:bg-gray-800"
                rows={3}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Max Blocks */}
          <div>
            <label htmlFor="max-blocks" className="block text-sm font-medium mb-1">
              Max Blocks to Process
            </label>
            <input
              id="max-blocks"
              type="number"
              min={1}
              max={20}
              value={maxBlocks}
              onChange={(e) => setMaxBlocks(parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Higher values use more AI tokens but process more content
            </p>
          </div>

          {/* Execute Button */}
          <button
            onClick={() => handleBatchAction(selectedIntent)}
            disabled={isProcessing || (selectedIntent === 'custom' && !customInstruction.trim())}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
          >
            {isProcessing ? 'Processing...' : 'Process Scene'}
          </button>

          {/* Processing Progress */}
          {progress && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Processing blocks...</span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs">
            <p className="text-gray-600 dark:text-gray-400">
              <strong>Scene Batch Actions</strong> use smart retrieval to find relevant blocks,
              then apply AI edits across multiple paragraphs in one operation.
              This is much more efficient than editing blocks one at a time.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {diffHtml && currentBatch && stats && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Proposed Changes
          </div>

          {/* Stats */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm">
            <div className="font-semibold mb-2">Batch Statistics</div>
            <div className="space-y-1 text-gray-700 dark:text-gray-300">
              <div>• Total blocks scanned: {stats.totalBlocks}</div>
              <div>• Blocks edited: {stats.editedBlocks}</div>
              <div>• Total operations: {stats.totalOperations}</div>
            </div>
          </div>

          {/* Batch Notes */}
          {currentBatch.notes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded p-3">
              <div className="font-semibold mb-1">AI Note:</div>
              {currentBatch.notes}
            </div>
          )}

          {/* Diff */}
          <div 
            className="text-sm bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto max-h-96"
            dangerouslySetInnerHTML={{ __html: diffHtml }}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Apply All
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

