import React from 'react';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useOutlineStore } from '../store/outlineStore';

interface PartSummaryViewProps {
  partId: string;
}

export default function PartSummaryView({ partId }: PartSummaryViewProps) {
  const getPart = useManuscriptStore(state => state.getPart);
  const getChaptersByPart = useManuscriptStore(state => state.getChaptersByPart);
  const getScenesByChapter = useManuscriptStore(state => state.getScenesByChapter);
  const getChapterCard = useOutlineStore(state => state.getChapterCard);

  const part = getPart(partId);
  const chapters = getChaptersByPart(partId);

  if (!part) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Part not found.</p>
        </div>
      </div>
    );
  }

  // Calculate word counts from all chapters and scenes
  const totalTargetWords = chapters.reduce((partSum, chapter) => {
    const scenes = getScenesByChapter(chapter.id);
    const chapterTargetWords = scenes.reduce((sceneSum, scene) => sceneSum + (scene.wordsTarget || 0), 0);
    return partSum + chapterTargetWords;
  }, 0);

  const totalCurrentWords = chapters.reduce((partSum, chapter) => {
    const scenes = getScenesByChapter(chapter.id);
    const chapterCurrentWords = scenes.reduce((sceneSum, scene) => sceneSum + (scene.wordsCurrent || 0), 0);
    return partSum + chapterCurrentWords;
  }, 0);

  // Calculate total scenes across all chapters
  const totalScenes = chapters.reduce((sum, chapter) => {
    const scenes = getScenesByChapter(chapter.id);
    return sum + scenes.length;
  }, 0);

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {part.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Part {part.number}
            </p>
          </div>
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <p>Target: {totalTargetWords} words</p>
            <p>Current: {totalCurrentWords} words</p>
            {totalTargetWords > 0 && (
              <p className="text-xs mt-1">
                Progress: {Math.round((totalCurrentWords / totalTargetWords) * 100)}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Part Details - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Part Summary */}
        {part.summary && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Part Summary
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {part.summary}
              </p>
            </div>
          </div>
        )}

        {/* Part Statistics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Part Statistics
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Number of Chapters:</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{chapters.length}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Scenes:</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{totalScenes}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Word Count:</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1">
                  {totalCurrentWords} / {totalTargetWords} words
                  {totalTargetWords > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({Math.round((totalCurrentWords / totalTargetWords) * 100)}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Modified:</span>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                {new Date(part.lastModified).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Chapters ({chapters.length})
          </h2>
          {chapters.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No chapters in this part yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter, index) => {
                const chapterCard = getChapterCard(chapter.id);
                const scenes = getScenesByChapter(chapter.id);
                
                // Calculate chapter word counts
                const chapterTargetWords = scenes.reduce((sum, scene) => sum + (scene.wordsTarget || 0), 0);
                const chapterCurrentWords = scenes.reduce((sum, scene) => sum + (scene.wordsCurrent || 0), 0);

                return (
                  <div key={chapter.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {chapter.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {chapter.pov && <span>👤 {chapter.pov}</span>}
                          {chapter.theme && <span>🎭 {chapter.theme}</span>}
                          <span>📖 {scenes.length} scenes</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <p>{chapterCurrentWords} / {chapterTargetWords} words</p>
                        {chapterTargetWords > 0 && (
                          <p className="text-xs">
                            {Math.round((chapterCurrentWords / chapterTargetWords) * 100)}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Chapter Summary */}
                    {chapter.summary && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Summary:</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{chapter.summary}</p>
                      </div>
                    )}

                    {/* Chapter Outline Card */}
                    {chapterCard && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {chapterCard.goal && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Goal:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{chapterCard.goal}</p>
                          </div>
                        )}
                        {chapterCard.conflict && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Conflict:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{chapterCard.conflict}</p>
                          </div>
                        )}
                        {chapterCard.outcome && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Outcome:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{chapterCard.outcome}</p>
                          </div>
                        )}
                        {chapterCard.clock && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Clock:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{chapterCard.clock}</p>
                          </div>
                        )}
                        {chapterCard.crucible && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Crucible:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{chapterCard.crucible}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scenes Preview */}
                    {scenes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Scenes:</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {scenes.map((scene, sceneIndex) => (
                            <span 
                              key={scene.id}
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                            >
                              {sceneIndex + 1}. {scene.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
