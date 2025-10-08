import React, { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';

export default function VersionPanel() {
  const currentDoc = useDocumentStore(state => state.getCurrentDoc());
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentDoc) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Base Version:
            </span>
            <code className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
              {currentDoc.baseVersion.slice(0, 12)}...
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Blocks:
            </span>
            <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
              {currentDoc.blocks.length}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? 'Hide' : 'Show'} Block Hashes
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2 max-h-48 overflow-auto">
          {currentDoc.blocks.map((block, idx) => (
            <div
              key={block.id}
              className="flex items-start gap-2 text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700"
            >
              <span className="text-gray-500 dark:text-gray-400 min-w-[30px]">
                #{idx + 1}
              </span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {block.type}
                    {block.level ? ` (h${block.level})` : ''}
                  </span>
                  <code className="text-green-600 dark:text-green-400 font-mono">
                    {block.id}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Hash:</span>
                  <code className="text-purple-600 dark:text-purple-400 font-mono">
                    {block.hash.slice(0, 16)}...
                  </code>
                </div>
                <div className="text-gray-600 dark:text-gray-300 truncate">
                  {block.text.slice(0, 60)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

