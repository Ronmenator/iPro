import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Document } from '../types/ops';
import { PartMetadata, ChapterMetadata, SceneMetadata } from '../types/manuscript';
import { ProjectMetadata, GitCommit } from '../store/projectStore';

/**
 * Project Manager - handles creating, saving, loading, and switching between multiple books/projects
 */

export interface SavedProject {
  id: string;
  metadata: ProjectMetadata;
  documents: Document[];
  parts: PartMetadata[];
  chapters: ChapterMetadata[];
  scenes: SceneMetadata[];
  partOrder: string[];
  commits: GitCommit[];
  savedAt: number;
}

interface ProjectsDB extends DBSchema {
  projects: {
    key: string;
    value: SavedProject;
  };
  metadata: {
    key: string;
    value: {
      currentProjectId: string | null;
      lastOpened: string | null;
    };
  };
}

const PROJECTS_DB_NAME = 'MondayProjectsManagerDB';
const PROJECTS_DB_VERSION = 1;

let projectsDB: IDBPDatabase<ProjectsDB> | null = null;

/**
 * Initialize the projects database
 */
export async function initProjectsDB(): Promise<IDBPDatabase<ProjectsDB>> {
  if (projectsDB) return projectsDB;

  projectsDB = await openDB<ProjectsDB>(PROJECTS_DB_NAME, PROJECTS_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    },
  });

  return projectsDB;
}

/**
 * Generate a unique project ID
 */
export function generateProjectId(projectName: string): string {
  const timestamp = Date.now();
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${sanitized}-${timestamp}`;
}

/**
 * Save the current project state
 */
export async function saveCurrentProject(
  metadata: ProjectMetadata,
  documents: Document[],
  parts: PartMetadata[],
  chapters: ChapterMetadata[],
  scenes: SceneMetadata[],
  partOrder: string[],
  commits: GitCommit[],
  projectId?: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const db = await initProjectsDB();

    const id = projectId || generateProjectId(metadata.name);

    const savedProject: SavedProject = {
      id,
      metadata: {
        ...metadata,
        lastModified: Date.now(),
      },
      documents,
      parts,
      chapters,
      scenes,
      partOrder,
      commits,
      savedAt: Date.now(),
    };

    await db.put('projects', savedProject);

    // Update current project reference
    await db.put('metadata', { currentProjectId: id, lastOpened: id }, 'current');

    return { success: true, projectId: id };
  } catch (error: any) {
    console.error('Failed to save project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load a project by ID
 */
export async function loadProject(
  projectId: string
): Promise<{ success: boolean; project?: SavedProject; error?: string }> {
  try {
    const db = await initProjectsDB();
    const project = await db.get('projects', projectId);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Update last opened
    await db.put('metadata', { currentProjectId: projectId, lastOpened: projectId }, 'current');

    return { success: true, project };
  } catch (error: any) {
    console.error('Failed to load project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all saved projects (metadata only for listing)
 */
export async function listProjects(): Promise<
  Array<{
    id: string;
    name: string;
    author: string;
    description: string;
    created: number;
    lastModified: number;
    savedAt: number;
    sceneCount: number;
    chapterCount: number;
  }>
> {
  try {
    const db = await initProjectsDB();
    const projects = await db.getAll('projects');

    return projects.map((p) => ({
      id: p.id,
      name: p.metadata.name,
      author: p.metadata.author,
      description: p.metadata.description,
      created: p.metadata.created,
      lastModified: p.metadata.lastModified,
      savedAt: p.savedAt,
      sceneCount: p.scenes.length,
      chapterCount: p.chapters.length,
    }));
  } catch (error) {
    console.error('Failed to list projects:', error);
    return [];
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await initProjectsDB();
    await db.delete('projects', projectId);

    // If this was the current project, clear the reference
    const meta = await db.get('metadata', 'current');
    if (meta && meta.currentProjectId === projectId) {
      await db.put('metadata', { currentProjectId: null, lastOpened: null }, 'current');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the current project ID
 */
export async function getCurrentProjectId(): Promise<string | null> {
  try {
    const db = await initProjectsDB();
    const meta = await db.get('metadata', 'current');
    return meta?.currentProjectId || null;
  } catch (error) {
    console.error('Failed to get current project ID:', error);
    return null;
  }
}

/**
 * Duplicate/Clone a project
 */
export async function duplicateProject(
  projectId: string,
  newName: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const result = await loadProject(projectId);
    if (!result.success || !result.project) {
      return { success: false, error: result.error || 'Project not found' };
    }

    const original = result.project;
    const newId = generateProjectId(newName);

    const duplicated: SavedProject = {
      ...original,
      id: newId,
      metadata: {
        ...original.metadata,
        name: newName,
        created: Date.now(),
        lastModified: Date.now(),
      },
      savedAt: Date.now(),
    };

    const db = await initProjectsDB();
    await db.put('projects', duplicated);

    return { success: true, projectId: newId };
  } catch (error: any) {
    console.error('Failed to duplicate project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rename a project
 */
export async function renameProject(
  projectId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await loadProject(projectId);
    if (!result.success || !result.project) {
      return { success: false, error: result.error || 'Project not found' };
    }

    const project = result.project;
    project.metadata.name = newName;
    project.metadata.lastModified = Date.now();

    const db = await initProjectsDB();
    await db.put('projects', project);

    return { success: true };
  } catch (error: any) {
    console.error('Failed to rename project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Export project as JSON
 */
export async function exportProjectAsJSON(projectId: string): Promise<{ success: boolean; json?: string; error?: string }> {
  try {
    const result = await loadProject(projectId);
    if (!result.success || !result.project) {
      return { success: false, error: result.error || 'Project not found' };
    }

    const json = JSON.stringify(result.project, null, 2);
    return { success: true, json };
  } catch (error: any) {
    console.error('Failed to export project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Import project from JSON
 */
export async function importProjectFromJSON(
  json: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const project = JSON.parse(json) as SavedProject;

    // Generate new ID to avoid conflicts
    const newId = generateProjectId(project.metadata.name);
    project.id = newId;
    project.savedAt = Date.now();

    const db = await initProjectsDB();
    await db.put('projects', project);

    return { success: true, projectId: newId };
  } catch (error: any) {
    console.error('Failed to import project:', error);
    return { success: false, error: error.message };
  }
}

