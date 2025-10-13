import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SceneData {
  id: string;
  title: string;
  content: string;
  outline: {
    goal: string;
    conflict: string;
    outcome: string;
    location: string;
    clock: string;
    crucible: string;
    pov: string;
  };
  metadata: {
    chapter: string;
    wordsTarget?: number;
    wordsCurrent?: number;
    time?: string;
  };
  lastModified: number;
}

interface SceneStore {
  currentScene: SceneData | null;
  setCurrentScene: (scene: SceneData | null) => void;
  updateSceneContent: (content: string) => void;
  updateSceneOutline: (outline: Partial<SceneData['outline']>) => void;
  updateSceneMetadata: (metadata: Partial<SceneData['metadata']>) => void;
  saveScene: () => Promise<void>;
  loadScene: (sceneId: string) => Promise<void>;
}

export const useSceneStore = create<SceneStore>()(
  persist(
    (set, get) => ({
      currentScene: null,
      
      setCurrentScene: (scene) => {
        set({ currentScene: scene });
      },
      
      updateSceneContent: (content) => {
        const { currentScene } = get();
        if (currentScene) {
          set({
            currentScene: {
              ...currentScene,
              content,
              lastModified: Date.now()
            }
          });
        }
      },
      
      updateSceneOutline: (outline) => {
        const { currentScene } = get();
        if (currentScene) {
          set({
            currentScene: {
              ...currentScene,
              outline: {
                ...currentScene.outline,
                ...outline
              },
              lastModified: Date.now()
            }
          });
        }
      },
      
      updateSceneMetadata: (metadata) => {
        const { currentScene } = get();
        if (currentScene) {
          set({
            currentScene: {
              ...currentScene,
              metadata: {
                ...currentScene.metadata,
                ...metadata
              },
              lastModified: Date.now()
            }
          });
        }
      },
      
      saveScene: async () => {
        const { currentScene } = get();
        if (!currentScene) return;
        
        try {
          // Convert scene data to document format for persistence
          const blocks = [
            {
              id: `scene-${currentScene.id}-content`,
              type: 'paragraph' as const,
              text: currentScene.content,
              hash: '' // Will be computed by document store
            }
          ];
          
          // Save to document store
          const { useDocumentStore } = await import('../store/documentStore');
          const { updateDocument } = useDocumentStore.getState();
          await updateDocument(`scene/${currentScene.id}`, blocks);
          
          // Save to manuscript store
          const { useManuscriptStore } = await import('../store/manuscriptStore');
          const { updateScene } = useManuscriptStore.getState();
          await updateScene(currentScene.id, {
            title: currentScene.title,
            chapter: currentScene.metadata.chapter,
            location: currentScene.outline.location,
            time: currentScene.metadata.time,
            wordsTarget: currentScene.metadata.wordsTarget,
            wordsCurrent: currentScene.content.split(/\s+/).length
          });
          
          console.log('Scene saved successfully:', currentScene.id);
        } catch (error) {
          console.error('Failed to save scene:', error);
        }
      },
      
      loadScene: async (sceneId: string) => {
        try {
          // Load from document store
          const { useDocumentStore } = await import('../store/documentStore');
          const { loadDocument } = useDocumentStore.getState();
          const doc = await loadDocument(`scene/${sceneId}`);
          
          // Load from manuscript store
          const { useManuscriptStore } = await import('../store/manuscriptStore');
          const { getScene } = useManuscriptStore.getState();
          const sceneMetadata = getScene(sceneId);
          
          if (doc && sceneMetadata) {
            // Parse outline from content
            const { parseSceneOutline } = await import('../utils/sceneOutline');
            const outline = parseSceneOutline(doc.blocks[0]?.text || '');
            
            const sceneData: SceneData = {
              id: sceneId,
              title: sceneMetadata.title,
              content: doc.blocks[0]?.text || '',
              outline: {
                goal: outline.goal || '',
                conflict: outline.conflict || '',
                outcome: outline.outcome || '',
                location: outline.location || '',
                clock: outline.clock || '',
                crucible: outline.crucible || '',
                pov: outline.pov || ''
              },
              metadata: {
                chapter: sceneMetadata.chapter,
                wordsTarget: sceneMetadata.wordsTarget,
                wordsCurrent: sceneMetadata.wordsCurrent,
                time: sceneMetadata.time
              },
              lastModified: doc.lastModified
            };
            
            set({ currentScene: sceneData });
            console.log('Scene loaded successfully:', sceneId);
          }
        } catch (error) {
          console.error('Failed to load scene:', error);
        }
      }
    }),
    {
      name: 'scene-store',
      partialize: (state) => ({ currentScene: state.currentScene })
    }
  )
);
