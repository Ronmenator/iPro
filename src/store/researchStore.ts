import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  ResearchItem, 
  ResearchQuery, 
  ResearchCollection, 
  ResearchStats,
  ResearchType,
  ResearchSource,
  createResearchItem,
  createResearchSource
} from '../types/research';

/**
 * ResearchStore - manages research data for AI-assisted book writing
 * 
 * This store handles:
 * - Storing research items from web searches
 * - Managing research collections
 * - Tracking search queries and results
 * - Providing search and filtering capabilities
 */

interface ResearchDB extends DBSchema {
  researchItems: {
    key: string;
    value: ResearchItem;
  };
  researchQueries: {
    key: string;
    value: ResearchQuery;
  };
  researchCollections: {
    key: string;
    value: ResearchCollection;
  };
}

interface ResearchStore {
  // Data
  researchItems: Map<string, ResearchItem>;
  researchQueries: Map<string, ResearchQuery>;
  researchCollections: Map<string, ResearchCollection>;
  db: IDBPDatabase<ResearchDB> | null;
  
  // Database
  initDB: () => Promise<void>;
  
  // Research Items
  addResearchItem: (item: Omit<ResearchItem, 'id' | 'created' | 'modified' | 'lastAccessed'>) => Promise<ResearchItem>;
  getResearchItem: (id: string) => ResearchItem | null;
  updateResearchItem: (id: string, updates: Partial<ResearchItem>) => Promise<void>;
  deleteResearchItem: (id: string) => Promise<void>;
  getAllResearchItems: () => ResearchItem[];
  searchResearchItems: (query: string, type?: ResearchType) => ResearchItem[];
  getResearchItemsByType: (type: ResearchType) => ResearchItem[];
  getResearchItemsByTags: (tags: string[]) => ResearchItem[];
  
  // Research Queries
  addResearchQuery: (query: Omit<ResearchQuery, 'id'>) => Promise<ResearchQuery>;
  getResearchQuery: (id: string) => ResearchQuery | null;
  getAllResearchQueries: () => ResearchQuery[];
  getRecentQueries: (limit?: number) => ResearchQuery[];
  
