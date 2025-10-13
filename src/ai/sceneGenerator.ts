/**
 * Scene Generator using the new AI provider system
 * Generates scenes for chapters using AI
 */

import { getCurrentAIProvider } from './providers';
import { useBookStore } from '../store/bookStore';
import { Scene } from '../types/book';

export interface SceneGenerationResult {
  success: boolean;
  scenes: Scene[];
  chapterId: string;
  message?: string;
}

/**
 * Generate scenes for a specific chapter using AI
 */
export async function generateScenesForChapter(chapterId: string): Promise<SceneGenerationResult> {
  try {
    const { getChapterById, addScene } = useBookStore.getState();
    
    const chapter = getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    const { book } = useBookStore.getState();
    if (!book?.settings) {
      throw new Error('Book settings not found');
    }
    
    const aiProvider = getCurrentAIProvider(book.settings);
    if (!aiProvider) {
      throw new Error('AI provider not configured');
    }

    // Build context for scene generation
    const chapterContext = {
      title: chapter.title,
      summary: chapter.summary,
      pov: chapter.pov,
      theme: chapter.theme,
      goal: chapter.goal,
      conflict: chapter.conflict,
      outcome: chapter.outcome,
    };

    const scenePrompt = `You are an expert fiction writer. Generate 3 scenes for a chapter based on the provided context.

**Chapter Information:**
- Title: ${chapterContext.title}
- Summary: ${chapterContext.summary || 'Not specified'}
- POV: ${chapterContext.pov || 'Not specified'}
- Theme: ${chapterContext.theme || 'Not specified'}
- Goal: ${chapterContext.goal || 'Not specified'}
- Conflict: ${chapterContext.conflict || 'Not specified'}
- Outcome: ${chapterContext.outcome || 'Not specified'}

**Instructions:**
Generate 3 scenes that work together to fulfill the chapter's goals. Each scene should be distinct and contribute to the overall chapter arc.

Return ONLY a JSON array with this exact structure (ALL fields are required):
[
  {
    "title": "Scene title (required)",
    "goal": "What the character wants to achieve (required)",
    "conflict": "What stands in their way (required)",
    "outcome": "What actually happens (required)",
    "location": "Where the scene takes place (required)",
    "time": "When the scene takes place (required)",
    "clock": "Time pressure or urgency (required)",
    "crucible": "The pressure cooker situation (required)",
    "pov": "Point of view character (required)",
    "targetWords": 1000
  }
]

Generate 3 scenes that work together to fulfill the chapter's goals. Each scene should be distinct and contribute to the overall chapter arc. Make sure ALL required fields are filled with meaningful content.`;

    const response = await aiProvider.generateText({
      messages: [
        { role: 'system', content: scenePrompt },
        { role: 'user', content: 'Generate the 3 scenes for this chapter.' }
      ],
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
    });

    const responseText = response.content;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in AI response');
    }

    const scenesData = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(scenesData) || scenesData.length !== 3) {
      throw new Error('AI response must contain exactly 3 scenes');
    }

    // Create and add scenes
    const createdScenes: Scene[] = [];
    
    for (let i = 0; i < scenesData.length; i++) {
      const sceneData = scenesData[i];
      
      const scene: Omit<Scene, 'id' | 'number' | 'lastModified'> = {
        title: sceneData.title || `Scene ${i + 1}`,
        goal: sceneData.goal || 'To be determined',
        conflict: sceneData.conflict || 'Obstacles to overcome',
        outcome: sceneData.outcome || 'Resolution pending',
        location: sceneData.location || 'Location to be determined',
        time: sceneData.time || 'Time to be determined',
        clock: sceneData.clock || 'Time pressure to be determined',
        crucible: sceneData.crucible || 'Pressure situation to be determined',
        pov: sceneData.pov || chapterContext.pov || 'Unknown',
        content: '',
        targetWords: sceneData.targetWords || 1000,
        currentWords: 0,
        generatedByAI: true,
        aiPrompt: scenePrompt,
        aiModel: 'gpt-4',
      };

      addScene(chapterId, scene);
      createdScenes.push(scene as Scene);
    }

    return {
      success: true,
      scenes: createdScenes,
      chapterId,
      message: `Successfully generated 3 scenes for chapter "${chapter.title}"`,
    };

  } catch (error: any) {
    console.error('Failed to generate scenes:', error);
    return {
      success: false,
      scenes: [],
      chapterId,
      message: `Failed to generate scenes: ${error.message}`,
    };
  }
}

