import { Pcc5Payload, Outline, Character, Chapter, Scene } from '../types/pcc5';

/**
 * PCC-5 File I/O utilities
 * 
 * Saves PCC-5 generated data to JSON files in the project structure:
 * /outline/outline.json
 * /characters/cast.json  
 * /manuscript/structure.json
 */

/**
 * Convert PCC-5 outline to JSON format
 */
export function outlineToJSON(outline: Outline): string {
  return JSON.stringify(outline, null, 2);
}

/**
 * Convert PCC-5 characters to JSON format
 */
export function charactersToJSON(characters: Character[]): string {
  return JSON.stringify(characters, null, 2);
}

/**
 * Convert PCC-5 structure to JSON format
 */
export function structureToJSON(chapters: Chapter[], scenes: Scene[]): string {
  const structure = {
    chapters,
    scenes
  };
  return JSON.stringify(structure, null, 2);
}

/**
 * Save PCC-5 data to project files
 */
export async function savePcc5ToFiles(payload: Pcc5Payload): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  
  // Save outline
  const outlineJson = outlineToJSON(payload.outline);
  files.set('outline/outline.json', outlineJson);
  
  // Save characters
  const charactersJson = charactersToJSON(payload.characters);
  files.set('characters/cast.json', charactersJson);
  
  // Save structure
  const structureJson = structureToJSON(payload.chapters, payload.scenes);
  files.set('manuscript/structure.json', structureJson);
  
  return files;
}

/**
 * Create scene files for each generated scene
 */
export async function createSceneFiles(payload: Pcc5Payload): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  
  // Create markdown files for each scene
  for (const scene of payload.scenes) {
    const sceneContent = `# ${scene.title}

## Scene Details
- **Location**: ${scene.location || 'TBD'}
- **POV**: ${scene.pov || 'TBD'}
- **Goal**: ${scene.goal || 'TBD'}
- **Conflict**: ${scene.conflict || 'TBD'}

## Scene Content
${scene.disaster ? `**Disaster**: ${scene.disaster}` : ''}
${scene.reaction ? `**Reaction**: ${scene.reaction}` : ''}
${scene.dilemma ? `**Dilemma**: ${scene.dilemma}` : ''}
${scene.decision ? `**Decision**: ${scene.decision}` : ''}

---

*Write your scene content here...*
`;

    files.set(`scenes/${scene.id}.md`, sceneContent);
  }
  
  return files;
}

/**
 * Load PCC-5 data from JSON files
 */
export async function loadPcc5FromFiles(files: Map<string, string>): Promise<Pcc5Payload | null> {
  try {
    const outlineJson = files.get('outline/outline.json');
    const charactersJson = files.get('characters/cast.json');
    const structureJson = files.get('manuscript/structure.json');
    
    if (!outlineJson || !charactersJson || !structureJson) {
      throw new Error('Missing required JSON files');
    }
    
    const outline = JSON.parse(outlineJson);
    const characters = JSON.parse(charactersJson);
    const structure = JSON.parse(structureJson);

    return {
      outline,
      characters,
      chapters: structure.chapters || [],
      scenes: structure.scenes || []
    };
  } catch (error) {
    console.error('Failed to load PCC-5 files:', error);
    return null;
  }
}