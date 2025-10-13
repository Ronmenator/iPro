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
 * Convert scene metadata to JSON format
 */
export function sceneMetadataToJSON(meta: SceneMetadata): string {
  return JSON.stringify(meta, null, 2);
}

/**
 * Parse JSON to scene metadata
 */
export function jsonToSceneMetadata(json: string): Partial<SceneMetadata> {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse scene metadata JSON:', error);
    return {};
  }
}

/**
 * Convert chapter metadata to JSON format
 */
export function chapterMetadataToJSON(meta: ChapterMetadata): string {
  return JSON.stringify(meta, null, 2);
}

/**
 * Parse JSON to chapter metadata
 */
export function jsonToChapterMetadata(json: string): Partial<ChapterMetadata> {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse chapter metadata JSON:', error);
    return {};
  }
}

/**
 * Convert part metadata to JSON format
 */
export function partMetadataToJSON(meta: PartMetadata): string {
  return JSON.stringify(meta, null, 2);
}

/**
 * Parse JSON to part metadata
 */
export function jsonToPartMetadata(json: string): Partial<PartMetadata> {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to parse part metadata JSON:', error);
    return {};
  }
}

/**
 * Export manuscript structure to files
 */
export function exportManuscriptStructure(
  parts: Map<string, PartMetadata>,
  chapters: Map<string, ChapterMetadata>,
  scenes: Map<string, SceneMetadata>,
  documents: Map<string, Document>
): Map<string, string> {
  const files = new Map<string, string>();
  
  // Export parts
  for (const [partId, part] of parts) {
    const content = partMetadataToJSON(part);
    files.set(`manuscript/${partId}/${partId}.meta.json`, content);
  }
  
  // Export chapters
  for (const [chapterId, chapter] of chapters) {
    const content = chapterMetadataToJSON(chapter);
    files.set(`manuscript/${chapter.part}/${chapterId}/${chapterId}.meta.json`, content);
  }
  
  // Export scenes
  for (const [sceneId, scene] of scenes) {
    const metaContent = sceneMetadataToJSON(scene);
    files.set(`manuscript/${scene.part}/${scene.chapter}/${sceneId}.meta.json`, metaContent);
    
    // Export scene document if it exists
    const doc = documents.get(`scene/${sceneId}`);
    if (doc) {
      const docContent = documentToMarkdown(doc);
      files.set(`manuscript/${scene.part}/${scene.chapter}/${sceneId}.md`, docContent);
    }
  }
  
  return files;
}

/**
 * Import manuscript structure from files
 */
export async function importManuscriptStructure(
  files: Map<string, string>
): Promise<{
  parts: Map<string, PartMetadata>;
  chapters: Map<string, ChapterMetadata>;
  scenes: Map<string, SceneMetadata>;
  documents: Map<string, Document>;
}> {
  const parts = new Map<string, PartMetadata>();
  const chapters = new Map<string, ChapterMetadata>();
  const scenes = new Map<string, SceneMetadata>();
  const documents = new Map<string, Document>();
  
  for (const [filePath, content] of files) {
    try {
      // Parse part metadata
      if (filePath.match(/manuscript\/part-\d+\/part-\d+\.meta\.json$/)) {
        const partMeta = jsonToPartMetadata(content);
        if (partMeta.id) {
          parts.set(partMeta.id, partMeta as PartMetadata);
        }
      }
      // Parse chapter metadata
      else if (filePath.match(/manuscript\/part-\d+\/ch-\d+\/ch-\d+\.meta\.json$/)) {
        const chapterMeta = jsonToChapterMetadata(content);
        if (chapterMeta.id) {
          chapters.set(chapterMeta.id, chapterMeta as ChapterMetadata);
        }
      }
      // Parse scene metadata
      else if (filePath.match(/manuscript\/.*\/scene-\d+\.meta\.json$/)) {
        const sceneMeta = jsonToSceneMetadata(content);
        if (sceneMeta.id) {
          scenes.set(sceneMeta.id, sceneMeta as SceneMetadata);
        }
      }
      // Parse scene documents
      else if (filePath.match(/manuscript\/.*\/scene-\d+\.md$/)) {
        const doc = markdownToDocument(content, filePath);
        if (doc.id) {
          documents.set(doc.id, doc as Document);
        }
      }
    } catch (error) {
      console.error(`Failed to parse file ${filePath}:`, error);
    }
  }
  
  return { parts, chapters, scenes, documents };
}

/**
 * Export manuscript to files
 */
export function exportManuscript(
  parts: Map<string, PartMetadata>,
  chapters: Map<string, ChapterMetadata>,
  scenes: Map<string, SceneMetadata>,
  documents: Map<string, Document>
): Map<string, string> {
  return exportManuscriptStructure(parts, chapters, scenes, documents);
}

/**
 * Import manuscript from files
 */
export async function importManuscript(
  files: Map<string, string>
): Promise<{
  parts: Map<string, PartMetadata>;
  chapters: Map<string, ChapterMetadata>;
  scenes: Map<string, SceneMetadata>;
  documents: Map<string, Document>;
}> {
  return importManuscriptStructure(files);
}

/**
 * Export project files
 */
export function exportProjectFiles(
  documents: Document[],
  projectName: string = 'MyBook'
): Map<string, string> {
  const files = new Map<string, string>();
  
  // Create project structure
  files.set('README.md', `# ${projectName}\n\nThis is a generated manuscript project.`);
  
  // Export all documents
  for (const doc of documents) {
    const content = documentToMarkdown(doc);
    const filePath = getDocumentFilePath(doc.id);
    files.set(filePath, content);
  }
  
  return files;
}

/**
 * Get document file path
 */
function getDocumentFilePath(docId: string): string {
  if (docId.startsWith('scene/')) {
    const sceneId = docId.replace('scene/', '');
    return `scenes/${sceneId}.md`;
  } else if (docId.startsWith('chapter/')) {
    const chapterId = docId.replace('chapter/', '');
    return `chapters/${chapterId}.md`;
  } else {
    return `documents/${docId}.md`;
  }
}

/**
 * Manuscript export interface
 */
export interface ManuscriptExport {
  parts: Map<string, PartMetadata>;
  chapters: Map<string, ChapterMetadata>;
  scenes: Map<string, { metadata: SceneMetadata; document: Document }>;
}