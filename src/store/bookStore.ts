import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Book, Chapter, Scene, ResearchEntry, BookSettings } from '../types/book';
import bookOperations from '../lib/bookOperations';

interface BookStore {
  // State
  book: Book | null;
  currentSceneId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Book management
  createBook: (title: string, author: string, genre: string) => void;
  loadBook: (jsonData: string) => void;
  saveBook: () => string;
  clearBook: () => void;
  
  // Chapter operations
  addChapter: (chapterData: Omit<Chapter, 'id' | 'number' | 'lastModified'>) => void;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapter: (chapterId: string) => void;
  reorderChapters: (chapterIds: string[]) => void;
  
  // Scene operations
  addScene: (chapterId: string, sceneData: Omit<Scene, 'id' | 'number' | 'lastModified'>) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  moveScene: (sceneId: string, fromChapterId: string, toChapterId: string) => void;
  setCurrentScene: (sceneId: string | null) => void;
  
  // Content operations
  updateSceneContent: (sceneId: string, content: string) => void;
  insertTextAtPosition: (sceneId: string, position: number, text: string) => void;
  replaceTextRange: (sceneId: string, start: number, end: number, newText: string) => void;
  addParagraph: (sceneId: string, paragraph: string, position?: number) => void;
  
  // Research operations
  addResearchEntry: (entryData: Omit<ResearchEntry, 'id' | 'createdAt' | 'lastModified'>) => void;
  updateResearchEntry: (entryId: string, updates: Partial<ResearchEntry>) => void;
  deleteResearchEntry: (entryId: string) => void;

  // Research chapter operations
  addResearchScene: (entryData: Omit<ResearchEntry, 'id' | 'createdAt' | 'lastModified'>) => void;
  updateResearchScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteResearchScene: (sceneId: string) => void;
  
  // Settings operations
  updateSettings: (settings: Partial<BookSettings>) => void;
  
  // Utility operations
  getChapterById: (chapterId: string) => Chapter | undefined;
  getSceneById: (sceneId: string) => Scene | undefined;
  getCurrentScene: () => Scene | undefined;
  getAllScenes: () => Scene[];
  getScenesByChapter: (chapterId: string) => Scene[];
  
  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  autoSave: () => void;
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      // State
      book: null,
      currentSceneId: null,
      isLoading: false,
      error: null,
      
      // Book management
      createBook: (title: string, author: string, genre: string) => {
        const book = bookOperations.createBook(title, author, genre);
        // Ensure research chapter exists for the new book
        const bookWithResearchChapter = bookOperations.ensureResearchChapter(book);
        set({ book: bookWithResearchChapter, error: null });
      },
      
