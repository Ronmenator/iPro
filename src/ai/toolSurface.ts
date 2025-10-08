import { useDocumentStore } from '../store/documentStore';
import { ToolSurface, ToolReadBlock, ToolReadRequest, DocEditBatch } from '../types/ops';
import { simulateOps, applyOps } from '../utils/operations';
import { loadStyleConfig } from '../utils/linting';

/**
 * Create a tool surface instance for AI operations
 */
export function createToolSurface(): ToolSurface {
  return {
    /**
     * Read blocks from a document
     */
    async readBlocks(req: ToolReadRequest): Promise<ToolReadBlock[]> {
      const store = useDocumentStore.getState();
      const doc = await store.loadDocument(req.docId);
      
      if (!doc) {
        throw new Error(`Document not found: ${req.docId}`);
      }

      // Handle blockIds request
      if ('blockIds' in req) {
        const blocks: ToolReadBlock[] = [];
        for (const blockId of req.blockIds) {
          const block = doc.blocks.find(b => b.id === blockId);
          if (block) {
            blocks.push({
              blockId: block.id,
              text: block.text,
              hash: block.hash,
              type: block.type,
              level: block.level,
            });
          }
        }
        return blocks;
      }

      // Handle selection request
      if ('selection' in req) {
        const block = doc.blocks.find(b => b.id === req.selection.blockId);
        if (!block) {
          throw new Error(`Block not found: ${req.selection.blockId}`);
        }
        return [{
          blockId: block.id,
          text: block.text,
          hash: block.hash,
          type: block.type,
          level: block.level,
        }];
      }

      return [];
    },

    /**
     * Simulate operations and return diff HTML
     */
    async simulateOps(batch: DocEditBatch): Promise<{ diffHtml: string; changedBlocks: string[] }> {
      const store = useDocumentStore.getState();
      const doc = await store.loadDocument(batch.docId);
      
      if (!doc) {
        throw new Error(`Document not found: ${batch.docId}`);
      }

      const result = await simulateOps(batch, doc);
      
      if (!result.ok) {
        throw new Error(`Simulation failed: ${result.code}`);
      }

      // Generate diff HTML
      const diffHtml = generateDiffHtml(result.diff);
      
      return {
        diffHtml,
        changedBlocks: result.changedBlocks,
      };
    },

    /**
     * Apply operations to document
     */
    async applyOps(batch: DocEditBatch): Promise<{ ok: true; newVersion: string } | { ok: false; code: string }> {
      const store = useDocumentStore.getState();
      const doc = await store.loadDocument(batch.docId);
      
      if (!doc) {
        return { ok: false, code: 'DOCUMENT_NOT_FOUND' };
      }

      const { result, newBlocks } = await applyOps(batch, doc);
      
      if (!result.ok) {
        return { ok: false, code: result.code };
      }

      // Update document in store
      await store.updateDocument(batch.docId, newBlocks!);
      
      return {
        ok: true,
        newVersion: result.newVersion!,
      };
    },

    /**
     * Get style rules for AI context
     */
    async getStyleRules(): Promise<{ rules: string[]; banlist: string[] }> {
      const config = await loadStyleConfig();
      
      const rules = [
        `Tense: ${config.tense || 'any'}`,
        `Person: ${config.person || 'any'}`,
        `Max paragraph length: ${config.maxParagraphLength || 500} characters`,
      ];

      if (config.preferences && config.preferences.length > 0) {
        rules.push(...config.preferences);
      }

      return {
        rules,
        banlist: config.banlist || [],
      };
    },
  };
}

/**
 * Generate HTML for diff display
 */
function generateDiffHtml(diff: any[]): string {
  const html: string[] = [];
  
  html.push('<div class="diff-container space-y-4">');
  
  for (const block of diff) {
    html.push('<div class="diff-block">');
    
    if (block.type === 'modified') {
      html.push('<div class="diff-header text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2">Modified</div>');
      
      if (block.oldText) {
        html.push('<div class="diff-old bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 mb-2">');
        html.push('<div class="text-xs text-red-700 dark:text-red-300 mb-1">Before:</div>');
        html.push(`<div class="text-sm">${escapeHtml(block.oldText)}</div>`);
        html.push('</div>');
      }
      
      if (block.newText) {
        html.push('<div class="diff-new bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-3">');
        html.push('<div class="text-xs text-green-700 dark:text-green-300 mb-1">After:</div>');
        html.push(`<div class="text-sm">${escapeHtml(block.newText)}</div>`);
        html.push('</div>');
      }
    } else if (block.type === 'inserted') {
      html.push('<div class="diff-inserted bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-3">');
      html.push('<div class="text-xs text-green-700 dark:text-green-300 mb-1">Inserted:</div>');
      html.push(`<div class="text-sm">${escapeHtml(block.newText || '')}</div>`);
      html.push('</div>');
    } else if (block.type === 'deleted') {
      html.push('<div class="diff-deleted bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3">');
      html.push('<div class="text-xs text-red-700 dark:text-red-300 mb-1">Deleted:</div>');
      html.push(`<div class="text-sm line-through">${escapeHtml(block.oldText || '')}</div>`);
      html.push('</div>');
    }
    
    html.push('</div>');
  }
  
  html.push('</div>');
  
  return html.join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