  // Research Collections
  createCollection: (name: string, description?: string, tags?: string[]) => Promise<ResearchCollection>;
  getCollection: (id: string) => ResearchCollection | null;
  updateCollection: (id: string, updates: Partial<ResearchCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addItemToCollection: (collectionId: string, itemId: string) => Promise<void>;
  removeItemFromCollection: (collectionId: string, itemId: string) => Promise<void>;
  getAllCollections: () => ResearchCollection[];
  
  // Statistics
  getResearchStats: () => ResearchStats;
  
  // Utilities
  generateId: (prefix: string) => string;
  markItemAccessed: (id: string) => Promise<void>;
  getRelatedItems: (itemId: string) => ResearchItem[];
  addRelatedItems: (itemId: string, relatedIds: string[]) => Promise<void>;
}

const DB_NAME = 'MondayResearchDB';
const DB_VERSION = 1;

export const useResearchStore = create<ResearchStore>((set, get) => ({
  // Data
  researchItems: new Map(),
  researchQueries: new Map(),
  researchCollections: new Map(),
  db: null,

  // Database
  initDB: async () => {
    const db = await openDB<ResearchDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('researchItems')) {
          db.createObjectStore('researchItems', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('researchQueries')) {
          db.createObjectStore('researchQueries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('researchCollections')) {
          db.createObjectStore('researchCollections', { keyPath: 'id' });
        }
      },
    });
    set({ db });
    
    // Load all data into memory
    const items = await db.getAll('researchItems');
    const queries = await db.getAll('researchQueries');
    const collections = await db.getAll('researchCollections');
    
    const itemsMap = new Map(items.map(item => [item.id, item]));
    const queriesMap = new Map(queries.map(query => [query.id, query]));
    const collectionsMap = new Map(collections.map(collection => [collection.id, collection]));
    
    set({ 
      researchItems: itemsMap,
      researchQueries: queriesMap,
      researchCollections: collectionsMap
    });
  },

  // Research Items
  addResearchItem: async (itemData) => {
    const { db, researchItems } = get();
    const id = get().generateId('research');
    const now = Date.now();
    
    const item: ResearchItem = {
      ...itemData,
      id,
      created: now,
      modified: now,
      lastAccessed: now
    };
    
    researchItems.set(id, item);
    set({ researchItems: new Map(researchItems) });
    
    if (db) {
      await db.put('researchItems', item);
    }
    
    return item;
  },

  getResearchItem: (id) => {
    return get().researchItems.get(id) || null;
  },

  updateResearchItem: async (id, updates) => {
    const { db, researchItems } = get();
    const item = researchItems.get(id);
    if (!item) return;
    
    const updatedItem = {
      ...item,
      ...updates,
      modified: Date.now()
    };
    
    researchItems.set(id, updatedItem);
    set({ researchItems: new Map(researchItems) });
    
    if (db) {
      await db.put('researchItems', updatedItem);
    }
  },

  deleteResearchItem: async (id) => {
    const { db, researchItems } = get();
    researchItems.delete(id);
    set({ researchItems: new Map(researchItems) });
    
    if (db) {
      await db.delete('researchItems', id);
    }
  },

  getAllResearchItems: () => {
    return Array.from(get().researchItems.values());
  },

  searchResearchItems: (query, type) => {
    const items = get().getAllResearchItems();
    const lowerQuery = query.toLowerCase();
    
    return items
      .filter(item => {
        if (type && item.type !== type) return false;
        
        return (
          item.title.toLowerCase().includes(lowerQuery) ||
          item.content.toLowerCase().includes(lowerQuery) ||
          item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
          item.source.name.toLowerCase().includes(lowerQuery)
        );
      })
      .sort((a, b) => b.relevance - a.relevance);
  },

  getResearchItemsByType: (type) => {
    return get().getAllResearchItems().filter(item => item.type === type);
  },

  getResearchItemsByTags: (tags) => {
    return get().getAllResearchItems().filter(item =>
      tags.some(tag => item.tags.includes(tag))
    );
  },

  // Research Queries
  addResearchQuery: async (queryData) => {
    const { db, researchQueries } = get();
    const id = get().generateId('query');
    
    const query: ResearchQuery = {
      ...queryData,
      id
    };
    
    researchQueries.set(id, query);
    set({ researchQueries: new Map(researchQueries) });
    
    if (db) {
      await db.put('researchQueries', query);
    }
    
    return query;
  },

  getResearchQuery: (id) => {
    return get().researchQueries.get(id) || null;
  },

  getAllResearchQueries: () => {
    return Array.from(get().researchQueries.values());
  },

  getRecentQueries: (limit = 10) => {
    return get().getAllResearchQueries()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },

  // Research Collections
  createCollection: async (name, description, tags = []) => {
    const { db, researchCollections } = get();
    const id = get().generateId('collection');
    const now = Date.now();
    
    const collection: ResearchCollection = {
      id,
      name,
      description,
      items: [],
      tags,
      created: now,
      modified: now
    };
    
    researchCollections.set(id, collection);
    set({ researchCollections: new Map(researchCollections) });
    
    if (db) {
      await db.put('researchCollections', collection);
    }
    
    return collection;
  },

  getCollection: (id) => {
    return get().researchCollections.get(id) || null;
  },

  updateCollection: async (id, updates) => {
    const { db, researchCollections } = get();
    const collection = researchCollections.get(id);
    if (!collection) return;
    
    const updatedCollection = {
      ...collection,
      ...updates,
      modified: Date.now()
    };
    
    researchCollections.set(id, updatedCollection);
    set({ researchCollections: new Map(researchCollections) });
    
    if (db) {
      await db.put('researchCollections', updatedCollection);
    }
  },

  deleteCollection: async (id) => {
    const { db, researchCollections } = get();
    researchCollections.delete(id);
    set({ researchCollections: new Map(researchCollections) });
    
    if (db) {
      await db.delete('researchCollections', id);
    }
  },

  addItemToCollection: async (collectionId, itemId) => {
    const collection = get().getCollection(collectionId);
    if (!collection || collection.items.includes(itemId)) return;
    
    collection.items.push(itemId);
    await get().updateCollection(collectionId, { items: collection.items });
  },

  removeItemFromCollection: async (collectionId, itemId) => {
    const collection = get().getCollection(collectionId);
    if (!collection) return;
    
    collection.items = collection.items.filter(id => id !== itemId);
    await get().updateCollection(collectionId, { items: collection.items });
  },

  getAllCollections: () => {
    return Array.from(get().researchCollections.values());
  },

  // Statistics
  getResearchStats: () => {
    const items = get().getAllResearchItems();
    const queries = get().getAllResearchQueries();
    
    const itemsByType = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<ResearchType, number>);
    
    const itemsBySource = items.reduce((acc, item) => {
      const sourceName = item.source.name;
      acc[sourceName] = (acc[sourceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostAccessed = items
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 5)
      .map(item => item.id);
    
    const recentQueries = get().getRecentQueries(5);
    
    return {
      totalItems: items.length,
      itemsByType,
      itemsBySource,
      lastActivity: Math.max(...items.map(item => item.lastAccessed), 0),
      mostAccessed,
      recentQueries
    };
  },

  // Utilities
  generateId: (prefix) => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`;
  },

  markItemAccessed: async (id) => {
    await get().updateResearchItem(id, { lastAccessed: Date.now() });
  },

  getRelatedItems: (itemId) => {
    const item = get().getResearchItem(itemId);
    if (!item || !item.relatedItems) return [];
    
    return item.relatedItems
      .map(id => get().getResearchItem(id))
      .filter(Boolean) as ResearchItem[];
  },

  addRelatedItems: async (itemId, relatedIds) => {
    const item = get().getResearchItem(itemId);
    if (!item) return;
    
    const currentRelated = item.relatedItems || [];
    const newRelated = [...new Set([...currentRelated, ...relatedIds])];
    
    await get().updateResearchItem(itemId, { relatedItems: newRelated });
  }
}));

