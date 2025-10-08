import { create } from 'zustand';
import { OutlineCard, ChapterOutlineCard, DeleteGuardResult } from '../types/outline';

interface OutlineStore {
  cards: Map<string, OutlineCard>;
  chapterCards: Map<string, ChapterOutlineCard>;
  
  // Scene Actions
  getCard: (sceneId: string) => OutlineCard | null;
  setCard: (card: OutlineCard) => void;
  updateCard: (sceneId: string, updates: Partial<OutlineCard>) => void;
  deleteCard: (sceneId: string) => void;
  addRequiredBeat: (sceneId: string, blockId: string) => void;
  removeRequiredBeat: (sceneId: string, blockId: string) => void;
  checkDeleteGuard: (sceneId: string, blockId: string) => DeleteGuardResult;
  getCardsByChapter: (chapterId: string) => OutlineCard[];
  renameCard: (sceneId: string, newTitle: string) => void;
  
  // Chapter Actions
  getChapterCard: (chapterId: string) => ChapterOutlineCard | null;
  setChapterCard: (card: ChapterOutlineCard) => void;
  updateChapterCard: (chapterId: string, updates: Partial<ChapterOutlineCard>) => void;
  deleteChapterCard: (chapterId: string) => void;
  renameChapterCard: (chapterId: string, newTitle: string) => void;
  
  // Initialize
  initializeDefaultCards: () => void;
}

export const useOutlineStore = create<OutlineStore>((set, get) => ({
  cards: new Map(),
  chapterCards: new Map(),

  // Scene Actions
  getCard: (sceneId) => {
    return get().cards.get(sceneId) || null;
  },

  setCard: (card) => {
    const { cards } = get();
    cards.set(card.sceneId, card);
    set({ cards: new Map(cards) });
  },

  updateCard: (sceneId, updates) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card) {
      cards.set(sceneId, { ...card, ...updates, lastModified: Date.now() });
      set({ cards: new Map(cards) });
    }
  },

  deleteCard: (sceneId) => {
    const { cards } = get();
    cards.delete(sceneId);
    set({ cards: new Map(cards) });
  },

  addRequiredBeat: (sceneId, blockId) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card && !card.requiredBeats.includes(blockId)) {
      cards.set(sceneId, {
        ...card,
        requiredBeats: [...card.requiredBeats, blockId],
        lastModified: Date.now(),
      });
      set({ cards: new Map(cards) });
    }
  },

  removeRequiredBeat: (sceneId, blockId) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card) {
      cards.set(sceneId, {
        ...card,
        requiredBeats: card.requiredBeats.filter(id => id !== blockId),
        lastModified: Date.now(),
      });
      set({ cards: new Map(cards) });
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

  renameCard: (sceneId, newTitle) => {
    const { cards } = get();
    const card = cards.get(sceneId);
    if (card) {
      cards.set(sceneId, { ...card, title: newTitle, lastModified: Date.now() });
      set({ cards: new Map(cards) });
    }
  },

  // Chapter Actions
  getChapterCard: (chapterId) => {
    return get().chapterCards.get(chapterId) || null;
  },

  setChapterCard: (card) => {
    const { chapterCards } = get();
    chapterCards.set(card.chapterId, card);
    set({ chapterCards: new Map(chapterCards) });
  },

  updateChapterCard: (chapterId, updates) => {
    const { chapterCards } = get();
    const card = chapterCards.get(chapterId);
    if (card) {
      chapterCards.set(chapterId, { ...card, ...updates, lastModified: Date.now() });
      set({ chapterCards: new Map(chapterCards) });
    }
  },

  deleteChapterCard: (chapterId) => {
    const { chapterCards } = get();
    chapterCards.delete(chapterId);
    set({ chapterCards: new Map(chapterCards) });
  },

  renameChapterCard: (chapterId, newTitle) => {
    const { chapterCards } = get();
    const card = chapterCards.get(chapterId);
    if (card) {
      chapterCards.set(chapterId, { ...card, title: newTitle, lastModified: Date.now() });
      set({ chapterCards: new Map(chapterCards) });
    }
  },

  initializeDefaultCards: () => {
    const defaultChapterCards: ChapterOutlineCard[] = [
      {
        id: 'outline_ch_01',
        chapterId: 'ch-01',
        title: 'Chapter 01 - The Haunted House',
        pov: 'Sarah',
        theme: 'Mystery and curiosity',
        summary: 'Sarah discovers a mysterious abandoned house and decides to investigate',
        lastModified: Date.now(),
      },
    ];

    const defaultCards: OutlineCard[] = [
      {
        id: 'outline_scene_01',
        sceneId: 'scene-01',
        chapterId: 'ch-01',
        title: 'Scene 01 - Opening',
        goal: 'Establish the mysterious atmosphere and introduce Sarah',
        conflict: 'The abandoned house appears normal by day but shows strange lights at night',
        outcome: 'Sarah witnesses the lights and decides to investigate',
        clock: 'The lights only appear at midnight',
        crucible: 'Sarah\'s curiosity about the unexplained phenomenon',
        requiredBeats: [],
        lastModified: Date.now(),
      },
      {
        id: 'outline_scene_02',
        sceneId: 'scene-02',
        chapterId: 'ch-01',
        title: 'Scene 02 - Discovery',
        goal: 'Sarah enters the house to find answers',
        conflict: 'The house is dangerous and eerie, with an unknown presence',
        outcome: 'Sarah encounters the keeper and learns she may be trapped',
        clock: 'Daylight is fading, night is approaching',
        crucible: 'The door closes behind her, limiting escape routes',
        requiredBeats: [],
        lastModified: Date.now(),
      },
      {
        id: 'outline_scene_03',
        sceneId: 'scene-03',
        chapterId: 'ch-01',
        title: 'Scene 03 - Confrontation',
        goal: 'Understand who the keeper is and why the house exists',
        conflict: 'The keeper is cryptic and may not be trustworthy',
        outcome: 'Sarah learns she must make a choice that will determine her fate',
        clock: 'Must decide before sunrise',
        crucible: 'The keeper hints that leaving may be impossible',
        requiredBeats: [],
        lastModified: Date.now(),
      },
    ];

    const cards = new Map<string, OutlineCard>();
    defaultCards.forEach(card => cards.set(card.sceneId, card));
    
    const chapterCards = new Map<string, ChapterOutlineCard>();
    defaultChapterCards.forEach(card => chapterCards.set(card.chapterId, card));
    
    set({ cards, chapterCards });
  },
}));

