import React, { useState, useEffect, useRef } from 'react';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useProjectStore } from '../store/projectStore';
import { useOutlineStore } from '../store/outlineStore';
import { useDocumentStore } from '../store/documentStore';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  meta?: any;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  onSelect: (nodeId: string) => void;
  currentPath: string;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onAdd?: (parentId: string, parentType: string) => void;
  onDelete?: (nodeId: string, nodeType: string) => void;
  onRename?: (nodeId: string, nodeType: string, newName: string) => void;
}

function TreeNodeComponent({
  node,
  level,
  onSelect,
  currentPath,
  selectedId,
  setSelectedId,
  onAdd,
  onDelete,
  onRename,
}: TreeNodeComponentProps) {
  const [expanded, setExpanded] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelected = currentPath === `/${node.id}` || selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (isEditing) return;
    
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      
      // This is a double click - only allow rename for items under main sections
      if (onRename && canRename()) {
        setIsEditing(true);
        setEditValue(node.name);
      }
      return;
    }
    
    // Set timeout for single click
    clickTimeoutRef.current = setTimeout(() => {
      // Single click
      if (hasChildren) {
        setExpanded(!expanded);
      }
      setSelectedId(node.id);
      onSelect(node.id);
      clickTimeoutRef.current = null;
    }, 300);
  };

  // Check if this node can be renamed (only items under main sections)
  const canRename = () => {
    // Main section headers cannot be renamed
    const mainSections = ['book', 'manuscript', 'outline', 'research'];
    if (mainSections.includes(node.id)) {
      return false;
    }
    
    // Check if this node is under a main section by looking at the tree structure
    // This is a simple check - in a real implementation you might want to pass parent info
    return node.meta?.itemType || node.type === 'file' || 
           (node.id.includes('part') || node.id.includes('ch-') || node.id.includes('scene') || 
            node.id.includes('outline/') || node.id.includes('research/'));
  };

  const handleRenameSave = () => {
    if (onRename && editValue.trim() && editValue !== node.name) {
      onRename(node.id, node.meta?.type || 'file', editValue.trim());
    }
    setIsEditing(false);
  };

  const handleRenameCancel = () => {
    setEditValue(node.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        handleRenameSave();
      } else if (e.key === 'Escape') {
        handleRenameCancel();
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'ArrowRight' && hasChildren && !expanded) {
      setExpanded(true);
    } else if (e.key === 'ArrowLeft' && hasChildren && expanded) {
      setExpanded(false);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAdd) {
      onAdd(node.id, node.type);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(node.id, node.meta?.itemType || node.type);
    }
  };

  // Determine if this node can have children
  const canHaveChildren = 
    node.id === 'manuscript' || 
    node.id === 'outline' ||
    node.id === 'research' ||
    node.meta?.itemType === 'part' ||
    node.meta?.itemType === 'chapter';

  // Determine if this node can be deleted (not root folders)
  const canDelete = ![
    'book',
    'manuscript',
    'outline',
    'research',
  ].includes(node.id);

  const paddingLeft = level * 16 + 8;

  return (
    <div>
      <div
        className={`group flex items-center px-2 py-1.5 rounded-md transition-colors relative ${
          canRename() 
            ? 'cursor-pointer' 
            : 'cursor-default'
        } ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        tabIndex={0}
        role="button"
        title={canRename() ? "Double-click to rename" : "Cannot rename this item"}
      >
        {hasChildren && (
          <svg
            className={`w-4 h-4 mr-1 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!hasChildren && <span className="w-4 mr-1" />}

        {node.type === 'folder' ? (
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}

        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={handleKeyDown}
            className="text-sm flex-1 bg-transparent border-b border-blue-500 outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename item"
            placeholder="Enter new name"
          />
        ) : (
          <span className="text-sm flex-1">{node.name}</span>
        )}

        {/* Action buttons - visible on hover */}
        {hovering && (
          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            {canHaveChildren && onAdd && (
              <span
                onClick={handleAdd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAdd(e as any);
                  }
                }}
                className="p-1 rounded hover:bg-green-500 hover:text-white dark:hover:bg-green-600 transition-colors cursor-pointer inline-block"
                title="Add child item"
                aria-label="Add child"
                role="button"
                tabIndex={0}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
            )}
            {canDelete && onDelete && (
              <span
                onClick={handleDelete}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDelete(e as any);
                  }
                }}
                className="p-1 rounded hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors cursor-pointer inline-block"
                title="Delete item"
                aria-label="Delete"
                role="button"
                tabIndex={0}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              currentPath={currentPath}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onAdd={onAdd}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DynamicTreeSidebar({
  onSelect,
  currentPath,
}: {
  onSelect: (nodeId: string) => void;
  currentPath: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);

  const { getAllParts, getAllChapters, getAllScenes, getChaptersByPart, getScenesByChapter, setPart, setChapter, setScene, deletePart, deleteChapter, deleteScene, addChapterToPart, addSceneToChapter, saveStructure, partOrder, renamePart, renameChapter, renameScene, parts, chapters, scenes } = useManuscriptStore();
  const { metadata } = useProjectStore();
  const { cards, chapterCards, setCard, setChapterCard, deleteCard, deleteChapterCard, renameCard, renameChapterCard } = useOutlineStore();
  const { createDocument, deleteDocument, documents } = useDocumentStore();

  useEffect(() => {
    // Update selected ID based on current path
    const pathId = currentPath.slice(1); // Remove leading slash
    if (pathId) {
      setSelectedId(pathId);
    }
  }, [currentPath]);

  useEffect(() => {
    // Build tree from stores
    buildTree();
  }, [parts, chapters, scenes, metadata, cards, chapterCards, partOrder, documents]);

  const buildTree = () => {
    const parts = getAllParts();
    const chapters = getAllChapters();
    const scenes = getAllScenes();

    // Build manuscript structure
    const manuscriptChildren: TreeNode[] = parts.map((part) => {
      const partChapters = chapters.filter((ch) => ch.part === part.id);

      return {
        id: part.id,
        name: `${part.title}`,
        type: 'folder' as const,
        meta: { itemType: 'part', data: part },
        children: partChapters.map((chapter) => {
          const chapterScenes = scenes.filter((sc) => sc.chapter === chapter.id);

          return {
            id: chapter.id,
            name: `${chapter.title}`,
            type: 'folder' as const,
            meta: { itemType: 'chapter', data: chapter },
            children: chapterScenes.map((scene) => ({
              id: `scene/${scene.id}`,
              name: scene.title,
              type: 'file' as const,
              meta: { itemType: 'scene', data: scene },
            })),
          };
        }),
      };
    });

    // Build outline structure
    const outlineChildren: TreeNode[] = Array.from(chapterCards.values()).map((chapterCard) => {
      const sceneCards = Array.from(cards.values()).filter(
        (card) => card.chapterId === chapterCard.chapterId
      );

      return {
        id: `outline/${chapterCard.chapterId}`,
        name: chapterCard.title,
        type: 'file' as const,
        meta: { itemType: 'outline-chapter', data: chapterCard },
      };
    });

    // Build research structure from research documents
    const researchChildren: TreeNode[] = Array.from(documents.values())
      .filter(doc => doc.id.startsWith('research-'))
      .map(doc => ({
        id: doc.id,
        name: doc.title,
        type: 'file' as const,
        meta: { itemType: 'research-document', data: doc },
      }))
      .sort((a, b) => b.meta.data.lastModified - a.meta.data.lastModified); // Sort by most recent first

    const newTree: TreeNode[] = [
      {
        id: 'book',
        name: 'Book',
        type: 'folder',
        children: [
          { id: 'book/metadata', name: 'Metadata', type: 'file' },
          { id: 'book/settings', name: 'Settings', type: 'file' },
        ],
      },
      {
        id: 'outline',
        name: 'Outline',
        type: 'folder',
        children: [
          { id: 'wizard/pcc5', name: '🎭 Generate from Idea', type: 'file' },
          ...outlineChildren,
        ],
      },
      {
        id: 'manuscript',
        name: 'Manuscript',
        type: 'folder',
        children: manuscriptChildren,
      },
      {
        id: 'research',
        name: 'Research',
        type: 'folder',
        children: researchChildren,
      },
    ];

    setTree(newTree);
  };

  const handleAdd = async (parentId: string, parentType: string) => {
    try {
      if (parentId === 'manuscript') {
        // Add new Part
        const parts = getAllParts();
        const displayNumber = parts.length + 1; // numbering based on existing items at this level

        // Create a globally unique part id (avoid collisions with any references)
        const existingPartIds = new Set<string>([
          ...parts.map((p) => p.id),
          ...getAllChapters().map((c) => c.part).filter(Boolean) as string[],
        ]);
        let idCounter = Math.max(1, parts.length + 1);
        let candidateId = `part-${String(idCounter).padStart(2, '0')}`;
        while (existingPartIds.has(candidateId)) {
          idCounter += 1;
          candidateId = `part-${String(idCounter).padStart(2, '0')}`;
        }

        await setPart({
          id: candidateId,
          title: `Part ${String(displayNumber).padStart(2, '0')}: New Part`,
          number: displayNumber,
          summary: '',
          chapters: [],
          lastModified: Date.now(),
        });

        // Add to partOrder
        const { partOrder } = useManuscriptStore.getState();
        const newPartOrder = [...partOrder, candidateId];
        useManuscriptStore.setState({ partOrder: newPartOrder });

        await saveStructure();
        buildTree();
      } else if (parentId === 'research') {
        // Research items are managed through the ResearchPanel
        // This is handled by the research store and UI
        console.log('Research items are managed through the Research Panel');
      } else if (parentType === 'folder' && parentId.startsWith('part-')) {
        // Add new Chapter to Part
        const part = getAllParts().find((p) => p.id === parentId);
        if (!part) return;

        // Display numbering should be based on siblings under this part
        const siblingChapters = getChaptersByPart(parentId);
        const displayNumber = siblingChapters.length + 1;

        // ID must be globally unique across chapters
        const existingChapterIds = new Set<string>(getAllChapters().map((c) => c.id));
        let idCounter = Math.max(1, getAllChapters().length + 1);
        let newChapterId = `ch-${String(idCounter).padStart(2, '0')}`;
        while (existingChapterIds.has(newChapterId)) {
          idCounter += 1;
          newChapterId = `ch-${String(idCounter).padStart(2, '0')}`;
        }

        await setChapter({
          id: newChapterId,
          title: `Chapter ${String(displayNumber).padStart(2, '0')}: New Chapter`,
          number: displayNumber,
          part: parentId,
          pov: '',
          theme: '',
          summary: '',
          scenes: [],
          targetWords: 0,
          currentWords: 0,
          lastModified: Date.now(),
        });

        await addChapterToPart(newChapterId, parentId);
        await saveStructure();
        buildTree();
      } else if (parentType === 'folder' && parentId.startsWith('ch-')) {
        // Add new Scene to Chapter
        const chapter = getAllChapters().find((c) => c.id === parentId);
        if (!chapter) return;

        // Display numbering based on sibling scenes under this chapter
        const siblingScenes = getScenesByChapter(parentId);
        const displayNumber = siblingScenes.length + 1;

        // ID must be globally unique across scenes
        const existingSceneIds = new Set<string>(getAllScenes().map((s) => s.id));
        let idCounter = Math.max(1, getAllScenes().length + 1);
        let newSceneId = `scene-${String(idCounter).padStart(2, '0')}`;
        while (existingSceneIds.has(newSceneId)) {
          idCounter += 1;
          newSceneId = `scene-${String(idCounter).padStart(2, '0')}`;
        }

        await setScene({
          id: newSceneId,
          chapter: parentId,
          title: `Scene ${String(displayNumber).padStart(2, '0')} - New Scene`,
          location: '',
          time: '',
          pov: '',
          goal: '',
          conflict: '',
          outcome: '',
          clock: '',
          crucible: '',
          wordsTarget: 1000,
          wordsCurrent: 0,
          lastModified: Date.now(),
        });

        await addSceneToChapter(newSceneId, parentId);

        // Create an empty document for the scene with a single empty paragraph block
        await createDocument(`scene/${newSceneId}`, `Scene ${String(displayNumber).padStart(2, '0')}`, [
          {
            id: 'p_001',
            type: 'paragraph',
            text: '',
          },
        ]);

        await saveStructure();
        buildTree();
      } else if (parentId === 'outline') {
        // Add new Outline entry (chapter outline)
        const chapters = getAllChapters();
        if (chapters.length === 0) {
          alert('Please create chapters in the Manuscript section first.');
          return;
        }

        // Find a chapter that doesn't have an outline yet
        const chapterWithoutOutline = chapters.find(
          (ch) => !chapterCards.has(ch.id)
        );

        if (!chapterWithoutOutline) {
          alert('All chapters already have outlines.');
          return;
        }

        setChapterCard({
          id: `outline_${chapterWithoutOutline.id}`,
          chapterId: chapterWithoutOutline.id,
          title: chapterWithoutOutline.title,
          pov: '',
          theme: '',
          summary: '',
          lastModified: Date.now(),
        });

        buildTree();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert(`Failed to add item: ${error}`);
    }
  };

  const handleDelete = async (nodeId: string, nodeType: string) => {
    const confirmMsg = `Are you sure you want to delete this ${nodeType}? This cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    try {
      if (nodeType === 'part') {
        await deletePart(nodeId);
        await saveStructure();
      } else if (nodeType === 'chapter') {
        await deleteChapter(nodeId);
        deleteChapterCard(nodeId);
        await saveStructure();
      } else if (nodeType === 'scene') {
        const sceneId = nodeId.replace('scene/', '');
        await deleteScene(sceneId);
        deleteCard(sceneId);
        await saveStructure();
      } else if (nodeType === 'outline-chapter') {
        const chapterId = nodeId.replace('outline/', '');
        deleteChapterCard(chapterId);
      } else if (nodeType === 'research-document') {
        await deleteDocument(nodeId);
      }
      buildTree();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(`Failed to delete item: ${error}`);
    }
  };

  const handleRename = async (nodeId: string, nodeType: string, newName: string) => {
    // Only allow renaming of items under main sections
    const mainSections = ['book', 'manuscript', 'outline', 'research'];
    if (mainSections.includes(nodeId)) {
      console.log('Cannot rename main section:', nodeId);
      return;
    }

    try {
      if (nodeType === 'part') {
        await renamePart(nodeId, newName);
        await saveStructure();
      } else if (nodeType === 'chapter') {
        await renameChapter(nodeId, newName);
        await saveStructure();
      } else if (nodeType === 'scene') {
        const sceneId = nodeId.replace('scene/', '');
        await renameScene(sceneId, newName);
        await saveStructure();
      } else if (nodeType === 'outline-chapter') {
        const chapterId = nodeId.replace('outline/', '');
        renameChapterCard(chapterId, newName);
      } else if (nodeType === 'outline-scene') {
        const sceneId = nodeId.replace('outline/', '');
        renameCard(sceneId, newName);
      }
      buildTree();
    } catch (error) {
      console.error('Error renaming item:', error);
      alert(`Failed to rename item: ${error}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold">{metadata.name || 'Project'}</h2>
        {metadata.author && <p className="text-xs text-gray-600 dark:text-gray-400">by {metadata.author}</p>}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {tree.map((node) => (
          <TreeNodeComponent
            key={node.id}
            node={node}
            level={0}
            onSelect={onSelect}
            currentPath={currentPath}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}
      </div>
    </div>
  );
}

