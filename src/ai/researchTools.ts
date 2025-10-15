/**
 * Research Tools for AI
 * These tools allow the AI to create and manage research entries
 */

import { AITool } from './providers';
import { useBookStore } from '../store/bookStore';

export interface ResearchTool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<{ success: boolean; message: string; result?: any }>;
}

/**
 * Research tools that allow the AI to create research entries
 */
export const researchTools: ResearchTool[] = [
  {
    name: 'create_research_entry',
    description: 'Create a new research entry for the book with the specified title, content, source, and tags',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the research entry' },
        content: { type: 'string', description: 'Full content of the research entry' },
        source: { type: 'string', description: 'Source of the research (e.g., "AI Research", "User Input")' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Array of tags for the research entry' },
      },
      required: ['title', 'content'],
    },
    execute: async (args) => {
      try {
        const { title, content, source = 'AI Research', tags = [] } = args;

        if (!title || !content) {
          return {
            success: false,
            message: 'Title and content are required for research entry',
          };
        }

        const { addResearchEntry, addResearchScene } = useBookStore.getState();
        
        // Save to research array
        await addResearchEntry({
          title,
          content,
          source,
          tags,
        });

        // Also save as a scene in the research chapter
        await addResearchScene({
          title,
          content,
          source,
          tags,
        });

        console.log(`Research entry saved: "${title}" (${content.length} chars)`);

        return {
          success: true,
          message: `Successfully created research entry: "${title}"`,
          result: {
            title,
            content,
            source,
            tags,
          },
        };
      } catch (error) {
        console.error('Failed to create research entry:', error);
        return {
          success: false,
          message: `Failed to create research entry: ${error.message}`,
        };
      }
    },
  },
];

/**
 * Convert research tools to AI tools format
 */
export function getResearchAITools(): AITool[] {
  return researchTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Execute a research tool call from the AI
 */
export async function executeResearchToolCall(toolCall: { name: string; arguments: string }): Promise<{ success: boolean; message: string; result?: any }> {
  console.log('Executing research tool:', toolCall);

  const tool = researchTools.find(t => t.name === toolCall.name);
  if (!tool) {
    console.log('Research tool not found:', toolCall.name);
    return {
      success: false,
      message: `Unknown research tool: ${toolCall.name}`,
    };
  }

  try {
    const args = JSON.parse(toolCall.arguments);
    console.log('Research tool arguments:', args);
    const result = await tool.execute(args);
    console.log('Research tool execution result:', result);
    return result;
  } catch (error) {
    console.log('Research tool execution error:', error);
    return {
      success: false,
      message: `Failed to execute research tool ${toolCall.name}: ${error.message}`,
    };
  }
}
