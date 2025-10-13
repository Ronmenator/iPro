import React, { useState } from 'react';
import { useBookStore } from '../store/bookStore';
import { generateScenesForChapter, generateBookFromIdea } from '../ai/sceneGenerator';

interface SceneBatchActionsPanelProps {
  currentDocId: string | null;
}

export default function SceneBatchActionsPanel({ currentDocId }: SceneBatchActionsPanelProps) {
  const { book, addChapter, addScene } = useBookStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Book state is managed by useBookStore

  const handleCreateMissingScenes = async () => {
    if (!book) {
      setError('No book loaded');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Find chapters that have no scenes
      const chaptersMissingScenes = book.chapters.filter(chapter => chapter.scenes.length === 0);

      if (chaptersMissingScenes.length === 0) {
        setResult('All chapters already have scenes. No missing scenes to create.');
        return;
      }

      setProgress({
        current: 0,
        total: chaptersMissingScenes.length,
      });

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Generate scenes for each chapter missing scenes
      for (let i = 0; i < chaptersMissingScenes.length; i++) {
        const chapter = chaptersMissingScenes[i];
        
        setProgress({
          current: i + 1,
          total: chaptersMissingScenes.length,
        });

        try {
          const result = await generateScenesForChapter(chapter.id);
          if (result.success) {
          successCount++;
          } else {
            errorCount++;
            errors.push(`Chapter "${chapter.title}": ${result.message}`);
          }
        } catch (err: any) {
          errorCount++;
          errors.push(`Chapter "${chapter.title}": ${err.message}`);
        }
      }

      setProgress(null);
      
      if (errorCount === 0) {
        setResult(`Successfully created scenes for ${successCount} chapters.`);
      } else {
        setResult(`Created scenes for ${successCount} chapters, but ${errorCount} failed. Errors: ${errors.join(', ')}`);
      }

    } catch (error: any) {
      setError(`Failed to create missing scenes: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFromIdea = async () => {
    const idea = prompt('Enter your book idea:');
    if (!idea) return;

    const title = prompt('Enter book title:') || 'Untitled';
    const author = prompt('Enter author name:') || 'Unknown';
    const genre = prompt('Enter genre:') || 'Fiction';

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const result = await generateBookFromIdea(idea, title, author, genre);
      
      if (result.success) {
        setResult(result.message);
      } else {
        setError(result.message);
      }

    } catch (error: any) {
      setError(`Failed to generate book: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadFromJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            useBookStore.getState().loadBook(content);
            setResult('Book loaded successfully!');
          } catch (error: any) {
            setError(`Failed to load book: ${error.message}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (!book) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200">
          No book loaded. Create a new book or load an existing one to use batch actions.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Batch Actions
      </h3>

      {/* Progress */}
          {progress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Processing...
            </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {progress.current} / {progress.total}
                </span>
              </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{result}</p>
        </div>
      )}

      {/* Actions */}
        <div className="space-y-3">
            <button
          onClick={handleCreateMissingScenes}
          disabled={isProcessing}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Missing Scenes
            </button>

            <button
          onClick={handleGenerateFromIdea}
              disabled={isProcessing}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate From Idea
            </button>

            <button
          onClick={handleLoadFromJSON}
              disabled={isProcessing}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
          Load From JSON
            </button>
          </div>

      {/* Book Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Book Statistics
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>Chapters: {book.chapters.length}</p>
          <p>Scenes: {book.chapters.reduce((total, ch) => total + ch.scenes.length, 0)}</p>
          <p>Research Entries: {book.research.length}</p>
          <p>Last Modified: {new Date(book.lastModified).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}