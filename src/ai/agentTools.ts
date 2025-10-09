import { LlmClient } from './adapter';
import { proposeEdits } from './adapter';
import { createToolSurface } from './toolSurface';
import { useDocumentStore } from '../store/documentStore';
import { onSelectionChange } from '../utils/selectionTracker';
import { getResearchTools } from './researchTools';

export interface AgentTool {
  name: string;
  description: string;
  parameters: any;
  handler: (params: any) => Promise<any>;
}

export interface AgentContext {
  currentDocId: string | null;
  selection: { blockId: string; start: number; end: number } | null;
  currentDoc: any;
}

/**
 * Get the current context (document, selection, etc.)
 */
export function getCurrentContext(): AgentContext {
  const store = useDocumentStore.getState();
  const currentDocId = store.currentDocId;
  const currentDoc = currentDocId ? store.documents.get(currentDocId) : null;
  
  console.log('getCurrentContext:', { currentDocId, currentDoc: currentDoc ? 'found' : 'null' });
  
  // Note: Selection would need to be passed in or retrieved from a global state
  // For now, we'll handle this in the chat component
  return {
    currentDocId,
    selection: null, // Will be set by the chat component
    currentDoc
  };
}

/**
 * Create AI agent tools
 */
export function createAgentTools(llm: LlmClient, context: AgentContext): AgentTool[] {
  const toolSurface = createToolSurface();
  const researchTools = getResearchTools();

  return [
    {
      name: 'apply_edit',
      description: 'Apply a text edit to the current document. Use this to modify, expand, improve, or change existing text content. For content generation requests, generate the content first in your response, then use this tool to apply it.',
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'Clear instruction for what edit to make (e.g., "expand this scene", "make this more dramatic", "fix grammar")'
          },
          target: {
            type: 'string',
            enum: ['selected', 'current_block', 'entire_document'],
            description: 'What to edit: selected text, current block, or entire document'
          },
          customText: {
            type: 'string',
            description: 'If target is "custom", specify the exact text to edit'
          }
        },
        required: ['instruction', 'target']
      },
      handler: async (params) => {
        const { instruction, target, customText } = params;
        
        console.log('apply_edit tool called with:', { instruction, target, customText });
        console.log('context:', { currentDocId: context.currentDocId, hasDoc: !!context.currentDoc, selection: context.selection });
        
        if (!context.currentDocId || !context.currentDoc) {
          return {
            success: false,
            message: 'No document is currently open. Please open a document first, or switch to discussion mode to get writing advice.',
            error: 'NO_DOCUMENT'
          };
        }

        if (target === 'selected' && !context.selection) {
          // If no selection but user wants to edit selected text, try to edit the first block instead
          const firstBlock = context.currentDoc?.blocks[0];
          if (!firstBlock) {
            throw new Error('No text is currently selected and no document blocks available');
          }
          // Create a fake selection for the entire first block
          context.selection = {
            blockId: firstBlock.id,
            start: 0,
            end: firstBlock.text.length
          };
        }

        try {
          // Get style rules
          const style = await toolSurface.getStyleRules();
          console.log('Got style rules:', style);
          
          let editContext;
          let blockText = '';
          let selection = context.selection;

          if (target === 'selected' && context.selection) {
            // Edit selected text
            const block = context.currentDoc?.blocks.find(b => b.id === context.selection!.blockId);
            if (!block) {
              throw new Error('Selected block not found');
            }
            blockText = block.text;
            editContext = {
              docId: context.currentDocId,
              baseVersion: context.currentDoc.baseVersion,
              selection: context.selection,
              blockText,
              style
            };
          } else if (target === 'current_block') {
            // Edit entire current block - use first block if no selection
            console.log('Handling current_block target');
            let block;
            if (context.selection) {
              console.log('Using selected block:', context.selection.blockId);
              block = context.currentDoc?.blocks.find(b => b.id === context.selection!.blockId);
            } else {
              // No selection, use first block
              console.log('No selection, using first block');
              block = context.currentDoc?.blocks[0];
            }
            
            console.log('Selected block:', block);
            if (!block) {
              throw new Error('No block found to edit');
            }
            blockText = block.text;
            editContext = {
              docId: context.currentDocId,
              baseVersion: context.currentDoc.baseVersion,
              selection: { 
                blockId: block.id, 
                start: 0, 
                end: block.text.length 
              },
              blockText,
              style
            };
            console.log('Created edit context:', editContext);
          } else if (target === 'entire_document') {
            // Edit entire document - we'll need to handle this differently
            // For now, let's edit the first block as a placeholder
            const firstBlock = context.currentDoc?.blocks[0];
            if (!firstBlock) {
              throw new Error('Document has no blocks');
            }
            blockText = firstBlock.text;
            editContext = {
              docId: context.currentDocId,
              baseVersion: context.currentDoc.baseVersion,
              selection: { 
                blockId: firstBlock.id, 
                start: 0, 
                end: firstBlock.text.length 
              },
              blockText,
              style
            };
          } else if (target === 'custom' && customText) {
            // Find the block containing the custom text
            const block = context.currentDoc?.blocks.find(b => b.text.includes(customText));
            if (!block) {
              throw new Error('Text not found in document');
            }
            const start = block.text.indexOf(customText);
            const end = start + customText.length;
            blockText = block.text;
            editContext = {
              docId: context.currentDocId,
              baseVersion: context.currentDoc.baseVersion,
              selection: { 
                blockId: block.id, 
                start, 
                end 
              },
              blockText,
              style
            };
          } else {
            throw new Error('Invalid target or missing required parameters');
          }

          // Propose the edit
          console.log('Proposing edit with context:', editContext);
          const batch = await proposeEdits(llm, editContext, instruction);
          console.log('Got edit batch:', batch);
          
          // Simulate the edit to show preview
          const preview = await toolSurface.simulateOps(batch);
          console.log('Got preview:', preview);
          
          return {
            success: true,
            message: 'Edit proposed successfully',
            preview: preview.diffHtml,
            batch: batch,
            changedBlocks: preview.changedBlocks
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to apply edit: ${error.message}`,
            error: error.message
          };
        }
      }
    },
    {
      name: 'discuss_changes',
      description: 'Discuss potential changes or provide advice without applying them. Use this when the user wants to talk about ideas, get suggestions, or discuss before making changes.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'What to discuss (e.g., "character development", "plot structure", "dialogue improvement")'
          },
          context: {
            type: 'string',
            description: 'Additional context about what the user is working on'
          }
        },
        required: ['topic']
      },
      handler: async (params) => {
        const { topic, context: additionalContext } = params;
        
        // This is a discussion tool, so we don't apply changes
        // The AI will provide advice and suggestions
        return {
          success: true,
          message: `Let's discuss ${topic}. ${additionalContext ? `Context: ${additionalContext}` : ''}`,
          mode: 'discussion'
        };
      }
    },
    {
      name: 'get_context',
      description: 'Get information about the current document, selection, or specific content.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['document', 'selection', 'block', 'search'],
            description: 'What context to retrieve'
          },
          query: {
            type: 'string',
            description: 'If type is "search", what to search for'
          },
          blockId: {
            type: 'string',
            description: 'If type is "block", the ID of the block to retrieve'
          }
        },
        required: ['type']
      },
      handler: async (params) => {
        const { type, query, blockId } = params;
        
        if (!context.currentDocId || !context.currentDoc) {
          return {
            success: false,
            message: 'No document is currently open'
          };
        }

        switch (type) {
          case 'document':
            return {
              success: true,
              data: {
                title: context.currentDoc.title,
                blocks: context.currentDoc.blocks.map(b => ({
                  id: b.id,
                  text: b.text.substring(0, 200) + (b.text.length > 200 ? '...' : ''),
                  type: b.type,
                  level: b.level
                })),
                totalBlocks: context.currentDoc.blocks.length
              }
            };
            
          case 'selection':
            if (!context.selection) {
              return {
                success: false,
                message: 'No text is currently selected'
              };
            }
            const selectedBlock = context.currentDoc.blocks.find(b => b.id === context.selection!.blockId);
            if (!selectedBlock) {
              return {
                success: false,
                message: 'Selected block not found'
              };
            }
            return {
              success: true,
              data: {
                selectedText: selectedBlock.text.substring(context.selection!.start, context.selection!.end),
                blockId: context.selection.blockId,
                blockText: selectedBlock.text,
                position: {
                  start: context.selection.start,
                  end: context.selection.end
                }
              }
            };
            
          case 'block':
            if (!blockId) {
              return {
                success: false,
                message: 'Block ID is required'
              };
            }
            const block = context.currentDoc.blocks.find(b => b.id === blockId);
            if (!block) {
              return {
                success: false,
                message: 'Block not found'
              };
            }
            return {
              success: true,
              data: {
                id: block.id,
                text: block.text,
                type: block.type,
                level: block.level
              }
            };
            
          case 'search':
            if (!query) {
              return {
                success: false,
                message: 'Search query is required'
              };
            }
            const matchingBlocks = context.currentDoc.blocks.filter(b => 
              b.text.toLowerCase().includes(query.toLowerCase())
            );
            return {
              success: true,
              data: {
                query,
                matches: matchingBlocks.map(b => ({
                  id: b.id,
                  text: b.text.substring(0, 200) + (b.text.length > 200 ? '...' : ''),
                  type: b.type,
                  level: b.level
                })),
                totalMatches: matchingBlocks.length
              }
            };
            
          default:
            return {
              success: false,
              message: 'Invalid context type'
            };
        }
      }
    },
    {
      name: 'apply_batch_edit',
      description: 'Apply a previously proposed edit batch to the document.',
      parameters: {
        type: 'object',
        properties: {
          batch: {
            type: 'object',
            description: 'The edit batch to apply'
          }
        },
        required: ['batch']
      },
      handler: async (params) => {
        const { batch } = params;
        
        try {
          const result = await toolSurface.applyOps(batch);
          
          if (result.ok) {
            return {
              success: true,
              message: 'Edit applied successfully',
              newVersion: result.newVersion
            };
          } else {
            return {
              success: false,
              message: `Failed to apply edit: ${result.code}`
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Error applying edit: ${error.message}`
          };
        }
      }
    },
    {
      name: 'generate_scenes_for_chapter',
      description: 'Generate scenes for a specific chapter using AI. This creates 3 scenes with proper structure and metadata.',
      parameters: {
        type: 'object',
        properties: {
          chapterId: {
            type: 'string',
            description: 'The ID of the chapter to generate scenes for'
          }
        },
        required: ['chapterId']
      },
      handler: async (params) => {
        const { chapterId } = params;
        
        try {
          // Import the scene generation function
          const { generateScenesForChapter } = await import('./sceneGenerator');
          const result = await generateScenesForChapter(chapterId);
          
          return {
            success: true,
            message: `Generated ${result.scenes.length} scenes for chapter ${chapterId}`,
            scenes: result.scenes,
            chapterId: result.chapterId
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to generate scenes: ${error.message}`,
            error: error.message
          };
        }
      }
    },
    // Add research tools
    ...researchTools
  ];
}

/**
 * Convert agent tools to OpenAI function calling format
 */
export function toolsToOpenAIFormat(tools: AgentTool[]): any[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}
