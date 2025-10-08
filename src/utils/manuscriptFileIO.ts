import { Document } from '../types/ops';
import { 
  SceneMetadata, 
  ChapterMetadata, 
  PartMetadata,
  MANUSCRIPT_PATHS 
} from '../types/manuscript';
import { documentToMarkdown, markdownToDocument } from './fileIO';

/**
 * File I/O utilities for hierarchical manuscript structure
 */

/**
 * Convert scene metadata to YAML format
 */
export function sceneMetadataToYAML(meta: SceneMetadata): string {
  const lines: string[] = [
    `id: ${meta.id}`,
    `chapter: ${meta.chapter}`,
    `title: ${meta.title}`,
  ];
  
  if (meta.location) lines.push(`location: ${meta.location}`);
  if (meta.time) lines.push(`time: ${meta.time}`);
  if (meta.pov) lines.push(`pov: ${meta.pov}`);
  
  lines.push('');
  lines.push('# Story Structure');
  if (meta.goal) lines.push(`goal: ${meta.goal}`);
  if (meta.conflict) lines.push(`conflict: ${meta.conflict}`);
  if (meta.outcome) lines.push(`outcome: ${meta.outcome}`);
  if (meta.clock) lines.push(`clock: ${meta.clock}`);
  if (meta.crucible) lines.push(`crucible: ${meta.crucible}`);
  
  lines.push('');
  lines.push('# Word Count');
  if (meta.wordsTarget) lines.push(`words_target: ${meta.wordsTarget}`);
  if (meta.wordsCurrent) lines.push(`words_current: ${meta.wordsCurrent}`);
  
  lines.push('');
  lines.push(`last_modified: ${meta.lastModified}`);
  
  if (meta.notes) {
    lines.push('');
    lines.push('# Notes');
    lines.push(`notes: ${meta.notes}`);
  }
  
  return lines.join('\n');
}

/**
 * Parse YAML to scene metadata
 */
export function yamlToSceneMetadata(yaml: string): Partial<SceneMetadata> {
  const lines = yaml.split('\n');
  const meta: any = {};
  
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Parse numbers
      if (key.includes('words') || key.includes('modified')) {
        meta[camelKey] = parseInt(value);
      } else {
        meta[camelKey] = value;
      }
    }
  }
  
  return meta;
}

/**
 * Convert chapter metadata to YAML format
 */
export function chapterMetadataToYAML(meta: ChapterMetadata): string {
  const lines: string[] = [
    `id: ${meta.id}`,
    `title: ${meta.title}`,
    `number: ${meta.number}`,
  ];
  
  if (meta.part) lines.push(`part: ${meta.part}`);
  if (meta.pov) lines.push(`pov: ${meta.pov}`);
  if (meta.theme) lines.push(`theme: ${meta.theme}`);
  
  if (meta.summary) {
    lines.push('');
    lines.push('# Summary');
    lines.push(`summary: ${meta.summary}`);
  }
  
  lines.push('');
  lines.push('# Scenes');
  lines.push('scenes:');
  meta.scenes.forEach(sceneId => {
    lines.push(`  - ${sceneId}`);
  });
  
  lines.push('');
  lines.push('# Word Count');
  if (meta.targetWords) lines.push(`target_words: ${meta.targetWords}`);
  if (meta.currentWords) lines.push(`current_words: ${meta.currentWords}`);
  
  lines.push('');
  lines.push(`last_modified: ${meta.lastModified}`);
  
  if (meta.notes) {
    lines.push('');
    lines.push('# Notes');
    lines.push(`notes: ${meta.notes}`);
  }
  
  return lines.join('\n');
}

/**
 * Parse YAML to chapter metadata
 */
export function yamlToChapterMetadata(yaml: string): Partial<ChapterMetadata> {
  const lines = yaml.split('\n');
  const meta: any = { scenes: [] };
  let inScenesSection = false;
  
  for (const line of lines) {
    if (line.startsWith('#')) {
      inScenesSection = false;
      continue;
    }
    if (!line.trim()) continue;
    
    if (line === 'scenes:') {
      inScenesSection = true;
      continue;
    }
    
    if (inScenesSection && line.trim().startsWith('- ')) {
      meta.scenes.push(line.trim().substring(2));
      continue;
    }
    
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Parse numbers
      if (key === 'number' || key.includes('words') || key.includes('modified')) {
        meta[camelKey] = parseInt(value);
      } else {
        meta[camelKey] = value;
      }
    }
  }
  
  return meta;
}

/**
 * Convert part metadata to YAML format
 */
export function partMetadataToYAML(meta: PartMetadata): string {
  const lines: string[] = [
    `id: ${meta.id}`,
    `title: ${meta.title}`,
    `number: ${meta.number}`,
  ];
  
  if (meta.summary) {
    lines.push('');
    lines.push('# Summary');
    lines.push(`summary: ${meta.summary}`);
  }
  
  lines.push('');
  lines.push('# Chapters');
  lines.push('chapters:');
  meta.chapters.forEach(chapterId => {
    lines.push(`  - ${chapterId}`);
  });
  
  lines.push('');
  lines.push(`last_modified: ${meta.lastModified}`);
  
  return lines.join('\n');
}

/**
 * Get file path for a scene markdown file
 */
