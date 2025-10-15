import React, { useState, useEffect } from 'react';
import { useBookStore } from '../store/bookStore';
import { getCurrentAIProvider } from '../ai/providers';
import { getAITools, executeToolCall } from '../ai/chatTools';
import Sidebar from './Sidebar';
import SceneEditor from './SceneEditor';
import AIChat from './AIChat';
import ResearchChat from './ResearchChat';
import BookSettingsPanel from './BookSettings';

export default function BookEditor() {
  const { book, currentSceneId, setCurrentScene, isLoading } = useBookStore();
  const [activeTab, setActiveTab] = useState<'editor' | 'ai-chat' | 'research' | 'settings'>('editor');

  // Auto-save effect
  useEffect(() => {
    if (!book?.settings?.autoSave) return;

    const interval = setInterval(() => {
      useBookStore.getState().autoSave();
    }, (book.settings.autoSaveInterval || 30) * 1000);

    return () => clearInterval(interval);
  }, [book?.settings?.autoSave, book?.settings?.autoSaveInterval]);

  // Handle tab changes for conversation context
  useEffect(() => {
    // When switching tabs, the chat components will handle setting the correct conversation mode
    // through their useEffect hooks, so no additional logic needed here
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading book...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Book Editor
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Create a new book or load an existing one to get started
          </p>
          <div className="space-x-4">
            <button
              onClick={() => {
                const title = prompt('Enter book title:');
                const author = prompt('Enter author name:');
                const genre = prompt('Enter genre:');
                if (title && author && genre) {
                  useBookStore.getState().createBook(title, author, genre);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create New Book
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const content = e.target?.result as string;
                      useBookStore.getState().loadBook(content);
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Load Book
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar */}
      <Sidebar
        book={book}
        currentSceneId={currentSceneId}
        onSceneSelect={setCurrentScene}
        onTabChange={setActiveTab}
        activeTab={activeTab}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {book.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                by {book.author} • {book.genre}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {book.chapters.length} chapters • {book.chapters.reduce((total, ch) => total + ch.scenes.length, 0)} scenes
              </span>
              <button
                onClick={() => {
                  const data = useBookStore.getState().saveBook();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Save Book
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to close this book? Any unsaved changes will be lost.')) {
                    useBookStore.getState().clearBook();
                  }
                }}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Close Book
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Center Panel - Scene Editor */}
          <div className="flex-1 flex flex-col">
            {currentSceneId ? (
              <SceneEditor
                sceneId={currentSceneId}
                onSceneUpdate={(sceneId, updates) => {
                  useBookStore.getState().updateScene(sceneId, updates);
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select a scene to start editing
              </div>
            )}
          </div>

          {/* Right Panel - AI Chat or Research */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col min-h-0 overflow-x-hidden">
            {activeTab === 'ai-chat' && (
              <AIChat
                currentSceneId={currentSceneId}
                onSceneUpdate={(sceneId, updates) => {
                  useBookStore.getState().updateScene(sceneId, updates);
                }}
              />
            )}
            {activeTab === 'research' && (
              <ResearchChat
                currentSceneId={currentSceneId}
                onResearchUpdate={(entry) => {
                  useBookStore.getState().addResearchEntry(entry);
                }}
              />
            )}
            {activeTab === 'settings' && (
              <BookSettingsPanel
                settings={book.settings}
                onSettingsUpdate={(settings) => {
                  useBookStore.getState().updateSettings(settings);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
