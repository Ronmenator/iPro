/**
 * Multi-Block Edit Orchestrator
 * 
 * Coordinates AI edits across multiple blocks in a batch operation.
 */

import { proposeEdits, LlmClient } from '../ai/adapter';
import { smartFindSceneTargets, Intent, buildContextString } from './retrieval';
import { DocEditBatch, EditOp } from '../types/ops';
import { useDocumentStore } from '../store/documentStore';

export interface BatchEditRequest {
  sceneId: string;
  intent: Intent;
  instruction?: string;
  maxBlocks?: number;
}

export interface BatchEditResult {
  batch: DocEditBatch;
  blocks: Array<{
    blockId: string;
    originalText: string;
    operations: EditOp[];
  }>;
  context: string;
  stats: {
    totalBlocks: number;
    editedBlocks: number;
    totalOperations: number;
  };
}

/**
 * Generate instruction based on intent
 */
function getInstructionForIntent(intent: Intent): string {
  const instructions: Record<Intent, string> = {
    'reduce-adverbs': 'Remove or replace weak -ly adverbs with stronger verbs. Keep meaning unchanged.',
    'fix-passive': 'Convert passive voice to active voice. Make prose more direct and dynamic.',
    'tighten': 'Remove filler words (very, really, quite, etc.). Tighten prose without losing meaning.',
    'expand': 'Add sensory details and descriptions. Expand sparse passages.',
    'simplify': 'Simplify complex language. Make text more accessible.',
    'fix-grammar': 'Fix grammar, spelling, and punctuation errors.',
    'custom': '', // Will be provided by user
  };
  
  return instructions[intent];
}

/**
 * Orchestrate multi-block edits
 * 
 * This is the main function that:
 * 1. Retrieves relevant blocks
 * 2. Calls AI for each block
 * 3. Combines all operations into one batch
 */
export async function orchestrateSceneEdit(
  llm: LlmClient,
  request: BatchEditRequest
): Promise<BatchEditResult> {
  const { sceneId, intent, instruction, maxBlocks = 5 } = request;
  
  // 1) Retrieve relevant blocks
  const retrieval = await smartFindSceneTargets(
    sceneId,
    intent,
    instruction,
    maxBlocks
  );
  
  if (retrieval.blocks.length === 0) {
    throw new Error('No blocks found matching criteria');
  }
  
  // 2) Get document and base version
  const store = useDocumentStore.getState();
  const doc = store.documents.get(sceneId);
  
  if (!doc) {
    throw new Error(`Scene not found: ${sceneId}`);
  }
  
  // 3) Get style rules
  const style = { rules: [], banlist: [] }; // Could load from config
  
  // 4) Build instruction
  const baseInstruction = instruction || getInstructionForIntent(intent);
  
  // 5) Process each block and collect operations
  const allOps: EditOp[] = [];
  const processedBlocks: Array<{
    blockId: string;
    originalText: string;
    operations: EditOp[];
  }> = [];
  
  const contextStr = buildContextString(retrieval);
  
  for (const block of retrieval.blocks) {
    try {
      // Find the full block in document
      const fullBlock = doc.blocks.find(b => b.id === block.blockId);
      if (!fullBlock) continue;
      
      // Propose edits for this block
      const editBatch = await proposeEdits(
        llm,
        {
          docId: sceneId,
          baseVersion: doc.baseVersion,
          selection: {
            blockId: block.blockId,
            start: 0,
            end: fullBlock.text.length,
          },
          blockText: fullBlock.text,
          style,
        },
        `${baseInstruction}\n\nContext:\n${contextStr}`
      );
      
      // Collect operations
      const blockOps = editBatch.ops.filter(op => {
        // Only include ops for this block
        return 'blockId' in op && op.blockId === block.blockId;
      });
      
      allOps.push(...blockOps);
      processedBlocks.push({
        blockId: block.blockId,
        originalText: fullBlock.text,
        operations: blockOps,
      });
      
    } catch (error) {
      console.error(`Failed to process block ${block.blockId}:`, error);
      // Continue with other blocks
    }
  }
  
  // 6) Create combined batch
  const combinedBatch: DocEditBatch = {
    type: 'DocEditBatch',
    docId: sceneId,
    baseVersion: doc.baseVersion,
    ops: allOps,
    notes: `Multi-block ${intent}: ${allOps.length} operations across ${processedBlocks.length} blocks`,
  };
  
  return {
    batch: combinedBatch,
    blocks: processedBlocks,
    context: contextStr,
    stats: {
      totalBlocks: retrieval.blocks.length,
      editedBlocks: processedBlocks.length,
      totalOperations: allOps.length,
    },
  };
}

/**
 * Orchestrate edits with progressive feedback
 * 
 * Yields progress updates as blocks are processed
 */
export async function* orchestrateSceneEditProgressive(
  llm: LlmClient,
  request: BatchEditRequest
): AsyncGenerator<{
  type: 'progress' | 'complete';
  current?: number;
  total?: number;
  blockId?: string;
  result?: BatchEditResult;
}> {
  const { sceneId, intent, instruction, maxBlocks = 5 } = request;
  
  // Retrieve blocks
  const retrieval = await smartFindSceneTargets(
    sceneId,
    intent,
    instruction,
    maxBlocks
  );
  
  if (retrieval.blocks.length === 0) {
    throw new Error('No blocks found matching criteria');
  }
  
  const store = useDocumentStore.getState();
  const doc = store.documents.get(sceneId);
  
  if (!doc) {
    throw new Error(`Scene not found: ${sceneId}`);
  }
  
  const style = { rules: [], banlist: [] };
  const baseInstruction = instruction || getInstructionForIntent(intent);
  const contextStr = buildContextString(retrieval);
  
  const allOps: EditOp[] = [];
  const processedBlocks: Array<{
    blockId: string;
    originalText: string;
    operations: EditOp[];
  }> = [];
  
  // Process blocks with progress
  for (let i = 0; i < retrieval.blocks.length; i++) {
    const block = retrieval.blocks[i];
    
    yield {
      type: 'progress',
      current: i + 1,
      total: retrieval.blocks.length,
      blockId: block.blockId,
    };
    
    try {
      const fullBlock = doc.blocks.find(b => b.id === block.blockId);
      if (!fullBlock) continue;
      
      const editBatch = await proposeEdits(
        llm,
        {
          docId: sceneId,
          baseVersion: doc.baseVersion,
          selection: {
            blockId: block.blockId,
            start: 0,
            end: fullBlock.text.length,
          },
          blockText: fullBlock.text,
          style,
        },
        `${baseInstruction}\n\nContext:\n${contextStr}`
      );
      
      const blockOps = editBatch.ops.filter(op => {
        return 'blockId' in op && op.blockId === block.blockId;
      });
      
      allOps.push(...blockOps);
      processedBlocks.push({
        blockId: block.blockId,
        originalText: fullBlock.text,
        operations: blockOps,
      });
      
    } catch (error) {
      console.error(`Failed to process block ${block.blockId}:`, error);
    }
  }
  
  // Yield final result
  const combinedBatch: DocEditBatch = {
    type: 'DocEditBatch',
    docId: sceneId,
    baseVersion: doc.baseVersion,
    ops: allOps,
    notes: `Multi-block ${intent}: ${allOps.length} operations across ${processedBlocks.length} blocks`,
  };
  
  yield {
    type: 'complete',
    result: {
      batch: combinedBatch,
      blocks: processedBlocks,
      context: contextStr,
      stats: {
        totalBlocks: retrieval.blocks.length,
        editedBlocks: processedBlocks.length,
        totalOperations: allOps.length,
      },
    },
  };
}

