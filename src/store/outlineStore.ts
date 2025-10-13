import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OutlineCard, ChapterOutlineCard, DeleteGuardResult } from '../types/outline';

interface OutlineDB extends DBSchema {
  cards: {
    key: string;
    value: OutlineCard;
  };
  chapterCards: {
    key: string;
    value: ChapterOutlineCard;
  };
}

interface OutlineStore {
  cards: Map<string, OutlineCard>;
  chapterCards: Map<string, ChapterOutlineCard>;
  db: IDBPDatabase<OutlineDB> | null;
  
  // Scene Actions
  getCard: (sceneId: string) => OutlineCard | null;
  setCard: (card: OutlineCard) => Promise<void>;
  updateCard: (sceneId: string, updates: Partial<OutlineCard>) => Promise<void>;
  deleteCard: (sceneId: string) => Promise<void>;
  addRequiredBeat: (sceneId: string, blockId: string) => Promise<void>;
  removeRequiredBeat: (sceneId: string, blockId: string) => Promise<void>;
  checkDeleteGuard: (sceneId: string, blockId: string) => DeleteGuardResult;
  getCardsByChapter: (chapterId: string) => OutlineCard[];
  renameCard: (sceneId: string, newTitle: string) => Promise<void>;
  
  // Chapter Actions
  getChapterCard: (chapterId: string) => ChapterOutlineCard | null;
  setChapterCard: (card: ChapterOutlineCard) => Promise<void>;
  updateChapterCard: (chapterId: string, updates: Partial<ChapterOutlineCard>) => Promise<void>;
  deleteChapterCard: (chapterId: string) => Promise<void>;
  renameChapterCard: (chapterId: string, newTitle: string) => Promise<void>;
  
  // Database
  initDB: () => Promise<void>;
  loadCards: () => Promise<void>;
  saveCard: (card: OutlineCard) => Promise<void>;
  saveChapterCard: (card: ChapterOutlineCard) => Promise<void>;
  
  // Initialize
  initializeDefaultCards: () => void;
  
  // Clear all cards
  clearAllCards: () => Promise<void>;
}

const DB_NAME = 'MondayOutlineDB';
const DB_VERSION = 1;

