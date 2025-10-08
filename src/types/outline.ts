export interface OutlineCard {
  id: string;
  sceneId: string;
  chapterId?: string;  // Parent chapter ID for context
  title: string;
  goal: string;        // What the protagonist wants
  conflict: string;    // What stands in their way
  outcome: string;     // How the scene ends
  clock: string;       // Time pressure / urgency
  crucible: string;    // What keeps them from leaving
  requiredBeats: string[];  // Block IDs that contain critical beats
  lastModified: number;
}

/**
 * Chapter-level outline card
 */
export interface ChapterOutlineCard {
  id: string;
  chapterId: string;
  title: string;
  pov?: string;         // Primary POV character
  theme?: string;       // Chapter theme
  summary?: string;     // Brief chapter summary
  lastModified: number;
}

export interface DeleteGuardResult {
  allowed: boolean;
  reason?: string;
  outlineCard?: OutlineCard;
  affectedBeats?: string[];
}

