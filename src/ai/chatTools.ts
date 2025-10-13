/**
 * AI Chat Tools for Text Editing
 * These tools allow the AI to modify text in the editor like a code agent
 */

import { AITool } from './providers';
import { useBookStore } from '../store/bookStore';

export interface TextEditTool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<{ success: boolean; message: string; result?: any }>;
}

/**
 * Text editing tools that the AI can use
 */
export const textEditTools: TextEditTool[] = [
  {
    name: 'replace_text',
    description: 'Replace a specific range of text with new text',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        start: { type: 'number', description: 'Start position of text to replace' },
        end: { type: 'number', description: 'End position of text to replace' },
        newText: { type: 'string', description: 'New text to replace with' },
      },
      required: ['sceneId', 'start', 'end', 'newText'],
    },
    execute: async (args) => {
      try {
        const { sceneId, start, end, newText } = args;
        const { replaceTextRange } = useBookStore.getState();
        
        replaceTextRange(sceneId, start, end, newText);
        
        return {
          success: true,
          message: `Replaced text from position ${start} to ${end}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to replace text: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'insert_text',
    description: 'Insert text at a specific position',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        position: { type: 'number', description: 'Position to insert text at' },
        text: { type: 'string', description: 'Text to insert' },
      },
      required: ['sceneId', 'position', 'text'],
    },
    execute: async (args) => {
      try {
        const { sceneId, position, text } = args;
        const { insertTextAtPosition } = useBookStore.getState();
        
        insertTextAtPosition(sceneId, position, text);
        
        return {
          success: true,
          message: `Inserted text at position ${position}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to insert text: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'add_paragraph',
    description: 'Add a new paragraph to the scene',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        paragraph: { type: 'string', description: 'Paragraph text to add' },
        position: { type: 'number', description: 'Position to insert paragraph (optional, defaults to end)' },
      },
      required: ['sceneId', 'paragraph'],
    },
    execute: async (args) => {
      try {
        const { sceneId, paragraph, position } = args;
        const { addParagraph } = useBookStore.getState();
        
        addParagraph(sceneId, paragraph, position);
        
        return {
          success: true,
          message: `Added paragraph ${position !== undefined ? `at position ${position}` : 'at the end'}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to add paragraph: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'rewrite_sentence',
    description: 'Rewrite a specific sentence to improve clarity, tone, or style',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        sentence: { type: 'string', description: 'The sentence to rewrite' },
        newSentence: { type: 'string', description: 'The improved sentence' },
      },
      required: ['sceneId', 'sentence', 'newSentence'],
    },
    execute: async (args) => {
      try {
        const { sceneId, sentence, newSentence } = args;
        const { getSceneById, replaceTextRange } = useBookStore.getState();
        
        const scene = getSceneById(sceneId);
        if (!scene) {
          return {
            success: false,
            message: 'Scene not found',
          };
        }
        
        const startIndex = scene.content.indexOf(sentence);
        if (startIndex === -1) {
          return {
            success: false,
            message: 'Sentence not found in scene content',
          };
        }
        
        const endIndex = startIndex + sentence.length;
        replaceTextRange(sceneId, startIndex, endIndex, newSentence);
        
        return {
          success: true,
          message: 'Sentence rewritten successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to rewrite sentence: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'improve_tone',
    description: 'Improve the tone of a specific section of text',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        start: { type: 'number', description: 'Start position of text to improve' },
        end: { type: 'number', description: 'End position of text to improve' },
        tone: { type: 'string', description: 'Desired tone (e.g., more dramatic, more subtle, more emotional)' },
        improvedText: { type: 'string', description: 'The improved text with better tone' },
      },
      required: ['sceneId', 'start', 'end', 'tone', 'improvedText'],
    },
    execute: async (args) => {
      try {
        const { sceneId, start, end, tone, improvedText } = args;
        const { replaceTextRange } = useBookStore.getState();
        
        replaceTextRange(sceneId, start, end, improvedText);
        
        return {
          success: true,
          message: `Improved tone to be more ${tone}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to improve tone: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'expand_description',
    description: 'Expand a description to add more detail and vivid imagery',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        start: { type: 'number', description: 'Start position of description to expand' },
        end: { type: 'number', description: 'End position of description to expand' },
        expandedText: { type: 'string', description: 'The expanded description with more detail' },
      },
      required: ['sceneId', 'start', 'end', 'expandedText'],
    },
    execute: async (args) => {
      try {
        const { sceneId, start, end, expandedText } = args;
        const { replaceTextRange } = useBookStore.getState();
        
        replaceTextRange(sceneId, start, end, expandedText);
        
        return {
          success: true,
          message: 'Description expanded with more detail',
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
    name: 'add_dialogue',
    description: 'Add dialogue between characters',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to edit' },
        position: { type: 'number', description: 'Position to insert dialogue' },
        character: { type: 'string', description: 'Name of the character speaking' },
        dialogue: { type: 'string', description: 'The dialogue text' },
        action: { type: 'string', description: 'Action or description accompanying the dialogue (optional)' },
      },
      required: ['sceneId', 'position', 'character', 'dialogue'],
    },
    execute: async (args) => {
      try {
        const { sceneId, position, character, dialogue, action } = args;
        const { insertTextAtPosition } = useBookStore.getState();
        
        let dialogueText = `"${dialogue}"`;
        if (action) {
          dialogueText = `${action} "${dialogue}"`;
        }
        dialogueText = `${character} said, ${dialogueText}\n\n`;
        
        insertTextAtPosition(sceneId, position, dialogueText);
        
        return {
          success: true,
          message: `Added dialogue for ${character}`,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to add dialogue: ${error.message}`,
        };
      }
    },
  },
  
  {
    name: 'get_scene_info',
    description: 'Get information about the current scene',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'string', description: 'ID of the scene to get info about' },
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
          message: 'Scene information retrieved',
          result: {
            title: scene.title,
            goal: scene.goal,
            conflict: scene.conflict,
            outcome: scene.outcome,
            location: scene.location,
            time: scene.time,
            clock: scene.clock,
            crucible: scene.crucible,
            pov: scene.pov,
            wordCount: scene.currentWords,
            content: scene.content,
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
];

/**
 * Convert text edit tools to AI tools format
 */
export function getAITools(): AITool[] {
  return textEditTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Execute a tool call from the AI
 */
export async function executeToolCall(toolCall: { name: string; arguments: string }): Promise<{ success: boolean; message: string; result?: any }> {
  console.log('Executing text editing tool:', toolCall);
  
  const tool = textEditTools.find(t => t.name === toolCall.name);
  if (!tool) {
    console.log('Tool not found:', toolCall.name);
    return {
      success: false,
      message: `Unknown tool: ${toolCall.name}`,
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
      message: `Failed to execute tool ${toolCall.name}: ${error.message}`,
    };
  }
}
