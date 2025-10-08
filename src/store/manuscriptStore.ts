import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  ChapterMetadata,
  SceneMetadata,
  PartMetadata,
  ManuscriptStructure,
} from '../types/manuscript';

/**
 * ManuscriptStore - manages the hierarchical structure of the book
 * Parts → Chapters → Scenes
 */

interface ManuscriptDB extends DBSchema {
  parts: {
    key: string;
    value: PartMetadata;
  };
  chapters: {
    key: string;
    value: ChapterMetadata;
  };
  scenes: {
    key: string;
    value: SceneMetadata;
  };
  structure: {
    key: string;
    value: ManuscriptStructure;
  };
}

interface ManuscriptStore {
  parts: Map<string, PartMetadata>;
  chapters: Map<string, ChapterMetadata>;
  scenes: Map<string, SceneMetadata>;
  partOrder: string[];
  db: IDBPDatabase<ManuscriptDB> | null;

  // Database
  initDB: () => Promise<void>;

  // Parts
  getPart: (partId: string) => PartMetadata | null;
  setPart: (part: PartMetadata) => Promise<void>;
  deletePart: (partId: string) => Promise<void>;
  getAllParts: () => PartMetadata[];
  renamePart: (partId: string, newTitle: string) => Promise<void>;

  // Chapters
  getChapter: (chapterId: string) => ChapterMetadata | null;
  setChapter: (chapter: ChapterMetadata) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  getChaptersByPart: (partId: string) => ChapterMetadata[];
  getAllChapters: () => ChapterMetadata[];
  renameChapter: (chapterId: string, newTitle: string) => Promise<void>;

  // Scenes
  getScene: (sceneId: string) => SceneMetadata | null;
  setScene: (scene: SceneMetadata) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  getScenesByChapter: (chapterId: string) => SceneMetadata[];
  getAllScenes: () => SceneMetadata[];
  renameScene: (sceneId: string, newTitle: string) => Promise<void>;

  // Hierarchy operations
  addSceneToChapter: (sceneId: string, chapterId: string) => Promise<void>;
  removeSceneFromChapter: (sceneId: string, chapterId: string) => Promise<void>;
  addChapterToPart: (chapterId: string, partId: string) => Promise<void>;
  removeChapterFromPart: (chapterId: string, partId: string) => Promise<void>;
  reorderScenes: (chapterId: string, sceneIds: string[]) => Promise<void>;
  reorderChapters: (partId: string, chapterIds: string[]) => Promise<void>;

  // Structure
  getManuscriptStructure: () => ManuscriptStructure;
  saveStructure: () => Promise<void>;
  loadStructure: () => Promise<void>;

  // Utilities
  getSceneDocId: (sceneId: string) => string;
  getChapterSceneCount: (chapterId: string) => number;
  getChapterWordCount: (chapterId: string) => number;
  updateSceneWordCount: (sceneId: string, wordCount: number) => Promise<void>;
}

const DB_NAME = 'MondayManuscriptDB';
const DB_VERSION = 1;

