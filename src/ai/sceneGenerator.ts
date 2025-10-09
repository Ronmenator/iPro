import { getLLMClient } from './providers';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useOutlineStore } from '../store/outlineStore';
import { useDocumentStore } from '../store/documentStore';
import { SceneMetadata } from '../types/manuscript';

export interface SceneGenerationResult {
  success: boolean;
  scenes: SceneMetadata[];
  chapterId: string;
  message?: string;
  error?: string;
}

/**
 * Generate scenes for a specific chapter using AI
 */
export async function generateScenesForChapter(chapterId: string): Promise<SceneGenerationResult> {
  const client = getLLMClient();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  // Get chapter data
  const getChapter = useManuscriptStore.getState().getChapter;
  const getScenesByChapter = useManuscriptStore.getState().getScenesByChapter;
  const getChapterCard = useOutlineStore.getState().getChapterCard;
  const setScene = useManuscriptStore.getState().setScene;
  const addSceneToChapter = useManuscriptStore.getState().addSceneToChapter;
  const saveStructure = useManuscriptStore.getState().saveStructure;
  const setCard = useOutlineStore.getState().setCard;

  const chapter = getChapter(chapterId);
  if (!chapter) {
    throw new Error(`Chapter ${chapterId} not found`);
  }

  const chapterCard = getChapterCard(chapterId);

  // Get existing scenes for this chapter to determine proper numbering
  const existingChapterScenes = getScenesByChapter(chapterId);
  const nextSceneNumber = existingChapterScenes.length + 1;
  
  // Generate unique scene IDs (globally unique across all scenes)
  const existingScenes = useManuscriptStore.getState().getAllScenes();
  const existingSceneIds = new Set(existingScenes.map(s => s.id));
  let sceneCounter = Math.max(1, existingScenes.length + 1);
  
  const generateSceneId = () => {
    let sceneId = `scene-${String(sceneCounter).padStart(2, '0')}`;
    while (existingSceneIds.has(sceneId)) {
      sceneCounter += 1;
      sceneId = `scene-${String(sceneCounter).padStart(2, '0')}`;
    }
    existingSceneIds.add(sceneId);
    sceneCounter += 1;
    return sceneId;
  };

  // Prepare chapter context for AI
  const chapterContext = {
    title: chapter.title,
    number: chapter.number,
    summary: chapter.summary || '',
    pov: chapter.pov || '',
    theme: chapter.theme || '',
    goal: chapterCard?.goal || '',
    conflict: chapterCard?.conflict || '',
    outcome: chapterCard?.outcome || '',
    clock: chapterCard?.clock || '',
    crucible: chapterCard?.crucible || ''
  };

  const scenePrompt = `Generate exactly 3 scenes for this chapter. Each scene should be well-structured and advance the chapter's goals.

Chapter Context:
- Title: ${chapterContext.title}
- Summary: ${chapterContext.summary}
- POV: ${chapterContext.pov}
- Theme: ${chapterContext.theme}
- Goal: ${chapterContext.goal}
- Conflict: ${chapterContext.conflict}
- Outcome: ${chapterContext.outcome}
- Clock: ${chapterContext.clock}
- Crucible: ${chapterContext.crucible}

Return ONLY a JSON array with this exact structure (ALL fields are required):
[
  {
    "pov": "Character name (required)",
    "goal": "What the character wants to achieve (required)",
    "conflict": "What stands in their way (required)",
    "outcome": "What actually happens (required)",
    "location": "Where the scene takes place (required)",
    "time": "When the scene takes place (required)",
    "clock": "Time pressure or urgency (required)",
    "crucible": "The pressure cooker situation (required)",
    "summary": "Brief scene summary (required)",
    "wordsTarget": 1000
  }
]

Generate 3 scenes that work together to fulfill the chapter's goals. Each scene should be distinct and contribute to the overall chapter arc. Make sure ALL required fields are filled with meaningful content.`;

  try {
    const response = await client([
      { role: 'system', content: scenePrompt },
      { role: 'user', content: 'Generate the 3 scenes for this chapter.' }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in AI response');
    }

    const scenesData = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(scenesData) || scenesData.length !== 3) {
      throw new Error('AI response must contain exactly 3 scenes');
    }

    // Create scene metadata objects
    const scenes: SceneMetadata[] = [];
    const createDocument = useDocumentStore.getState().createDocument;
    
    for (let i = 0; i < scenesData.length; i++) {
      const sceneData = scenesData[i];
      const sceneId = generateSceneId();
      const sceneNumber = nextSceneNumber + i;
      
      const scene: SceneMetadata = {
        id: sceneId,
        chapter: chapterId,
        title: `Scene ${String(sceneNumber).padStart(2, '0')}`,
        number: sceneNumber,
        pov: sceneData.pov || chapterContext.pov || 'Unknown',
        goal: sceneData.goal || 'To be determined',
        conflict: sceneData.conflict || 'Obstacles to overcome',
        outcome: sceneData.outcome || 'Resolution pending',
        location: sceneData.location || 'Location to be determined',
        time: sceneData.time || 'Time to be determined',
        clock: sceneData.clock || 'Time pressure to be determined',
        crucible: sceneData.crucible || 'Pressure situation to be determined',
        summary: sceneData.summary || 'Scene summary to be written',
        wordsTarget: sceneData.wordsTarget || 1000,
        wordsCurrent: 0,
        lastModified: Date.now()
      };

      // Save scene to store
      await setScene(scene);
      
      // Add scene to chapter
      await addSceneToChapter(sceneId, chapterId);
      
      // Create an empty document for the scene (following the same pattern as + button)
      await createDocument(`scene/${sceneId}`, scene.title, [
        {
          id: 'p_001',
          type: 'paragraph',
          text: '',
        },
      ]);
      
      // Create outline card for the scene with AI-generated data
      // The key should be the full document path format (scene/scene-01) to match how OutlinePanel looks it up
      const sceneDocId = `scene/${sceneId}`;
      const outlineCard = {
        id: `outline_${sceneId}`,
        sceneId: sceneDocId, // Use the full document path format
        chapterId: chapterId,
        title: scene.title,
        goal: scene.goal,
        conflict: scene.conflict,
        outcome: scene.outcome,
        clock: scene.clock,
        crucible: scene.crucible,
        requiredBeats: [],
        lastModified: Date.now()
      };
      
      // Store the card with the full path as the key to match how OutlinePanel looks it up
      const { cards } = useOutlineStore.getState();
      cards.set(sceneDocId, outlineCard);
      useOutlineStore.setState({ cards: new Map(cards) });
      
      scenes.push(scene);
    }

    // Save the structure
    await saveStructure();

    return {
      success: true,
      scenes,
      chapterId,
      message: `Successfully generated ${scenes.length} scenes for chapter ${chapter.title}`
    };

  } catch (error) {
    console.error('Error generating scenes:', error);
    return {
      success: false,
      scenes: [],
      chapterId,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
