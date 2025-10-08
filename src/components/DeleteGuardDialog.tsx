import React from 'react';
import { DeleteGuardResult } from '../types/outline';

interface DeleteGuardDialogProps {
  guard: DeleteGuardResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteGuardDialog({ guard, onConfirm, onCancel }: DeleteGuardDialogProps) {
  if (guard.allowed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Delete Protected Block?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {guard.reason}
              </p>

              {guard.outlineCard && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                  <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    From Outline: {guard.outlineCard.title}
                  </div>
                  {guard.outlineCard.goal && (
                    <div className="text-xs text-blue-800 dark:text-blue-200 mb-1">
                      <span className="font-semibold">Goal:</span> {guard.outlineCard.goal}
                    </div>
                  )}
                  {guard.outlineCard.conflict && (
                    <div className="text-xs text-blue-800 dark:text-blue-200">
                      <span className="font-semibold">Conflict:</span> {guard.outlineCard.conflict}
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deleting this block may disrupt your story structure. Are you sure you want to continue?
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm font-medium"
            >
              Delete Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

