/**
 * Manuscript Types - Chapter & Scene Hierarchy
 * 
 * Hierarchy: Book → Parts → Chapters → Scenes → Paragraphs (blocks)
 */

/**
 * Scene Metadata
 * One scene = one editable .md file with block IDs
 * Accompanying .meta.yml stores metadata
 */
export interface SceneMetadata {
  id: string;                    // e.g., "scene-01"
  chapter: string;               // Parent chapter ID, e.g., "ch-01"
  title: string;                 // e.g., "The Bells of Oxford"
  location?: string;             // e.g., "Radcliffe Square"
  time?: string;                 // e.g., "Dawn, March 21"
  pov?: string;                  // Point of view character, e.g., "Margaret"
  
  // Story structure (Scene-level beat sheet)
  goal?: string;                 // What the POV character wants
  conflict?: string;             // What stands in their way
  outcome?: string;              // How the scene ends
  clock?: string;                // Time pressure / urgency
  crucible?: string;             // What keeps them from leaving
  
  // Targets
  wordsTarget?: number;          // Target word count, e.g., 1200
  wordsCurrent?: number;         // Current word count (calculated)
  
  // Metadata
  lastModified: number;
  notes?: string;                // Internal notes
}

/**
 * Chapter Metadata
 * Chapter = container for 1–6 scenes
 * The chapter file (ch-XX.meta.yml) holds metadata
 */
export interface ChapterMetadata {
  id: string;                    // e.g., "ch-01"
  part?: string;                 // Parent part ID, e.g., "part-01"
  title: string;                 // e.g., "The Bells of Oxford"
  number: number;                // Chapter number for ordering
  
  // Story elements
  pov?: string;                  // Primary POV character
  theme?: string;                // Chapter theme, e.g., "Knowledge vs Faith"
  summary?: string;              // Brief summary
  
  // Scenes in this chapter
  scenes: string[];              // Array of scene IDs, e.g., ["scene-01", "scene-02"]
  
  // Targets
  targetWords?: number;          // Target word count, e.g., 4000
  currentWords?: number;         // Current word count (calculated from scenes)
  
  // Metadata
  lastModified: number;
  notes?: string;                // Internal notes
}

/**
 * Part Metadata (optional higher-level grouping)
 */
export interface PartMetadata {
  id: string;                    // e.g., "part-01"
  title: string;                 // e.g., "Part One: The Discovery"
  number: number;                // Part number for ordering
  chapters: string[];            // Array of chapter IDs
  summary?: string;
  lastModified: number;
}

/**
 * Manuscript Structure
 * Full book hierarchy
 */
export interface ManuscriptStructure {
  parts: Map<string, PartMetadata>;
  chapters: Map<string, ChapterMetadata>;
  scenes: Map<string, SceneMetadata>;
  
  // Ordering
  partOrder: string[];           // Ordered list of part IDs
  
  lastModified: number;
}

/**
 * Scene with content
 * Combines metadata with actual document content
 */
export interface SceneWithContent {
  metadata: SceneMetadata;
  docId: string;                 // Document ID in documentStore
  filePath: string;              // Relative path, e.g., "manuscript/part-01/ch-01/scene-01.md"
}

/**
 * Chapter with scenes
 * Combines metadata with scene references
 */
export interface ChapterWithScenes {
  metadata: ChapterMetadata;
  scenes: SceneWithContent[];
}

/**
 * File paths for manuscript structure
 */
export interface ManuscriptPaths {
  // Scene files
  sceneMarkdown: (partId: string, chapterId: string, sceneId: string) => string;
  sceneMetadata: (partId: string, chapterId: string, sceneId: string) => string;
  
  // Chapter files
  chapterMetadata: (partId: string, chapterId: string) => string;
  chapterMarkdown?: (partId: string, chapterId: string) => string; // Optional intro/outro
  
  // Part files
  partMetadata: (partId: string) => string;
}

/**
 * Default manuscript paths
 */
export const MANUSCRIPT_PATHS: ManuscriptPaths = {
  sceneMarkdown: (partId, chapterId, sceneId) => 
    `manuscript/${partId}/${chapterId}/${sceneId}.md`,
  sceneMetadata: (partId, chapterId, sceneId) => 
    `manuscript/${partId}/${chapterId}/${sceneId}.meta.yml`,
  chapterMetadata: (partId, chapterId) => 
    `manuscript/${partId}/${chapterId}/${chapterId}.meta.yml`,
  chapterMarkdown: (partId, chapterId) => 
    `manuscript/${partId}/${chapterId}/${chapterId}.md`,
  partMetadata: (partId) => 
    `manuscript/${partId}/${partId}.meta.yml`,
};

/**
 * Helper to get full scene path
 */
export function getScenePath(scene: SceneMetadata, chapter: ChapterMetadata, part?: PartMetadata): string {
  const partId = part?.id || chapter.part || 'part-01';
  return `manuscript/${partId}/${chapter.id}/${scene.id}`;
}

/**
 * Helper to get chapter path
 */
export function getChapterPath(chapter: ChapterMetadata, part?: PartMetadata): string {
  const partId = part?.id || chapter.part || 'part-01';
  return `manuscript/${partId}/${chapter.id}`;
}

