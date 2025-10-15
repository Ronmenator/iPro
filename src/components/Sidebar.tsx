import React, { useState } from 'react';
import { Book, Chapter, Scene } from '../types/book';
import { useBookStore } from '../store/bookStore';

interface SidebarProps {
  book: Book;
  currentSceneId: string | null;
  onSceneSelect: (sceneId: string | null) => void;
  onTabChange: (tab: 'editor' | 'ai-chat' | 'research' | 'settings') => void;
  activeTab: 'editor' | 'ai-chat' | 'research' | 'settings';
}

export default function Sidebar({ book, currentSceneId, onSceneSelect, onTabChange, activeTab }: SidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const { addChapter, addScene, deleteChapter, deleteScene } = useBookStore();

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleAddChapter = () => {
    const title = prompt('Enter chapter title:');
    if (title) {
      addChapter({
        title,
        summary: '',
        pov: '',
        theme: '',
        goal: '',
        conflict: '',
        outcome: '',
        targetWords: 3000,
        currentWords: 0,
      });
    }
  };

  const handleAddScene = (chapterId: string) => {
    const title = prompt('Enter scene title:');
    if (title) {
      addScene(chapterId, {
        title,
        goal: '',
        conflict: '',
        outcome: '',
        location: '',
        time: '',
        clock: '',
        crucible: '',
        pov: '',
        content: '',
        targetWords: 1000,
        currentWords: 0,
        generatedByAI: false,
      });
    }
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      deleteChapter(chapterId);
    }
  };

  const handleDeleteScene = (sceneId: string) => {
    if (confirm('Are you sure you want to delete this scene?')) {
      deleteScene(sceneId);
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Book Structure
        </h2>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => onTabChange('editor')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'editor'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => onTabChange('ai-chat')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'ai-chat'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => onTabChange('research')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'research'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Research
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'settings'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Add Chapter Button */}
        <button
          onClick={handleAddChapter}
          className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          + Add Chapter
        </button>
      </div>

      {/* Book Structure */}
      <div className="flex-1 overflow-y-auto">
        {book.chapters.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p>No chapters yet</p>
            <p className="text-sm">Click "Add Chapter" to get started</p>
          </div>
        ) : (
          <div className="p-2">
            {/* Regular chapters */}
            {book.chapters.map((chapter) => (
              <div key={chapter.id} className="mb-2">
                {/* Chapter Header */}
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    <span className="text-sm">
                      {expandedChapters.has(chapter.id) ? '▼' : '▶'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Chapter {chapter.number}: {chapter.title}
                    </span>
                  </button>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleAddScene(chapter.id)}
                      className="text-xs text-green-600 hover:text-green-700"
                      title="Add Scene"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(chapter.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                      title="Delete Chapter"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Scenes */}
                {expandedChapters.has(chapter.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {chapter.scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                          currentSceneId === scene.id
                            ? 'bg-blue-100 dark:bg-blue-900'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => onSceneSelect(scene.id)}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            Scene {scene.number}: {scene.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {scene.currentWords} / {scene.targetWords} words
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScene(scene.id);
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                          title="Delete Scene"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Research Chapter */}
            {book.researchChapter && (
              <div key={book.researchChapter.id} className="mb-2">
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <button
                    onClick={() => toggleChapter(book.researchChapter!.id)}
                    className="flex items-center space-x-2 flex-1 text-left"
                  >
                    <span className="text-sm">
                      {expandedChapters.has(book.researchChapter!.id) ? '▼' : '▶'}
                    </span>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {book.researchChapter.title}
                    </span>
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      ({book.researchChapter.scenes.length} items)
                    </span>
                  </button>
                </div>

                {expandedChapters.has(book.researchChapter.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {book.researchChapter.scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                          currentSceneId === scene.id
                            ? 'bg-purple-100 dark:bg-purple-900'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => onSceneSelect(scene.id)}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {scene.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {scene.currentWords} words
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Last saved: {new Date(book.lastModified).toLocaleTimeString()}</p>
          <p>Version: {book.version}</p>
        </div>
      </div>
    </div>
  );
}
