import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useProjectStore } from '../store/projectStore';
import { useOutlineStore } from '../store/outlineStore';
import {
  saveCurrentProject,
  loadProject,
  listProjects,
  deleteProject,
  duplicateProject,
  renameProject,
  exportProjectAsJSON,
  importProjectFromJSON,
  getCurrentProjectId,
  SavedProject,
} from '../utils/projectManager';
import { autoSaveService } from '../services/autoSaveService';

interface ProjectListItem {
  id: string;
  name: string;
  author: string;
  description: string;
  created: number;
  lastModified: number;
  savedAt: number;
  sceneCount: number;
  chapterCount: number;
}

export default function ProjectManagementPanel({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [view, setView] = useState<'list' | 'new'>('list');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAuthor, setNewProjectAuthor] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [renamingProject, setRenamingProject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { getAllDocuments, saveDocument, db: docDB } = useDocumentStore();
  const {
    getAllParts,
    getAllChapters,
    getAllScenes,
    partOrder,
    setPart,
    setChapter,
    setScene,
    parts,
    chapters,
    scenes,
    db: manuscriptDB,
  } = useManuscriptStore();
  const { metadata, commits, saveMetadata, db: projectDB } = useProjectStore();

  // Load projects list on mount
  useEffect(() => {
    if (isOpen) {
      loadProjectsList();
      loadCurrentProjectId();
    }
  }, [isOpen]);

  const loadProjectsList = async () => {
    const projectsList = await listProjects();
    setProjects(projectsList.sort((a, b) => b.savedAt - a.savedAt));
  };

  const loadCurrentProjectId = async () => {
    const id = await getCurrentProjectId();
    setCurrentProjectId(id);
  };

  const handleSaveCurrentProject = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      // Get all data from stores
      const documents = await getAllDocuments();
      const partsArray = getAllParts();
      const chaptersArray = getAllChapters();
      const scenesArray = getAllScenes();

      const result = await saveCurrentProject(
        metadata,
        documents,
        partsArray,
        chaptersArray,
        scenesArray,
        partOrder,
        commits,
        currentProjectId || undefined
      );

      if (result.success) {
        // Trigger auto-save after successful project save
        autoSaveService.forceSave();
        setMessage('✓ Project saved successfully!');
        setCurrentProjectId(result.projectId || null);
        await loadProjectsList();
      } else {
        setMessage(`✗ Failed to save: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      setMessage(`✗ Failed to save: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProject = async (projectId: string) => {
    setIsLoading(true);
    setMessage('');

    try {
      const result = await loadProject(projectId);

      if (!result.success || !result.project) {
        setMessage(`✗ Failed to load: ${result.error}`);
        setIsLoading(false);
        return;
      }

      const project = result.project;

      // Clear and reload all stores
      await clearAllStores();
      await loadProjectIntoStores(project);

      setCurrentProjectId(projectId);
      setMessage('✓ Project loaded successfully!');

      // Refresh after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Load error:', error);
      setMessage(`✗ Failed to load: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllStores = async () => {
    // Clear document store
    if (docDB) {
      const tx1 = docDB.transaction('documents', 'readwrite');
      await tx1.store.clear();
      await tx1.done;
    }

    // Clear manuscript store
    if (manuscriptDB) {
      const tx2 = manuscriptDB.transaction(['parts', 'chapters', 'scenes', 'structure'], 'readwrite');
      await tx2.objectStore('parts').clear();
      await tx2.objectStore('chapters').clear();
      await tx2.objectStore('scenes').clear();
      await tx2.objectStore('structure').clear();
      await tx2.done;
    }

    // Clear project store
    if (projectDB) {
      const tx3 = projectDB.transaction(['metadata', 'commits'], 'readwrite');
      await tx3.objectStore('metadata').clear();
      await tx3.objectStore('commits').clear();
      await tx3.done;
    }

    // Reset in-memory state
    useManuscriptStore.setState({ 
      parts: new Map(), 
      chapters: new Map(), 
      scenes: new Map(), 
      partOrder: [] 
    });
    useDocumentStore.setState({ documents: new Map() });
    useOutlineStore.setState({ 
      cards: new Map(), 
      chapterCards: new Map() 
    });
  };

  const loadProjectIntoStores = async (project: SavedProject) => {
    // Load project metadata
    await saveMetadata(project.metadata);

    // Load documents
    for (const doc of project.documents) {
      await saveDocument(doc);
    }

    // Load manuscript structure
    for (const part of project.parts) {
      await setPart(part);
    }

    for (const chapter of project.chapters) {
      await setChapter(chapter);
    }

    for (const scene of project.scenes) {
      await setScene(scene);
    }

    // Save structure with part order
    await useManuscriptStore.getState().saveStructure();
  };

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      setMessage('✗ Project name is required');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Clear all stores
      await clearAllStores();

      // Create new project metadata
      const newMetadata = {
        name: newProjectName.trim(),
        author: newProjectAuthor.trim(),
        description: newProjectDescription.trim(),
        created: Date.now(),
        lastModified: Date.now(),
        version: '1.0.0',
      };

      // Save empty project
      const result = await saveCurrentProject(newMetadata, [], [], [], [], [], []);

      if (result.success) {
        setMessage('✓ New project created!');
        setCurrentProjectId(result.projectId || null);

        // Update project store with new metadata
        await saveMetadata(newMetadata);

        // Reset form
        setNewProjectName('');
        setNewProjectAuthor('');
        setNewProjectDescription('');
        setView('list');

        await loadProjectsList();

        // Reload page to reflect new project
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(`✗ Failed to create project: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Create project error:', error);
      setMessage(`✗ Failed to create project: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const result = await deleteProject(projectId);

      if (result.success) {
        setMessage('✓ Project deleted');
        if (currentProjectId === projectId) {
          setCurrentProjectId(null);
        }
        await loadProjectsList();
      } else {
        setMessage(`✗ Failed to delete: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setMessage(`✗ Failed to delete: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateProject = async (projectId: string, projectName: string) => {
    const newName = prompt(`Enter name for duplicated project:`, `${projectName} (Copy)`);
    if (!newName) return;

    setIsLoading(true);
    setMessage('');

    try {
      const result = await duplicateProject(projectId, newName);

      if (result.success) {
        setMessage('✓ Project duplicated');
        await loadProjectsList();
      } else {
        setMessage(`✗ Failed to duplicate: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Duplicate error:', error);
      setMessage(`✗ Failed to duplicate: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameProject = async (projectId: string) => {
    if (!renameValue.trim()) return;

    setIsLoading(true);
    setMessage('');

    try {
      const result = await renameProject(projectId, renameValue.trim());

      if (result.success) {
        setMessage('✓ Project renamed');
        setRenamingProject(null);
        setRenameValue('');
        await loadProjectsList();
      } else {
        setMessage(`✗ Failed to rename: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Rename error:', error);
      setMessage(`✗ Failed to rename: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = async (projectId: string, projectName: string) => {
    setIsLoading(true);
    setMessage('');

    try {
      const result = await exportProjectAsJSON(projectId);

      if (result.success && result.json) {
        const blob = new Blob([result.json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage('✓ Project exported');
      } else {
        setMessage(`✗ Failed to export: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setMessage(`✗ Failed to export: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportJSON = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setMessage('');

      try {
        const text = await file.text();
        const result = await importProjectFromJSON(text);

        if (result.success) {
          setMessage('✓ Project imported');
          await loadProjectsList();
        } else {
          setMessage(`✗ Failed to import: ${result.error}`);
        }
      } catch (error: any) {
        console.error('Import error:', error);
        setMessage(`✗ Failed to import: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    input.click();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Project Management</h2>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Project Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Current: {metadata.name}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {metadata.author ? `by ${metadata.author}` : 'No author set'}
              </p>
            </div>
            <button
              onClick={handleSaveCurrentProject}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              Save Current
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setView('list')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              view === 'list'
                ? 'bg-white dark:bg-gray-800 border-b-2 border-blue-600 text-blue-600'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
            }`}
          >
            My Projects ({projects.length})
          </button>
          <button
            onClick={() => setView('new')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              view === 'new'
                ? 'bg-white dark:bg-gray-800 border-b-2 border-green-600 text-green-600'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
            }`}
          >
            New Project
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                message.startsWith('✓')
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}
            >
              {message}
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-4">
              {/* Import/Export Actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleImportJSON}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Import from JSON
                </button>
              </div>

              {/* Projects List */}
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No saved projects yet.</p>
                  <p className="text-sm mt-2">Create a new project or save your current work.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`border rounded-lg p-4 transition-all ${
                        project.id === currentProjectId
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {renamingProject === project.id ? (
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="flex-1 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                aria-label="New project name"
                                placeholder="Enter new project name"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenameProject(project.id)}
                                className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setRenamingProject(null);
                                  setRenameValue('');
                                }}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-lg mb-1">
                              {project.name}
                              {project.id === currentProjectId && (
                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                  Current
                                </span>
                              )}
                            </h3>
                          )}
                          {project.author && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              by {project.author}
                            </p>
                          )}
                          {project.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {project.description}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <span>{project.chapterCount} chapters</span>
                            <span>{project.sceneCount} scenes</span>
                            <span>Saved: {formatDate(project.savedAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 ml-4">
                          {project.id !== currentProjectId && (
                            <button
                              onClick={() => handleLoadProject(project.id)}
                              disabled={isLoading}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm"
                            >
                              Load
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setRenamingProject(project.id);
                              setRenameValue(project.name);
                            }}
                            disabled={isLoading}
                            className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded text-sm"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDuplicateProject(project.id, project.name)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-sm"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleExportJSON(project.id, project.name)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded text-sm"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'new' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Novel"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <input
                  type="text"
                  value={newProjectAuthor}
                  onChange={(e) => setNewProjectAuthor(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="A brief description of your project..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Warning: Creating a new project will clear all current data. Make sure to save
                  your current project first!
                </p>
              </div>

              <button
                onClick={handleCreateNewProject}
                disabled={isLoading || !newProjectName.trim()}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create New Project'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

