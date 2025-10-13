/**
 * Scene Outline Utilities
 * 
 * Functions to parse and update scene outline details embedded in scene content
 */

export interface SceneOutlineDetails {
  goal: string;
  conflict: string;
  outcome: string;
  location: string;
  clock: string;
  crucible: string;
  pov: string;
}

/**
 * Parse outline details from scene content
 */
export function parseSceneOutline(content: string): SceneOutlineDetails {
  const details: SceneOutlineDetails = {
    goal: '',
    conflict: '',
    outcome: '',
    location: '',
    clock: '',
    crucible: '',
    pov: ''
  };

  // Look for the Scene Outline section
  const outlineMatch = content.match(/## Scene Outline\s*\n(.*?)(?=\n---|\n##|$)/s);
  if (!outlineMatch) {
    return details;
  }

  const outlineSection = outlineMatch[1];
  
  // Parse each field
  const fields = ['goal', 'conflict', 'outcome', 'location', 'clock', 'crucible', 'pov'];
  
  for (const field of fields) {
    const fieldPattern = new RegExp(`\\*\\*${field.charAt(0).toUpperCase() + field.slice(1)}:\\*\\*\\s*(.*?)(?=\\n\\*\\*|$)`, 'i');
    const match = outlineSection.match(fieldPattern);
    if (match) {
      details[field] = match[1].trim();
    }
  }

  return details;
}

/**
 * Update outline details in scene content
 */
export function updateSceneOutline(content: string, details: Partial<SceneOutlineDetails>): string {
  // Find the Scene Outline section
  const outlineMatch = content.match(/## Scene Outline\s*\n(.*?)(?=\n---|\n##|$)/s);
  if (!outlineMatch) {
    // If no outline section exists, create one
    const sceneTitle = content.match(/^# (.+)$/m)?.[1] || 'Scene';
    const newOutline = `# ${sceneTitle}

## Scene Outline
**Goal:** ${details.goal || 'TBD'}
**Conflict:** ${details.conflict || 'TBD'}
**Outcome:** ${details.outcome || 'TBD'}
**Location:** ${details.location || 'TBD'}
**Clock:** ${details.clock || 'TBD'}
**Crucible:** ${details.crucible || 'TBD'}
**POV:** ${details.pov || 'TBD'}

---

## Scene Content
*Write your scene here...*`;
    return newOutline;
  }

  let outlineSection = outlineMatch[1];
  
  // Update each field
  const fields = ['goal', 'conflict', 'outcome', 'location', 'clock', 'crucible', 'pov'];
  
  for (const field of fields) {
    if (details[field] !== undefined) {
      const fieldPattern = new RegExp(`(\\*\\*${field.charAt(0).toUpperCase() + field.slice(1)}:\\*\\*\\s*).*?(?=\\n\\*\\*|$)`, 'i');
      outlineSection = outlineSection.replace(fieldPattern, `$1${details[field]}`);
    }
  }

  // Replace the outline section in the content
  return content.replace(/## Scene Outline\s*\n(.*?)(?=\n---|\n##|$)/s, `## Scene Outline\n${outlineSection}`);
}

/**
 * Create a new scene content template with outline details
 */
export function createSceneTemplate(title: string, details: Partial<SceneOutlineDetails> = {}): string {
  return `# ${title}

## Scene Outline
**Goal:** ${details.goal || 'TBD'}
**Conflict:** ${details.conflict || 'TBD'}
**Outcome:** ${details.outcome || 'TBD'}
**Location:** ${details.location || 'TBD'}
**Clock:** ${details.clock || 'TBD'}
**Crucible:** ${details.crucible || 'TBD'}
**POV:** ${details.pov || 'TBD'}

---

## Scene Content
*Write your scene here...*`;
}
