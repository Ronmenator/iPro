import { useState, useEffect } from 'react'

const mockTree = [
  {
    id: 'book',
    name: 'Book',
    type: 'folder',
    children: [
      { id: 'book/metadata', name: 'Metadata', type: 'file' },
      { id: 'book/settings', name: 'Settings', type: 'file' },
    ]
  },
  {
    id: 'outline',
    name: 'Outline',
    type: 'folder',
    children: [
      { id: 'outline/act-1', name: 'Act 1', type: 'file' },
      { id: 'outline/act-2', name: 'Act 2', type: 'file' },
      { id: 'outline/act-3', name: 'Act 3', type: 'file' },
    ]
  },
  {
    id: 'manuscript',
    name: 'Manuscript',
    type: 'folder',
    children: []
  },
  {
    id: 'research',
    name: 'Research',
    type: 'folder',
    children: [
      { id: 'research/characters', name: 'Characters', type: 'file' },
      { id: 'research/locations', name: 'Locations', type: 'file' },
      { id: 'research/timeline', name: 'Timeline', type: 'file' },
    ]
  },
]

function TreeNode({ node, level = 0, onSelect, currentPath, selectedId, setSelectedId }) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = currentPath === `/${node.id}` || selectedId === node.id
  const hasChildren = node.children && node.children.length > 0

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded)
    }
    setSelectedId(node.id)
    onSelect(node.id)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    } else if (e.key === 'ArrowRight' && hasChildren && !expanded) {
      setExpanded(true)
    } else if (e.key === 'ArrowLeft' && hasChildren && expanded) {
      setExpanded(false)
    }
  }

  return (
    <div>
      <div
        className={`
          flex items-center px-2 py-1.5 cursor-pointer rounded-md
          transition-colors
          ${isSelected 
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={hasChildren ? expanded : undefined}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        
        <span className="text-sm">{node.name}</span>
      </div>
      
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect} 
              currentPath={currentPath}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LeftSidebar({ onSelect, currentPath }) {
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    // Update selected ID based on current path
    const pathId = currentPath.slice(1) // Remove leading slash
    if (pathId) {
      setSelectedId(pathId)
    }
  }, [currentPath])

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold">Project</h2>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {mockTree.map(node => (
          <TreeNode 
            key={node.id} 
            node={node} 
            onSelect={onSelect} 
            currentPath={currentPath}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        ))}
      </div>
    </div>
  )
}

