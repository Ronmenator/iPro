import React from 'react';
import { useOutlineStore } from '../store/outlineStore';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useDocumentStore } from '../store/documentStore';
import { loadYamlFile, loadPcc5FromYaml } from '../utils/pcc5FileIO';

interface OutlinePageProps {
  onOpenWizard: () => void;
}

export default function OutlinePage({ onOpenWizard }: OutlinePageProps) {
  const { cards, chapterCards } = useOutlineStore();
  const { getAllChapters, getAllScenes } = useManuscriptStore();

  const chapters = getAllChapters();
  const scenes = getAllScenes();

  const handleLoadFromYaml = async () => {
    try {
      console.log('=== YAML LOAD START ===');
      console.log('Starting YAML file load...');
      
      const yamlContent = await loadYamlFile();
      console.log('YAML content loaded, length:', yamlContent?.length);
      
      if (!yamlContent) {
        console.log('No YAML content received - user likely cancelled');
        return;
      }

      console.log('Parsing YAML content...');
      const pcc5Data = await loadPcc5FromYaml(yamlContent);
      console.log('YAML parsed successfully', pcc5Data);
      console.log('=== YAML LOAD COMPLETE ===');

      // Update outline store with loaded outline data
      if (pcc5Data.outline && Object.keys(pcc5Data.outline).length > 0) {
        // Convert outline to card for the outline store
        const outlineCard = {
          id: 'outline-1',
          sceneId: 'outline-1',
          type: 'outline' as const,
          title: 'PCC-5 Outline',
          content: pcc5Data.outline,
          goal: '',
          conflict: '',
          outcome: '',
          clock: '',
          crucible: '',
          requiredBeats: [],
          lastModified: Date.now()
        };

        useOutlineStore.getState().setCard(outlineCard);
      }

      // Integrate chapters and scenes into manuscript store
      if (pcc5Data.chapters.length > 0 || pcc5Data.scenes.length > 0) {
        console.log('Integrating chapters and scenes into manuscript store...');
        
        // Create a default part if none exists
        const manuscriptStore = useManuscriptStore.getState();
        const existingParts = manuscriptStore.getAllParts();
        let defaultPartId = 'part-01';
        
        if (existingParts.length === 0) {
          // Create a default part
          const defaultPart = {
            id: 'part-01',
            title: 'Part I',
            number: 1,
            summary: 'The main story',
            chapters: [],
            lastModified: Date.now()
          };
          await manuscriptStore.setPart(defaultPart);
          
          // Add to partOrder (following the same pattern as + button)
          const { partOrder } = manuscriptStore;
          const newPartOrder = [...partOrder, 'part-01'];
          useManuscriptStore.setState({ partOrder: newPartOrder });
        } else {
          defaultPartId = existingParts[0].id;
        }

        // Convert and store chapters
        let chapterCounter = 1;
        for (const pcc5Chapter of pcc5Data.chapters) {
          const chapterNumber = parseInt(pcc5Chapter.id.replace('ch-', '')) || chapterCounter;
          const chapterMetadata = {
            id: pcc5Chapter.id,
            part: defaultPartId,
            title: `Chapter ${String(chapterNumber).padStart(2, '0')}: ${pcc5Chapter.title}`,
            number: chapterNumber,
            pov: pcc5Chapter.pov,
            summary: pcc5Chapter.summary,
            lastModified: Date.now(),
            scenes: [] // Will be populated when we process scenes
          };
          chapterCounter++;
          
          await manuscriptStore.setChapter(chapterMetadata);
          
          // Add chapter to part (following the same pattern as + button)
          await manuscriptStore.addChapterToPart(pcc5Chapter.id, defaultPartId);
          console.log('Stored chapter:', pcc5Chapter.id);
        }

        // Convert and store scenes
        // Group scenes by chapter to get proper scene numbering within each chapter
        const scenesByChapter = new Map<string, any[]>();
        for (const pcc5Scene of pcc5Data.scenes) {
          if (!scenesByChapter.has(pcc5Scene.chapter)) {
            scenesByChapter.set(pcc5Scene.chapter, []);
          }
          scenesByChapter.get(pcc5Scene.chapter)!.push(pcc5Scene);
        }

        for (const [chapterId, chapterScenes] of scenesByChapter) {
          let sceneCounter = 1;
          for (const pcc5Scene of chapterScenes) {
            const sceneMetadata = {
              id: pcc5Scene.id,
              chapter: pcc5Scene.chapter,
              title: `Scene ${String(sceneCounter).padStart(2, '0')}`,
              location: pcc5Scene.location,
              pov: pcc5Scene.pov,
              goal: pcc5Scene.goal,
              conflict: pcc5Scene.conflict,
              outcome: pcc5Scene.outcome,
              clock: pcc5Scene.clock,
              crucible: pcc5Scene.crucible,
              wordsTarget: pcc5Scene.words_target,
              wordsCurrent: 0,
              lastModified: Date.now()
            };
            sceneCounter++;
            
            await manuscriptStore.setScene(sceneMetadata);
            
            // Add scene to chapter
            await manuscriptStore.addSceneToChapter(pcc5Scene.id, pcc5Scene.chapter);
            
            // Create an empty document for the scene (following the same pattern as + button)
            const { createDocument } = useDocumentStore.getState();
            await createDocument(`scene/${pcc5Scene.id}`, sceneMetadata.title, [
              {
                id: 'p_001',
                type: 'paragraph',
                text: '',
              },
            ]);
            
            // Create outline card for the scene with YAML data
            const { setCard } = useOutlineStore.getState();
            const outlineCard = {
              id: `outline_${pcc5Scene.id}`,
              sceneId: `scene/${pcc5Scene.id}`,
              chapterId: pcc5Scene.chapter,
              title: sceneMetadata.title,
              goal: pcc5Scene.goal || '',
              conflict: pcc5Scene.conflict || '',
              outcome: pcc5Scene.outcome || '',
              clock: pcc5Scene.clock || '',
              crucible: pcc5Scene.crucible || '',
              requiredBeats: [],
              lastModified: Date.now(),
            };
            setCard(outlineCard);
            
            console.log('Stored scene:', pcc5Scene.id, 'in chapter:', pcc5Scene.chapter);
          }
        }

        // Save structure (following the same pattern as + button)
        await manuscriptStore.saveStructure();
        console.log('Integration complete!');
      }

      // Show success message
      if (pcc5Data.chapters.length > 0 || pcc5Data.scenes.length > 0) {
        alert(`Successfully loaded YAML file!\n\n📋 Outline: ${Object.keys(pcc5Data.outline).length} sections\n👥 Characters: ${pcc5Data.characters.length}\n📖 Chapters: ${pcc5Data.chapters.length}\n🎬 Scenes: ${pcc5Data.scenes.length}\n\nAll data has been integrated into the manuscript structure!`);
      } else {
        alert(`Successfully loaded YAML file!\n\n📋 Outline: ${Object.keys(pcc5Data.outline).length} sections\n👥 Characters: ${pcc5Data.characters.length}\n\nOutline data has been loaded into the outline store.`);
      }

    } catch (error) {
      console.error('Error loading YAML file:', error);
      alert(`Failed to load YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
              onClick={handleLoadFromYaml}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Load from YAML</span>
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
