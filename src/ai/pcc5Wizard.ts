import { getCurrentAIProvider } from './providers';
import {
  IdeaInput,
  Pcc5Payload,
  validatePcc5,
  validatePcc5NonBlocking,
  extractJson,
  Outline,
  Character,
  Chapter,
  Scene,
  validateOutline,
  validateCharacters,
  validateChapters,
  validateScenes
} from '../types/pcc5';

// Types for incremental generation
export interface GenerationContext {
  outline?: Outline;
  characters?: Character[];
  chapters?: Chapter[];
  scenes?: Scene[];
}

export interface GenerationPhase {
  name: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  result?: any;
  error?: string;
}

export interface GenerationProgress {
  currentPhase: string;
  phases: Record<string, GenerationPhase>;
  isComplete: boolean;
}

/**
 * PCC-5 Wizard AI Service
 * 
 * Generates complete book skeletons using the PCC-5 Method:
 * Promise, Countdown, Crucible, Expansion, Fulfillment
 */

const SYSTEM_PROMPT_PCC5 = `You are a professional story architect trained in structural narrative design.
Your task is to build a complete book skeleton using the PCC-5 Method —
Promise, Countdown, Crucible, Expansion, Fulfillment.

⚠️ Do not write prose or dialogue.
Your output must describe structure and summaries only.
Return a single structured JSON object that conforms to the schema provided.
Every promise (question or mystery) introduced in Promise must be resolved in Fulfillment.
Each scene must include: POV, goal, conflict, outcome, and a word-target estimate.
Keep the narrative internally consistent, concise, and cinematic in tone.

The PCC-5 Method — Definition & Purpose of Each Step

1. Promise (The Contract with the Reader)
Define what the story promises to deliver — its core hook or emotional contract.
Create a logline (≤ 25 words) summarizing the book's central conflict.
List 2–5 contract questions that will drive reader curiosity ("Who killed the mentor?", "Will the rebellion succeed?").
Optionally include the genre and theme to anchor tone and message.
This step sets reader expectations; the rest of the structure must fulfill them.

2. Countdown (The Clock of Urgency)
Introduce a ticking clock — a time limit, impending event, or irreversible process that fuels tension.
Describe the stakes if time runs out or failure occurs.
Define three story beats:
Setup: What launches the countdown (inciting incident).
Midpoint: The major reversal or escalation halfway through.
Climax: The final confrontation when the clock reaches zero.
The Countdown defines pacing and narrative pressure.

3. Crucible (The Trap or Pressure Chamber)
Explain why the protagonist cannot simply walk away.
Describe the protagonist (name, motivation, limitation, transformation arc).
Describe the antagonist or opposing force (name, leverage).
List the constraints — physical, emotional, moral, or situational — that lock everyone into conflict.
This section is the story's pressure-cooker; it enforces struggle and growth.

4. Expansion (The 3-Act Growth Blueprint)
Outline Acts I, II, III, each as 1–3 paragraphs:
Act I: Introduce world, characters, and the promise; end with inciting incident.
Act II: Escalate obstacles, reveal truths, and tighten both clock and crucible.
Act III: Deliver the payoff — resolution, transformation, and emotional closure.
Include escalation notes describing how tension rises (shorter deadlines, moral costs, personal stakes).
This converts the high-level design into a working story roadmap.

5. Fulfillment (Resolution of the Contract)
Resolve each question or mystery listed in Promise.
Provide a resolutions map: each promise → its answer or payoff.
Optionally list loose ends that remain intentionally open.
Add success criteria — reminders for the author during revision ("Clock must tighten each act", "All promises resolved or justified").
Fulfillment ensures narrative satisfaction and thematic closure.

🎬 Additional Requirements
After generating the PCC-5 outline, create:
Character Roster: key characters with motivations, arcs, and relationships.
Chapter Plan: EXACTLY 30 chapters with summaries and POV assignments.
Scene Skeletons: for each chapter, EXACTLY 3 scenes (start, middle, end) with:
id, chapter, pov, goal, conflict, outcome, location, clock, crucible, words_target, summary.
Each scene should target 1000 words for a novel around 90,000 words total (30 chapters × 3 scenes × 1000 words).

Return ONLY valid JSON that matches this exact schema:
{
  "outline": {
    "version": "pcc5.v1",
    "step1_promise": { "logline": "", "contract": [""], "genre": "", "theme": "" },
    "step2_countdown": { "deadline": "", "stakes": "", "beats": { "setup": "", "midpoint": "", "climax": "" } },
    "step3_crucible": { "protagonist": { "name": "", "motivation": "", "limitation": "", "transformation": "" },
                        "antagonist": { "name": "", "leverage": "" },
                        "constraints": [""] },
    "step4_expansion": { "acts": { "act1": "", "act2": "", "act3": "" }, "escalation_notes": [""] },
    "step5_fulfillment": { "resolutions": {}, "success_criteria": [""] }
  },
  "characters": [
    { "name": "", "role": "", "motivation": "", "conflict": "", "arc": "", "relationships": [{"name": "", "relation": ""}] }
  ],
  "chapters": [
    { "id": "ch-01", "title": "", "summary": "", "pov": "", "scenes": ["scene-01", "scene-02"] }
  ],
  "scenes": [
    { "id": "scene-01", "chapter": "ch-01", "pov": "", "goal": "", "conflict": "", "outcome": "", "location": "", "clock": "", "crucible": "", "words_target": 1200, "summary": "" }
  ]
}`;

