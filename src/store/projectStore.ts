import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Project metadata
export interface ProjectMetadata {
  name: string;
  author: string;
  description: string;
  created: number;
  lastModified: number;
  version: string;
}

// Git history entry
export interface GitCommit {
  id: string;
  message: string;
  timestamp: number;
  batchId: string;
  operations: any[];
}

interface ProjectDB extends DBSchema {
  metadata: {
    key: string;
    value: ProjectMetadata;
  };
  commits: {
    key: string;
    value: GitCommit;
  };
}

interface ProjectStore {
  metadata: ProjectMetadata;
  commits: GitCommit[];
  db: IDBPDatabase<ProjectDB> | null;
  
  // Actions
  initDB: () => Promise<void>;
  loadMetadata: () => Promise<void>;
  saveMetadata: (metadata: Partial<ProjectMetadata>) => Promise<void>;
  addCommit: (commit: GitCommit) => Promise<void>;
  getCommitHistory: () => Promise<GitCommit[]>;
  clearHistory: () => Promise<void>;
}

const DB_NAME = 'MondayProjectDB';
const DB_VERSION = 1;

const defaultMetadata: ProjectMetadata = {
  name: 'MyBook',
  author: '',
  description: '',
  created: Date.now(),
  lastModified: Date.now(),
  version: '1.0.0',
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  metadata: defaultMetadata,
  commits: [],
  db: null,

  initDB: async () => {
    const db = await openDB<ProjectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
        if (!db.objectStoreNames.contains('commits')) {
          db.createObjectStore('commits', { keyPath: 'id' });
        }
      },
    });
    set({ db });
    
    // Load metadata
    const metadata = await db.get('metadata', 'project');
    if (metadata) {
      set({ metadata });
    } else {
      // Save default
      await db.put('metadata', defaultMetadata, 'project');
    }
    
    // Load commits
    const commits = await db.getAll('commits');
    set({ commits });
  },

  loadMetadata: async () => {
    const { db } = get();
    if (db) {
      const metadata = await db.get('metadata', 'project');
      if (metadata) {
        set({ metadata });
      }
    }
  },

  saveMetadata: async (updates: Partial<ProjectMetadata>) => {
    const { db, metadata } = get();
    const updatedMetadata = {
      ...metadata,
      ...updates,
      lastModified: Date.now(),
    };
    
    set({ metadata: updatedMetadata });
    
    if (db) {
      await db.put('metadata', updatedMetadata, 'project');
    }
  },

  addCommit: async (commit: GitCommit) => {
    const { db, commits } = get();
    const newCommits = [...commits, commit];
    set({ commits: newCommits });
    
    if (db) {
      await db.put('commits', commit);
    }
  },

  getCommitHistory: async () => {
    const { db } = get();
    if (db) {
      const commits = await db.getAll('commits');
      set({ commits });
      return commits;
    }
    return [];
  },

  clearHistory: async () => {
    const { db } = get();
    if (db) {
      const tx = db.transaction('commits', 'readwrite');
      await tx.store.clear();
      await tx.done;
    }
    set({ commits: [] });
  },
}));

