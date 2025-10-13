import { z } from 'zod';

/**
 * PCC-5 Method Types and Zod Schemas
 * 
 * The PCC-5 Method is a structural narrative design approach:
 * Promise, Countdown, Crucible, Expansion, Fulfillment
 */

// Input types for the wizard
export interface IdeaInput {
  idea: string;
  genre?: string;
  theme?: string;
  tone?: string;
  world?: string;
  audience?: string;
}

// Zod schemas for validation
export const PromiseSchema = z.object({
  logline: z.string().min(1, "Logline is required"),
  contract: z.array(z.string()).min(2, "At least 2 contract questions required").max(5, "Maximum 5 contract questions"),
  genre: z.string().optional(),
  theme: z.string().optional(),
});

export const CountdownSchema = z.object({
  deadline: z.string().min(1, "Deadline description is required"),
  stakes: z.string().min(1, "Stakes description is required"),
  beats: z.object({
    setup: z.string().min(1, "Setup beat is required"),
    midpoint: z.string().min(1, "Midpoint beat is required"),
    climax: z.string().min(1, "Climax beat is required"),
  }),
});

export const CrucibleSchema = z.object({
  protagonist: z.object({
    name: z.string().min(1, "Protagonist name is required"),
    motivation: z.string().min(1, "Protagonist motivation is required"),
    limitation: z.string().min(1, "Protagonist limitation is required"),
    transformation: z.string().min(1, "Protagonist transformation arc is required"),
  }),
  antagonist: z.object({
    name: z.string().min(1, "Antagonist name is required"),
    leverage: z.string().min(1, "Antagonist leverage is required"),
  }),
  constraints: z.array(z.string()).min(1, "At least one constraint is required"),
});

export const ExpansionSchema = z.object({
  acts: z.object({
    act1: z.string().min(1, "Act I description is required"),
    act2: z.string().min(1, "Act II description is required"),
    act3: z.string().min(1, "Act III description is required"),
  }),
  escalation_notes: z.array(z.string()).min(1, "At least one escalation note is required"),
});

export const FulfillmentSchema = z.object({
  resolutions: z.record(z.string(), z.string()), // Map of promise questions to their answers
  success_criteria: z.array(z.string()).min(1, "At least one success criterion is required"),
});

export const OutlineSchema = z.object({
  version: z.literal("pcc5.v1"),
  step1_promise: PromiseSchema,
  step2_countdown: CountdownSchema,
  step3_crucible: CrucibleSchema,
  step4_expansion: ExpansionSchema,
  step5_fulfillment: FulfillmentSchema,
});

export const CharacterSchema = z.object({
  name: z.string().min(1, "Character name is required"),
  role: z.string().min(1, "Character role is required"),
  motivation: z.string().min(1, "Character motivation is required"),
  conflict: z.string().min(1, "Character conflict is required"),
  arc: z.string().min(1, "Character arc is required"),
  relationships: z.array(z.object({
    name: z.string(),
    relation: z.string().optional()
  })).default([]).or(z.array(z.string())).default([]),
});

export const ChapterSchema = z.object({
  id: z.string().min(1, "Chapter ID is required"),
  title: z.string().min(1, "Chapter title is required"),
  summary: z.string().min(1, "Chapter summary is required"),
  pov: z.string().min(1, "Chapter POV is required"),
  scenes: z.array(z.string()).min(3, "Each chapter must have at least 3 scenes"),
});

export const SceneSchema = z.object({
  id: z.string().min(1, "Scene ID is required"),
  chapter: z.string().min(1, "Chapter ID is required"),
  pov: z.string().min(1, "Scene POV is required"),
  goal: z.string().min(1, "Scene goal is required"),
  conflict: z.string().min(1, "Scene conflict is required"),
  outcome: z.string().min(1, "Scene outcome is required"),
  location: z.string().min(1, "Scene location is required"),
  clock: z.string().min(1, "Scene clock is required"),
  crucible: z.string().min(1, "Scene crucible is required"),
  words_target: z.number().min(800, "Minimum 800 words per scene").max(1200, "Maximum 1200 words per scene"), // Each scene targets around 1000 words
  summary: z.string().min(1, "Scene summary is required"),
});

export const Pcc5PayloadSchema = z.object({
  outline: OutlineSchema,
  characters: z.array(CharacterSchema).min(1, "At least one character is required"),
  chapters: z.array(ChapterSchema).min(30, "At least 30 chapters required for a novel"),
  scenes: z.array(SceneSchema).min(90, "At least 90 scenes required (30 chapters × 3 scenes each)"),
});

// TypeScript types derived from schemas
export type Promise = z.infer<typeof PromiseSchema>;
export type Countdown = z.infer<typeof CountdownSchema>;
export type Crucible = z.infer<typeof CrucibleSchema>;
export type Expansion = z.infer<typeof ExpansionSchema>;
export type Fulfillment = z.infer<typeof FulfillmentSchema>;
export type Outline = z.infer<typeof OutlineSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Pcc5Payload = z.infer<typeof Pcc5PayloadSchema>;

