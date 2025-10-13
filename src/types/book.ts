/**
 * Centralized Book data structure
 * This is the single source of truth for all book data
 */

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  createdAt: number;
  lastModified: number;
  version: string;
  
  // Book structure
  chapters: Chapter[];
  research: ResearchEntry[];
  
  // Settings
  settings: BookSettings;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  pov: string;
  theme: string;
  goal: string;
  conflict: string;
  outcome: string;
  targetWords: number;
  currentWords: number;
  lastModified: number;
  
  // Chapter content
  scenes: Scene[];
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  
  // Scene structure
  goal: string;
  conflict: string;
  outcome: string;
  location: string;
  time: string;
  clock: string;
  crucible: string;
  pov: string;
  
  // Content
  content: string;
  targetWords: number;
  currentWords: number;
  lastModified: number;
  
  // AI generation metadata
  generatedByAI: boolean;
  aiPrompt?: string;
  aiModel?: string;
}

export interface ResearchEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  createdAt: number;
  lastModified: number;
}

export interface BookSettings {
  aiProvider: 'openai' | 'azure openai' | 'anthropic claude';
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl?: string;
  aiMaxTokens: number;
  aiTemperature: number;
  
  // Azure specific
  azureEndpoint?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  
  // Auto-save settings
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
}

/**
 * Book operations for managing the centralized book object
 */
export interface BookOperations {
  // Book management
  createBook: (title: string, author: string, genre: string) => Book;
  loadBook: (jsonData: string) => Book;
  saveBook: (book: Book) => string;
  
  // Chapter operations
  addChapter: (book: Book, chapter: Omit<Chapter, 'id' | 'number' | 'lastModified'>) => Book;
  updateChapter: (book: Book, chapterId: string, updates: Partial<Chapter>) => Book;
  deleteChapter: (book: Book, chapterId: string) => Book;
  reorderChapters: (book: Book, chapterIds: string[]) => Book;
  
  // Scene operations
  addScene: (book: Book, chapterId: string, scene: Omit<Scene, 'id' | 'number' | 'lastModified'>) => Book;
  updateScene: (book: Book, sceneId: string, updates: Partial<Scene>) => Book;
  deleteScene: (book: Book, sceneId: string) => Book;
  moveScene: (book: Book, sceneId: string, fromChapterId: string, toChapterId: string) => Book;
  
  // Content operations
  updateSceneContent: (book: Book, sceneId: string, content: string) => Book;
  insertTextAtPosition: (book: Book, sceneId: string, position: number, text: string) => Book;
  replaceTextRange: (book: Book, sceneId: string, start: number, end: number, newText: string) => Book;
  addParagraph: (book: Book, sceneId: string, paragraph: string, position?: number) => Book;
  
  // Research operations
  addResearchEntry: (book: Book, entry: Omit<ResearchEntry, 'id' | 'createdAt' | 'lastModified'>) => Book;
  updateResearchEntry: (book: Book, entryId: string, updates: Partial<ResearchEntry>) => Book;
  deleteResearchEntry: (book: Book, entryId: string) => Book;
  
  // Settings operations
  updateSettings: (book: Book, settings: Partial<BookSettings>) => Book;
  
  // Utility operations
  getChapterById: (book: Book, chapterId: string) => Chapter | undefined;
  getSceneById: (book: Book, sceneId: string) => Scene | undefined;
  getSceneByPath: (book: Book, chapterId: string, sceneNumber: number) => Scene | undefined;
  calculateWordCounts: (book: Book) => Book;
  generateId: () => string;
}

/**
 * Default book settings
 */
export const DEFAULT_BOOK_SETTINGS: BookSettings = {
  aiProvider: 'openai',
  aiModel: 'gpt-4',
  aiApiKey: '',
  aiMaxTokens: 4000,
  aiTemperature: 0.7,
  autoSave: true,
  autoSaveInterval: 30,
};

/**
 * Create a new empty book
 */
export function createEmptyBook(title: string, author: string, genre: string): Book {
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
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