      loadBook: (jsonData: string) => {
        try {
          set({ isLoading: true, error: null });
          const book = bookOperations.loadBook(jsonData);
          // Ensure research chapter exists for the loaded book
          const bookWithResearchChapter = bookOperations.ensureResearchChapter(book);
          set({ book: bookWithResearchChapter, isLoading: false, error: null });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load book',
            isLoading: false 
          });
        }
      },
      
      saveBook: () => {
        const { book } = get();
        if (!book) {
          throw new Error('No book to save');
        }
        return bookOperations.saveBook(book);
      },
      
      clearBook: () => {
        set({ book: null, currentSceneId: null, error: null });
      },
      
      // Chapter operations
      addChapter: (chapterData) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.addChapter(book, chapterData);
        set({ book: updatedBook });
      },
      
      updateChapter: (chapterId: string, updates: Partial<Chapter>) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.updateChapter(book, chapterId, updates);
        set({ book: updatedBook });
      },
      
      deleteChapter: (chapterId: string) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.deleteChapter(book, chapterId);
        set({ book: updatedBook });
      },
      
      reorderChapters: (chapterIds: string[]) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.reorderChapters(book, chapterIds);
        set({ book: updatedBook });
      },
      
      // Scene operations
      addScene: (chapterId: string, sceneData) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.addScene(book, chapterId, sceneData);
        set({ book: updatedBook });
      },
      
      updateScene: (sceneId: string, updates: Partial<Scene>) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.updateScene(book, sceneId, updates);
        set({ book: updatedBook });
      },
      
      deleteScene: (sceneId: string) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.deleteScene(book, sceneId);
        set({ book: updatedBook });
      },
      
      moveScene: (sceneId: string, fromChapterId: string, toChapterId: string) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.moveScene(book, sceneId, fromChapterId, toChapterId);
        set({ book: updatedBook });
      },
      
      setCurrentScene: (sceneId: string | null) => {
        set({ currentSceneId: sceneId });
      },
      
      // Content operations
      updateSceneContent: (sceneId: string, content: string) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.updateSceneContent(book, sceneId, content);
        set({ book: updatedBook });
      },
      
      insertTextAtPosition: (sceneId: string, position: number, text: string) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.insertTextAtPosition(book, sceneId, position, text);
        set({ book: updatedBook });
      },
      
      replaceTextRange: (sceneId: string, start: number, end: number, newText: string) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.replaceTextRange(book, sceneId, start, end, newText);
        set({ book: updatedBook });
      },
      
      addParagraph: (sceneId: string, paragraph: string, position?: number) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.addParagraph(book, sceneId, paragraph, position);
        set({ book: updatedBook });
      },
      
      // Research operations
      addResearchEntry: (entryData) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.addResearchEntry(book, entryData);
        set({ book: updatedBook });
      },
      
      updateResearchEntry: (entryId: string, updates: Partial<ResearchEntry>) => {
        const { book } = get();
        if (!book) return;

        const updatedBook = bookOperations.updateResearchEntry(book, entryId, updates);
        set({ book: updatedBook });
      },

      deleteResearchEntry: (entryId: string) => {
        const { book } = get();
        if (!book) return;

        const updatedBook = bookOperations.deleteResearchEntry(book, entryId);
        set({ book: updatedBook });
      },

      // Research chapter operations
      addResearchScene: (entryData) => {
        const { book } = get();
        if (!book) return;

        const updatedBook = bookOperations.addResearchScene(book, entryData);
        set({ book: updatedBook });
      },

      updateResearchScene: (sceneId: string, updates: Partial<Scene>) => {
        const { book } = get();
        if (!book) return;

        const updatedBook = bookOperations.updateResearchScene(book, sceneId, updates);
        set({ book: updatedBook });
      },

      deleteResearchScene: (sceneId: string) => {
        const { book } = get();
        if (!book) return;

        const updatedBook = bookOperations.deleteResearchScene(book, sceneId);
        set({ book: updatedBook });
      },
      
      // Settings operations
      updateSettings: (settings: Partial<BookSettings>) => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.updateSettings(book, settings);
        set({ book: updatedBook });
      },
      
      // Utility operations
      getChapterById: (chapterId: string) => {
        const { book } = get();
        return book ? bookOperations.getChapterById(book, chapterId) : undefined;
      },
      
      getSceneById: (sceneId: string) => {
        const { book } = get();
        return book ? bookOperations.getSceneById(book, sceneId) : undefined;
      },
      
      getCurrentScene: () => {
        const { book, currentSceneId } = get();
        return book && currentSceneId ? bookOperations.getSceneById(book, currentSceneId) : undefined;
      },
      
      getAllScenes: () => {
        const { book } = get();
        if (!book) return [];
        
        return book.chapters.flatMap(chapter => chapter.scenes);
      },
      
      getScenesByChapter: (chapterId: string) => {
        const { book } = get();
        if (!book) return [];
        
        const chapter = bookOperations.getChapterById(book, chapterId);
        return chapter ? chapter.scenes : [];
      },
      
      // Auto-save
      enableAutoSave: () => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.updateSettings(book, { autoSave: true });
        set({ book: updatedBook });
      },
      
      disableAutoSave: () => {
        const { book } = get();
        if (!book) return;
        
        const updatedBook = bookOperations.updateSettings(book, { autoSave: false });
        set({ book: updatedBook });
      },
      
      autoSave: () => {
        const { book } = get();
        if (!book || !book.settings.autoSave) return;
        
        // Auto-save logic would go here
        // For now, just update the lastModified timestamp
        const updatedBook = { ...book, lastModified: Date.now() };
        set({ book: updatedBook });
      },
    }),
    {
      name: 'book-store',
      partialize: (state) => ({ book: state.book }),
    }
  )
);
