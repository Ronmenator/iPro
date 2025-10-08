import React from 'react';
import { DiffBlock } from '../types/ops';

interface DiffViewerProps {
  diff: DiffBlock[];
  onClose: () => void;
}

export default function DiffViewer({ diff, onClose }: DiffViewerProps) {
  if (diff.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Operation Preview (Simulation)</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close diff viewer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {diff.map((item, idx) => (
            <div
              key={idx}
              className={`
                p-4 rounded-lg border-l-4
                ${item.type === 'modified' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''}
                ${item.type === 'inserted' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                ${item.type === 'deleted' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
                ${item.type === 'moved' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                ${item.type === 'unchanged' ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/20' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`
                  text-xs font-semibold uppercase
                  ${item.type === 'modified' ? 'text-yellow-700 dark:text-yellow-400' : ''}
                  ${item.type === 'inserted' ? 'text-green-700 dark:text-green-400' : ''}
                  ${item.type === 'deleted' ? 'text-red-700 dark:text-red-400' : ''}
                  ${item.type === 'moved' ? 'text-blue-700 dark:text-blue-400' : ''}
                  ${item.type === 'unchanged' ? 'text-gray-700 dark:text-gray-400' : ''}
                `}>
                  {item.type}
                </span>
                <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {item.blockId}
                </code>
              </div>

              {item.annotation && (
                <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                    Note:
                  </span>
                  <span className="text-sm text-blue-800 dark:text-blue-200 ml-2">
                    {item.annotation}
                  </span>
                </div>
              )}

              {item.oldText && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Old:
                  </div>
                  <div className="text-sm bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <span className="line-through text-gray-500 dark:text-gray-400">
                      {item.oldText}
                    </span>
                  </div>
                </div>
              )}

              {item.newText && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    New:
                  </div>
                  <div className="text-sm bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <span className="text-green-700 dark:text-green-300 font-semibold">
                      {item.newText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

