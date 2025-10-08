/**
 * Policy System Types
 * 
 * Defines rules and guards for AI editing operations to ensure
 * edits are justified, safe, and aligned with project guidelines.
 */

import { EditOp } from './ops';

/**
 * Policy hit - a violation or warning about a specific text location
 */
export interface PolicyHit {
  rule: string;
  blockId: string;
  start?: number;
  end?: number;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Policy evaluation report
 */
export interface PolicyReport {
  hits: PolicyHit[];
  blocking: boolean;
  reason?: string;
}

/**
 * Style rules configuration
 */
export interface StyleRules {
  rules: string[];
  banlist: string[];
  preferences?: string[];
}

/**
 * Scene metadata for outline guards
 */
export interface SceneMeta {
  id: string;
  outline?: {
    goal?: string;
    conflict?: string;
    outcome?: string;
    clock?: string;
    crucible?: string;
    requiredBeats?: string[]; // Block IDs
  };
  blocks?: Array<{
    id: string;
    text: string;
    hash: string;
    markers?: string[]; // e.g., ["beat:reveal", "plot:twist"]
  }>;
}

/**
 * Evaluate style rules against a block of text
 */
export function evaluateStyleRules(
  blockId: string,
  text: string,
  rules: StyleRules
): PolicyHit[] {
  const hits: PolicyHit[] = [];
  
  // Rule: NoWeakAdverbs
  if (rules.rules.includes('NoWeakAdverbs')) {
    const adverbPattern = /\b\w+ly\b/g;
    let match;
    while ((match = adverbPattern.exec(text))) {
      hits.push({
        rule: 'NoWeakAdverbs',
        blockId,
        start: match.index,
        end: match.index + match[0].length,
        message: `Adverb: ${match[0]}`,
        severity: 'warning',
      });
    }
  }
  
  // Rule: NoPassiveVoice
  if (rules.rules.includes('NoPassiveVoice')) {
    const passivePattern = /\b(was|were|is|are|been|be|being)\s+(\w+ed|done|gone|taken)\b/gi;
    let match;
    while ((match = passivePattern.exec(text))) {
      hits.push({
        rule: 'NoPassiveVoice',
        blockId,
        start: match.index,
        end: match.index + match[0].length,
        message: `Passive voice: ${match[0]}`,
        severity: 'warning',
      });
    }
  }
  
  // Rule: Banlist words
  for (const banned of rules.banlist) {
    const idx = text.toLowerCase().indexOf(banned.toLowerCase());
    if (idx >= 0) {
      hits.push({
        rule: 'Banlist',
        blockId,
        start: idx,
        end: idx + banned.length,
        message: `Banned word: ${banned}`,
        severity: 'error',
      });
    }
  }
  
  // Rule: MaxParagraphLength
  if (rules.rules.includes('MaxParagraphLength')) {
    if (text.length > 500) {
      hits.push({
        rule: 'MaxParagraphLength',
        blockId,
        message: `Paragraph too long: ${text.length} characters (max 500)`,
        severity: 'info',
      });
    }
  }
  
  // Rule: NoClichés
  if (rules.rules.includes('NoClichés')) {
    const clichés = [
      'at the end of the day',
      'think outside the box',
      'low-hanging fruit',
      'it goes without saying',
      'at this point in time',
    ];
    
    for (const cliché of clichés) {
      const idx = text.toLowerCase().indexOf(cliché.toLowerCase());
      if (idx >= 0) {
        hits.push({
          rule: 'NoClichés',
          blockId,
          start: idx,
          end: idx + cliché.length,
          message: `Cliché: ${cliché}`,
          severity: 'warning',
        });
      }
    }
  }
  
  return hits;
}

/**
 * Check if an operation affects outline beats or required content
 */
export function outlineGuards(
  op: EditOp,
  sceneMeta: SceneMeta
): PolicyReport {
  const hits: PolicyHit[] = [];
  let blocking = false;
  let reason: string | undefined;
  
  // Check if this is a risky operation
  const riskyOps = ['deleteBlock', 'replaceBlock', 'moveBlock'];
  const isRisky = riskyOps.includes(op.op);
  
  if (!isRisky) {
    return { hits, blocking: false };
  }
  
  // Get block ID from operation
  const blockId = 'blockId' in op ? op.blockId : null;
  if (!blockId) {
    return { hits, blocking: false };
  }
  
  // Check if block is marked as required
  const requiredBeats = sceneMeta.outline?.requiredBeats || [];
  if (requiredBeats.includes(blockId)) {
    blocking = true;
    reason = 'Required outline beat';
    hits.push({
      rule: 'RequiredBeat',
      blockId,
      message: `Block contains required story beat and cannot be ${op.op === 'deleteBlock' ? 'deleted' : 'modified'}`,
      severity: 'error',
    });
  }
  
  // Check for beat markers in block text
  const block = sceneMeta.blocks?.find(b => b.id === blockId);
  if (block) {
    // Check for HTML comments with beat markers
    const beatMarkers = block.text.match(/<!--\s*beat:(\w+)\s*-->/g);
    if (beatMarkers && beatMarkers.length > 0) {
      blocking = true;
      reason = 'Contains beat markers';
      hits.push({
        rule: 'BeatMarker',
        blockId,
        message: `Block contains beat markers: ${beatMarkers.join(', ')}`,
        severity: 'error',
      });
    }
    
    // Check for plot markers
    const plotMarkers = block.text.match(/<!--\s*plot:(\w+)\s*-->/g);
    if (plotMarkers && plotMarkers.length > 0) {
      hits.push({
        rule: 'PlotMarker',
        blockId,
        message: `Block contains plot markers: ${plotMarkers.join(', ')}`,
        severity: 'warning',
      });
    }
  }
  
  return { hits, blocking, reason };
}

/**
 * Evaluate a batch of operations against all policies
 */
export function evaluateBatchPolicies(
  ops: EditOp[],
  sceneMeta: SceneMeta,
  styleRules: StyleRules
): {
  opReports: Array<{
    op: EditOp;
    styleHits: PolicyHit[];
    outlineReport: PolicyReport;
    safe: boolean;
  }>;
  overallSafe: boolean;
  blockingCount: number;
} {
  const opReports = ops.map(op => {
    // Get block text for style evaluation
    const blockId = 'blockId' in op ? op.blockId : null;
    const block = blockId ? sceneMeta.blocks?.find(b => b.id === blockId) : null;
    
    const styleHits = block 
      ? evaluateStyleRules(blockId!, block.text, styleRules)
      : [];
    
    const outlineReport = outlineGuards(op, sceneMeta);
    
    return {
      op,
      styleHits,
      outlineReport,
      safe: !outlineReport.blocking,
    };
  });
  
  const blockingCount = opReports.filter(r => !r.safe).length;
  const overallSafe = blockingCount === 0;
  
  return {
    opReports,
    overallSafe,
    blockingCount,
  };
}

/**
 * Get default style rules
 */
export function getDefaultStyleRules(): StyleRules {
  return {
    rules: [
      'NoWeakAdverbs',
      'NoPassiveVoice',
      'MaxParagraphLength',
      'NoClichés',
    ],
    banlist: [
      'very',
      'really',
      'quite',
      'rather',
      'somehow',
      'somewhat',
      'just',
    ],
    preferences: [
      'Use active voice',
      'Show, don\'t tell',
      'Avoid filter words (saw, heard, felt)',
    ],
  };
}

/**
 * Format policy hits for display
 */
export function formatPolicyHits(hits: PolicyHit[]): string {
  if (hits.length === 0) {
    return 'No policy violations found.';
  }
  
  const lines: string[] = [];
  const grouped = hits.reduce((acc, hit) => {
    if (!acc[hit.rule]) {
      acc[hit.rule] = [];
    }
    acc[hit.rule].push(hit);
    return acc;
  }, {} as Record<string, PolicyHit[]>);
  
  for (const [rule, ruleHits] of Object.entries(grouped)) {
    lines.push(`${rule} (${ruleHits.length}):`);
    for (const hit of ruleHits.slice(0, 5)) { // Show max 5 per rule
      lines.push(`  - ${hit.message}`);
    }
    if (ruleHits.length > 5) {
      lines.push(`  ... and ${ruleHits.length - 5} more`);
    }
  }
  
  return lines.join('\n');
}

