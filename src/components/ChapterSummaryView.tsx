import React from 'react';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useOutlineStore } from '../store/outlineStore';

interface ChapterSummaryViewProps {
  chapterId: string;
}

export default function ChapterSummaryView({ chapterId }: ChapterSummaryViewProps) {
  const getChapter = useManuscriptStore(state => state.getChapter);
  const getScenesByChapter = useManuscriptStore(state => state.getScenesByChapter);
  const getCard = useOutlineStore(state => state.getCard);
  const getChapterCard = useOutlineStore(state => state.getChapterCard);

  const chapter = getChapter(chapterId);
  const scenes = getScenesByChapter(chapterId);
  const chapterCard = getChapterCard(chapterId);

  // Calculate word counts from scenes
  const totalTargetWords = scenes.reduce((sum, scene) => sum + (scene.wordsTarget || 0), 0);
  const totalCurrentWords = scenes.reduce((sum, scene) => sum + (scene.wordsCurrent || 0), 0);

  if (!chapter) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Chapter not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {chapter.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Chapter {chapter.number}
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

      {/* Chapter Details */}
      <div className="p-6 space-y-6">
        {/* Chapter Summary */}
        {chapter.summary && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Chapter Summary
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {chapter.summary}
              </p>
            </div>
          </div>
        )}

        {/* Chapter Outline Card */}
        {chapterCard && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Chapter Outline
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              {chapterCard.goal && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Goal:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapterCard.goal}</p>
                </div>
              )}
              {chapterCard.conflict && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Conflict:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapterCard.conflict}</p>
                </div>
              )}
              {chapterCard.outcome && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Outcome:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapterCard.outcome}</p>
                </div>
              )}
              {chapterCard.clock && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Clock:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapterCard.clock}</p>
                </div>
              )}
              {chapterCard.crucible && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Crucible:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapterCard.crucible}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chapter Metadata */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Chapter Details
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapter.pov && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">POV Character:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapter.pov}</p>
                </div>
              )}
              {chapter.theme && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{chapter.theme}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Number of Scenes:</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{scenes.length}</p>
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
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Modified:</span>
                <p className="text-gray-700 dark:text-gray-300 mt-1">
                  {new Date(chapter.lastModified).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scenes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Scenes ({scenes.length})
          </h2>
          {scenes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No scenes in this chapter yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scenes.map((scene, index) => {
                const sceneCard = getCard(scene.id);
                return (
                  <div key={scene.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Scene {index + 1}: {scene.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {scene.location && <span>📍 {scene.location}</span>}
                          {scene.time && <span>🕐 {scene.time}</span>}
                          {scene.pov && <span>👤 {scene.pov}</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <p>{scene.wordsCurrent || 0} / {scene.wordsTarget || 0} words</p>
                      </div>
                    </div>

                    {/* Scene Summary */}
                    {sceneCard && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {sceneCard.goal && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Goal:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{sceneCard.goal}</p>
                          </div>
                        )}
                        {sceneCard.conflict && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Conflict:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{sceneCard.conflict}</p>
                          </div>
                        )}
                        {sceneCard.outcome && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Outcome:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{sceneCard.outcome}</p>
                          </div>
                        )}
                        {sceneCard.clock && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Clock:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{sceneCard.clock}</p>
                          </div>
                        )}
                        {sceneCard.crucible && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Crucible:</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{sceneCard.crucible}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scene Notes */}
                    {scene.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Notes:</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{scene.notes}</p>
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
