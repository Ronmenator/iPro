import { BlockSelector, FindOptions, FindResult, DocIndexScope, DocIndexEntry, StyleRules, ToolResult } from '../types/tools';
import { Block, Document } from '../types/ops';

/**
 * AI Tool Functions
 * These are the functions an AI can call to interact with documents
 */

/**
 * Read blocks from a document based on selectors
 */
export function readBlocks(
  doc: Document | null,
  selector: BlockSelector
): ToolResult<Block[]> {
  if (!doc) {
    return { ok: false, error: 'Document not found' };
  }

  try {
    let selectedBlocks: Block[] = [];

    switch (selector.type) {
      case 'id':
        selectedBlocks = doc.blocks.filter(block => selector.ids.includes(block.id));
        break;

      case 'range':
        const start = Math.max(0, selector.start);
        const end = Math.min(doc.blocks.length, selector.end);
        selectedBlocks = doc.blocks.slice(start, end);
        break;

      case 'type':
        selectedBlocks = doc.blocks.filter(block => {
          if (block.type !== selector.blockType) return false;
          if (selector.blockType === 'heading' && selector.level !== undefined) {
            return block.level === selector.level;
          }
          return true;
        });
        break;

      case 'all':
        selectedBlocks = [...doc.blocks];
        break;

      default:
        return { ok: false, error: 'Invalid selector type' };
    }

    return { ok: true, data: selectedBlocks };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Find text in document using regex
 */
export function find(
  doc: Document | null,
  options: FindOptions
): ToolResult<FindResult[]> {
  if (!doc) {
    return { ok: false, error: 'Document not found' };
  }

  try {
    const flags = options.caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(options.regex, flags);
    const results: FindResult[] = [];
    const limit = options.limit || 100;

    for (let i = 0; i < doc.blocks.length && results.length < limit; i++) {
      const block = doc.blocks[i];
      const matches: Array<{ start: number; end: number; matched: string }> = [];
      
      let match;
      while ((match = regex.exec(block.text)) !== null && matches.length < limit) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          matched: match[0],
        });
        
        // Prevent infinite loop on zero-length matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }

      if (matches.length > 0) {
        results.push({
          blockId: block.id,
          blockIndex: i,
          text: block.text,
          matches,
        });
      }
    }

    return { ok: true, data: results };
  } catch (error) {
    return { ok: false, error: `Invalid regex: ${error}` };
  }
}

/**
 * Get document index (list of documents)
 */
export function getDocIndex(
  documents: Map<string, Document>,
  scope: DocIndexScope = 'all'
): ToolResult<DocIndexEntry[]> {
  try {
    const entries: DocIndexEntry[] = [];

    documents.forEach((doc) => {
      const type = doc.id.split('/')[0]; // 'scene', 'chapter', 'research', etc.
      
      // Filter by scope
      if (scope !== 'all') {
        const scopeMatch = 
          (scope === 'scenes' && type === 'scene') ||
          (scope === 'chapters' && type === 'chapter') ||
          (scope === 'research' && type === 'research');
        
        if (!scopeMatch) return;
      }

      entries.push({
        id: doc.id,
        title: doc.title,
        type,
        blockCount: doc.blocks.length,
        lastModified: doc.lastModified,
      });
    });

    // Sort by last modified (newest first)
    entries.sort((a, b) => b.lastModified - a.lastModified);

    return { ok: true, data: entries };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Get style rules for the project
 */
export function getStyleRules(): ToolResult<StyleRules> {
  // In a real app, these would be loaded from user preferences or project config
  const rules: StyleRules = {
    maxParagraphLength: 500,
    preferredTense: 'past',
    pointOfView: 'third',
    toneGuidelines: 'Maintain a mysterious and atmospheric tone. Show, don\'t tell. Build tension gradually.',
    formatRules: [
      'Use proper dialogue formatting with quotation marks',
      'Start new paragraphs for new speakers',
      'Avoid excessive adverbs',
      'Vary sentence length for rhythm',
      'Use active voice when possible',
    ],
  };

  return { ok: true, data: rules };
}

/**
 * Format tool results for display
 */
export function formatToolResult(result: ToolResult<any>, toolName: string): string {
  if (!result.ok) {
    return `❌ ${toolName} failed: ${result.error}`;
  }

  try {
    return JSON.stringify(result.data, null, 2);
  } catch {
    return String(result.data);
  }
}

