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
