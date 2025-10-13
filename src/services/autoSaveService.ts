import { useDocumentStore } from '../store/documentStore';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useProjectStore } from '../store/projectStore';
import { useResearchStore } from '../store/researchStore';
import { useChatStore } from '../store/chatStore';
import { useOutlineStore } from '../store/outlineStore';

/**
 * Auto-save service that monitors changes and automatically saves them
 */
class AutoSaveService {
  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;
  private lastSaveTime = 0;
  private saveInterval = 2000; // Save every 2 seconds after changes
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeStores();
  }

  private initializeStores() {
    // Monitor document store changes
    useDocumentStore.subscribe((state, prevState) => {
      if (this.hasDocumentChanges(state, prevState)) {
        this.scheduleSave('document');
      }
    });

    // Monitor manuscript store changes
    useManuscriptStore.subscribe((state, prevState) => {
      if (this.hasManuscriptChanges(state, prevState)) {
        this.scheduleSave('manuscript');
      }
    });

    // Monitor project store changes
    useProjectStore.subscribe((state, prevState) => {
      if (this.hasProjectChanges(state, prevState)) {
        this.scheduleSave('project');
      }
    });

    // Monitor research store changes
    useResearchStore.subscribe((state, prevState) => {
      if (this.hasResearchChanges(state, prevState)) {
        this.scheduleSave('research');
      }
    });

    // Monitor chat store changes
    useChatStore.subscribe((state, prevState) => {
      if (this.hasChatChanges(state, prevState)) {
        this.scheduleSave('chat');
      }
    });
  }

  private hasDocumentChanges(current: any, previous: any): boolean {
    // Check if documents map has changed
    if (current.documents !== previous.documents) {
      return true;
    }
    return false;
  }

  private hasManuscriptChanges(current: any, previous: any): boolean {
    // Check if any manuscript data has changed
    if (current.parts !== previous.parts || 
        current.chapters !== previous.chapters || 
        current.scenes !== previous.scenes ||
        current.partOrder !== previous.partOrder) {
      return true;
    }
    return false;
  }

  private hasProjectChanges(current: any, previous: any): boolean {
    // Check if project metadata has changed
    if (current.metadata !== previous.metadata || 
        current.commits !== previous.commits) {
      return true;
    }
    return false;
  }

  private hasResearchChanges(current: any, previous: any): boolean {
    // Check if research data has changed
    if (current.items !== previous.items || 
        current.relationships !== previous.relationships) {
      return true;
    }
    return false;
  }

  private hasChatChanges(current: any, previous: any): boolean {
    // Check if chat messages have changed
    if (current.messages !== previous.messages) {
      return true;
    }
    return false;
  }

  private scheduleSave(type: string) {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Schedule new save
    this.saveTimeout = setTimeout(() => {
      this.performSave(type);
    }, this.saveInterval);
  }

  private async performSave(type: string) {
    if (this.isSaving) {
      return; // Already saving, skip
    }

    this.isSaving = true;
    this.lastSaveTime = Date.now();

    try {
      // Notify listeners that save is starting
      this.notifyListeners();

      // The stores already handle their own persistence
      // We just need to ensure they're synchronized
      await this.synchronizeStores();
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this.isSaving = false;
    }
  }

  private async synchronizeStores() {
    // Ensure all stores are properly initialized and synchronized
    const documentStore = useDocumentStore.getState();
    const manuscriptStore = useManuscriptStore.getState();
    const projectStore = useProjectStore.getState();
    const researchStore = useResearchStore.getState();
    const chatStore = useChatStore.getState();
    const outlineStore = useOutlineStore.getState();

    // Initialize stores if needed
    if (!documentStore.db) {
      await documentStore.initDB();
    }
    if (!manuscriptStore.db) {
      await manuscriptStore.initDB();
    }
    if (!projectStore.db) {
      await projectStore.initDB();
    }
    if (!researchStore.db) {
      await researchStore.initDB();
    }
    if (!chatStore.db) {
      await chatStore.initDB();
    }
    if (!outlineStore.db) {
      await outlineStore.initDB();
    }

    // Save manuscript structure after any changes
    await manuscriptStore.saveStructure();
    
    // Update project metadata last modified time
    await projectStore.saveMetadata({ lastModified: Date.now() });
  }

  // Public methods
  public addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  public removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  public getSaveStatus() {
    return {
      isSaving: this.isSaving,
      lastSaveTime: this.lastSaveTime,
      timeSinceLastSave: this.lastSaveTime ? Date.now() - this.lastSaveTime : null
    };
  }

  public forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.performSave('manual');
  }

  public setSaveInterval(interval: number) {
    this.saveInterval = interval;
  }
}

// Create singleton instance
export const autoSaveService = new AutoSaveService();

// Export hook for components to use
export function useAutoSave() {
  const [saveStatus, setSaveStatus] = React.useState(autoSaveService.getSaveStatus());

  React.useEffect(() => {
    const updateStatus = () => {
      setSaveStatus(autoSaveService.getSaveStatus());
    };

    autoSaveService.addListener(updateStatus);
    return () => autoSaveService.removeListener(updateStatus);
  }, []);

  return {
    ...saveStatus,
    forceSave: autoSaveService.forceSave,
    setSaveInterval: autoSaveService.setSaveInterval
  };
}

// Import React for the hook
import React from 'react';
