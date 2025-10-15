import { Book, Chapter, Scene, ResearchEntry, BookSettings, BookOperations, generateId, DEFAULT_BOOK_SETTINGS } from '../types/book';

/**
 * Book operations implementation
 * All operations return a new book object (immutable updates)
 */

export const bookOperations: BookOperations = {
  // Book management
  createBook: (title: string, author: string, genre: string): Book => {
    return {
      id: generateId(),
      title,
      author,
      genre,
      description: '',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      chapters: [],
      research: [],
      settings: { ...DEFAULT_BOOK_SETTINGS },
    };
  },

  loadBook: (jsonData: string): Book => {
    try {
      const data = JSON.parse(jsonData);
      // Validate and migrate data if needed
      return migrateBookData(data);
    } catch (error) {
      throw new Error(`Failed to load book: ${error.message}`);
    }
  },

  saveBook: (book: Book): string => {
    return JSON.stringify(book, null, 2);
  },

  // Chapter operations
  addChapter: (book: Book, chapterData: Omit<Chapter, 'id' | 'number' | 'lastModified'>): Book => {
    const newChapter: Chapter = {
      ...chapterData,
      id: generateId(),
      number: book.chapters.length + 1,
      lastModified: Date.now(),
      scenes: [],
    };

    return {
      ...book,
      chapters: [...book.chapters, newChapter],
      lastModified: Date.now(),
    };
  },

  updateChapter: (book: Book, chapterId: string, updates: Partial<Chapter>): Book => {
    return {
      ...book,
      chapters: book.chapters.map(chapter =>
        chapter.id === chapterId
          ? { ...chapter, ...updates, lastModified: Date.now() }
          : chapter
      ),
      lastModified: Date.now(),
    };
  },

  deleteChapter: (book: Book, chapterId: string): Book => {
    return {
      ...book,
      chapters: book.chapters
        .filter(chapter => chapter.id !== chapterId)
        .map((chapter, index) => ({ ...chapter, number: index + 1 })),
      lastModified: Date.now(),
    };
  },

  reorderChapters: (book: Book, chapterIds: string[]): Book => {
    const reorderedChapters = chapterIds
      .map(id => book.chapters.find(chapter => chapter.id === id))
      .filter((chapter): chapter is Chapter => chapter !== undefined)
      .map((chapter, index) => ({ ...chapter, number: index + 1 }));

    return {
      ...book,
      chapters: reorderedChapters,
      lastModified: Date.now(),
    };
  },

  // Scene operations
  addScene: (book: Book, chapterId: string, sceneData: Omit<Scene, 'id' | 'number' | 'lastModified'>): Book => {
    const chapter = book.chapters.find(ch => ch.id === chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    const newScene: Scene = {
      ...sceneData,
      id: generateId(),
      number: chapter.scenes.length + 1,
      lastModified: Date.now(),
    };

    return {
      ...book,
      chapters: book.chapters.map(ch =>
        ch.id === chapterId
          ? { ...ch, scenes: [...ch.scenes, newScene], lastModified: Date.now() }
          : ch
      ),
      lastModified: Date.now(),
    };
  },

  updateScene: (book: Book, sceneId: string, updates: Partial<Scene>): Book => {
    return {
      ...book,
      chapters: book.chapters.map(chapter => ({
        ...chapter,
        scenes: chapter.scenes.map(scene =>
          scene.id === sceneId
            ? { ...scene, ...updates, lastModified: Date.now() }
            : scene
        ),
        lastModified: chapter.scenes.some(scene => scene.id === sceneId) ? Date.now() : chapter.lastModified,
      })),
      lastModified: Date.now(),
    };
  },

  deleteScene: (book: Book, sceneId: string): Book => {
    return {
      ...book,
      chapters: book.chapters.map(chapter => ({
        ...chapter,
        scenes: chapter.scenes
          .filter(scene => scene.id !== sceneId)
          .map((scene, index) => ({ ...scene, number: index + 1 })),
        lastModified: chapter.scenes.some(scene => scene.id === sceneId) ? Date.now() : chapter.lastModified,
      })),
      lastModified: Date.now(),
    };
  },

  moveScene: (book: Book, sceneId: string, fromChapterId: string, toChapterId: string): Book => {
    const fromChapter = book.chapters.find(ch => ch.id === fromChapterId);
    const toChapter = book.chapters.find(ch => ch.id === toChapterId);
    
    if (!fromChapter || !toChapter) {
      throw new Error('Source or target chapter not found');
    }

    const scene = fromChapter.scenes.find(sc => sc.id === sceneId);
    if (!scene) {
      throw new Error('Scene not found');
    }

    // Remove from source chapter
    const updatedFromChapter = {
      ...fromChapter,
      scenes: fromChapter.scenes
        .filter(sc => sc.id !== sceneId)
        .map((sc, index) => ({ ...sc, number: index + 1 })),
      lastModified: Date.now(),
    };

    // Add to target chapter
    const updatedToChapter = {
      ...toChapter,
      scenes: [...toChapter.scenes, { ...scene, number: toChapter.scenes.length + 1 }],
      lastModified: Date.now(),
    };

    return {
      ...book,
      chapters: book.chapters.map(chapter => {
        if (chapter.id === fromChapterId) return updatedFromChapter;
        if (chapter.id === toChapterId) return updatedToChapter;
        return chapter;
      }),
      lastModified: Date.now(),
    };
  },

  // Content operations
  updateSceneContent: (book: Book, sceneId: string, content: string): Book => {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    return bookOperations.updateScene(book, sceneId, {
      content,
      currentWords: wordCount,
    });
  },

  insertTextAtPosition: (book: Book, sceneId: string, position: number, text: string): Book => {
    const scene = bookOperations.getSceneById(book, sceneId);
    if (!scene) {
      throw new Error('Scene not found');
    }

    const newContent = scene.content.slice(0, position) + text + scene.content.slice(position);
    return bookOperations.updateSceneContent(book, sceneId, newContent);
  },

  replaceTextRange: (book: Book, sceneId: string, start: number, end: number, newText: string): Book => {
    const scene = bookOperations.getSceneById(book, sceneId);
    if (!scene) {
      throw new Error('Scene not found');
    }

    const newContent = scene.content.slice(0, start) + newText + scene.content.slice(end);
    return bookOperations.updateSceneContent(book, sceneId, newContent);
  },

  addParagraph: (book: Book, sceneId: string, paragraph: string, position?: number): Book => {
    const scene = bookOperations.getSceneById(book, sceneId);
    if (!scene) {
      throw new Error('Scene not found');
    }

    const newParagraph = paragraph.trim() + '\n\n';
    const insertPosition = position !== undefined ? position : scene.content.length;
    return bookOperations.insertTextAtPosition(book, sceneId, insertPosition, newParagraph);
  },

  // Research operations
  addResearchEntry: (book: Book, entryData: Omit<ResearchEntry, 'id' | 'createdAt' | 'lastModified'>): Book => {
    const newEntry: ResearchEntry = {
      ...entryData,
      id: generateId(),
      createdAt: Date.now(),
      lastModified: Date.now(),
    };

    return {
      ...book,
      research: [...book.research, newEntry],
      lastModified: Date.now(),
    };
  },

  updateResearchEntry: (book: Book, entryId: string, updates: Partial<ResearchEntry>): Book => {
    return {
      ...book,
      research: book.research.map(entry =>
        entry.id === entryId
          ? { ...entry, ...updates, lastModified: Date.now() }
          : entry
      ),
      lastModified: Date.now(),
    };
  },

  deleteResearchEntry: (book: Book, entryId: string): Book => {
    return {
      ...book,
      research: book.research.filter(entry => entry.id !== entryId),
      lastModified: Date.now(),
    };
  },

  // Research chapter operations
  getResearchChapter: (book: Book): Chapter | undefined => {
    return book.researchChapter;
  },

  ensureResearchChapter: (book: Book): Book => {
    if (book.researchChapter) {
      return book;
    }

    const researchChapter: Chapter = {
      id: generateId(),
      number: book.chapters.length + 1,
      title: 'Research',
      summary: 'Research materials and notes for the book',
      pov: '',
      theme: 'Research',
      goal: 'Organize research materials',
      conflict: '',
      outcome: '',
      targetWords: 0,
      currentWords: 0,
      lastModified: Date.now(),
      scenes: [],
    };

    return {
      ...book,
      researchChapter,
      lastModified: Date.now(),
    };
  },

  addResearchScene: (book: Book, entryData: Omit<ResearchEntry, 'id' | 'createdAt' | 'lastModified'>): Book => {
    // Ensure research chapter exists
    const bookWithResearchChapter = bookOperations.ensureResearchChapter(book);

    const newScene: Scene = {
      id: generateId(),
      number: bookWithResearchChapter.researchChapter!.scenes.length + 1,
      title: entryData.title,
      goal: 'Research',
      conflict: '',
      outcome: '',
      location: 'Research',
      time: '',
      clock: '',
      crucible: '',
      pov: '',
      content: entryData.content,
      targetWords: 0,
      currentWords: entryData.content.split(' ').length,
      lastModified: Date.now(),
      generatedByAI: false,
    };

    return {
      ...bookWithResearchChapter,
      researchChapter: {
        ...bookWithResearchChapter.researchChapter!,
        scenes: [...bookWithResearchChapter.researchChapter!.scenes, newScene],
        lastModified: Date.now(),
      },
      lastModified: Date.now(),
    };
  },

  updateResearchScene: (book: Book, sceneId: string, updates: Partial<Scene>): Book => {
    if (!book.researchChapter) {
      return book;
    }

    const updatedScenes = book.researchChapter.scenes.map(scene =>
      scene.id === sceneId ? { ...scene, ...updates, lastModified: Date.now() } : scene
    );

    return {
      ...book,
      researchChapter: {
        ...book.researchChapter,
        scenes: updatedScenes,
        lastModified: Date.now(),
      },
      lastModified: Date.now(),
    };
  },

  deleteResearchScene: (book: Book, sceneId: string): Book => {
    if (!book.researchChapter) {
      return book;
    }

    return {
      ...book,
      researchChapter: {
        ...book.researchChapter,
        scenes: book.researchChapter.scenes.filter(scene => scene.id !== sceneId),
        lastModified: Date.now(),
      },
      lastModified: Date.now(),
    };
  },

  // Settings operations
  updateSettings: (book: Book, settings: Partial<BookSettings>): Book => {
    return {
      ...book,
      settings: { ...book.settings, ...settings },
      lastModified: Date.now(),
    };
  },

  // Utility operations
  getChapterById: (book: Book, chapterId: string): Chapter | undefined => {
    return book.chapters.find(chapter => chapter.id === chapterId);
  },

  getSceneById: (book: Book, sceneId: string): Scene | undefined => {
    for (const chapter of book.chapters) {
      const scene = chapter.scenes.find(scene => scene.id === sceneId);
      if (scene) return scene;
    }
    return undefined;
  },

  getSceneByPath: (book: Book, chapterId: string, sceneNumber: number): Scene | undefined => {
    const chapter = bookOperations.getChapterById(book, chapterId);
    return chapter?.scenes.find(scene => scene.number === sceneNumber);
  },

  calculateWordCounts: (book: Book): Book => {
    return {
      ...book,
      chapters: book.chapters.map(chapter => ({
        ...chapter,
        currentWords: chapter.scenes.reduce((total, scene) => total + scene.currentWords, 0),
        scenes: chapter.scenes.map(scene => ({
          ...scene,
          currentWords: scene.content.split(/\s+/).filter(word => word.length > 0).length,
        })),
      })),
      lastModified: Date.now(),
    };
  },

  generateId,
};

/**
 * Strip "Chapter XX:" prefix from chapter titles and ensure proper numbering
 */
function cleanChapterTitle(title: string): string {
  // Remove "Chapter XX:" prefix pattern
  return title.replace(/^Chapter\s+\d+:\s*/i, '').trim();
}

/**
 * Migrate book data from older versions
 */
function migrateBookData(data: any): Book {
  // Handle old manuscript format with separate scenes array
  if (data.scenes && Array.isArray(data.scenes)) {
    // Convert old format to new Book format
    const chapters = data.chapters.map((chapter: any, i: number) => {
      const chapterScenes = data.scenes
        .filter((scene: any) => scene.chapter === chapter.id)
        .map((scene: any, index: number) => ({
          id: scene.id,
          number: index + 1,
          title: scene.summary || scene.title || `Scene ${index + 1}`,
          goal: scene.goal || '',
          conflict: scene.conflict || '',
          outcome: scene.outcome || '',
          location: scene.location || '',
          time: scene.time || '',
          clock: scene.clock || '',
          crucible: scene.crucible || '',
          pov: scene.pov || '',
          content: scene.content || '',
          targetWords: scene.words_target || 1000,
          currentWords: scene.words_current || 0,
          lastModified: scene.lastModified || Date.now(),
          generatedByAI: false,
        }));

      return {
        id: chapter.id,
        number: i + 1, // Always assign sequential numbers based on position
        title: chapter.title || '',
        summary: chapter.summary || '',
        pov: chapter.pov || '',
        theme: chapter.theme || '',
        goal: chapter.goal || '',
        conflict: chapter.conflict || '',
        outcome: chapter.outcome || '',
        targetWords: chapter.targetWords || 3000,
        currentWords: chapterScenes.reduce((sum: number, scene: any) => sum + scene.currentWords, 0),
        lastModified: chapter.lastModified || Date.now(),
        scenes: chapterScenes,
      };
    });


    return {
      id: data.id || generateId(),
      title: data.title || 'Untitled Book',
      author: data.author || 'Unknown Author',
      genre: data.genre || 'Fiction',
      description: data.description || '',
      createdAt: data.createdAt || Date.now(),
      lastModified: data.lastModified || Date.now(),
      version: data.version || '1.0.0',
      chapters,
      research: data.research || [],
      settings: {
        ...DEFAULT_BOOK_SETTINGS,
        ...data.settings,
      },
    };
  }

  // Handle new Book format - ensure settings are properly initialized and clean chapter titles
  const migratedData = {
    ...data,
    chapters: data.chapters.map((chapter: Chapter, index: number) => ({
      ...chapter,
      number: index + 1, // Ensure sequential numbering based on position
      title: cleanChapterTitle(chapter.title || ''),
    })),
    settings: {
      ...DEFAULT_BOOK_SETTINGS,
      ...data.settings,
    },
  };
  
  // Add migration logic here for future versions
  return migratedData as Book;
}

// Re-export the operations as the default export
export default bookOperations;