export function getSceneMarkdownPath(sceneId: string, chapterId: string, partId: string = 'part-01'): string {
  return MANUSCRIPT_PATHS.sceneMarkdown(partId, chapterId, sceneId);
}

/**
 * Get file path for a scene metadata file
 */
export function getSceneMetadataPath(sceneId: string, chapterId: string, partId: string = 'part-01'): string {
  return MANUSCRIPT_PATHS.sceneMetadata(partId, chapterId, sceneId);
}

/**
 * Get file path for a chapter metadata file
 */
export function getChapterMetadataPath(chapterId: string, partId: string = 'part-01'): string {
  return MANUSCRIPT_PATHS.chapterMetadata(partId, chapterId);
}

/**
 * Get file path for a part metadata file
 */
export function getPartMetadataPath(partId: string): string {
  return MANUSCRIPT_PATHS.partMetadata(partId);
}

/**
 * Export manuscript structure to file map
 */
export interface ManuscriptExport {
  parts: Map<string, PartMetadata>;
  chapters: Map<string, ChapterMetadata>;
  scenes: Map<string, { metadata: SceneMetadata; document: Document }>;
}

export function exportManuscript(
  parts: Map<string, PartMetadata>,
  chapters: Map<string, ChapterMetadata>,
  scenes: Map<string, SceneMetadata>,
  documents: Map<string, Document>
): Map<string, string> {
  const files = new Map<string, string>();
  
  // Export parts
  parts.forEach(part => {
    const path = getPartMetadataPath(part.id);
    const content = partMetadataToYAML(part);
    files.set(path, content);
  });
  
  // Export chapters
  chapters.forEach(chapter => {
    const partId = chapter.part || 'part-01';
    const path = getChapterMetadataPath(chapter.id, partId);
    const content = chapterMetadataToYAML(chapter);
    files.set(path, content);
  });
  
  // Export scenes
  scenes.forEach(scene => {
    const chapter = chapters.get(scene.chapter);
    if (!chapter) return;
    
    const partId = chapter.part || 'part-01';
    
    // Export scene metadata
    const metaPath = getSceneMetadataPath(scene.id, scene.chapter, partId);
    const metaContent = sceneMetadataToYAML(scene);
    files.set(metaPath, metaContent);
    
    // Export scene document
    const docId = `scene/${scene.id}`;
    const doc = documents.get(docId);
    if (doc) {
      const mdPath = getSceneMarkdownPath(scene.id, scene.chapter, partId);
      const mdContent = documentToMarkdown(doc);
      files.set(mdPath, mdContent);
    }
  });
  
  // Add project manifest
  const manifest = {
    type: 'monday-manuscript',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    structure: {
      parts: parts.size,
      chapters: chapters.size,
      scenes: scenes.size,
    },
  };
  files.set('manuscript.json', JSON.stringify(manifest, null, 2));
  
  return files;
}

/**
 * Import manuscript structure from file map
 */
export function importManuscript(files: Map<string, string>): ManuscriptExport {
  const parts = new Map<string, PartMetadata>();
  const chapters = new Map<string, ChapterMetadata>();
  const scenes = new Map<string, { metadata: SceneMetadata; document: Document }>();
  
  // Process all files
  files.forEach((content, filePath) => {
    // Part metadata
    if (filePath.match(/manuscript\/part-\d+\/part-\d+\.meta\.yml$/)) {
      // Parse part metadata
      const lines = content.split('\n');
      const partMeta: any = { chapters: [] };
      let inChaptersSection = false;
      
      for (const line of lines) {
        if (line === 'chapters:') {
          inChaptersSection = true;
          continue;
        }
        if (inChaptersSection && line.trim().startsWith('- ')) {
          partMeta.chapters.push(line.trim().substring(2));
          continue;
        }
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          partMeta[key] = key === 'number' || key === 'last_modified' ? parseInt(value) : value;
        }
      }
      
      if (partMeta.id) {
        parts.set(partMeta.id, partMeta as PartMetadata);
      }
    }
    
    // Chapter metadata
    else if (filePath.match(/manuscript\/part-\d+\/ch-\d+\/ch-\d+\.meta\.yml$/)) {
      const chapterMeta = yamlToChapterMetadata(content);
      if (chapterMeta.id) {
        chapters.set(chapterMeta.id, chapterMeta as ChapterMetadata);
      }
    }
    
    // Scene metadata
    else if (filePath.match(/manuscript\/.*\/scene-\d+\.meta\.yml$/)) {
      const sceneMeta = yamlToSceneMetadata(content);
      if (sceneMeta.id) {
        scenes.set(sceneMeta.id, { 
          metadata: sceneMeta as SceneMetadata, 
          document: null as any 
        });
      }
    }
    
    // Scene markdown
    else if (filePath.match(/manuscript\/.*\/scene-\d+\.md$/)) {
      const match = filePath.match(/scene-(\d+)\.md$/);
      if (match) {
        const sceneId = `scene-${match[1]}`;
        const docId = `scene/${sceneId}`;
        const doc = markdownToDocument(content, docId);
        
        if (scenes.has(sceneId)) {
          scenes.get(sceneId)!.document = doc as Document;
        } else {
          scenes.set(sceneId, {
            metadata: { id: sceneId } as SceneMetadata,
            document: doc as Document,
          });
        }
      }
    }
  });
  
  return { parts, chapters, scenes };
}