/**
 * Generate PCC-5 outline only (Phase 1)
 */
async function generateOutline(data: IdeaInput): Promise<Outline> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  const outlinePrompt = `Generate ONLY the PCC-5 outline section. Return ONLY the outline JSON object matching this schema:
{
  "outline": {
    "version": "pcc5.v1",
    "step1_promise": { "logline": "", "contract": [""], "genre": "", "theme": "" },
    "step2_countdown": { "deadline": "", "stakes": "", "beats": { "setup": "", "midpoint": "", "climax": "" } },
    "step3_crucible": { "protagonist": { "name": "", "motivation": "", "limitation": "", "transformation": "" },
                        "antagonist": { "name": "", "leverage": "" },
                        "constraints": [""] },
    "step4_expansion": { "acts": { "act1": "", "act2": "", "act3": "" }, "escalation_notes": [""] },
    "step5_fulfillment": { "resolutions": {}, "success_criteria": [""] }
  }
}`;

  try {
    const response = await client([
      { role: 'system', content: outlinePrompt },
      { role: 'user', content: JSON.stringify(data) }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    const json = extractJson(responseText);
    return validateOutline(json.outline);
  } catch (error) {
    console.error('Error generating outline:', error);
    throw new Error(`Failed to generate outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate character roster (Phase 2)
 */
async function generateCharacters(data: IdeaInput, outline: Outline): Promise<Character[]> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  const characterPrompt = `Generate ONLY the characters section. Return ONLY the characters JSON array matching this schema:
{
  "characters": [
    { "name": "", "role": "", "motivation": "", "conflict": "", "arc": "", "relationships": [{"name": "", "relation": ""}] }
  ]
}`;

  try {
    const response = await client([
      { role: 'system', content: characterPrompt },
      { role: 'user', content: JSON.stringify({ idea: data.idea, outline }) }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    const json = extractJson(responseText);
    return validateCharacters(json.characters);
  } catch (error) {
    console.error('Error generating characters:', error);
    throw new Error(`Failed to generate characters: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a batch of chapters (Phase 3)
 */
async function generateChapterBatch(
  data: IdeaInput,
  outline: Outline,
  characters: Character[],
  existingChapters: Chapter[] = [],
  batchSize: number = 5
): Promise<Chapter[]> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  const startChapter = existingChapters.length + 1;
  const endChapter = Math.min(startChapter + batchSize - 1, 30);

  const chapterPrompt = `Generate chapters ${startChapter}-${endChapter} ONLY. Return ONLY the chapters JSON array matching this schema:
{
  "chapters": [
    { "id": "ch-01", "title": "", "summary": "", "pov": "", "scenes": ["scene-01", "scene-02", "scene-03"] }
  ]
}
Each chapter must have EXACTLY 3 scenes. Generate ${endChapter - startChapter + 1} chapters.`;

  try {
    const response = await client([
      { role: 'system', content: chapterPrompt },
      { role: 'user', content: JSON.stringify({
        idea: data.idea,
        outline,
        characters,
        existingChapters: existingChapters.slice(-3), // Include last 3 chapters for context
        startChapter,
        endChapter
      }) }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    const json = extractJson(responseText);

    // Validate and merge with existing chapters
    const newChapters = validateChapters(json.chapters);
    return [...existingChapters, ...newChapters];
  } catch (error) {
    console.error('Error generating chapter batch:', error);
    throw new Error(`Failed to generate chapters ${startChapter}-${endChapter}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate scenes for specific chapters (Phase 4)
 */
async function generateScenesForChapters(
  data: IdeaInput,
  outline: Outline,
  characters: Character[],
  chapters: Chapter[],
  chapterIds: string[]
): Promise<Scene[]> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  // Group chapters by the ones we need to generate scenes for
  const targetChapters = chapters.filter(ch => chapterIds.includes(ch.id));

  if (targetChapters.length === 0) {
    return [];
  }

  const scenePrompt = `Generate scenes for the specified chapters ONLY. Return ONLY the scenes JSON array matching this schema:
{
  "scenes": [
    { "id": "scene-01", "chapter": "ch-01", "pov": "", "goal": "", "conflict": "", "outcome": "", "location": "", "clock": "", "crucible": "", "words_target": 1000, "summary": "" }
  ]
}
Generate EXACTLY 3 scenes per chapter. Each scene should target around 1000 words.`;

  try {
    const response = await client([
      { role: 'system', content: scenePrompt },
      { role: 'user', content: JSON.stringify({
        idea: data.idea,
        outline,
        characters,
        chapters: targetChapters
      }) }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    const json = extractJson(responseText);
    return validateScenes(json.scenes);
  } catch (error) {
    console.error('Error generating scenes for chapters:', error);

    // Provide more helpful error messages based on the type of error
    let errorMessage = `Failed to generate scenes for chapters ${chapterIds.join(', ')}`;

    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage += ': Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('API error')) {
        errorMessage += ': OpenAI API error. Please check your API key and quota.';
      } else {
        errorMessage += `: ${error.message}`;
      }
    } else {
      errorMessage += ': Unknown error occurred';
    }

    throw new Error(errorMessage);
  }
}

/**
 * Generate complete PCC-5 structure incrementally
 */
export async function generatePcc5Incremental(
  data: IdeaInput,
  onProgress?: (progress: GenerationProgress) => void
): Promise<Pcc5Payload> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  const progress: GenerationProgress = {
    currentPhase: 'outline',
    phases: {
      outline: { name: 'Generating PCC-5 Outline', status: 'generating' },
      characters: { name: 'Generating Character Roster', status: 'pending' },
      chapters: { name: 'Generating Chapter Structure', status: 'pending' },
      scenes: { name: 'Generating Scene Details', status: 'pending' }
    },
    isComplete: false
  };

  try {
    // Phase 1: Generate Outline
    onProgress?.(progress);
    const outline = await generateOutline(data);
    progress.phases.outline.status = 'completed';
    progress.phases.outline.result = outline;

    // Phase 2: Generate Characters
    progress.currentPhase = 'characters';
    progress.phases.characters.status = 'generating';
    onProgress?.(progress);
    const characters = await generateCharacters(data, outline);
    progress.phases.characters.status = 'completed';
    progress.phases.characters.result = characters;

    // Phase 3: Generate Chapters in batches
    progress.currentPhase = 'chapters';
    progress.phases.chapters.status = 'generating';
    onProgress?.(progress);

    let allChapters: Chapter[] = [];
    const batchSize = 5;

    for (let i = 0; i < 30; i += batchSize) {
      const batchChapters = await generateChapterBatch(data, outline, characters, allChapters, batchSize);
      allChapters = batchChapters;
    }

    progress.phases.chapters.status = 'completed';
    progress.phases.chapters.result = allChapters;

    // Phase 4: Generate Scenes for all chapters
    progress.currentPhase = 'scenes';
    progress.phases.scenes.status = 'generating';
    onProgress?.(progress);

    let allScenes: Scene[] = [];
    const chapterIds = allChapters.map(ch => ch.id);

    // Generate scenes in batches of 5 chapters at a time for better performance
    for (let i = 0; i < chapterIds.length; i += 5) {
      const batchChapterIds = chapterIds.slice(i, i + 5);
      const batchScenes = await generateScenesForChapters(data, outline, characters, allChapters, batchChapterIds);
      allScenes.push(...batchScenes);
    }

    progress.phases.scenes.status = 'completed';
    progress.phases.scenes.result = allScenes;
    progress.isComplete = true;
    onProgress?.(progress);

    // Validate complete structure (non-blocking)
    const result: Pcc5Payload = {
      outline,
      characters,
      chapters: allChapters,
      scenes: allScenes
    };

    const validationResult = validatePcc5NonBlocking(result);

    // If validation fails completely, try to return partial data
    if (!validationResult.data) {
      console.warn('PCC-5 validation failed completely, returning partial data');
      // Return the raw data as partial result
      return result;
    }

    // Return validated data with any warnings logged
    if (validationResult.warnings.length > 0) {
      console.warn('PCC-5 validation warnings:', validationResult.warnings);
    }

    return validationResult.data;

  } catch (error) {
    const currentPhase = progress.phases[progress.currentPhase];
    currentPhase.status = 'error';

    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('Network connection failed')) {
        currentPhase.error = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('OpenAI API error')) {
        currentPhase.error = 'OpenAI API error. Please check your API key and quota.';
      } else if (error.message.includes('Failed to fetch')) {
        currentPhase.error = 'Unable to connect to AI service. Please check your internet connection and API settings.';
      } else {
        currentPhase.error = error.message;
      }
    } else {
      currentPhase.error = 'An unexpected error occurred during generation.';
    }

    onProgress?.(progress);

    console.error('Error in incremental PCC-5 generation:', error);
    throw error;
  }
}

/**
 * Deduce story properties from idea text
 */
export async function deduceStoryProperties(idea: string): Promise<Partial<IdeaInput>> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  const deducePrompt = `Analyze the following story idea and deduce the most likely genre, theme, tone, world setting, and target audience. Return ONLY a JSON object with these properties.

Story Idea: "${idea}"

Return format:
{
  "genre": "Fantasy|Science Fiction|Romance|Mystery|Thriller|Horror|Literary Fiction|etc.",
  "theme": "Redemption|Love|Power|Identity|Justice|Freedom|etc.",
  "tone": "Dark|Hopeful|Mysterious|Humorous|Serious|Lighthearted|etc.",
  "world": "Medieval fantasy|Modern day|Space opera|Victorian era|etc.",
  "audience": "Young Adult|Adult|Middle Grade|Children|etc."
}

Only include properties that can be confidently deduced from the idea. Use concise, specific terms.`;

  try {
    const response = await client([
      { role: 'system', content: deducePrompt }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    const json = extractJson(responseText);

    // Validate the response structure
    if (typeof json !== 'object' || json === null) {
      throw new Error('Invalid response format from AI');
    }

    const result: Partial<IdeaInput> = {};

    if (json.genre && typeof json.genre === 'string') {
      result.genre = json.genre;
    }
    if (json.theme && typeof json.theme === 'string') {
      result.theme = json.theme;
    }
    if (json.tone && typeof json.tone === 'string') {
      result.tone = json.tone;
    }
    if (json.world && typeof json.world === 'string') {
      result.world = json.world;
    }
    if (json.audience && typeof json.audience === 'string') {
      result.audience = json.audience;
    }

    return result;
  } catch (error) {
    console.error('Error deducing story properties:', error);
    // Return empty object if deduction fails - don't break the flow
    // This is expected behavior for the property deduction feature
    // Network errors are handled silently to not disrupt the user experience
    return {};
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function generatePcc5(data: IdeaInput): Promise<Pcc5Payload> {
  return generatePcc5Incremental(data);
}

/**
 * Regenerate a specific section of the PCC-5 structure
 */
export async function regenerateSection(
  section: 'outline' | 'characters' | 'chapters' | 'scenes',
  context: Partial<Pcc5Payload>,
  originalIdea: IdeaInput
): Promise<Pcc5Payload> {
  const client = getCurrentAIProvider();
  if (!client) {
    throw new Error('AI client not configured. Please check your AI settings.');
  }

  let systemPrompt = '';
  let userPrompt = '';

  switch (section) {
    case 'outline':
      systemPrompt = `You are a professional story architect. Generate ONLY the outline section using the PCC-5 Method.
Return ONLY the outline JSON object matching this schema:
{
  "outline": {
    "version": "pcc5.v1",
    "step1_promise": { "logline": "", "contract": [""], "genre": "", "theme": "" },
    "step2_countdown": { "deadline": "", "stakes": "", "beats": { "setup": "", "midpoint": "", "climax": "" } },
    "step3_crucible": { "protagonist": { "name": "", "motivation": "", "limitation": "", "transformation": "" },
                        "antagonist": { "name": "", "leverage": "" },
                        "constraints": [""] },
    "step4_expansion": { "acts": { "act1": "", "act2": "", "act3": "" }, "escalation_notes": [""] },
    "step5_fulfillment": { "resolutions": {}, "success_criteria": [""] }
  }
}`;
      userPrompt = JSON.stringify({ idea: originalIdea.idea, context: context.characters || [] });
      break;

    case 'characters':
      systemPrompt = `You are a professional story architect. Generate ONLY the characters section.
Return ONLY the characters JSON array matching this schema:
{
  "characters": [
    { "name": "", "role": "", "motivation": "", "conflict": "", "arc": "", "relationships": [{"name": "", "relation": ""}] }
  ]
}`;
      userPrompt = JSON.stringify({ 
        idea: originalIdea.idea, 
        outline: context.outline,
        existingCharacters: context.characters || []
      });
      break;

    case 'chapters':
      systemPrompt = `You are a professional story architect. Generate ONLY the chapters section.
Return ONLY the chapters JSON array matching this schema:
{
  "chapters": [
    { "id": "ch-01", "title": "", "summary": "", "pov": "", "scenes": ["scene-01", "scene-02"] }
  ]
}`;
      userPrompt = JSON.stringify({ 
        idea: originalIdea.idea, 
        outline: context.outline,
        characters: context.characters || [],
        existingChapters: context.chapters || []
      });
      break;

    case 'scenes':
      systemPrompt = `You are a professional story architect. Generate ONLY the scenes section.
Return ONLY the scenes JSON array matching this schema:
{
  "scenes": [
    { "id": "scene-01", "chapter": "ch-01", "pov": "", "goal": "", "conflict": "", "outcome": "", "location": "", "clock": "", "crucible": "", "words_target": 1200, "summary": "" }
  ]
}`;
      userPrompt = JSON.stringify({ 
        idea: originalIdea.idea, 
        outline: context.outline,
        characters: context.characters || [],
        chapters: context.chapters || [],
        existingScenes: context.scenes || []
      });
      break;
  }

  try {
    const response = await client([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    const json = extractJson(responseText);
    
    // Validate the specific section
    let validatedData: any;
    switch (section) {
      case 'outline':
        validatedData = { outline: validateOutline(json.outline) };
        break;
      case 'characters':
        validatedData = { characters: validateCharacters(json.characters) };
        break;
      case 'chapters':
        validatedData = { chapters: validateChapters(json.chapters) };
        break;
      case 'scenes':
        validatedData = { scenes: validateScenes(json.scenes) };
        break;
    }

    // Merge with existing context
    return {
      ...context,
      ...validatedData,
    } as Pcc5Payload;
  } catch (error) {
    console.error(`Error regenerating ${section}:`, error);
    throw new Error(`Failed to regenerate ${section}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that all promises are resolved in fulfillment
 */
export function validatePromiseResolution(payload: Pcc5Payload): boolean {
  const promises = payload.outline.step1_promise.contract;
  const resolutions = payload.outline.step5_fulfillment.resolutions;
  
  return promises.every(promise => 
    Object.keys(resolutions).some(resolvedPromise => 
      resolvedPromise.toLowerCase().includes(promise.toLowerCase()) ||
      promise.toLowerCase().includes(resolvedPromise.toLowerCase())
    )
  );
}

/**
 * Get word count estimates for the entire structure
 */
export function getWordCountEstimates(payload: Pcc5Payload) {
  // Calculate based on actual word targets
  const totalSceneWords = payload.scenes.reduce((sum, scene) => sum + scene.words_target, 0);
  const averageSceneWords = Math.round(totalSceneWords / payload.scenes.length);
  const estimatedTotalWords = totalSceneWords;

  return {
    totalWords: estimatedTotalWords,
    averageSceneWords,
    sceneCount: payload.scenes.length,
    chapterCount: payload.chapters.length,
    targetNovelLength: 'Around 90,000 words',
  };
}
