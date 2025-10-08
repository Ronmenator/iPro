import React, { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useOutlineStore } from '../store/outlineStore';
import { proposeEdits, EDIT_PRESETS } from '../ai/adapter';
import { createToolSurface } from '../ai/toolSurface';
import { getLLMClient } from '../ai/providers';
import { DocEditBatch } from '../types/ops';
import { gateAndJustify, createGateContext } from '../ai/policyGate';
import { getDefaultStyleRules } from '../types/policy';

interface AIActionsPanelProps {
  currentDocId: string | null;
  selection: {
    blockId: string;
    start: number;
    end: number;
  } | null;
}

export default function AIActionsPanel({ currentDocId, selection }: AIActionsPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [diffHtml, setDiffHtml] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState<DocEditBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [policyWarnings, setPolicyWarnings] = useState<string[]>([]);
  const [blockedOps, setBlockedOps] = useState<number>(0);

  const getCurrentDoc = useDocumentStore(state => state.getCurrentDoc);
  const getOutlineCard = useOutlineStore(state => state.getCard);
  const toolSurface = createToolSurface();

  const handleAIAction = async (preset: keyof typeof EDIT_PRESETS | 'custom') => {
    if (!currentDocId || !selection) {
      setError('Please select text to edit');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDiffHtml(null);
    setCurrentBatch(null);

    try {
      // Get LLM client
      const llm = getLLMClient();
      if (!llm) {
        throw new Error('AI is not configured. Please configure in settings.');
      }

      // Get current document
      const doc = getCurrentDoc();
      if (!doc) {
        throw new Error('No document loaded');
      }

      // Find the block
      const block = doc.blocks.find(b => b.id === selection.blockId);
      if (!block) {
        throw new Error('Selected block not found');
      }

      // Get style rules
      const style = await toolSurface.getStyleRules();

      // Get instruction
      const instruction = preset === 'custom' 
        ? customPrompt 
        : EDIT_PRESETS[preset];

      if (!instruction) {
        throw new Error('Please enter a custom prompt');
      }

      // Propose edits
      const batch = await proposeEdits(llm, {
        docId: currentDocId,
        baseVersion: doc.baseVersion,
        selection,
        blockText: block.text,
        style,
      }, instruction);

      // Apply policy gate
      const outline = currentDocId.startsWith('scene/') 
        ? getOutlineCard(currentDocId)
        : null;
      
      const gateCtx = createGateContext(
        currentDocId,
        doc.blocks,
        outline,
        getDefaultStyleRules()
      );
      
      const { result: gateResult, annotatedBatch } = gateAndJustify(
        batch,
        gateCtx,
        instruction
      );
      
      // Show policy warnings
      if (gateResult.blocked.length > 0) {
        setBlockedOps(gateResult.blocked.length);
        const warnings = gateResult.blocked.map(b => b.reason);
        setPolicyWarnings(warnings);
      } else {
        setBlockedOps(0);
        setPolicyWarnings([]);
      }
      
      if (gateResult.warnings.length > 0) {
        const warnings = gateResult.warnings.map(w => 
          `Style issues in block: ${w.hits.map(h => h.rule).join(', ')}`
        );
        setPolicyWarnings(prev => [...prev, ...warnings]);
      }

      // Simulate to get diff (use annotated batch with justifications)
      const preview = await toolSurface.simulateOps({
        ...annotatedBatch,
        simulate: true,
      });

      setDiffHtml(preview.diffHtml);
      setCurrentBatch(annotatedBatch);
      setShowCustomPrompt(false);
    } catch (err: any) {
      console.error('AI action failed:', err);
      setError(err.message || 'Failed to process AI request');
    } finally {
      setIsProcessing(false);
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

      // Success
      setDiffHtml(null);
      setCurrentBatch(null);
      
      // Reload the page to show updated content
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
    setError(null);
  };

  const hasSelection = currentDocId && selection;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Actions</h3>
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      {!hasSelection && (
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3">
          Select text in the editor to use AI actions
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-3">
          {error}
        </div>
      )}

      {/* Policy Warnings */}
      {policyWarnings.length > 0 && (
        <div className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Policy Warnings
            {blockedOps > 0 && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded-full">
                {blockedOps} blocked
              </span>
            )}
          </div>
          <ul className="space-y-1 text-yellow-800 dark:text-yellow-200">
            {policyWarnings.map((warning, i) => (
              <li key={i} className="text-xs">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Actions */}
      {hasSelection && !diffHtml && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Quick Actions
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAIAction('tighten')}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded transition-colors"
              title="Remove weak words and tighten prose"
            >
              {isProcessing ? '...' : '✨ Tighten'}
            </button>
            
            <button
              onClick={() => handleAIAction('expand')}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
              title="Add more detail and description"
            >
              {isProcessing ? '...' : '🔍 Expand'}
            </button>
            
            <button
              onClick={() => handleAIAction('simplify')}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
              title="Simplify language"
            >
              {isProcessing ? '...' : '📝 Simplify'}
            </button>
            
            <button
              onClick={() => handleAIAction('fix')}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded transition-colors"
              title="Fix grammar and spelling"
            >
              {isProcessing ? '...' : '🔧 Fix'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAIAction('active')}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded transition-colors"
              title="Convert to active voice"
            >
              {isProcessing ? '...' : '⚡ Active Voice'}
            </button>
            
            <button
              onClick={() => handleAIAction('rephrase')}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white rounded transition-colors"
              title="Rephrase differently"
            >
              {isProcessing ? '...' : '🔄 Rephrase'}
            </button>
          </div>

          {/* Custom Prompt */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            {!showCustomPrompt ? (
              <button
                onClick={() => setShowCustomPrompt(true)}
                className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Custom Prompt
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your instruction..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded resize-none bg-white dark:bg-gray-800"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAIAction('custom')}
                    disabled={isProcessing || !customPrompt.trim()}
                    className="flex-1 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomPrompt(false);
                      setCustomPrompt('');
                    }}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diff Preview */}
      {diffHtml && currentBatch && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            Proposed Changes
          </div>

          {currentBatch.notes && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded p-3">
              <div className="font-semibold mb-1">AI Note:</div>
              {currentBatch.notes}
            </div>
          )}

          <div 
            className="text-sm bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-auto max-h-96"
            dangerouslySetInnerHTML={{ __html: diffHtml }}
          />

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
              Apply
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && !diffHtml && (
        <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-600 dark:text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          AI is thinking...
        </div>
      )}
    </div>
  );
}

