import { Document } from '../types/ops';
import { exportProject, importProject } from './fileIO';
import { hashDocument, hashBlock } from './hashing';

// Type definitions for Electron API
declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      fs: {
        writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
        readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        readDir: (dirPath: string) => Promise<{ success: boolean; entries?: Array<{ name: string; isDirectory: boolean }>; error?: string }>;
      };
      dialog: {
        openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      };
      project: {
        export: (exportPath: string, files: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
      };
      git: {
        commit: (message: string, operations: any[]) => Promise<{ success: boolean; message?: string }>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => void;
      off: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  return window.electron?.isElectron === true;
}

/**
 * Export project using Electron file system
 */
export async function electronExportProject(
  documents: Document[],
  projectName: string = 'MyBook'
): Promise<{ success: boolean; error?: string; path?: string }> {
  if (!isElectron()) {
    return { success: false, error: 'Not running in Electron' };
  }

  try {
    // Let user select export directory
    const result = await window.electron!.dialog.openDirectory();
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Export cancelled' };
    }

    const exportPath = result.filePaths[0];
    const files = exportProject(documents);
    
    // Convert Map to object for IPC
    const filesObject = Object.fromEntries(files);
    
    // Use Electron IPC to write files
    const exportResult = await window.electron!.project.export(exportPath, filesObject);
    
    if (exportResult.success) {
      return { success: true, path: exportPath };
    } else {
      return { success: false, error: exportResult.error };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Import project using Electron file system
 */
export async function electronImportProject(): Promise<{
  success: boolean;
  documents?: Partial<Document>[];
  error?: string;
}> {
  if (!isElectron()) {
    return { success: false, error: 'Not running in Electron' };
  }

  try {
    // Let user select project directory
    const result = await window.electron!.dialog.openDirectory();
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Import cancelled' };
    }

    const projectPath = result.filePaths[0];
    
    // Read all markdown files
    const files = await readProjectDirectory(projectPath);
    
    if (files.size === 0) {
      return { success: false, error: 'No markdown files found in directory' };
    }
    
    // Parse files into documents
    const documents = importProject(files);
    
    return { success: true, documents };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Recursively read all markdown files from a directory
 */
async function readProjectDirectory(
  dirPath: string,
  relativePath: string = ''
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  
  if (!isElectron()) {
    return files;
  }

  try {
    const dirResult = await window.electron!.fs.readDir(dirPath);
    
    if (!dirResult.success || !dirResult.entries) {
      return files;
    }

    for (const entry of dirResult.entries) {
      const entryPath = `${dirPath}/${entry.name}`;
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory) {
        // Recursively read subdirectory
        const subFiles = await readProjectDirectory(entryPath, relPath);
        subFiles.forEach((content, path) => files.set(path, content));
      } else if (entry.name.endsWith('.md')) {
        // Read markdown file
        const fileResult = await window.electron!.fs.readFile(entryPath);
        if (fileResult.success && fileResult.content) {
          files.set(relPath, fileResult.content);
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }

  return files;
}

/**
 * Commit changes to Git (optional feature)
 */
export async function gitCommitBatch(
  message: string,
  operations: any[]
): Promise<{ success: boolean; message?: string }> {
  if (!isElectron()) {
    return { success: false, message: 'Not running in Electron' };
  }

  try {
    const result = await window.electron!.git.commit(message, operations);
    return result;
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Set up Electron IPC listeners
 */
export function setupElectronListeners(callbacks: {
  onOpenCommandPalette?: () => void;
  onNewProject?: () => void;
  onSaveProject?: (path: string) => void;
  onExportProject?: (path: string) => void;
  onImportProject?: (data: { projectPath: string; files: Record<string, string> }) => void;
  onProjectLoaded?: (data: { projectPath: string; files: Record<string, string> }) => void;
}) {
  if (!isElectron()) {
    return () => {}; // Return cleanup function
  }

  const handlers: Record<string, (...args: any[]) => void> = {};

  if (callbacks.onOpenCommandPalette) {
    handlers['open-command-palette'] = callbacks.onOpenCommandPalette;
    window.electron!.on('open-command-palette', handlers['open-command-palette']);
  }

  if (callbacks.onNewProject) {
    handlers['menu-new-project'] = callbacks.onNewProject;
    window.electron!.on('menu-new-project', handlers['menu-new-project']);
  }

  if (callbacks.onSaveProject) {
    handlers['save-project-requested'] = callbacks.onSaveProject;
    window.electron!.on('save-project-requested', handlers['save-project-requested']);
  }

  if (callbacks.onExportProject) {
    handlers['export-project-requested'] = callbacks.onExportProject;
    window.electron!.on('export-project-requested', handlers['export-project-requested']);
  }

  if (callbacks.onImportProject) {
    handlers['import-project'] = callbacks.onImportProject;
    window.electron!.on('import-project', handlers['import-project']);
  }

  if (callbacks.onProjectLoaded) {
    handlers['project-loaded'] = callbacks.onProjectLoaded;
    window.electron!.on('project-loaded', handlers['project-loaded']);
  }

  // Return cleanup function
  return () => {
    Object.entries(handlers).forEach(([channel, handler]) => {
      window.electron!.off(channel, handler);
    });
  };
}

