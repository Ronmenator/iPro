/**
 * Smart Retrieval Pipeline
 * 
 * Combines regex filters, lint rules, and semantic search to find
 * the most relevant blocks for AI operations.
 */

import { ChunkIndex, getGlobalIndex, Hit } from './index';
import { useDocumentStore } from '../store/documentStore';
import { useOutlineStore } from '../store/outlineStore';
import { Block } from '../types/ops';

export type Intent = 
  | 'reduce-adverbs'
  | 'fix-passive'
  | 'tighten'
  | 'expand'
  | 'simplify'
  | 'fix-grammar'
  | 'custom';

export interface RetrievalResult {
  blocks: Array<{
    blockId: string;
    text: string;
    hash: string;
    score?: number;
    reason?: string;
  }>;
  context: {
    sceneId: string;
    outline?: {
      goal?: string;
      conflict?: string;
      outcome?: string;
    };
  };
  notes: string[];
  stats: {
    totalBlocks: number;
    filteredBlocks: number;
    returnedBlocks: number;
  };
}

/**
 * Get blocks for a specific scene
 */
function getSceneBlocks(sceneId: string): Block[] {
  const store = useDocumentStore.getState();
  const doc = store.documents.get(sceneId);
  
  if (!doc) return [];
  
  return doc.blocks;
}

/**
 * Get outline context for a scene
 */
function getSceneOutline(sceneId: string) {
  const store = useOutlineStore.getState();
  const card = store.cards.get(sceneId);
  
  if (!card) return null;
  
  return {
    goal: card.goal,
    conflict: card.conflict,
    outcome: card.outcome,
    clock: card.clock,
    crucible: card.crucible,
  };
}

/**
 * Regex patterns for different intents
 */
const INTENT_PATTERNS: Record<Intent, RegExp | null> = {
  'reduce-adverbs': /\b\w+ly\b/gi,
  'fix-passive': /\b(was|were|is|are|been|be|being)\s+(\w+ed|done|gone|taken)\b/gi,
  'tighten': /\b(very|really|quite|rather|somehow|somewhat|just)\b/gi,
  'expand': null, // No regex filter
  'simplify': null, // No regex filter
  'fix-grammar': null, // Would need more sophisticated checking
  'custom': null, // User-defined
};

/**
 * Search queries for different intents
 */
const INTENT_QUERIES: Record<Intent, string> = {
  'reduce-adverbs': 'adverb weakly descriptive modifier',
  'fix-passive': 'passive voice was were been',
  'tighten': 'verbose wordy filler weak',
  'expand': 'brief short sparse lacking detail',
  'simplify': 'complex complicated difficult unclear',
  'fix-grammar': 'grammar error mistake typo',
  'custom': '',
};

/**
 * Smart retrieval function - main entry point
 */
export async function smartFindSceneTargets(
  sceneId: string,
  intent: Intent,
  customQuery?: string,
  maxBlocks: number = 5
): Promise<RetrievalResult> {
  const notes: string[] = [];
  
  // 1) Load scene blocks from store
  const blocks = getSceneBlocks(sceneId);
  notes.push(`Scene has ${blocks.length} blocks`);
  
  if (blocks.length === 0) {
    return {
      blocks: [],
      context: { sceneId },
      notes: [...notes, 'No blocks found in scene'],
      stats: { totalBlocks: 0, filteredBlocks: 0, returnedBlocks: 0 },
    };
  }
  
  // 2) Prefilter by intent using regex
  let candidates = blocks;
  const pattern = INTENT_PATTERNS[intent];
  
  if (pattern) {
    candidates = blocks.filter(b => pattern.test(b.text));
    notes.push(`Regex filter: ${candidates.length}/${blocks.length} blocks match pattern`);
  }
  
  // 3) If too many candidates, rank via search index
  let ranked = candidates;
  
  if (candidates.length > maxBlocks) {
    const idx = getGlobalIndex();
    const query = customQuery || INTENT_QUERIES[intent];
    
    if (query) {
      const hits = idx.searchInDoc(sceneId, query, candidates.length);
      notes.push(`Search ranking applied with query: "${query}"`);
      
      // Create a score map
      const hitScores = new Map<string, number>();
      hits.forEach(hit => hitScores.set(hit.blockId, hit.score));
      
      // Sort candidates by search score
      ranked = candidates.sort((a, b) => {
        const scoreA = hitScores.get(a.id) ?? 0;
        const scoreB = hitScores.get(b.id) ?? 0;
        return scoreB - scoreA;
      });
    }
  }
  
  // 4) Cap to small context window
  const limited = ranked.slice(0, maxBlocks);
  notes.push(`Limited to top ${limited.length} blocks for efficiency`);
  
  // 5) Get outline context
  const outline = getSceneOutline(sceneId);
  if (outline) {
    notes.push('Outline context included');
  }
  
  // 6) Format result
  return {
    blocks: limited.map(b => ({
      blockId: b.id,
      text: b.text,
      hash: b.hash,
      reason: pattern && pattern.test(b.text) ? `Matches ${intent} pattern` : 'Search ranking',
    })),
    context: {
      sceneId,
      outline: outline ?? undefined,
    },
    notes,
    stats: {
      totalBlocks: blocks.length,
      filteredBlocks: candidates.length,
      returnedBlocks: limited.length,
    },
  };
}

