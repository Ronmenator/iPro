import { Block, Document } from './ops';

/**
 * Tool function types for AI integration
 */

// Selector types for readBlocks
export type BlockSelector = 
  | { type: 'id'; ids: string[] }
  | { type: 'range'; start: number; end: number }
  | { type: 'type'; blockType: 'paragraph' | 'heading'; level?: number }
  | { type: 'all' };

// Find options
export interface FindOptions {
  regex: string;
  limit?: number;
  caseSensitive?: boolean;
}

// Find result
export interface FindResult {
  blockId: string;
  blockIndex: number;
  text: string;
  matches: Array<{
    start: number;
    end: number;
    matched: string;
  }>;
}

// Doc index scope
export type DocIndexScope = 'all' | 'scenes' | 'chapters' | 'research';

// Doc index entry
export interface DocIndexEntry {
  id: string;
  title: string;
  type: string;
  blockCount: number;
  lastModified: number;
}

// Style rules
export interface StyleRules {
  maxParagraphLength?: number;
  preferredTense?: 'past' | 'present' | 'future';
  pointOfView?: 'first' | 'second' | 'third';
  toneGuidelines?: string;
  formatRules?: string[];
}

// Tool call result wrapper
export type ToolResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string };

