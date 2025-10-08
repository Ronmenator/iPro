import React, { useState } from 'react';
import { Scene } from '../../types/pcc5';

interface ScenesTabProps {
  data: Scene[];
  onRegenerate: () => void;
  isGenerating: boolean;
}

export default function ScenesTab({ data, onRegenerate, isGenerating }: ScenesTabProps) {
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'chapter' | 'words'>('chapter');

  // Get unique chapters for filter
  const chapters = Array.from(new Set(data.map(scene => scene.chapter))).sort();

  // Filter and sort scenes
  const filteredScenes = data
    .filter(scene => filterChapter === 'all' || scene.chapter === filterChapter)
    .sort((a, b) => {
      if (sortBy === 'words') {
        return b.words_target - a.words_target;
      }
      return a.chapter.localeCompare(b.chapter) || a.id.localeCompare(b.id);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scene Skeletons</h3>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate Scenes'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Chapter</label>
          <select
            value={filterChapter}
            onChange={(e) => setFilterChapter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            title="Filter by chapter"
            aria-label="Filter by chapter"
          >
            <option value="all">All Chapters</option>
            {chapters.map(chapter => (
              <option key={chapter} value={chapter}>{chapter}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'chapter' | 'words')}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            title="Sort scenes"
            aria-label="Sort scenes"
          >
            <option value="chapter">Chapter Order</option>
            <option value="words">Word Count</option>
          </select>
        </div>
      </div>

      {/* Scenes List */}
      <div className="space-y-3">
        {filteredScenes.map((scene, index) => (
          <div key={scene.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                    {scene.id}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">in {scene.chapter}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {scene.words_target} words
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  POV: {scene.pov}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Goal:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {scene.goal}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conflict:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {scene.conflict}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Outcome:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {scene.outcome}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {scene.location}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Clock:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {scene.clock}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Crucible:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {scene.crucible}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Summary:</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {scene.summary}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredScenes.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {filterChapter === 'all' ? 'No scenes generated yet' : `No scenes found in ${filterChapter}`}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {data.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Scene Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Total Scenes:</span>
              <span className="ml-1 text-blue-900 dark:text-blue-100 font-medium">{data.length}</span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Total Words:</span>
              <span className="ml-1 text-blue-900 dark:text-blue-100 font-medium">
                {data.reduce((sum, scene) => sum + scene.words_target, 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Avg Words/Scene:</span>
              <span className="ml-1 text-blue-900 dark:text-blue-100 font-medium">
                {Math.round(data.reduce((sum, scene) => sum + scene.words_target, 0) / data.length).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Chapters:</span>
              <span className="ml-1 text-blue-900 dark:text-blue-100 font-medium">{chapters.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
