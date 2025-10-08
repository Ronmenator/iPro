import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Document, Block } from '../types/ops';
import { hashDocument, hashBlock, normalizeText } from '../utils/hashing';

// IndexedDB Schema
interface DocDB extends DBSchema {
  documents: {
    key: string;
    value: Document;
  };
}

// Zustand Store
interface DocumentStore {
  documents: Map<string, Document>;
  currentDocId: string | null;
  currentSceneId: string | null;  // Track current scene
  currentChapterId: string | null; // Track current chapter
  db: IDBPDatabase<DocDB> | null;
  
  // Actions
  initDB: () => Promise<void>;
  loadDocument: (docId: string) => Promise<Document | null>;
  saveDocument: (doc: Document) => Promise<void>;
  setCurrentDoc: (docId: string) => void;
  getCurrentDoc: () => Document | null;
  updateDocument: (docId: string, blocks: Block[]) => Promise<void>;
  createDocument: (id: string, title: string, blocks: Block[]) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  getAllDocuments: () => Promise<Document[]>;
  
  // Scene-aware methods
  setCurrentScene: (sceneId: string, chapterId?: string) => void;
  loadScene: (sceneId: string) => Promise<Document | null>;
  getSceneDocId: (sceneId: string) => string;
  getSceneIdFromDocId: (docId: string) => string | null;
}

const DB_NAME = 'MondayWriterDB';
const DB_VERSION = 1;

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: new Map(),
  currentDocId: null,
  currentSceneId: null,
  currentChapterId: null,
  db: null,

  initDB: async () => {
    const db = await openDB<DocDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
      },
    });
    set({ db });
    
    // Load all documents into memory
    const allDocs = await db.getAll('documents');
    const docMap = new Map<string, Document>();
    allDocs.forEach(doc => docMap.set(doc.id, doc));
    set({ documents: docMap });
  },

  loadDocument: async (docId: string) => {
    const { db, documents } = get();
    
    // Check memory first
    if (documents.has(docId)) {
      return documents.get(docId)!;
    }
    
    // Load from IndexedDB
    if (db) {
      const doc = await db.get('documents', docId);
      if (doc) {
        // Only update if document is not already in memory or is different
        const existingDoc = documents.get(docId);
        if (!existingDoc || existingDoc.baseVersion !== doc.baseVersion) {
          documents.set(docId, doc);
          set({ documents: new Map(documents) });
        }
        return doc;
      }
    }
    
    return null;
  },

  saveDocument: async (doc: Document) => {
    const { db, documents } = get();

    // Check if document has actually changed
    const existingDoc = documents.get(doc.id);
    if (existingDoc && existingDoc.baseVersion === doc.baseVersion) {
      // Document hasn't changed, just persist to IndexedDB
      if (db) {
        await db.put('documents', doc);
      }
      return;
    }

    // Update memory only if document has changed
    documents.set(doc.id, doc);
    set({ documents: new Map(documents) });

    // Persist to IndexedDB
    if (db) {
      await db.put('documents', doc);
    }
  },

  setCurrentDoc: (docId: string) => {
    set({ currentDocId: docId });
  },

  getCurrentDoc: () => {
    const { documents, currentDocId } = get();
    if (!currentDocId) return null;
    return documents.get(currentDocId) || null;
  },

  updateDocument: async (docId: string, blocks: Block[]) => {
    const { documents } = get();
    const doc = documents.get(docId);
    if (!doc) return;

    // Recompute hashes
    const blocksWithHashes = await Promise.all(
      blocks.map(async (block) => ({
        ...block,
        hash: await hashBlock(block.text),
      }))
    );

    const baseVersion = await hashDocument(blocksWithHashes);
    
    const updatedDoc: Document = {
      ...doc,
      blocks: blocksWithHashes,
      baseVersion,
      lastModified: Date.now(),
    };

    await get().saveDocument(updatedDoc);
  },

  createDocument: async (id: string, title: string, blocks: Block[]) => {
    // Compute hashes for all blocks
    const blocksWithHashes = await Promise.all(
      blocks.map(async (block) => ({
        ...block,
        hash: await hashBlock(block.text),
      }))
    );

    const baseVersion = await hashDocument(blocksWithHashes);

    const doc: Document = {
      id,
      title,
      blocks: blocksWithHashes,
      baseVersion,
      lastModified: Date.now(),
    };

    await get().saveDocument(doc);
    return doc;
  },

  deleteDocument: async (id: string) => {
    const { db, documents } = get();
    
    // Remove from memory
    documents.delete(id);
    set({ documents: new Map(documents) });
    
    // Remove from IndexedDB
    if (db) {
      await db.delete('documents', id);
    }
  },

  getAllDocuments: async () => {
    const { db } = get();
    if (!db) return [];
    return db.getAll('documents');
  },

  // Scene-aware methods
  setCurrentScene: (sceneId: string, chapterId?: string) => {
    const docId = get().getSceneDocId(sceneId);
    set({ 
      currentDocId: docId, 
      currentSceneId: sceneId,
      currentChapterId: chapterId || null,
    });
  },

  loadScene: async (sceneId: string) => {
    const docId = get().getSceneDocId(sceneId);
    return get().loadDocument(docId);
  },

  getSceneDocId: (sceneId: string) => {
    // Convert scene-01 to scene/scene-01 format
    return `scene/${sceneId}`;
  },

  getSceneIdFromDocId: (docId: string) => {
    // Convert scene/scene-01 to scene-01
    if (docId.startsWith('scene/')) {
      return docId.replace('scene/', '');
    }
    return null;
  },
}));