export const useManuscriptStore = create<ManuscriptStore>((set, get) => ({
  parts: new Map(),
  chapters: new Map(),
  scenes: new Map(),
  partOrder: [],
  db: null,

  initDB: async () => {
    const db = await openDB<ManuscriptDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('parts')) {
          db.createObjectStore('parts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chapters')) {
          db.createObjectStore('chapters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('scenes')) {
          db.createObjectStore('scenes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('structure')) {
          db.createObjectStore('structure');
        }
      },
    });
    set({ db });

    // Load all data
    await get().loadStructure();
  },

  // Parts
  getPart: (partId) => {
    return get().parts.get(partId) || null;
  },

  setPart: async (part) => {
    const { db, parts } = get();
    parts.set(part.id, part);
    set({ parts: new Map(parts) });

    if (db) {
      await db.put('parts', part);
    }
  },

  deletePart: async (partId) => {
    const { db, parts, partOrder } = get();
    parts.delete(partId);
    const newPartOrder = partOrder.filter(id => id !== partId);
    set({ parts: new Map(parts), partOrder: newPartOrder });

    if (db) {
      await db.delete('parts', partId);
      await get().saveStructure();
    }
  },

  getAllParts: () => {
    const { partOrder, parts } = get();
    return partOrder.map(id => parts.get(id)).filter(Boolean) as PartMetadata[];
  },

  // Chapters
  getChapter: (chapterId) => {
    return get().chapters.get(chapterId) || null;
  },

  setChapter: async (chapter) => {
    const { db, chapters } = get();
    chapters.set(chapter.id, chapter);
    set({ chapters: new Map(chapters) });

    if (db) {
      await db.put('chapters', chapter);
    }
  },

  deleteChapter: async (chapterId) => {
    const { db, chapters } = get();
    const chapter = chapters.get(chapterId);
    
    chapters.delete(chapterId);
    set({ chapters: new Map(chapters) });

    // Remove from parent part
    if (chapter?.part) {
      await get().removeChapterFromPart(chapterId, chapter.part);
    }

    if (db) {
      await db.delete('chapters', chapterId);
    }
  },

  getChaptersByPart: (partId) => {
    const { chapters } = get();
    const part = get().getPart(partId);
    if (!part) return [];
    
    return part.chapters
      .map(id => chapters.get(id))
      .filter(Boolean) as ChapterMetadata[];
  },

  getAllChapters: () => {
    return Array.from(get().chapters.values());
  },

  // Scenes
  getScene: (sceneId) => {
    return get().scenes.get(sceneId) || null;
  },

  setScene: async (scene) => {
    const { db, scenes } = get();
    scenes.set(scene.id, scene);
    set({ scenes: new Map(scenes) });

    if (db) {
      await db.put('scenes', scene);
    }
  },

  deleteScene: async (sceneId) => {
    const { db, scenes } = get();
    const scene = scenes.get(sceneId);
    
    scenes.delete(sceneId);
    set({ scenes: new Map(scenes) });

    // Remove from parent chapter
    if (scene?.chapter) {
      await get().removeSceneFromChapter(sceneId, scene.chapter);
    }

    if (db) {
      await db.delete('scenes', sceneId);
    }
  },

  getScenesByChapter: (chapterId) => {
    const { scenes } = get();
    const chapter = get().getChapter(chapterId);
    if (!chapter) return [];
    
    return chapter.scenes
      .map(id => scenes.get(id))
      .filter(Boolean) as SceneMetadata[];
  },

  getAllScenes: () => {
    return Array.from(get().scenes.values());
  },

  // Rename operations
  renamePart: async (partId, newTitle) => {
    const part = get().getPart(partId);
    if (!part) return;

    part.title = newTitle;
    part.lastModified = Date.now();
    await get().setPart(part);
  },

  renameChapter: async (chapterId, newTitle) => {
    const chapter = get().getChapter(chapterId);
    if (!chapter) return;

    chapter.title = newTitle;
    chapter.lastModified = Date.now();
    await get().setChapter(chapter);
  },

  renameScene: async (sceneId, newTitle) => {
    const scene = get().getScene(sceneId);
    if (!scene) return;

    scene.title = newTitle;
    scene.lastModified = Date.now();
    await get().setScene(scene);
  },

  // Hierarchy operations
  addSceneToChapter: async (sceneId, chapterId) => {
    const chapter = get().getChapter(chapterId);
    if (!chapter) return;

    if (!chapter.scenes.includes(sceneId)) {
      chapter.scenes.push(sceneId);
      await get().setChapter(chapter);
    }

    // Update scene's chapter reference
    const scene = get().getScene(sceneId);
    if (scene && scene.chapter !== chapterId) {
      scene.chapter = chapterId;
      await get().setScene(scene);
    }
  },

  removeSceneFromChapter: async (sceneId, chapterId) => {
    const chapter = get().getChapter(chapterId);
    if (!chapter) return;

    chapter.scenes = chapter.scenes.filter(id => id !== sceneId);
    await get().setChapter(chapter);
  },

  addChapterToPart: async (chapterId, partId) => {
    const part = get().getPart(partId);
    if (!part) return;

    if (!part.chapters.includes(chapterId)) {
      part.chapters.push(chapterId);
      await get().setPart(part);
    }

    // Update chapter's part reference
    const chapter = get().getChapter(chapterId);
    if (chapter && chapter.part !== partId) {
      chapter.part = partId;
      await get().setChapter(chapter);
    }
  },

  removeChapterFromPart: async (chapterId, partId) => {
    const part = get().getPart(partId);
    if (!part) return;

    part.chapters = part.chapters.filter(id => id !== chapterId);
    await get().setPart(part);
  },

  reorderScenes: async (chapterId, sceneIds) => {
    const chapter = get().getChapter(chapterId);
    if (!chapter) return;

    chapter.scenes = sceneIds;
    chapter.lastModified = Date.now();
    await get().setChapter(chapter);
  },

  reorderChapters: async (partId, chapterIds) => {
    const part = get().getPart(partId);
    if (!part) return;

    part.chapters = chapterIds;
    part.lastModified = Date.now();
    await get().setPart(part);
  },

  // Structure
  getManuscriptStructure: () => {
    const { parts, chapters, scenes, partOrder } = get();
    return {
      parts,
      chapters,
      scenes,
      partOrder,
      lastModified: Date.now(),
    };
  },

  saveStructure: async () => {
    const { db } = get();
    if (!db) return;

    const structure = get().getManuscriptStructure();
    await db.put('structure', structure, 'main');
  },

  loadStructure: async () => {
    const { db } = get();
    if (!db) return;

    // Load all parts, chapters, and scenes
    const parts = await db.getAll('parts');
    const chapters = await db.getAll('chapters');
    const scenes = await db.getAll('scenes');
    const structure = await db.get('structure', 'main');

    const partsMap = new Map(parts.map(p => [p.id, p]));
    const chaptersMap = new Map(chapters.map(c => [c.id, c]));
    const scenesMap = new Map(scenes.map(s => [s.id, s]));

    set({
      parts: partsMap,
      chapters: chaptersMap,
      scenes: scenesMap,
      partOrder: structure?.partOrder || [],
    });
  },

  // Utilities
  getSceneDocId: (sceneId) => {
    return `scene/${sceneId}`;
  },

  getChapterSceneCount: (chapterId) => {
    const chapter = get().getChapter(chapterId);
    return chapter?.scenes.length || 0;
  },

  getChapterWordCount: (chapterId) => {
    const scenes = get().getScenesByChapter(chapterId);
    return scenes.reduce((total, scene) => total + (scene.wordsCurrent || 0), 0);
  },

  updateSceneWordCount: async (sceneId, wordCount) => {
    const scene = get().getScene(sceneId);
    if (!scene) return;

    scene.wordsCurrent = wordCount;
    scene.lastModified = Date.now();
    await get().setScene(scene);

    // Update chapter's total word count
    const chapter = get().getChapter(scene.chapter);
    if (chapter) {
      chapter.currentWords = get().getChapterWordCount(scene.chapter);
      await get().setChapter(chapter);
    }
  },
}));

