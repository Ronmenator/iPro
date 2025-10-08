/**
 * Policy Gate
 * 
 * Wraps AI operations to ensure they pass policy checks before execution.
 * Provides justification tracking and blocking of risky operations.
 */

import { DocEditBatch, EditOp } from '../types/ops';
import { 
  evaluateStyleRules, 
  outlineGuards, 
  PolicyHit, 
  PolicyReport,
  SceneMeta,
  StyleRules,
  evaluateBatchPolicies,
} from '../types/policy';

/**
 * Gated operation with policy evaluation
 */
export interface GatedOp {
  op: EditOp;
  allowed: boolean;
  reason?: string;
  styleHits: PolicyHit[];
  outlineReport: PolicyReport;
  justification?: string;
}

/**
 * Gate context - information needed for policy evaluation
 */
export interface GateContext {
  sceneMeta: SceneMeta;
  style: StyleRules;
  allowOverride?: boolean; // User can override blocking policies
}

/**
 * Result of gating a batch
 */
export interface GateResult {
  allowed: EditOp[];
  blocked: Array<{
    op: EditOp;
    reason: string;
    details: PolicyReport;
  }>;
  warnings: Array<{
    op: EditOp;
    hits: PolicyHit[];
  }>;
  summary: {
    totalOps: number;
    allowedOps: number;
    blockedOps: number;
    warningsCount: number;
  };
}

/**
 * Main gating function - filters operations through policy checks
 */
export function gateBatch(
  batch: DocEditBatch,
  ctx: GateContext
): GateResult {
  const allowed: EditOp[] = [];
  const blocked: Array<{ op: EditOp; reason: string; details: PolicyReport }> = [];
  const warnings: Array<{ op: EditOp; hits: PolicyHit[] }> = [];
  
  for (const op of batch.ops) {
    // Evaluate outline guards
    const outlineReport = outlineGuards(op, ctx.sceneMeta);
    
    // If blocking and no override, block the operation
    if (outlineReport.blocking && !ctx.allowOverride) {
      blocked.push({
        op,
        reason: outlineReport.reason || 'Outline guard violation',
        details: outlineReport,
      });
      continue;
    }
    
    // Evaluate style rules for warnings
    const blockId = 'blockId' in op ? op.blockId : null;
    if (blockId) {
      const block = ctx.sceneMeta.blocks?.find(b => b.id === blockId);
      if (block) {
        const styleHits = evaluateStyleRules(blockId, block.text, ctx.style);
        if (styleHits.length > 0) {
          warnings.push({ op, hits: styleHits });
        }
      }
    }
    
    // Allow the operation
    allowed.push(op);
  }
  
  return {
    allowed,
    blocked,
    warnings,
    summary: {
      totalOps: batch.ops.length,
      allowedOps: allowed.length,
      blockedOps: blocked.length,
      warningsCount: warnings.length,
    },
  };
}

/**
 * Annotate operations with justifications
 */
export function annotateOps(
  batch: DocEditBatch,
  justifications: Map<string, string> // blockId -> justification
): DocEditBatch {
  return {
    ...batch,
    notes: batch.notes 
      ? `${batch.notes}\n\nJustifications:\n${Array.from(justifications.entries()).map(([id, just]) => `- ${id}: ${just}`).join('\n')}`
      : `Justifications:\n${Array.from(justifications.entries()).map(([id, just]) => `- ${id}: ${just}`).join('\n')}`,
  };
}

/**
 * Generate justification for an operation
 */
export function generateJustification(
  op: EditOp,
  intent: string,
  styleViolations?: PolicyHit[]
): string {
  const parts: string[] = [];
  
  // Intent-based justification
  if (intent) {
    parts.push(`Intent: ${intent}`);
  }
  
  // Operation-specific reasoning
  switch (op.op) {
    case 'replace':
      parts.push('Replacing text to improve clarity/style');
      break;
    case 'replaceBlock':
      parts.push('Replacing entire block for significant improvement');
      break;
    case 'insertAfter':
      parts.push('Adding content to expand or clarify');
      break;
    case 'deleteBlock':
      parts.push('Removing redundant or problematic content');
      break;
    case 'moveBlock':
      parts.push('Reordering for better flow');
      break;
    case 'annotate':
      parts.push('Adding note for review');
      break;
  }
  
  // Style violation fixes
  if (styleViolations && styleViolations.length > 0) {
    const rules = [...new Set(styleViolations.map(v => v.rule))];
    parts.push(`Fixes: ${rules.join(', ')}`);
  }
  
  return parts.join('; ');
}

/**
 * Enhanced gating with justifications
 */
export function gateAndJustify(
  batch: DocEditBatch,
  ctx: GateContext,
  intent: string
): {
  result: GateResult;
  annotatedBatch: DocEditBatch;
} {
  const result = gateBatch(batch, ctx);
  
  // Generate justifications for allowed ops
  const justifications = new Map<string, string>();
  for (const op of result.allowed) {
    if ('blockId' in op) {
      const warning = result.warnings.find(w => 
        'blockId' in w.op && w.op.blockId === op.blockId
      );
      const just = generateJustification(op, intent, warning?.hits);
      justifications.set(op.blockId, just);
    }
  }
  
  // Annotate the batch
  const annotatedBatch = annotateOps(
    { ...batch, ops: result.allowed },
    justifications
  );
  
  return {
    result,
    annotatedBatch,
  };
}

/**
 * Create a gate context from current application state
 */
export function createGateContext(
  sceneId: string,
  blocks: Array<{ id: string; text: string; hash: string }>,
  outline?: any,
  styleRules?: StyleRules,
  allowOverride: boolean = false
): GateContext {
  return {
    sceneMeta: {
      id: sceneId,
      outline: outline ? {
        goal: outline.goal,
        conflict: outline.conflict,
        outcome: outline.outcome,
        clock: outline.clock,
        crucible: outline.crucible,
        requiredBeats: outline.requiredBeats || [],
      } : undefined,
      blocks: blocks.map(b => ({
        id: b.id,
        text: b.text,
        hash: b.hash,
      })),
    },
    style: styleRules || {
      rules: ['NoWeakAdverbs', 'NoPassiveVoice'],
      banlist: ['very', 'really', 'quite'],
    },
    allowOverride,
  };
}

/**
 * Check if a batch has any blocking issues
 */
export function hasBlockingIssues(batch: DocEditBatch, ctx: GateContext): boolean {
  const result = gateBatch(batch, ctx);
  return result.blocked.length > 0;
}

/**
 * Get summary of policy issues
 */
export function getPolicySummary(result: GateResult): string {
  const lines: string[] = [];
  
  lines.push(`Policy Gate Summary:`);
  lines.push(`- Total operations: ${result.summary.totalOps}`);
  lines.push(`- Allowed: ${result.summary.allowedOps}`);
  lines.push(`- Blocked: ${result.summary.blockedOps}`);
  lines.push(`- Warnings: ${result.summary.warningsCount}`);
  
  if (result.blocked.length > 0) {
    lines.push('');
    lines.push('Blocked operations:');
    for (const block of result.blocked) {
      lines.push(`- ${block.op.op}: ${block.reason}`);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    const uniqueRules = new Set<string>();
    for (const warning of result.warnings) {
      for (const hit of warning.hits) {
        uniqueRules.add(hit.rule);
      }
    }
    for (const rule of uniqueRules) {
      const count = result.warnings.reduce(
        (sum, w) => sum + w.hits.filter(h => h.rule === rule).length,
        0
      );
      lines.push(`- ${rule}: ${count} violation(s)`);
    }
  }
  
  return lines.join('\n');
}