export const useOutlineStore = create<OutlineStore>((set, get) => ({
  cards: new Map(),
  chapterCards: new Map(),
  db: null,

  // Scene Actions
  getCard: (sceneId) => {
    return get().cards.get(sceneId) || null;
  },

  setCard: async (card) => {
    const { cards } = get();
    cards.set(card.sceneId, card);
    set({ cards: new Map(cards) });
    await get().saveCard(card);
  },

  updateCard: async (sceneId, updates) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card) {
      const updatedCard = { ...card, ...updates, lastModified: Date.now() };
      cards.set(sceneId, updatedCard);
      set({ cards: new Map(cards) });
      await get().saveCard(updatedCard);
    }
  },

  deleteCard: async (sceneId) => {
    const { cards, db } = get();
    cards.delete(sceneId);
    set({ cards: new Map(cards) });
    
    if (db) {
      await db.delete('cards', sceneId);
    }
  },

  addRequiredBeat: async (sceneId, blockId) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card && !card.requiredBeats.includes(blockId)) {
      const updatedCard = {
        ...card,
        requiredBeats: [...card.requiredBeats, blockId],
        lastModified: Date.now(),
      };
      cards.set(sceneId, updatedCard);
      set({ cards: new Map(cards) });
      await get().saveCard(updatedCard);
    }
  },

  removeRequiredBeat: async (sceneId, blockId) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card) {
      const updatedCard = {
        ...card,
        requiredBeats: card.requiredBeats.filter(id => id !== blockId),
        lastModified: Date.now(),
      };
      cards.set(sceneId, updatedCard);
      set({ cards: new Map(cards) });
      await get().saveCard(updatedCard);
    }
  },

  checkDeleteGuard: (sceneId, blockId) => {
    const card = get().cards.get(sceneId);
    
    if (!card) {
      return { allowed: true };
    }

    if (card.requiredBeats.includes(blockId)) {
      return {
        allowed: false,
        reason: 'This block contains a required story beat from the outline.',
        outlineCard: card,
        affectedBeats: [blockId],
      };
    }

    return { allowed: true };
  },

  getCardsByChapter: (chapterId) => {
    const { cards } = get();
    return Array.from(cards.values()).filter(card => card.chapterId === chapterId);
  },

  renameCard: async (sceneId, newTitle) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card) {
      const updatedCard = { ...card, title: newTitle, lastModified: Date.now() };
      cards.set(sceneId, updatedCard);
      set({ cards: new Map(cards) });
      await get().saveCard(updatedCard);
    }
  },

  // Chapter Actions
  getChapterCard: (chapterId) => {
    return get().chapterCards.get(chapterId) || null;
  },

  setChapterCard: async (card) => {
    const { chapterCards } = get();
    chapterCards.set(card.chapterId, card);
    set({ chapterCards: new Map(chapterCards) });
    await get().saveChapterCard(card);
  },

  updateChapterCard: async (chapterId, updates) => {
    const { chapterCards } = get();
    const card = chapterCards.get(chapterId);
    if (card) {
      const updatedCard = { ...card, ...updates, lastModified: Date.now() };
      chapterCards.set(chapterId, updatedCard);
      set({ chapterCards: new Map(chapterCards) });
      await get().saveChapterCard(updatedCard);
    }
  },

  deleteChapterCard: async (chapterId) => {
    const { chapterCards, db } = get();
    chapterCards.delete(chapterId);
    set({ chapterCards: new Map(chapterCards) });
    
    if (db) {
      await db.delete('chapterCards', chapterId);
    }
  },

  renameChapterCard: async (chapterId, newTitle) => {
    const { chapterCards } = get();
    const card = chapterCards.get(chapterId);
    if (card) {
      const updatedCard = { ...card, title: newTitle, lastModified: Date.now() };
      chapterCards.set(chapterId, updatedCard);
      set({ chapterCards: new Map(chapterCards) });
      await get().saveChapterCard(updatedCard);
    }
  },

  // Database
  initDB: async () => {
    const db = await openDB<OutlineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'sceneId' });
        }
        if (!db.objectStoreNames.contains('chapterCards')) {
          db.createObjectStore('chapterCards', { keyPath: 'chapterId' });
        }
      },
    });
    set({ db });
    await get().loadCards();
  },

  loadCards: async () => {
    const { db } = get();
    if (!db) return;

    const cards = await db.getAll('cards');
    const chapterCards = await db.getAll('chapterCards');

    const cardsMap = new Map(cards.map(c => [c.sceneId, c]));
    const chapterCardsMap = new Map(chapterCards.map(c => [c.chapterId, c]));

    set({ cards: cardsMap, chapterCards: chapterCardsMap });
  },

  saveCard: async (card) => {
    const { db } = get();
    if (db) {
      await db.put('cards', card);
    }
  },

  saveChapterCard: async (card) => {
    const { db } = get();
    if (db) {
      await db.put('chapterCards', card);
    }
  },

  initializeDefaultCards: () => {
    // No longer create default cards to avoid scenes without manuscript data
    // Outline cards should only be created when scenes are actually added to the manuscript
    const cards = new Map<string, OutlineCard>();
    const chapterCards = new Map<string, ChapterOutlineCard>();
    
    set({ cards, chapterCards });
  },

  clearAllCards: async () => {
    const { db } = get();
    
    // Clear from memory
    set({ cards: new Map(), chapterCards: new Map() });
    
    // Clear from database
    if (db) {
      const tx = db.transaction(['cards', 'chapterCards'], 'readwrite');
      await tx.objectStore('cards').clear();
      await tx.objectStore('chapterCards').clear();
      await tx.done;
    }
  },
}));

