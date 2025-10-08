import { Pcc5Payload, Outline, Character, Chapter, Scene } from '../types/pcc5';
import * as yaml from 'js-yaml';

/**
 * PCC-5 File I/O utilities
 * 
 * Saves PCC-5 generated data to YAML files in the project structure:
 * /outline/outline.yml
 * /characters/cast.yml  
 * /manuscript/structure.yml
 */

/**
 * Convert PCC-5 outline to YAML format
 */
export function outlineToYAML(outline: Outline): string {
  const lines: string[] = [
    '# PCC-5 Story Structure Outline',
    `version: ${outline.version}`,
    '',
    '# Step 1: Promise (The Contract with the Reader)',
    'step1_promise:',
    `  logline: "${outline.step1_promise.logline}"`,
    '  contract:',
  ];
  
  outline.step1_promise.contract.forEach(question => {
    lines.push(`    - "${question}"`);
  });
  
  if (outline.step1_promise.genre) {
    lines.push(`  genre: "${outline.step1_promise.genre}"`);
  }
  if (outline.step1_promise.theme) {
    lines.push(`  theme: "${outline.step1_promise.theme}"`);
  }
  
  lines.push('');
  lines.push('# Step 2: Countdown (The Clock of Urgency)');
  lines.push('step2_countdown:');
  lines.push(`  deadline: "${outline.step2_countdown.deadline}"`);
  lines.push(`  stakes: "${outline.step2_countdown.stakes}"`);
  lines.push('  beats:');
  lines.push(`    setup: "${outline.step2_countdown.beats.setup}"`);
  lines.push(`    midpoint: "${outline.step2_countdown.beats.midpoint}"`);
  lines.push(`    climax: "${outline.step2_countdown.beats.climax}"`);
  
  lines.push('');
  lines.push('# Step 3: Crucible (The Trap or Pressure Chamber)');
  lines.push('step3_crucible:');
  lines.push('  protagonist:');
  lines.push(`    name: "${outline.step3_crucible.protagonist.name}"`);
  lines.push(`    motivation: "${outline.step3_crucible.protagonist.motivation}"`);
  lines.push(`    limitation: "${outline.step3_crucible.protagonist.limitation}"`);
  lines.push(`    transformation: "${outline.step3_crucible.protagonist.transformation}"`);
  lines.push('  antagonist:');
  lines.push(`    name: "${outline.step3_crucible.antagonist.name}"`);
  lines.push(`    leverage: "${outline.step3_crucible.antagonist.leverage}"`);
  lines.push('  constraints:');
  outline.step3_crucible.constraints.forEach(constraint => {
    lines.push(`    - "${constraint}"`);
  });
  
  lines.push('');
  lines.push('# Step 4: Expansion (The 3-Act Growth Blueprint)');
  lines.push('step4_expansion:');
  lines.push('  acts:');
  lines.push(`    act1: "${outline.step4_expansion.acts.act1}"`);
  lines.push(`    act2: "${outline.step4_expansion.acts.act2}"`);
  lines.push(`    act3: "${outline.step4_expansion.acts.act3}"`);
  lines.push('  escalation_notes:');
  outline.step4_expansion.escalation_notes.forEach(note => {
    lines.push(`    - "${note}"`);
  });
  
  lines.push('');
  lines.push('# Step 5: Fulfillment (Resolution of the Contract)');
  lines.push('step5_fulfillment:');
  lines.push('  resolutions:');
  Object.entries(outline.step5_fulfillment.resolutions).forEach(([promise, resolution]) => {
    lines.push(`    "${promise}": "${resolution}"`);
  });
  lines.push('  success_criteria:');
  outline.step5_fulfillment.success_criteria.forEach(criterion => {
    lines.push(`    - "${criterion}"`);
  });
  
  lines.push('');
  lines.push(`# Generated on ${new Date().toISOString()}`);
  
  return lines.join('\n');
}

/**
 * Convert characters to YAML format
 */