/**
 * Find blocks across all scenes matching an intent
 */
export async function smartFindGlobalTargets(
  intent: Intent,
  customQuery?: string,
  maxBlocksPerScene: number = 3,
  maxScenes: number = 5
): Promise<Array<RetrievalResult>> {
  const store = useDocumentStore.getState();
  const results: RetrievalResult[] = [];
  
  // Get all scene documents
  const scenes = Array.from(store.documents.values())
    .filter(doc => doc.id.startsWith('scene/'));
  
  // Process each scene
  for (const scene of scenes.slice(0, maxScenes)) {
    const result = await smartFindSceneTargets(
      scene.id,
      intent,
      customQuery,
      maxBlocksPerScene
    );
    
    if (result.blocks.length > 0) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Find all blocks in a scene matching a regex pattern
 */
export function findBlocksByPattern(
  sceneId: string,
  pattern: RegExp,
  maxBlocks?: number
): Array<{ blockId: string; text: string; hash: string; matches: string[] }> {
  const blocks = getSceneBlocks(sceneId);
  const results: Array<{ blockId: string; text: string; hash: string; matches: string[] }> = [];
  
  for (const block of blocks) {
    const matches = block.text.match(pattern);
    if (matches && matches.length > 0) {
      results.push({
        blockId: block.id,
        text: block.text,
        hash: block.hash,
        matches: [...new Set(matches)], // Unique matches
      });
    }
  }
  
  return maxBlocks ? results.slice(0, maxBlocks) : results;
}

/**
 * Get statistics about a scene
 */
export function getSceneStats(sceneId: string): {
  totalBlocks: number;
  paragraphs: number;
  headings: number;
  wordCount: number;
  hasOutline: boolean;
} {
  const blocks = getSceneBlocks(sceneId);
  const outline = getSceneOutline(sceneId);
  
  let wordCount = 0;
  let paragraphs = 0;
  let headings = 0;
  
  for (const block of blocks) {
    const words = block.text.split(/\s+/).filter(w => w.length > 0);
    wordCount += words.length;
    
    if (block.type === 'paragraph') paragraphs++;
    if (block.type === 'heading') headings++;
  }
  
  return {
    totalBlocks: blocks.length,
    paragraphs,
    headings,
    wordCount,
    hasOutline: !!outline,
  };
}

/**
 * Build context string for AI prompt
 */
export function buildContextString(result: RetrievalResult): string {
  const parts: string[] = [];
  
  // Add outline if available
  if (result.context.outline) {
    parts.push('Scene Context:');
    if (result.context.outline.goal) {
      parts.push(`- Goal: ${result.context.outline.goal}`);
    }
    if (result.context.outline.conflict) {
      parts.push(`- Conflict: ${result.context.outline.conflict}`);
    }
    if (result.context.outline.outcome) {
      parts.push(`- Outcome: ${result.context.outline.outcome}`);
    }
    parts.push('');
  }
  
  // Add retrieval notes
  parts.push('Retrieval Info:');
  parts.push(...result.notes.map(n => `- ${n}`));
  parts.push('');
  
  return parts.join('\n');
}

