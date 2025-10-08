import { PartMetadata, ChapterMetadata, SceneMetadata } from '../types/manuscript';

/**
 * Seed data for manuscript structure
 */

export const seedParts: PartMetadata[] = [
  {
    id: 'part-01',
    title: 'Part One: The Discovery',
    number: 1,
    chapters: ['ch-01', 'ch-02'],
    summary: 'Sarah discovers the mysterious house and begins her investigation',
    lastModified: Date.now(),
  },
];

export const seedChapters: ChapterMetadata[] = [
  {
    id: 'ch-01',
    part: 'part-01',
    title: 'Chapter 01: The Haunted House',
    number: 1,
    pov: 'Sarah',
    theme: 'Mystery and curiosity',
    summary: 'Sarah discovers the mysterious lights in the abandoned house and decides to investigate',
    scenes: ['scene-01', 'scene-02', 'scene-03'],
    targetWords: 4000,
    currentWords: 0,
    lastModified: Date.now(),
  },
  {
    id: 'ch-02',
    part: 'part-01',
    title: 'Chapter 02: Into the Woods',
    number: 2,
    pov: 'Marcus',
    theme: 'Legacy and memory',
    summary: 'Marcus ventures into the mysterious woods warned by his grandfather',
    scenes: [],
    targetWords: 4000,
    currentWords: 0,
    lastModified: Date.now(),
  },
];

export const seedScenes: SceneMetadata[] = [
  {
    id: 'scene-01',
    chapter: 'ch-01',
    title: 'Scene 01: The Lights',
    location: 'Roadside near the old house',
    time: 'Tuesday evening',
    pov: 'Sarah',
    goal: 'Observe and understand the mysterious lights',
    conflict: 'Fear and uncertainty about what she\'s witnessing',
    outcome: 'Decides to investigate further the next day',
    clock: 'Lights only appear at midnight',
    crucible: 'Curiosity compels her to stay despite danger',
    wordsTarget: 1200,
    wordsCurrent: 0,
    lastModified: Date.now(),
    notes: 'Opening scene - establish mystery and protagonist',
  },
  {
    id: 'scene-02',
    chapter: 'ch-01',
    title: 'Scene 02: The Investigation',
    location: 'Inside the abandoned house',
    time: 'Wednesday morning',
    pov: 'Sarah',
    goal: 'Enter the house and find evidence',
    conflict: 'Dangerous structure, eerie atmosphere',
    outcome: 'Door opens mysteriously, she enters',
    clock: 'Daylight fading, night approaching',
    crucible: 'Commitment to uncovering the truth',
    wordsTarget: 1200,
    wordsCurrent: 0,
    lastModified: Date.now(),
  },
  {
    id: 'scene-03',
    chapter: 'ch-01',
    title: 'Scene 03: The Keeper',
    location: 'Inside the house, main room',
    time: 'Wednesday afternoon',
    pov: 'Sarah',
    goal: 'Understand who or what the keeper is',
    conflict: 'Cryptic figure, unclear intentions',
    outcome: 'Learns she has a choice to make',
    clock: 'Must decide before sunrise',
    crucible: 'Door has closed behind her',
    wordsTarget: 1200,
    wordsCurrent: 0,
    lastModified: Date.now(),
  },
];

/**
 * Initialize manuscript store with seed data
 */
export async function initializeManuscriptSeed(store: any) {
  // Add parts
  for (const part of seedParts) {
    await store.setPart(part);
  }
  
  // Add chapters
  for (const chapter of seedChapters) {
    await store.setChapter(chapter);
    
    // Link chapter to part
    if (chapter.part) {
      await store.addChapterToPart(chapter.id, chapter.part);
    }
  }
  
  // Add scenes
  for (const scene of seedScenes) {
    await store.setScene(scene);
    
    // Link scene to chapter
    await store.addSceneToChapter(scene.id, scene.chapter);
  }
  
  // Set part order
  store.partOrder = seedParts.map(p => p.id);
  await store.saveStructure();
}