export function charactersToYAML(characters: Character[]): string {
  const lines: string[] = [
    '# Character Roster',
    `generated: ${new Date().toISOString()}`,
    'characters:',
  ];
  
  characters.forEach(character => {
    lines.push(`- name: "${character.name}"`);
    lines.push(`  role: "${character.role}"`);
    lines.push(`  motivation: "${character.motivation}"`);
    lines.push(`  conflict: "${character.conflict}"`);
    lines.push(`  arc: "${character.arc}"`);
    if (character.relationships.length > 0) {
      lines.push('  relationships:');
      character.relationships.forEach(relationship => {
        lines.push(`    - "${relationship}"`);
      });
    } else {
      lines.push('  relationships: []');
    }
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Convert structure (chapters + scenes) to YAML format
 */
export function structureToYAML(chapters: Chapter[], scenes: Scene[]): string {
  const lines: string[] = [
    '# Manuscript Structure',
    `generated: ${new Date().toISOString()}`,
    '',
    'chapters:',
  ];
  
  chapters.forEach(chapter => {
    lines.push(`- id: "${chapter.id}"`);
    lines.push(`  title: "${chapter.title}"`);
    lines.push(`  summary: "${chapter.summary}"`);
    lines.push(`  pov: "${chapter.pov}"`);
    lines.push('  scenes:');
    chapter.scenes.forEach(sceneId => {
      lines.push(`    - "${sceneId}"`);
    });
    lines.push('');
  });
  
  lines.push('scenes:');
  scenes.forEach(scene => {
    lines.push(`- id: "${scene.id}"`);
    lines.push(`  chapter: "${scene.chapter}"`);
    lines.push(`  pov: "${scene.pov}"`);
    lines.push(`  goal: "${scene.goal}"`);
    lines.push(`  conflict: "${scene.conflict}"`);
    lines.push(`  outcome: "${scene.outcome}"`);
    lines.push(`  location: "${scene.location}"`);
    lines.push(`  clock: "${scene.clock}"`);
    lines.push(`  crucible: "${scene.crucible}"`);
    lines.push(`  words_target: ${scene.words_target}`);
    lines.push(`  summary: "${scene.summary}"`);
    lines.push('');
  });
  
  return lines.join('\n');
}

/**
 * Save PCC-5 data to project files
 */
export async function savePcc5ToFiles(payload: Pcc5Payload): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  
  // Save outline
  const outlineYaml = outlineToYAML(payload.outline);
  files.set('outline/outline.yml', outlineYaml);
  
  // Save characters
  const charactersYaml = charactersToYAML(payload.characters);
  files.set('characters/cast.yml', charactersYaml);
  
  // Save structure
  const structureYaml = structureToYAML(payload.chapters, payload.scenes);
  files.set('manuscript/structure.yml', structureYaml);
  
  return files;
}

/**
 * Create scene files for each generated scene
 */
export async function createSceneFiles(payload: Pcc5Payload): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  
  // Group scenes by chapter
  const scenesByChapter = new Map<string, Scene[]>();
  payload.scenes.forEach(scene => {
    if (!scenesByChapter.has(scene.chapter)) {
      scenesByChapter.set(scene.chapter, []);
    }
    scenesByChapter.get(scene.chapter)!.push(scene);
  });
  
  // Create scene files for each chapter
  scenesByChapter.forEach((scenes, chapterId) => {
    scenes.forEach(scene => {
      // Create scene metadata file
      const metaPath = `manuscript/part-01/${chapterId}/${scene.id}.meta.yml`;
      const metaContent = sceneMetadataToYAML(scene);
      files.set(metaPath, metaContent);
      
      // Create scene markdown file with placeholder content
      const mdPath = `manuscript/part-01/${chapterId}/${scene.id}.md`;
      const mdContent = createSceneMarkdown(scene);
      files.set(mdPath, mdContent);
    });
  });
  
  return files;
}

/**
 * Convert scene to metadata YAML format
 */
function sceneMetadataToYAML(scene: Scene): string {
  const lines: string[] = [
    `id: ${scene.id}`,
    `chapter: ${scene.chapter}`,
    `title: ${scene.summary}`,
    `pov: ${scene.pov}`,
    '',
    '# Story Structure',
    `goal: ${scene.goal}`,
    `conflict: ${scene.conflict}`,
    `outcome: ${scene.outcome}`,
    `clock: ${scene.clock}`,
    `crucible: ${scene.crucible}`,
    '',
    '# Word Count',
    `words_target: ${scene.words_target}`,
    `words_current: 0`,
    '',
    `last_modified: ${Date.now()}`,
  ];
  
  return lines.join('\n');
}

/**
 * Create scene markdown file with placeholder content
 */
function createSceneMarkdown(scene: Scene): string {
  return `# ${scene.summary}

**Location:** ${scene.location}
**POV:** ${scene.pov}
**Goal:** ${scene.goal}
**Conflict:** ${scene.conflict}
**Outcome:** ${scene.outcome}
**Clock:** ${scene.clock}
**Crucible:** ${scene.crucible}

---

<!-- Start writing your scene here -->
<!-- Target: ${scene.words_target} words -->

`;
}

/**
 * Parse YAML to PCC-5 outline
 */
export function yamlToOutline(yamlContent: string): Partial<Outline> {
  try {
    const parsed = yaml.load(yamlContent) as any;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML structure');
    }

    // Ensure required fields exist
    const outline: Partial<Outline> = {
      version: parsed.version || 'pcc5.v1',
      step1_promise: parsed.step1_promise || {
        logline: '',
        contract: []
      },
      step2_countdown: parsed.step2_countdown || {
        deadline: '',
        stakes: '',
        beats: { setup: '', midpoint: '', climax: '' }
      },
      step3_crucible: parsed.step3_crucible || {
        protagonist: { name: '', motivation: '', limitation: '', transformation: '' },
        antagonist: { name: '', leverage: '' },
        constraints: []
      },
      step4_expansion: parsed.step4_expansion || {
        acts: { act1: '', act2: '', act3: '' },
        escalation_notes: []
      },
      step5_fulfillment: parsed.step5_fulfillment || {
        resolutions: {},
        success_criteria: []
      }
    };

    return outline;
  } catch (error) {
    console.error('Error parsing outline YAML:', error);
    throw new Error(`Failed to parse outline YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse YAML to characters
 */
export function yamlToCharacters(yamlContent: string): Character[] {
  try {
    const parsed = yaml.load(yamlContent) as any;

    if (!parsed || typeof parsed !== 'object' || !parsed.characters) {
      throw new Error('Invalid YAML structure - missing characters array');
    }

    const characters: Character[] = parsed.characters.map((char: any) => ({
      name: char.name || '',
      role: char.role || '',
      motivation: char.motivation || '',
      conflict: char.conflict || '',
      arc: char.arc || '',
      relationships: char.relationships || []
    }));

    return characters;
  } catch (error) {
    console.error('Error parsing characters YAML:', error);
    throw new Error(`Failed to parse characters YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse YAML to structure (chapters and scenes)
 */
export function yamlToStructure(yamlContent: string): { chapters: Chapter[]; scenes: Scene[] } {
  try {
    const parsed = yaml.load(yamlContent) as any;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML structure');
    }

    const chapters: Chapter[] = (parsed.chapters || []).map((chapter: any) => ({
      id: chapter.id || '',
      title: chapter.title || '',
      summary: chapter.summary || '',
      pov: chapter.pov || '',
      scenes: chapter.scenes || []
    }));

    const scenes: Scene[] = (parsed.scenes || []).map((scene: any) => ({
      id: scene.id || '',
      chapter: scene.chapter || '',
      pov: scene.pov || '',
      goal: scene.goal || '',
      conflict: scene.conflict || '',
      outcome: scene.outcome || '',
      location: scene.location || '',
      clock: scene.clock || '',
      crucible: scene.crucible || '',
      words_target: scene.words_target || 1000,
      summary: scene.summary || ''
    }));

    return { chapters, scenes };
  } catch (error) {
    console.error('Error parsing structure YAML:', error);
    throw new Error(`Failed to parse structure YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load PCC-5 data from a YAML file content (supports multi-file format)
 */
export async function loadPcc5FromYaml(yamlContent: string): Promise<Pcc5Payload> {
  try {
    console.log('loadPcc5FromYaml: Starting YAML parsing');
    console.log('loadPcc5FromYaml: Content length:', yamlContent.length);
    console.log('loadPcc5FromYaml: Contains separators:', yamlContent.includes('=== '));

    // Check if this is a multi-file format (with === filename === separators)
    if (yamlContent.includes('=== ')) {
      console.log('loadPcc5FromYaml: Using multi-file parser');
      return loadPcc5FromMultiFileYaml(yamlContent);
    }

    // Try to parse as a complete PCC-5 structure first
    console.log('loadPcc5FromYaml: Attempting to parse as complete structure');
    const parsed = yaml.load(yamlContent) as any;
    console.log('loadPcc5FromYaml: Parsed result:', typeof parsed, parsed ? Object.keys(parsed || {}) : 'null');

    if (parsed && parsed.outline && parsed.characters && parsed.chapters && parsed.scenes) {
      console.log('loadPcc5FromYaml: Found complete PCC-5 structure');
      // It's a complete PCC-5 payload
      return {
        outline: parsed.outline,
        characters: parsed.characters,
        chapters: parsed.chapters,
        scenes: parsed.scenes
      };
    }

    // Try to parse individual sections
    let outline: Partial<Outline> = {};
    let characters: Character[] = [];
    let chapters: Chapter[] = [];
    let scenes: Scene[] = [];

    // Check if content contains outline section
    if (yamlContent.includes('step1_promise:') || yamlContent.includes('Promise')) {
      outline = yamlToOutline(yamlContent);
    }

    // Check if content contains characters section
    if (yamlContent.includes('characters:') || yamlContent.includes('Character')) {
      characters = yamlToCharacters(yamlContent);
    }

    // Check if content contains structure section
    if (yamlContent.includes('chapters:') || yamlContent.includes('scenes:')) {
      const structure = yamlToStructure(yamlContent);
      chapters = structure.chapters;
      scenes = structure.scenes;
    }

    return {
      outline: outline as Outline,
      characters,
      chapters,
      scenes
    };

  } catch (error) {
    console.error('Error loading PCC-5 from YAML:', error);
    throw new Error(`Failed to load PCC-5 from YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load PCC-5 data from multi-file YAML format (with === filename === separators)
 */
function loadPcc5FromMultiFileYaml(yamlContent: string): Pcc5Payload {
  console.log('loadPcc5FromMultiFileYaml: Starting multi-file parsing');
  console.log('loadPcc5FromMultiFileYaml: Content preview:', yamlContent.substring(0, 200) + '...');

  // Split by === filename === pattern
  const sectionRegex = /^=== (.+) ===$/gm;
  const sections: string[] = [];
  let lastIndex = 0;

  // Find all matches first to avoid infinite loop
  const allMatches: Array<{ index: number; header: string; fullMatch: string }> = [];
  let match;
  
  // Reset regex lastIndex
  sectionRegex.lastIndex = 0;
  while ((match = sectionRegex.exec(yamlContent)) !== null) {
    allMatches.push({
      index: match.index,
      header: match[1],
      fullMatch: match[0]
    });
  }

  console.log('loadPcc5FromMultiFileYaml: Found', allMatches.length, 'headers:', allMatches.map(m => m.header));

  // Process each match
  for (let i = 0; i < allMatches.length; i++) {
    const currentMatch = allMatches[i];
    const nextMatch = allMatches[i + 1];
    
    console.log('loadPcc5FromMultiFileYaml: Processing header', i, ':', currentMatch.header);
    
    // Add content before this header (if any)
    if (currentMatch.index > lastIndex) {
      const contentBefore = yamlContent.substring(lastIndex, currentMatch.index).trim();
      if (contentBefore) {
        console.log('loadPcc5FromMultiFileYaml: Adding content before header, length:', contentBefore.length);
        sections.push(contentBefore);
      }
    }

    // Add the YAML content that follows this header
    const headerEnd = currentMatch.index + currentMatch.fullMatch.length;
    const contentEnd = nextMatch ? nextMatch.index : yamlContent.length;
    
    console.log('loadPcc5FromMultiFileYaml: Header ends at', headerEnd, 'content ends at', contentEnd);
    
    const sectionContent = yamlContent.substring(headerEnd, contentEnd).trim();
    console.log('loadPcc5FromMultiFileYaml: Section content length:', sectionContent.length);

    if (sectionContent) {
      console.log('loadPcc5FromMultiFileYaml: Adding section content');
      sections.push(sectionContent);
    }

    lastIndex = headerEnd;
  }

  // Add any remaining content after the last header
  if (lastIndex < yamlContent.length) {
    const remainingContent = yamlContent.substring(lastIndex).trim();
    if (remainingContent) {
      console.log('loadPcc5FromMultiFileYaml: Adding remaining content, length:', remainingContent.length);
      sections.push(remainingContent);
    }
  }

  console.log('loadPcc5FromMultiFileYaml: Finished parsing, found', sections.length, 'sections');

  let outline: Partial<Outline> = {};
  let characters: Character[] = [];
  let chapters: Chapter[] = [];
  let scenes: Scene[] = [];

  console.log('loadPcc5FromMultiFileYaml: Processing', sections.length, 'sections');

  sections.forEach((section, index) => {
    const trimmedSection = section.trim();
    if (!trimmedSection) {
      console.log(`loadPcc5FromMultiFileYaml: Section ${index} is empty, skipping`);
      return;
    }

    console.log(`loadPcc5FromMultiFileYaml: Processing section ${index}, length:`, trimmedSection.length);
    console.log(`loadPcc5FromMultiFileYaml: Section ${index} preview:`, trimmedSection.substring(0, 100) + '...');

    try {
      console.log(`loadPcc5FromMultiFileYaml: Analyzing section ${index}...`);
      
      // Determine section type based on YAML content
      if (trimmedSection.includes('step1_promise:') || trimmedSection.includes('Promise')) {
        console.log(`loadPcc5FromMultiFileYaml: Section ${index} appears to be outline`);
        console.log(`loadPcc5FromMultiFileYaml: Calling yamlToOutline for section ${index}`);
        outline = yamlToOutline(trimmedSection);
        console.log(`loadPcc5FromMultiFileYaml: yamlToOutline completed for section ${index}`);
      } else if (trimmedSection.includes('characters:')) {
        console.log(`loadPcc5FromMultiFileYaml: Section ${index} appears to be characters`);
        console.log(`loadPcc5FromMultiFileYaml: Calling yamlToCharacters for section ${index}`);
        characters = yamlToCharacters(trimmedSection);
        console.log(`loadPcc5FromMultiFileYaml: yamlToCharacters completed for section ${index}`);
      } else if (trimmedSection.includes('chapters:') && trimmedSection.includes('scenes:')) {
        console.log(`loadPcc5FromMultiFileYaml: Section ${index} appears to be structure`);
        console.log(`loadPcc5FromMultiFileYaml: Calling yamlToStructure for section ${index}`);
        const structure = yamlToStructure(trimmedSection);
        chapters = structure.chapters;
        scenes = structure.scenes;
        console.log(`loadPcc5FromMultiFileYaml: yamlToStructure completed for section ${index}`);
      } else {
        console.log(`loadPcc5FromMultiFileYaml: Section ${index} type not recognized`);
      }
    } catch (error) {
      console.warn(`loadPcc5FromMultiFileYaml: Failed to parse section ${index}:`, error);
    }
  });

  return {
    outline: outline as Outline,
    characters,
    chapters,
    scenes
  };
}

/**
 * Load YAML file from user selection (browser file API)
 */
export async function loadYamlFile(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Create a drag-and-drop zone with file input
      const dropZone = document.createElement('div');
      dropZone.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const dropZoneContent = document.createElement('div');
      dropZoneContent.style.cssText = `
        background: white;
        padding: 32px;
        border-radius: 12px;
        text-align: center;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        border: 2px dashed #cbd5e0;
        transition: border-color 0.3s ease;
      `;

      const title = document.createElement('h3');
      title.textContent = 'Load PCC-5 YAML File';
      title.style.cssText = `
        margin: 0 0 16px 0;
        color: #1f2937;
        font-size: 20px;
        font-weight: 600;
      `;

      const message = document.createElement('p');
      message.textContent = 'Drag and drop your YAML file here, or click to browse.';
      message.style.cssText = `
        margin: 0 0 24px 0;
        color: #6b7280;
        font-size: 15px;
        line-height: 1.5;
      `;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.yml,.yaml';
      input.style.display = 'none';

      const browseButton = document.createElement('button');
      browseButton.textContent = 'Browse Files';
      browseButton.style.cssText = `
        padding: 12px 24px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        margin-bottom: 16px;
        transition: background 0.2s;
      `;

      const statusText = document.createElement('div');
      statusText.textContent = 'Waiting for file...';
      statusText.style.cssText = `
        color: #6b7280;
        font-size: 14px;
        margin-top: 16px;
      `;

      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.cssText = `
        padding: 10px 20px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        margin-top: 16px;
        transition: background 0.2s;
      `;

      // Button hover effects
      browseButton.addEventListener('mouseenter', () => {
        browseButton.style.background = '#2563eb';
      });
      browseButton.addEventListener('mouseleave', () => {
        browseButton.style.background = '#3b82f6';
      });
      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#dc2626';
      });
      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = '#ef4444';
      });

      let resolved = false;
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (dropZone.parentNode) {
          document.body.removeChild(dropZone);
        }
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      };

      const processFile = (file: File) => {
        if (resolved) return;

        console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
        statusText.textContent = 'Reading file...';

        const reader = new FileReader();

        reader.onloadstart = () => {
          console.log('FileReader: Started loading');
          statusText.textContent = 'Starting to read file...';
        };

        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            console.log('FileReader: Progress -', percentComplete.toFixed(2) + '%');
            statusText.textContent = `Reading file... ${percentComplete.toFixed(0)}%`;
          }
        };

        reader.onload = (e) => {
          if (resolved) return;

          console.log('FileReader: Load completed, result type:', typeof e.target?.result);
          const content = e.target?.result as string;

          if (!content) {
            console.error('FileReader: No content received');
            statusText.textContent = 'Error: No content received';
            resolved = true;
            cleanup();
            resolve(null);
            return;
          }

          console.log('FileReader: Content length:', content.length);
          statusText.textContent = 'File loaded successfully!';

          resolved = true;
          cleanup();
          resolve(content);
        };

        reader.onerror = (e) => {
          if (resolved) return;

          console.error('FileReader: Error occurred', e);
          statusText.textContent = 'Error reading file';
          resolved = true;
          cleanup();
          resolve(null);
        };

        reader.onabort = () => {
          if (resolved) return;
          console.warn('FileReader: Operation aborted');
          statusText.textContent = 'Operation aborted';
          resolved = true;
          cleanup();
          resolve(null);
        };

        // Test with a simple approach first
        console.log('FileReader: Starting readAsText');
        console.log('FileReader: File details - name:', file.name, 'size:', file.size, 'type:', file.type);
        
        // Check if file is too large
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          console.error('FileReader: File too large:', file.size, 'bytes');
          statusText.textContent = 'Error: File too large (max 10MB)';
          resolved = true;
          cleanup();
          resolve(null);
          return;
        }

        // Try reading as ArrayBuffer first to test if FileReader works at all
        console.log('FileReader: Testing with ArrayBuffer first...');
        const testReader = new FileReader();
        
        testReader.onload = () => {
          console.log('FileReader: ArrayBuffer test successful, now trying text...');
          
          // Now try the actual text reading
          try {
            reader.readAsText(file);
          } catch (error) {
            console.error('FileReader: Exception during readAsText:', error);
            statusText.textContent = 'Error starting file read';
            resolved = true;
            cleanup();
            resolve(null);
          }
        };
        
        testReader.onerror = () => {
          console.error('FileReader: ArrayBuffer test failed');
          statusText.textContent = 'Error: Cannot read file';
          resolved = true;
          cleanup();
          resolve(null);
        };
        
        // Read just the first 1KB as a test
        const blob = file.slice(0, 1024);
        testReader.readAsArrayBuffer(blob);
      };

      const handleFileSelect = (e: Event) => {
        console.log('handleFileSelect: Event triggered');
        const files = (e.target as HTMLInputElement).files;
        console.log('handleFileSelect: Files found:', files ? files.length : 'null');
        if (files && files.length > 0) {
          console.log('handleFileSelect: Processing file:', files[0].name);
          processFile(files[0]);
        } else {
          console.log('handleFileSelect: No files selected');
        }
      };

      const handleDrop = (e: DragEvent) => {
        console.log('handleDrop: Event triggered');
        e.preventDefault();
        const files = e.dataTransfer?.files;
        console.log('handleDrop: Files found:', files ? files.length : 'null');
        if (files && files.length > 0) {
          console.log('handleDrop: Processing file:', files[0].name);
          processFile(files[0]);
        } else {
          console.log('handleDrop: No files dropped');
        }
      };

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        dropZoneContent.style.borderColor = '#3b82f6';
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        dropZoneContent.style.borderColor = '#cbd5e0';
      };

      // Set up event listeners
      input.addEventListener('change', handleFileSelect);
      browseButton.addEventListener('click', () => {
        console.log('browseButton: Clicked');
        input.click();
      });
      cancelButton.addEventListener('click', cleanup);

      // Set up drag and drop
      dropZone.addEventListener('drop', handleDrop);
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('dragleave', handleDragLeave);

      // Set up timeout
      timeoutId = setTimeout(() => {
        statusText.textContent = 'Operation timed out';
        console.warn('File selection timeout');
        cleanup();
      }, 10000); // 10 second timeout for testing

      // Assemble the UI
      dropZoneContent.appendChild(title);
      dropZoneContent.appendChild(message);
      dropZoneContent.appendChild(browseButton);
      dropZoneContent.appendChild(statusText);
      dropZoneContent.appendChild(cancelButton);
      dropZone.appendChild(dropZoneContent);
      document.body.appendChild(dropZone);

      console.log('loadYamlFile: UI assembled and added to DOM');

    } catch (error) {
      console.error('Error in loadYamlFile:', error);
      resolve(null);
    }
  });
}
