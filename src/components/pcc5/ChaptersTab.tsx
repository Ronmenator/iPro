import React from 'react';
import { Chapter } from '../../types/pcc5';

interface ChaptersTabProps {
  data: Chapter[];
  onRegenerate: () => void;
  isGenerating: boolean;
}

export default function ChaptersTab({ data, onRegenerate, isGenerating }: ChaptersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chapter Plan</h3>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate Chapters'}
        </button>
      </div>

      <div className="space-y-4">
        {data.map((chapter, index) => (
          <div key={chapter.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                    {chapter.id}
                  </span>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">{chapter.title}</h4>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {chapter.scenes.length} scene{chapter.scenes.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">POV:</span>
                  <span className="text-sm text-gray-900 dark:text-white ml-2">{chapter.pov}</span>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary:</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {chapter.summary}
                  </p>
                </div>
                
                {chapter.scenes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Scenes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {chapter.scenes.map((sceneId, sceneIndex) => (
                        <span 
                          key={sceneIndex}
                          className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                        >
                          {sceneId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No chapters generated yet</p>
        </div>
      )}
    </div>
  );
}
