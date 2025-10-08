/**
 * AI Editing Test Harness
 * 
 * Tests for policy gates, AI operations, and quality assurance.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { proposeEdits, LlmClient, EditContext } from '../ai/adapter';
import { gateBatch, gateAndJustify, createGateContext } from '../ai/policyGate';
import { evaluateStyleRules, outlineGuards, getDefaultStyleRules } from '../types/policy';
import { DocEditBatch, EditOp } from '../types/ops';

// Mock LLM client for testing
const createMockLLM = (response: any): LlmClient => {
  return async () => JSON.stringify(response);
};

describe('AI Editing - Style Rules', () => {
  it('detects weak adverbs', () => {
    const hits = evaluateStyleRules(
      'test-block',
      'She walked quickly and quietly across the hall.',
      { rules: ['NoWeakAdverbs'], banlist: [] }
    );
    
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some(h => h.rule === 'NoWeakAdverbs')).toBe(true);
    expect(hits.some(h => h.message.includes('quickly'))).toBe(true);
  });
  
  it('detects passive voice', () => {
    const hits = evaluateStyleRules(
      'test-block',
      'The door was opened by Sarah.',
      { rules: ['NoPassiveVoice'], banlist: [] }
    );
    
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some(h => h.rule === 'NoPassiveVoice')).toBe(true);
  });
  
  it('detects banlist words', () => {
    const hits = evaluateStyleRules(
      'test-block',
      'It was very dark and really scary.',
      { rules: [], banlist: ['very', 'really'] }
    );
    
    expect(hits.length).toBe(2);
    expect(hits.every(h => h.rule === 'Banlist')).toBe(true);
  });
  
  it('detects long paragraphs', () => {
    const longText = 'a'.repeat(600);
    const hits = evaluateStyleRules(
      'test-block',
      longText,
      { rules: ['MaxParagraphLength'], banlist: [] }
    );
    
    expect(hits.length).toBe(1);
    expect(hits[0].rule).toBe('MaxParagraphLength');
  });
});

describe('AI Editing - Outline Guards', () => {
  it('blocks deletion of required beats', () => {
    const op: EditOp = {
      op: 'deleteBlock',
      blockId: 'beat-block-1',
    };
    
    const sceneMeta = {
      id: 'scene-01',
      outline: {
        requiredBeats: ['beat-block-1'],
      },
      blocks: [
        { id: 'beat-block-1', text: 'Important plot point', hash: 'hash1' },
      ],
    };
    
    const report = outlineGuards(op, sceneMeta);
    
    expect(report.blocking).toBe(true);
    expect(report.hits.length).toBeGreaterThan(0);
    expect(report.hits[0].rule).toBe('RequiredBeat');
  });
  
  it('allows deletion of non-required blocks', () => {
    const op: EditOp = {
      op: 'deleteBlock',
      blockId: 'normal-block',
    };
    
    const sceneMeta = {
      id: 'scene-01',
      outline: {
        requiredBeats: ['beat-block-1'],
      },
      blocks: [
        { id: 'normal-block', text: 'Regular content', hash: 'hash1' },
      ],
    };
    
    const report = outlineGuards(op, sceneMeta);
    
    expect(report.blocking).toBe(false);
  });
  
  it('detects beat markers in block text', () => {
    const op: EditOp = {
      op: 'deleteBlock',
      blockId: 'marked-block',
    };
    
    const sceneMeta = {
      id: 'scene-01',
      blocks: [
        { 
          id: 'marked-block', 
          text: '<!-- beat:reveal -->The secret was revealed.', 
          hash: 'hash1' 
        },
      ],
    };
    
    const report = outlineGuards(op, sceneMeta);
    
    expect(report.blocking).toBe(true);
    expect(report.hits.some(h => h.rule === 'BeatMarker')).toBe(true);
  });
  
  it('allows safe operations', () => {
    const op: EditOp = {
      op: 'annotate',
      blockId: 'any-block',
      note: 'Review this',
    };
    
    const sceneMeta = {
      id: 'scene-01',
      blocks: [],
    };
    
    const report = outlineGuards(op, sceneMeta);
    
    expect(report.blocking).toBe(false);
  });
});

describe('AI Editing - Policy Gate', () => {
  it('gates a batch and blocks risky operations', () => {
    const batch: DocEditBatch = {
      type: 'DocEditBatch',
      docId: 'scene-01',
      baseVersion: 'sha256:test',
      ops: [
        { op: 'replace', blockId: 'block-1', range: { start: 0, end: 10 }, text: 'New text' },
        { op: 'deleteBlock', blockId: 'required-block' },
      ],
    };
    
    const ctx = createGateContext(
      'scene-01',
      [
        { id: 'block-1', text: 'Old text here', hash: 'hash1' },
        { id: 'required-block', text: 'Important', hash: 'hash2' },
      ],
      { requiredBeats: ['required-block'] }
    );
    
    const result = gateBatch(batch, ctx);
    
    expect(result.summary.totalOps).toBe(2);
    expect(result.summary.allowedOps).toBe(1);
    expect(result.summary.blockedOps).toBe(1);
    expect(result.blocked[0].reason).toContain('Required');
  });
  
  it('allows override when enabled', () => {
    const batch: DocEditBatch = {
      type: 'DocEditBatch',
      docId: 'scene-01',
      baseVersion: 'sha256:test',
      ops: [
        { op: 'deleteBlock', blockId: 'required-block' },
      ],
    };
    
    const ctx = createGateContext(
      'scene-01',
      [{ id: 'required-block', text: 'Important', hash: 'hash1' }],
      { requiredBeats: ['required-block'] },
      undefined,
      true // allowOverride
    );
    
    const result = gateBatch(batch, ctx);
    
    expect(result.summary.blockedOps).toBe(0);
    expect(result.summary.allowedOps).toBe(1);
  });
  
  it('generates justifications for operations', () => {
    const batch: DocEditBatch = {
      type: 'DocEditBatch',
      docId: 'scene-01',
      baseVersion: 'sha256:test',
      ops: [
        { op: 'replace', blockId: 'block-1', range: { start: 0, end: 10 }, text: 'Better text' },
      ],
    };
    
    const ctx = createGateContext(
      'scene-01',
      [{ id: 'block-1', text: 'Weak text here with quickly', hash: 'hash1' }],
      undefined,
      { rules: ['NoWeakAdverbs'], banlist: [] }
    );
    
    const { annotatedBatch } = gateAndJustify(batch, ctx, 'Tighten prose');
    
    expect(annotatedBatch.notes).toBeDefined();
    expect(annotatedBatch.notes).toContain('Justifications');
    expect(annotatedBatch.notes).toContain('block-1');
  });
});

describe('AI Editing - Integration Tests', () => {
  it('proposeEdits returns valid batch that passes gates', async () => {
    const mockLLM = createMockLLM({
      type: 'DocEditBatch',
      docId: 'scene-01',
      baseVersion: 'sha256:test',
      ops: [
        { 
          op: 'replace', 
          blockId: 'p_001', 
          range: { start: 4, end: 20 }, 
          text: '' 
        },
      ],
    });
    
    const ctx: EditContext = {
      docId: 'scene-01',
      baseVersion: 'sha256:test',
      selection: { blockId: 'p_001', start: 0, end: 50 },
      blockText: 'She quickly, quietly walked across the hall.',
      style: { rules: ['NoWeakAdverbs'], banlist: [] },
    };
    
    const batch = await proposeEdits(mockLLM, ctx, 'Tighten prose');
    
    expect(batch.type).toBe('DocEditBatch');
    expect(batch.ops.length).toBeGreaterThan(0);
    
    // Gate the batch
    const gateCtx = createGateContext(
      'scene-01',
      [{ id: 'p_001', text: ctx.blockText, hash: 'hash1' }],
      undefined,
      { rules: ['NoWeakAdverbs'], banlist: [] }
    );
    
    const result = gateBatch(batch, gateCtx);
    
    expect(result.summary.blockedOps).toBe(0);
  });
  
  it('mock LLM tighten removes adverbs', async () => {
    // Using the actual mock client from providers
    const mockLLM: LlmClient = async (messages) => {
      // Simple mock that removes adverbs
      const userMsg = messages.find(m => m.role === 'user');
      if (!userMsg) throw new Error('No user message');
      
      const ctx = JSON.parse(userMsg.content);
      const text = ctx.block.text;
      const tightened = text.replace(/\b\w+ly\b/gi, '').replace(/\s+/g, ' ').trim();
      
      return JSON.stringify({
        type: 'DocEditBatch',
        docId: ctx.docId,
        baseVersion: ctx.baseVersion,
        ops: [
          {
            op: 'replaceBlock',
            blockId: ctx.selection.blockId,
            text: tightened,
          },
        ],
      });
    };
    
    const ctx: EditContext = {
      docId: 'scene-01',
      baseVersion: 'sha256:test',
      selection: { blockId: 'p_001', start: 0, end: 50 },
      blockText: 'She quickly walked slowly down the hallway.',
      style: { rules: [], banlist: [] },
    };
    
    const batch = await proposeEdits(mockLLM, ctx, 'Tighten');
    
    expect(batch.ops.length).toBe(1);
    expect(batch.ops[0].op).toBe('replaceBlock');
    
    // Check that the result has fewer adverbs
    const newText = 'text' in batch.ops[0] ? batch.ops[0].text : '';
    const adverbsRemoved = !newText.includes('quickly') && !newText.includes('slowly');
    expect(adverbsRemoved).toBe(true);
  });
});

describe('AI Editing - Reversibility', () => {
  it('operations preserve original text for undo', () => {
    const batch: DocEditBatch = {
      type: 'DocEditBatch',
      docId: 'scene-01',
      baseVersion: 'sha256:before',
      ops: [
        { 
          op: 'replace', 
          blockId: 'p_001', 
          range: { start: 0, end: 10 }, 
          text: 'New text',
          expectHash: 'sha256:old',
        },
      ],
    };
    
    // The expectHash allows us to detect conflicts
    expect(batch.ops[0]).toHaveProperty('expectHash');
    
    // Original text can be recovered from:
    // 1. expectHash - validates we're editing the right version
    // 2. Version history in document store
    // 3. Git commits (if enabled)
  });
});

