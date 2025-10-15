/**
 * Book Access Tools for AI
 * These tools allow the AI to access book information beyond the current scene
 */

import { AITool } from './providers';
import { useBookStore } from '../store/bookStore';

export interface BookAccessTool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<{ success: boolean; message: string; result?: any }>;
}

/**
 * Book access tools that allow the AI to read chapters, scenes, and book metadata
 */
export const bookAccessTools: BookAccessTool[] = [
  {
    name: 'get_book_info',
    description: 'Get basic information about the book including title, author, genre, and settings',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (args) => {
      try {
        const { book } = useBookStore.getState();
        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }
        
        return {
          success: true,
          message: 'Book information retrieved',
          result: {
            title: book.title,
            author: book.author,
            genre: book.genre,
            description: book.description,
            settings: book.settings,
            totalChapters: book.chapters.length,
            totalScenes: book.chapters.reduce((acc, chapter) => acc + chapter.scenes.length, 0),
            totalWords: book.chapters.reduce((acc, chapter) => 
              acc + chapter.scenes.reduce((sceneAcc, scene) => sceneAcc + (scene.currentWords || 0), 0), 0
            ),
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get book info: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_chapter_list',
    description: 'Get a list of all chapters with their basic information',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (args) => {
      try {
        const { book } = useBookStore.getState();
        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }
        
        const chapters = book.chapters.map(chapter => ({
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          description: chapter.summary,
          sceneCount: chapter.scenes.length,
          wordCount: chapter.scenes.reduce((acc, scene) => acc + (scene.currentWords || 0), 0),
          lastModified: chapter.lastModified,
        }));
        
        return {
          success: true,
          message: `Retrieved ${chapters.length} chapters`,
          result: chapters,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get chapter list: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_chapter_content',
    description: 'Get the full content of a specific chapter including all scenes',
    parameters: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'ID of the chapter to retrieve' },
      },
      required: ['chapterId'],
    },
    execute: async (args) => {
      try {
        const { chapterId } = args;
        const { getChapterById } = useBookStore.getState();
        
        const chapter = getChapterById(chapterId);
        if (!chapter) {
          return {
            success: false,
            message: 'Chapter not found',
          };
        }
        
        const chapterContent = {
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          description: chapter.summary,
          scenes: chapter.scenes.map(scene => ({
            id: scene.id,
            number: scene.number,
            title: scene.title,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords || 0,
            content: scene.content,
            lastModified: scene.lastModified,
          })),
          lastModified: chapter.lastModified,
        };
        
        return {
          success: true,
          message: `Retrieved chapter ${chapter.number}: ${chapter.title}`,
          result: chapterContent,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get chapter content: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_current_scene_content',
    description: 'Get the full content of the currently selected scene',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (args) => {
      try {
        const { book } = useBookStore.getState();

        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }

        // Find the first scene (for now, since we don't have currentSceneId in this context)
        // In a real implementation, this would use the currentSceneId
        const currentChapter = book.chapters[0];
        if (!currentChapter || currentChapter.scenes.length === 0) {
          return {
            success: false,
            message: 'No scenes available in the current chapter',
          };
        }

        const scene = currentChapter.scenes[0];

        return {
          success: true,
          message: `Retrieved current scene: ${scene.title}`,
          result: {
            id: scene.id,
            number: scene.number,
            title: scene.title,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords || 0,
            content: scene.content,
            lastModified: scene.lastModified,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get current scene content: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'get_scene_info',
    description: 'Get basic information about a scene (title, goal, conflict, etc.) without full content',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to get info for' },
      },
      required: ['sceneId'],
    },
    execute: async (args) => {
      try {
        const { sceneId } = args;
        const { getSceneById } = useBookStore.getState();

        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }

        return {
          success: true,
          message: `Retrieved scene info: ${scene.title}`,
          result: {
            id: scene.id,
            number: scene.number,
            title: scene.title,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords || 0,
            contentPreview: scene.content.substring(0, 500) + (scene.content.length > 500 ? '...' : ''),
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get scene info: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'expand_description',
    description: 'Expand a description in the current scene with more sensory details and immersive language',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position in the scene content to expand' },
        length: { type: 'number', description: 'Length of text to expand' },
        expansionType: { type: 'string', description: 'Type of expansion (sensory, emotional, atmospheric, etc.)' },
      },
      required: ['position', 'length'],
    },
    execute: async (args) => {
      try {
        const { position, length, expansionType = 'sensory' } = args;
        const { book } = useBookStore.getState();

        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }

        // For now, use the first scene since we don't have currentSceneId context
        const currentChapter = book.chapters[0];
        if (!currentChapter || currentChapter.scenes.length === 0) {
          return {
            success: false,
            message: 'No scenes available',
          };
        }

        const scene = currentChapter.scenes[0];
        const content = scene.content;

        if (position < 0 || position + length > content.length) {
          return {
            success: false,
            message: 'Invalid position or length for expansion',
          };
        }

        const textToExpand = content.substring(position, position + length);

        // This is a placeholder - in a real implementation, this would use AI to expand the description
        const expandedText = `[EXPANDED: ${expansionType}] ${textToExpand} [Enhanced with richer ${expansionType} details]`;

        return {
          success: true,
          message: `Expanded description from position ${position} with ${expansionType} details`,
          result: {
            originalText: textToExpand,
            expandedText: expandedText,
            position: position,
            length: length,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to expand description: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'get_scene_content',
    description: 'Get the full content of a specific scene',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to retrieve' },
      },
      required: ['sceneId'],
    },
    execute: async (args) => {
      try {
        const { sceneId } = args;
        const { getSceneById } = useBookStore.getState();

        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }

        return {
          success: true,
          message: `Retrieved scene: ${scene.title}`,
          result: {
            id: scene.id,
            number: scene.number,
            title: scene.title,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords || 0,
            content: scene.content,
            lastModified: scene.lastModified,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get scene content: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_chapters_by_numbers',
    description: 'Get content for specific chapters by their numbers (e.g., chapters 1 and 2)',
    parameters: {
      type: 'object',
      properties: {
        chapterNumbers: { 
          type: 'array', 
          items: { type: 'number' },
          description: 'Array of chapter numbers to retrieve (e.g., [1, 2])' 
        },
      },
      required: ['chapterNumbers'],
    },
    execute: async (args) => {
      try {
        const { chapterNumbers } = args;
        const { book } = useBookStore.getState();
        
        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }
        
        const requestedChapters = book.chapters
          .filter(chapter => chapterNumbers.includes(chapter.number))
          .map(chapter => ({
            id: chapter.id,
            number: chapter.number,
            title: chapter.title,
            description: chapter.summary,
            scenes: chapter.scenes.map(scene => ({
              id: scene.id,
              number: scene.number,
              title: scene.title,
              goal: scene.goal,
              conflict: scene.conflict,
              outcome: scene.outcome,
              location: scene.location,
              time: scene.time,
              clock: scene.clock,
              crucible: scene.crucible,
              pov: scene.pov,
              wordCount: scene.currentWords || 0,
              content: scene.content,
              lastModified: scene.lastModified,
            })),
            lastModified: chapter.lastModified,
          }));
        
        return {
          success: true,
          message: `Retrieved ${requestedChapters.length} chapters`,
          result: requestedChapters,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get chapters: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_scene_summary',
    description: 'Get a summary of a scene including key details without full content',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to summarize' },
      },
      required: ['sceneId'],
    },
    execute: async (args) => {
      try {
        const { sceneId } = args;
        const { getSceneById } = useBookStore.getState();
        
        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }
        
        return {
          success: true,
          message: `Retrieved scene summary: ${scene.title}`,
          result: {
            id: scene.id,
            number: scene.number,
            title: scene.title,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords || 0,
            contentPreview: scene.content.substring(0, 500) + (scene.content.length > 500 ? '...' : ''),
            lastModified: scene.lastModified,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get scene summary: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_chapter_summary',
    description: 'Get a summary of a chapter including scene titles and key details',
    parameters: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'ID of the chapter to summarize' },
      },
      required: ['chapterId'],
    },
    execute: async (args) => {
      try {
        const { chapterId } = args;
        const { getChapterById } = useBookStore.getState();
        
        const chapter = getChapterById(chapterId);
        if (!chapter) {
          return {
            success: false,
            message: 'Chapter not found',
          };
        }
        
        return {
          success: true,
          message: `Retrieved chapter summary: ${chapter.title}`,
          result: {
            id: chapter.id,
            number: chapter.number,
            title: chapter.title,
            description: chapter.summary,
            sceneCount: chapter.scenes.length,
            wordCount: chapter.scenes.reduce((acc, scene) => acc + (scene.currentWords || 0), 0),
            scenes: chapter.scenes.map(scene => ({
              id: scene.id,
              number: scene.number,
              title: scene.title,
              goal: scene.goal,
              conflict: scene.conflict,
              outcome: scene.outcome,
              location: scene.location,
              time: scene.time,
              clock: scene.clock,
              crucible: scene.crucible,
              pov: scene.pov,
              wordCount: scene.currentWords || 0,
              contentPreview: scene.content.substring(0, 200) + (scene.content.length > 200 ? '...' : ''),
            })),
            lastModified: chapter.lastModified,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get chapter summary: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'search_scenes',
    description: 'Search for scenes by title, content, or other criteria',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find scenes' },
        searchIn: { 
          type: 'array', 
          items: { type: 'string', enum: ['title', 'content', 'goal', 'conflict', 'outcome', 'location', 'pov'] },
          description: 'Fields to search in (default: all fields)'
        },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 10)' },
      },
      required: ['query'],
    },
    execute: async (args) => {
      try {
        const { query, searchIn = ['title', 'content', 'goal', 'conflict', 'outcome', 'location', 'pov'], limit = 10 } = args;
        const { book } = useBookStore.getState();
        
        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }
        
        const allScenes = book.chapters.flatMap(chapter => 
          chapter.scenes.map(scene => ({ ...scene, chapterNumber: chapter.number, chapterTitle: chapter.title }))
        );
        
        const matchingScenes = allScenes.filter(scene => {
          const searchFields = searchIn.map(field => {
            switch (field) {
              case 'title': return scene.title.toLowerCase();
              case 'content': return scene.content.toLowerCase();
              case 'goal': return (scene.goal || '').toLowerCase();
              case 'conflict': return (scene.conflict || '').toLowerCase();
              case 'outcome': return (scene.outcome || '').toLowerCase();
              case 'location': return (scene.location || '').toLowerCase();
              case 'pov': return (scene.pov || '').toLowerCase();
              default: return '';
            }
          });
          
          return searchFields.some(field => field.includes(query.toLowerCase()));
        }).slice(0, limit);
        
        return {
          success: true,
          message: `Found ${matchingScenes.length} matching scenes`,
          result: matchingScenes.map(scene => ({
            id: scene.id,
            number: scene.number,
            title: scene.title,
            chapterNumber: scene.chapterNumber,
            chapterTitle: scene.chapterTitle,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords || 0,
            contentPreview: scene.content.substring(0, 300) + (scene.content.length > 300 ? '...' : ''),
          })),
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to search scenes: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_book_statistics',
    description: 'Get comprehensive statistics about the book including word counts, scene counts, and other metrics',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (args) => {
      try {
        const { book } = useBookStore.getState();
        if (!book) {
          return {
            success: false,
            message: 'No book loaded',
          };
        }
        
        const totalScenes = book.chapters.reduce((acc, chapter) => acc + chapter.scenes.length, 0);
        const totalWords = book.chapters.reduce((acc, chapter) => 
          acc + chapter.scenes.reduce((sceneAcc, scene) => sceneAcc + (scene.currentWords || 0), 0), 0
        );
        
        const scenesWithoutContent = book.chapters.reduce((acc, chapter) => 
          acc + chapter.scenes.filter(scene => !scene.content || scene.content.trim().length === 0).length, 0
        );
        
        const averageWordsPerScene = totalScenes > 0 ? Math.round(totalWords / totalScenes) : 0;
        const averageWordsPerChapter = book.chapters.length > 0 ? Math.round(totalWords / book.chapters.length) : 0;
        
        const chapterStats = book.chapters.map(chapter => ({
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          sceneCount: chapter.scenes.length,
          wordCount: chapter.scenes.reduce((acc, scene) => acc + (scene.currentWords || 0), 0),
          averageWordsPerScene: chapter.scenes.length > 0 ? 
            Math.round(chapter.scenes.reduce((acc, scene) => acc + (scene.currentWords || 0), 0) / chapter.scenes.length) : 0,
        }));
        
        return {
          success: true,
          message: 'Book statistics retrieved',
          result: {
            basic: {
              title: book.title,
              author: book.author,
              genre: book.genre,
              totalChapters: book.chapters.length,
              totalScenes: totalScenes,
              totalWords: totalWords,
            },
            averages: {
              wordsPerScene: averageWordsPerScene,
              wordsPerChapter: averageWordsPerChapter,
            },
            completeness: {
              scenesWithoutContent: scenesWithoutContent,
              completionPercentage: totalScenes > 0 ? Math.round(((totalScenes - scenesWithoutContent) / totalScenes) * 100) : 0,
            },
            chapters: chapterStats,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to get book statistics: ${error.message}`,
        };
      }
    },
  },

  // CRUD Operations for Chapters
  {
    name: 'create_chapter',
    description: 'Create a new chapter in the book',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the new chapter' },
        summary: { type: 'string', description: 'Summary/description of the chapter' },
        pov: { type: 'string', description: 'Point of view character for the chapter' },
        theme: { type: 'string', description: 'Theme of the chapter' },
        goal: { type: 'string', description: 'Main goal of the chapter' },
        conflict: { type: 'string', description: 'Main conflict in the chapter' },
        outcome: { type: 'string', description: 'Outcome of the chapter' },
        targetWords: { type: 'number', description: 'Target word count for the chapter' },
      },
      required: ['title'],
    },
    execute: async (args) => {
      try {
        const { title, summary = '', pov = '', theme = '', goal = '', conflict = '', outcome = '', targetWords = 3000 } = args;
        const { addChapter } = useBookStore.getState();

        addChapter({
          title,
          summary,
          pov,
          theme,
          goal,
          conflict,
          outcome,
          targetWords,
          currentWords: 0,
          scenes: [],
        });

        console.log(`Chapter created: "${title}"`);

        return {
          success: true,
          message: `Successfully created chapter: "${title}"`,
          result: { title, summary, pov, theme, goal, conflict, outcome, targetWords },
        };
      } catch (error) {
        console.error('Failed to create chapter:', error);
        return {
          success: false,
          message: `Failed to create chapter: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'update_chapter',
    description: 'Update an existing chapter\'s metadata',
    parameters: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'ID of the chapter to update' },
        title: { type: 'string', description: 'New title (optional)' },
        summary: { type: 'string', description: 'New summary (optional)' },
        pov: { type: 'string', description: 'New POV (optional)' },
        theme: { type: 'string', description: 'New theme (optional)' },
        goal: { type: 'string', description: 'New goal (optional)' },
        conflict: { type: 'string', description: 'New conflict (optional)' },
        outcome: { type: 'string', description: 'New outcome (optional)' },
        targetWords: { type: 'number', description: 'New target word count (optional)' },
      },
      required: ['chapterId'],
    },
    execute: async (args) => {
      try {
        const { chapterId, ...updates } = args;
        const { updateChapter, getChapterById } = useBookStore.getState();

        const chapter = getChapterById(chapterId);
        if (!chapter) {
          return {
            success: false,
            message: 'Chapter not found',
          };
        }

        updateChapter(chapterId, updates);

        console.log(`Chapter updated: ${chapterId}`);

        return {
          success: true,
          message: `Successfully updated chapter: "${chapter.title}"`,
          result: { chapterId, updates },
        };
      } catch (error) {
        console.error('Failed to update chapter:', error);
        return {
          success: false,
          message: `Failed to update chapter: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'delete_chapter',
    description: 'Delete a chapter from the book',
    parameters: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'ID of the chapter to delete' },
      },
      required: ['chapterId'],
    },
    execute: async (args) => {
      try {
        const { chapterId } = args;
        const { deleteChapter, getChapterById } = useBookStore.getState();

        const chapter = getChapterById(chapterId);
        if (!chapter) {
          return {
            success: false,
            message: 'Chapter not found',
          };
        }

        const title = chapter.title;
        deleteChapter(chapterId);

        console.log(`Chapter deleted: "${title}"`);

        return {
          success: true,
          message: `Successfully deleted chapter: "${title}"`,
          result: { chapterId, title },
        };
      } catch (error) {
        console.error('Failed to delete chapter:', error);
        return {
          success: false,
          message: `Failed to delete chapter: ${error.message}`,
        };
      }
    },
  },

  // CRUD Operations for Scenes
  {
    name: 'create_scene',
    description: 'Create a new scene in a chapter',
    parameters: {
      type: 'object',
      properties: {
        chapterId: { type: 'string', description: 'ID of the chapter to add the scene to' },
        title: { type: 'string', description: 'Title of the new scene' },
        goal: { type: 'string', description: 'Goal of the scene' },
        conflict: { type: 'string', description: 'Conflict in the scene' },
        outcome: { type: 'string', description: 'Outcome of the scene' },
        location: { type: 'string', description: 'Location where the scene takes place' },
        time: { type: 'string', description: 'Time when the scene takes place' },
        clock: { type: 'string', description: 'Clock/ticking time bomb element' },
        crucible: { type: 'string', description: 'Crucible element that keeps characters together' },
        pov: { type: 'string', description: 'Point of view character' },
        content: { type: 'string', description: 'Initial content for the scene' },
        targetWords: { type: 'number', description: 'Target word count' },
      },
      required: ['chapterId', 'title'],
    },
    execute: async (args) => {
      try {
        const { 
          chapterId, title, goal = '', conflict = '', outcome = '', 
          location = '', time = '', clock = '', crucible = '', pov = '', 
          content = '', targetWords = 1000 
        } = args;
        const { addScene, getChapterById } = useBookStore.getState();

        const chapter = getChapterById(chapterId);
        if (!chapter) {
          return {
            success: false,
            message: 'Chapter not found',
          };
        }

        addScene(chapterId, {
          title,
          goal,
          conflict,
          outcome,
          location,
          time,
          clock,
          crucible,
          pov,
          content,
          targetWords,
          currentWords: content.split(/\s+/).filter(w => w.length > 0).length,
          generatedByAI: false,
        });

        console.log(`Scene created: "${title}" in chapter "${chapter.title}"`);

        return {
          success: true,
          message: `Successfully created scene: "${title}" in chapter "${chapter.title}"`,
          result: { chapterId, title, goal, conflict, outcome, location, time, pov },
        };
      } catch (error) {
        console.error('Failed to create scene:', error);
        return {
          success: false,
          message: `Failed to create scene: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'update_scene',
    description: 'Update an existing scene\'s metadata or content',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to update' },
        title: { type: 'string', description: 'New title (optional)' },
        goal: { type: 'string', description: 'New goal (optional)' },
        conflict: { type: 'string', description: 'New conflict (optional)' },
        outcome: { type: 'string', description: 'New outcome (optional)' },
        location: { type: 'string', description: 'New location (optional)' },
        time: { type: 'string', description: 'New time (optional)' },
        clock: { type: 'string', description: 'New clock (optional)' },
        crucible: { type: 'string', description: 'New crucible (optional)' },
        pov: { type: 'string', description: 'New POV (optional)' },
        content: { type: 'string', description: 'New content (replaces entire scene content, optional)' },
        targetWords: { type: 'number', description: 'New target word count (optional)' },
      },
      required: ['sceneId'],
    },
    execute: async (args) => {
      try {
        const { sceneId, content, ...otherUpdates } = args;
        const { updateScene, updateSceneContent, getSceneById } = useBookStore.getState();

        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }

        // Update metadata if provided
        if (Object.keys(otherUpdates).length > 0) {
          updateScene(sceneId, otherUpdates);
        }

        // Update content separately if provided (to recalculate word count)
        if (content !== undefined) {
          updateSceneContent(sceneId, content);
        }

        console.log(`Scene updated: ${sceneId}`);

        return {
          success: true,
          message: `Successfully updated scene: "${scene.title}"`,
          result: { sceneId, updates: { ...otherUpdates, ...(content !== undefined ? { content: `${content.substring(0, 100)}...` } : {}) } },
        };
      } catch (error) {
        console.error('Failed to update scene:', error);
        return {
          success: false,
          message: `Failed to update scene: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'delete_scene',
    description: 'Delete a scene from its chapter',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to delete' },
      },
      required: ['sceneId'],
    },
    execute: async (args) => {
      try {
        const { sceneId } = args;
        const { deleteScene, getSceneById } = useBookStore.getState();

        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }

        const title = scene.title;
        deleteScene(sceneId);

        console.log(`Scene deleted: "${title}"`);

        return {
          success: true,
          message: `Successfully deleted scene: "${title}"`,
          result: { sceneId, title },
        };
      } catch (error) {
        console.error('Failed to delete scene:', error);
        return {
          success: false,
          message: `Failed to delete scene: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'move_scene',
    description: 'Move a scene from one chapter to another',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to move' },
        fromChapterId: { type: 'string', description: 'ID of the source chapter' },
        toChapterId: { type: 'string', description: 'ID of the destination chapter' },
      },
      required: ['sceneId', 'fromChapterId', 'toChapterId'],
    },
    execute: async (args) => {
      try {
        const { sceneId, fromChapterId, toChapterId } = args;
        const { moveScene, getSceneById, getChapterById } = useBookStore.getState();

        const scene = getSceneById(sceneId);
        const fromChapter = getChapterById(fromChapterId);
        const toChapter = getChapterById(toChapterId);

        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }

        if (!fromChapter || !toChapter) {
          return {
            success: false,
            message: 'Source or destination chapter not found',
          };
        }

        moveScene(sceneId, fromChapterId, toChapterId);

        console.log(`Scene moved: "${scene.title}" from "${fromChapter.title}" to "${toChapter.title}"`);

        return {
          success: true,
          message: `Successfully moved scene "${scene.title}" from "${fromChapter.title}" to "${toChapter.title}"`,
          result: { sceneId, fromChapterId, toChapterId, sceneTitle: scene.title },
        };
      } catch (error) {
        console.error('Failed to move scene:', error);
        return {
          success: false,
          message: `Failed to move scene: ${error.message}`,
        };
      }
    },
  },

  {
    name: 'update_scene_content',
    description: 'Replace the entire content of a scene (useful for major rewrites)',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to update' },
        content: { type: 'string', description: 'New content for the scene' },
      },
      required: ['sceneId', 'content'],
    },
    execute: async (args) => {
      try {
        const { sceneId, content } = args;
        const { updateSceneContent, getSceneById } = useBookStore.getState();

        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }

        updateSceneContent(sceneId, content);

        const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
        console.log(`Scene content updated: "${scene.title}" (${wordCount} words)`);

        return {
          success: true,
          message: `Successfully updated content for scene: "${scene.title}" (${wordCount} words)`,
          result: { sceneId, wordCount },
        };
      } catch (error) {
        console.error('Failed to update scene content:', error);
        return {
          success: false,
          message: `Failed to update scene content: ${error.message}`,
        };
      }
    },
  },
];

/**
 * Convert book access tools to AI tools format
 */
export function getBookAccessAITools(): AITool[] {
  return bookAccessTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Execute a book access tool call from the AI
 */
export async function executeBookAccessToolCall(toolCall: { name: string; arguments: string }): Promise<{ success: boolean; message: string; result?: any }> {
  console.log('Executing book access tool:', toolCall);
  
  const tool = bookAccessTools.find(t => t.name === toolCall.name);
  if (!tool) {
    console.log('Tool not found:', toolCall.name);
    return {
      success: false,
      message: `Unknown book access tool: ${toolCall.name}`,
    };
  }
  
  try {
    const args = JSON.parse(toolCall.arguments);
    console.log('Tool arguments:', args);
    const result = await tool.execute(args);
    console.log('Tool execution result:', result);
    return result;
  } catch (error) {
    console.log('Tool execution error:', error);
    return {
      success: false,
      message: `Failed to execute book access tool ${toolCall.name}: ${error.message}`,
    };
  }
}
