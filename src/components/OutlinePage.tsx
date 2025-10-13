import React from 'react';
import { useOutlineStore } from '../store/outlineStore';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useDocumentStore } from '../store/documentStore';
// JSON import not needed - using native JSON methods

interface OutlinePageProps {
  onOpenWizard: () => void;
}

export default function OutlinePage({ onOpenWizard }: OutlinePageProps) {
  const { cards, chapterCards, clearAllCards } = useOutlineStore();
  const { getAllChapters, getAllScenes } = useManuscriptStore();

  const chapters = getAllChapters();
  const scenes = getAllScenes();

  const handleLoadFromJson = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        console.log('=== JSON LOADER ===');
        
        // Read and parse JSON file
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        if (!jsonData) {
          throw new Error('Invalid JSON format or empty file.');
        }

        console.log('JSON data loaded:', jsonData);

        // Get manuscript store and clear existing data before loading new book
        const manuscriptStore = useManuscriptStore.getState();
        console.log('Clearing existing manuscript data...');
        await manuscriptStore.clearAllChapters();
        await manuscriptStore.clearAllScenes();
        
        // Clear outline cards as well
        const outlineStore = useOutlineStore.getState();
        await outlineStore.clearAllCards();

        // Get current manuscript state (should be empty now)
        const existingChapters = manuscriptStore.getAllChapters();
        
        // Find the highest chapter number
        let maxChapterNumber = 0;
        for (const chapter of existingChapters.values()) {
          if (chapter.number && chapter.number > maxChapterNumber) {
            maxChapterNumber = chapter.number;
          }
        }
        const nextChapterNumber = maxChapterNumber + 1;
        
        // Process chapters
        const newChapterIds: string[] = [];
        let chapterCounter = nextChapterNumber;
        
        if (jsonData.chapters && Array.isArray(jsonData.chapters)) {
          console.log(`Processing ${jsonData.chapters.length} chapters...`);
          
          for (const jsonChapter of jsonData.chapters) {
            if (!jsonChapter.id || !jsonChapter.title) {
              console.warn('Skipping chapter without ID or title:', jsonChapter);
              continue;
            }

            // Generate unique chapter ID
            const newChapterId = `ch-${String(chapterCounter).padStart(2, '0')}`;
            newChapterIds.push(newChapterId);
            
            // Create chapter metadata
            const chapterMetadata = {
              id: newChapterId,
              title: `Chapter ${String(chapterCounter).padStart(2, '0')}: ${jsonChapter.title}`,
              number: chapterCounter,
              pov: jsonChapter.pov || '',
              summary: jsonChapter.summary || '',
              lastModified: Date.now(),
              scenes: []
            };
            
            // Store chapter
            await manuscriptStore.setChapter(chapterMetadata);
            console.log(`Created chapter: ${newChapterId} - ${jsonChapter.title}`);
            
            chapterCounter++;
          }
        }

        // Process scenes
        let totalScenesCreated = 0;
        
        if (jsonData.scenes && Array.isArray(jsonData.scenes)) {
          console.log(`Processing ${jsonData.scenes.length} scenes...`);
          
          // Group scenes by their original chapter ID
          const scenesByOriginalChapter = new Map<string, any[]>();
          for (const jsonScene of jsonData.scenes) {
            if (!jsonScene.id || !jsonScene.chapter) {
              console.warn('Skipping scene without ID or chapter:', jsonScene);
              continue;
            }
            
            if (!scenesByOriginalChapter.has(jsonScene.chapter)) {
              scenesByOriginalChapter.set(jsonScene.chapter, []);
            }
            scenesByOriginalChapter.get(jsonScene.chapter)!.push(jsonScene);
          }

          // Map original chapter IDs to new chapter IDs
          const chapterIdMapping = new Map<string, string>();
          if (jsonData.chapters && Array.isArray(jsonData.chapters)) {
            jsonData.chapters.forEach((jsonChapter: any, index: number) => {
              if (jsonChapter.id && newChapterIds[index]) {
                chapterIdMapping.set(jsonChapter.id, newChapterIds[index]);
              }
            });
          }

          // Process scenes for each chapter
          for (const [originalChapterId, chapterScenes] of scenesByOriginalChapter) {
            const newChapterId = chapterIdMapping.get(originalChapterId);
            if (!newChapterId) {
              console.warn(`No mapping found for chapter ${originalChapterId}, skipping ${chapterScenes.length} scenes`);
              continue;
            }

            // Verify chapter exists
            const chapter = manuscriptStore.getChapter(newChapterId);
            if (!chapter) {
              console.warn(`Chapter ${newChapterId} not found, skipping ${chapterScenes.length} scenes`);
              continue;
            }

            // Process scenes in this chapter
            let sceneCounter = 1;
            for (const jsonScene of chapterScenes) {
              // Generate unique scene ID
              const newSceneId = `${newChapterId}-scene-${String(sceneCounter).padStart(2, '0')}`;
              
              // Create scene metadata
              const sceneMetadata = {
                id: newSceneId,
                chapter: newChapterId,
                title: `Scene ${String(sceneCounter).padStart(2, '0')}`,
                location: jsonScene.location || '',
                pov: jsonScene.pov || '',
                goal: jsonScene.goal || '',
                conflict: jsonScene.conflict || '',
                disaster: jsonScene.disaster || '',
                reaction: jsonScene.reaction || '',
                dilemma: jsonScene.dilemma || '',
                decision: jsonScene.decision || '',
                lastModified: Date.now()
              };

              // Store scene
              await manuscriptStore.setScene(sceneMetadata);
              
              // Add scene to chapter
              await manuscriptStore.addSceneToChapter(newSceneId, newChapterId);
              
              // Create document for scene with embedded outline details
              const { createDocument } = useDocumentStore.getState();
              const sceneContent = `# ${sceneMetadata.title}

## Scene Outline
**Goal:** ${jsonScene.goal || 'TBD'}
**Conflict:** ${jsonScene.conflict || 'TBD'}
**Outcome:** ${jsonScene.outcome || 'TBD'}
**Location:** ${jsonScene.location || 'TBD'}
**Clock:** ${jsonScene.clock || 'TBD'}
**Crucible:** ${jsonScene.crucible || 'TBD'}
**POV:** ${jsonScene.pov || 'TBD'}

---

## Scene Content
*Write your scene here...*`;

              await createDocument(`scene/${newSceneId}`, sceneMetadata.title, [
                {
                  id: 'p_001',
                  type: 'paragraph',
                  text: sceneContent,
                },
              ]);
              
              console.log(`Created scene: ${newSceneId} in chapter ${newChapterId}`);
              totalScenesCreated++;
              sceneCounter++;
            }
          }
        }

        // Update chapter order (replace with new chapters only)
        if (newChapterIds.length > 0) {
          useManuscriptStore.setState({ chapterOrder: newChapterIds });
        }

        // Save structure
        await manuscriptStore.saveStructure();

        // Show success message
        const chapterCount = newChapterIds.length;
        alert(`✅ Successfully loaded new book!\n🧹 Cleared existing data\n📚 Created ${chapterCount} chapters\n🎬 Created ${totalScenesCreated} scenes`);

        console.log('=== JSON LOADER COMPLETE ===');

      } catch (error) {
        console.error('Failed to load JSON file:', error);
        alert(`Failed to load JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Outline</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your story structure and scene outlines
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLoadFromJson}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Load from JSON</span>
            </button>
            <button
              onClick={onOpenWizard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Generate from Idea</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {chapters.length}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Chapters</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {scenes.length}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Scenes</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Array.from(cards.values()).length}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Outline Cards</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Array.from(chapterCards.values()).length}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-300">Chapter Cards</div>
            </div>
          </div>

          {/* Chapter Outlines */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Chapter Outlines
            </h2>
            {Array.from(chapterCards.values()).length > 0 ? (
              <div className="space-y-4">
                {Array.from(chapterCards.values()).map((chapterCard) => (
                  <div key={chapterCard.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                          {chapterCard.title}
                        </h3>
                        {chapterCard.summary && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {chapterCard.summary}
                          </p>
                        )}
                        {chapterCard.pov && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">POV:</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300 ml-1">{chapterCard.pov}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chapterCard.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-gray-400 dark:text-gray-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No chapter outlines yet</p>
                <button
                  onClick={onOpenWizard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Generate from Idea
                </button>
              </div>
            )}
          </div>

          {/* Scene Outlines */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scene Outlines
            </h2>
            {Array.from(cards.values()).length > 0 ? (
              <div className="space-y-3">
                {Array.from(cards.values()).map((card) => (
                  <div key={card.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                          {card.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Goal:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.goal}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conflict:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.conflict}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Outcome:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.outcome}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Clock:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.clock}</p>
                          </div>
                        </div>
                        {card.crucible && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Crucible:</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.crucible}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                        {new Date(card.lastModified).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-gray-400 dark:text-gray-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No scene outlines yet</p>
                <button
                  onClick={onOpenWizard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Generate from Idea
                </button>
              </div>
            )}
          </div>

          {/* Getting Started */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              🎭 PCC-5 Story Structure Wizard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate a complete book skeleton using the PCC-5 Method (Promise, Countdown, Crucible, Expansion, Fulfillment). 
              Perfect for turning your story idea into a structured outline with characters, chapters, and scenes.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onOpenWizard}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Start Wizard
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                Takes 1-2 minutes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
