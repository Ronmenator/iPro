import { z } from 'zod';
import { DocEditBatch } from '../types/ops';
import { getResearchContextForEditing, formatResearchContextForAI } from '../services/researchContextService';

// Zod schema for validating AI responses
const EditBatchSchema = z.object({
  type: z.literal('DocEditBatch'),
  docId: z.string(),
  baseVersion: z.string(),
  simulate: z.boolean().optional(),
  notes: z.string().optional(),
  ops: z.array(z.union([
    z.object({ 
      op: z.literal('replace'), 
      blockId: z.string(),
      range: z.object({ 
        start: z.number().int().min(0), 
        end: z.number().int().min(0) 
      }),
      expectHash: z.string().optional(), 
      text: z.string() 
    }),
    z.object({ 
      op: z.literal('replaceBlock'), 
      blockId: z.string(), 
      expectHash: z.string().optional(), 
      text: z.string() 
    }),
    z.object({ 
      op: z.literal('insertAfter'), 
      blockId: z.string(), 
      newBlockId: z.string().optional(), 
      text: z.string() 
    }),
    z.object({ 
      op: z.literal('deleteBlock'), 
      blockId: z.string() 
    }),
    z.object({ 
      op: z.literal('moveBlock'), 
      blockId: z.string(), 
      afterBlockId: z.string() 
    }),
    z.object({ 
      op: z.literal('annotate'), 
      blockId: z.string(), 
      note: z.string() 
    })
  ]))
});

// LLM Client interface - provider agnostic
export type LlmMessage = { 
  role: 'system' | 'user' | 'assistant'; 
  content: string 
};

export type LlmClient = (messages: LlmMessage[]) => Promise<string>;

// Context for AI editing operations
export interface EditContext {
  docId: string;
  baseVersion: string;
  selection: { 
    blockId: string; 
    start: number; 
    end: number 
  };
  blockText: string;
  style: { 
    rules: string[]; 
    banlist: string[] 
  };
}

/**
 * Propose edits using an LLM
 * 
 * This is the main entry point for AI-assisted editing.
 * It takes a user instruction and returns a validated DocEditBatch.
 */
export async function proposeEdits(
  llm: LlmClient,
  ctx: EditContext,
  instruction: string
): Promise<DocEditBatch> {
  console.log('proposeEdits called with instruction:', instruction);
  console.log('proposeEdits context:', ctx);
  
  // Get research context for the editing operation
  const researchContext = getResearchContextForEditing(
    ctx.docId,
    ctx.selection,
    instruction
  );
  
  const researchContextText = formatResearchContextForAI(researchContext);
  
  const system = [
    `You are a creative writing editor. Return ONLY a compact JSON object of type DocEditBatch.`,
    `Rules:`,
    `- Edit ONLY the provided block and ONLY within the given selection range unless instruction requires rewrite of entire block.`,
    `- Follow the user's instruction exactly - if they want to expand, make it longer; if they want to make it vivid, add sensory details; if they want it epic, make it dramatic.`,
    `- When expanding text, add meaningful content that enhances the story, characters, or scene.`,
    `- When making text more vivid, add sensory details, emotions, and descriptive language.`,
    `- When making text more dramatic or epic, add tension, conflict, or heightened language.`,
    `- Prefer 'replace' with exact [start,end] range over 'replaceBlock' when possible.`,
    `- Never include the original full document, only the minimal edits.`,
    `- Respect style rules and banlist if relevant.`,
    `- Use research context to enhance accuracy and authenticity when relevant.`,
    `- Return valid JSON that matches the DocEditBatch schema.`,
    `- Do not add any explanation or text outside the JSON object.`,
    ``,
    `IMPORTANT: The JSON must follow this exact format:`,
    `{`,
    `  "type": "DocEditBatch",`,
    `  "docId": "the_document_id",`,
    `  "baseVersion": "the_base_version",`,
    `  "ops": [`,
    `    {`,
    `      "op": "replace",`,
    `      "blockId": "block_id",`,
    `      "range": { "start": 0, "end": 10 },`,
    `      "text": "new_text_here"`,
    `    }`,
    `  ]`,
    `}`
  ].join('\n');

  const user = JSON.stringify({
    docId: ctx.docId,
    baseVersion: ctx.baseVersion,
    block: { 
      id: ctx.selection.blockId, 
      text: ctx.blockText 
    },
    selection: ctx.selection,
    style: ctx.style,
    instruction
  }, null, 2) + researchContextText;

  // Call LLM
  console.log('Sending to LLM for editing:', { system, user });
  const raw = await llm([
    { role: 'system', content: system }, 
    { role: 'user', content: user }
  ]);
  console.log('LLM raw response:', raw);

  // Extract JSON from response (handles markdown code blocks)
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('No JSON found in LLM response:', raw);
    throw new Error('LLM response does not contain valid JSON');
  }
  
  const payload = raw.slice(jsonStart, jsonEnd + 1);
  console.log('Extracted JSON payload:', payload);
  
  // Parse and validate
  try {
    const parsed = EditBatchSchema.parse(JSON.parse(payload));
    return parsed as DocEditBatch;
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    console.error('Raw response:', raw);
    console.error('Extracted JSON:', payload);
    
    // Try to convert from the AI's format to our format
    try {
      const aiResponse = JSON.parse(payload);
      if (aiResponse.edits && Array.isArray(aiResponse.edits)) {
        console.log('Converting AI response format to DocEditBatch');
        const converted: DocEditBatch = {
          type: 'DocEditBatch',
          docId: ctx.docId,
          baseVersion: ctx.baseVersion,
          notes: 'Converted from AI response format',
          ops: aiResponse.edits.map((edit: any) => ({
            op: 'replace' as const,
            blockId: edit.blockId,
            range: { start: edit.range[0], end: edit.range[1] },
            text: edit.replacement
          }))
        };
        console.log('Converted batch:', converted);
        return converted;
      }
    } catch (conversionError) {
      console.error('Failed to convert AI response:', conversionError);
    }
    
    // Fallback: construct a minimal valid DocEditBatch using selection as identity edit
    const fallback: DocEditBatch = {
      type: 'DocEditBatch',
      docId: ctx.docId,
      baseVersion: ctx.baseVersion,
      notes: 'Fallback batch due to invalid LLM response',
      ops: [
        {
          op: 'replace',
          blockId: ctx.selection.blockId,
          range: { start: ctx.selection.start, end: ctx.selection.end },
          text: ctx.blockText.slice(ctx.selection.start, ctx.selection.end),
        },
      ],
    };
    return fallback;
  }
}

/**
 * Quick edit presets for common operations
 */
export const EDIT_PRESETS = {
  tighten: 'Tighten prose; remove weak adverbs; keep meaning.',
  expand: 'Expand this text with more detail and sensory description.',
  simplify: 'Simplify the language; make it more accessible.',
  formal: 'Make the tone more formal and professional.',
  casual: 'Make the tone more casual and conversational.',
  active: 'Convert passive voice to active voice.',
  fix: 'Fix grammar, spelling, and punctuation errors.',
  rephrase: 'Rephrase this text while preserving the meaning.',
};

/**
 * Generate a prompt for a specific preset
 */
export function getPresetInstruction(preset: keyof typeof EDIT_PRESETS): string {
  return EDIT_PRESETS[preset];
}