/**
 * Generate a complete book structure from an idea
 */
export async function generateBookFromIdea(idea: string, title: string, author: string, genre: string): Promise<{
  success: boolean;
  book?: any;
  message: string;
}> {
  try {
    const { createBook, addChapter, addScene } = useBookStore.getState();
    
    const { book } = useBookStore.getState();
    if (!book?.settings) {
      throw new Error('Book settings not found');
    }
    
    const aiProvider = getCurrentAIProvider(book.settings);
    if (!aiProvider) {
      throw new Error('AI provider not configured');
    }

    // Create the book
    createBook(title, author, genre);

    // Generate book structure
    const structurePrompt = `You are an expert fiction writer. Generate a complete book structure based on the provided idea.

**Book Idea:** ${idea}
**Title:** ${title}
**Author:** ${author}
**Genre:** ${genre}

Generate a book with at least 30 chapters, each with 3 scenes. Return ONLY a JSON object with this structure:
{
  "chapters": [
    {
      "title": "Chapter title",
      "summary": "Chapter summary",
      "pov": "Point of view character",
      "theme": "Chapter theme",
      "goal": "Chapter goal",
      "conflict": "Chapter conflict",
      "outcome": "Chapter outcome",
      "scenes": [
        {
          "title": "Scene title",
          "goal": "Scene goal",
          "conflict": "Scene conflict",
          "outcome": "Scene outcome",
          "location": "Scene location",
          "time": "Scene time",
          "clock": "Scene clock",
          "crucible": "Scene crucible",
          "pov": "Scene POV character"
        }
      ]
    }
  ]
}

Generate at least 30 chapters with 3 scenes each. Make sure the story is compelling and follows good story structure.`;

    const response = await aiProvider.generateText({
      messages: [
        { role: 'system', content: structurePrompt },
        { role: 'user', content: 'Generate the complete book structure.' }
      ],
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7,
    });

    const responseText = response.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON object found in AI response');
    }

    const bookData = JSON.parse(jsonMatch[0]);
    if (!bookData.chapters || !Array.isArray(bookData.chapters)) {
      throw new Error('Invalid book structure in AI response');
    }

    // Create chapters and scenes
    for (const chapterData of bookData.chapters) {
      const chapter = addChapter({
        title: chapterData.title,
        summary: chapterData.summary || '',
        pov: chapterData.pov || 'Unknown',
        theme: chapterData.theme || '',
        goal: chapterData.goal || '',
        conflict: chapterData.conflict || '',
        outcome: chapterData.outcome || '',
        targetWords: 3000,
        currentWords: 0,
      });

      // Add scenes to the chapter
      if (chapterData.scenes && Array.isArray(chapterData.scenes)) {
        for (const sceneData of chapterData.scenes) {
          addScene(chapter.id, {
            title: sceneData.title,
            goal: sceneData.goal || '',
            conflict: sceneData.conflict || '',
            outcome: sceneData.outcome || '',
            location: sceneData.location || '',
            time: sceneData.time || '',
            clock: sceneData.clock || '',
            crucible: sceneData.crucible || '',
            pov: sceneData.pov || chapterData.pov || 'Unknown',
            content: '',
            targetWords: 1000,
            currentWords: 0,
            generatedByAI: true,
            aiPrompt: structurePrompt,
            aiModel: 'gpt-4',
          });
        }
      }
    }

    return {
      success: true,
      message: `Successfully generated book with ${bookData.chapters.length} chapters`,
    };

  } catch (error: any) {
    console.error('Failed to generate book:', error);
    return {
      success: false,
      message: `Failed to generate book: ${error.message}`,
    };
  }
}