// Validation functions
export function validatePcc5(data: unknown): Pcc5Payload {
  try {
    return Pcc5PayloadSchema.parse(data);
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((err: any) =>
        `${err.path?.join('.') || 'unknown'}: ${err.message}`
      ).join('\n');
      throw new Error(`PCC-5 validation failed:\n${errorMessages}`);
    }
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(`PCC-5 validation failed: ${error.message}`);
    }
    throw new Error(`PCC-5 validation failed: ${String(error)}`);
  }
}

// Non-blocking validation that returns warnings instead of throwing errors
export function validatePcc5NonBlocking(data: unknown): { data?: Pcc5Payload; warnings: string[] } {
  try {
    const validData = Pcc5PayloadSchema.parse(data);
    return { data: validData, warnings: [] };
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
      const warnings = error.errors.map((err: any) =>
        `Validation warning: ${err.path?.join('.') || 'unknown'}: ${err.message}`
      );
      // Try to return partial data if possible by parsing individual sections
      try {
        const partialData: any = {};
        if (data && typeof data === 'object' && 'outline' in data) {
          try {
            partialData.outline = OutlineSchema.parse((data as any).outline);
          } catch {
            warnings.push('Warning: Outline validation failed');
          }
        }
        if (data && typeof data === 'object' && 'characters' in data) {
          try {
            partialData.characters = z.array(CharacterSchema).parse((data as any).characters);
          } catch {
            warnings.push('Warning: Characters validation failed');
          }
        }
        if (data && typeof data === 'object' && 'chapters' in data) {
          try {
            partialData.chapters = z.array(ChapterSchema).parse((data as any).chapters);
          } catch {
            warnings.push('Warning: Chapters validation failed');
          }
        }
        if (data && typeof data === 'object' && 'scenes' in data) {
          try {
            partialData.scenes = z.array(SceneSchema).parse((data as any).scenes);
          } catch {
            warnings.push('Warning: Scenes validation failed');
          }
        }
        return { data: partialData as Pcc5Payload, warnings };
      } catch {
        return { warnings };
      }
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return { warnings: [`PCC-5 validation warning: ${error.message}`] };
    }
    return { warnings: [`PCC-5 validation warning: ${String(error)}`] };
  }
}

export function validateOutline(data: unknown): Outline {
  try {
    return OutlineSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      throw new Error(`Outline validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

export function validateCharacters(data: unknown): Character[] {
  try {
    return z.array(CharacterSchema).parse(data);
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((err: any) =>
        `${err.path?.join('.') || 'unknown'}: ${err.message}`
      ).join('\n');
      throw new Error(`Characters validation failed:\n${errorMessages}`);
    }
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(`Characters validation failed: ${error.message}`);
    }
    throw new Error(`Characters validation failed: ${String(error)}`);
  }
}

export function validateChapters(data: unknown): Chapter[] {
  try {
    return z.array(ChapterSchema).parse(data);
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((err: any) =>
        `${err.path?.join('.') || 'unknown'}: ${err.message}`
      ).join('\n');
      throw new Error(`Chapters validation failed:\n${errorMessages}`);
    }
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(`Chapters validation failed: ${error.message}`);
    }
    throw new Error(`Chapters validation failed: ${String(error)}`);
  }
}

export function validateScenes(data: unknown): Scene[] {
  try {
    return z.array(SceneSchema).parse(data);
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((err: any) =>
        `${err.path?.join('.') || 'unknown'}: ${err.message}`
      ).join('\n');
      throw new Error(`Scenes validation failed:\n${errorMessages}`);
    }
    if (error && typeof error === 'object' && 'message' in error) {
      throw new Error(`Scenes validation failed: ${error.message}`);
    }
    throw new Error(`Scenes validation failed: ${String(error)}`);
  }
}

// Helper function to split PCC-5 payload into separate JSON sections
export function splitPcc5ToJson(payload: Pcc5Payload) {
  return {
    outline: payload.outline,
    characters: payload.characters,
    structure: {
      chapters: payload.chapters,
      scenes: payload.scenes,
    },
  };
}

// Helper function to extract JSON from AI response
export function extractJson(text: string): unknown {
  console.log('Extracting JSON from response. Response length:', text.length);
  console.log('Response preview:', text.substring(0, 500));

  // First, try to find JSON in markdown code blocks
  const markdownJsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (markdownJsonMatch) {
    console.log('Found JSON in markdown code block');
    try {
      return JSON.parse(markdownJsonMatch[1]);
    } catch (error) {
      console.error('Failed to parse JSON from markdown code block:', error);
      throw new Error(`Failed to parse JSON from markdown code block: ${error}`);
    }
  }

  // Try to find a properly formatted JSON object (with balanced braces)
  const jsonStartMatch = text.match(/\{/);
  if (!jsonStartMatch) {
    throw new Error('No JSON object found in AI response');
  }

  const startIndex = jsonStartMatch.index!;
  let braceCount = 0;
  let endIndex = -1;

  // Find the matching closing brace
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{') {
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error('No matching closing brace found in JSON');
  }

  const jsonText = text.substring(startIndex, endIndex + 1);
  console.log('Extracted JSON text:', jsonText.substring(0, 200) + '...');

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('JSON parse error. Extracted text:', jsonText);
    console.error('Parse error details:', error);
    throw new Error(`Failed to parse JSON: ${error}. Position: ${JSON.stringify(error).match(/position (\d+)/)?.[1] || 'unknown'}`);
  }
}
