import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DynamicTreeSidebar from './DynamicTreeSidebar'
import MetadataViewer from './MetadataViewer'
import Editor from './Editor'
import RightSidebar from './RightSidebar'
import ThemeToggle from './ThemeToggle'
import DevToolsPanel from './DevToolsPanel'
import OperationsPanel from './OperationsPanel'
import ApplyChangesPanel from './ApplyChangesPanel'
import LintSidebar from './LintSidebar'
import FileIOPanel from './FileIOPanel'
import CommandPalette from './CommandPalette'
// AISettingsPanel removed - using new BookSettings component
import ProjectManagementPanel from './ProjectManagementPanel'
import WizardPCC5 from './WizardPCC5'
import OutlinePage from './OutlinePage'
import AutoSaveIndicator from './AutoSaveIndicator'
import { useDocumentStore } from '../store/documentStore'
import { usePendingStore } from '../store/pendingStore'
import { useOutlineStore } from '../store/outlineStore'
import { useProjectStore } from '../store/projectStore'
import { useManuscriptStore } from '../store/manuscriptStore'
import { useResearchStore } from '../store/researchStore'
import { useTheme } from '../context/ThemeContext'
import { seedDocuments } from '../utils/seedData'
 
import { setupElectronListeners } from '../utils/electronFileIO'
import { initializeIndex } from '../lib/index'

export default function Layout() {
  const [initialized, setInitialized] = useState(false)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(350)
  const [showLintSidebar, setShowLintSidebar] = useState(false)
  const editorRef = useRef(null)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [showOperations, setShowOperations] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showFileIO, setShowFileIO] = useState(false)
  const [showProjectManagement, setShowProjectManagement] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardIdea, setWizardIdea] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const initDB = useDocumentStore(state => state.initDB)
  const createDocument = useDocumentStore(state => state.createDocument)
  const getAllDocuments = useDocumentStore(state => state.getAllDocuments)
  const currentBatch = usePendingStore(state => state.getCurrentBatch())
  const initProjectDB = useProjectStore(state => state.initDB)
  const initManuscriptDB = useManuscriptStore(state => state.initDB)
  const initResearchDB = useResearchStore(state => state.initDB)
  const initOutlineDB = useOutlineStore(state => state.initDB)
  
  const { toggleTheme } = useTheme()
  
  useEffect(() => {
    const initializeStore = async () => {
      await Promise.all([initDB(), initProjectDB(), initManuscriptDB(), initResearchDB(), initOutlineDB()])
      
      // Check if we need to seed data
      const existingDocs = await getAllDocuments()
      if (existingDocs.length === 0) {
        // Seed initial documents
        for (const seedDoc of seedDocuments) {
          await createDocument(seedDoc.id, seedDoc.title, seedDoc.blocks)
        }
      }
      
      // Manuscript structure is no longer auto-seeded to avoid unwanted default content
      // Outline cards are initialized on-demand when chapters are created
      
      // Initialize search index
      const allDocs = await getAllDocuments()
      await initializeIndex(allDocs)
      console.log('Search index initialized with', allDocs.length, 'documents')
      
      setInitialized(true)
    }
    
    initializeStore()
  }, [initDB, initProjectDB, initManuscriptDB, createDocument, getAllDocuments])

  // Set up Electron listeners
  useEffect(() => {
    const cleanup = setupElectronListeners({
      onOpenCommandPalette: () => setShowCommandPalette(true),
      onNewProject: () => {
        if (confirm('Create new project? This will clear current data.')) {
          window.location.reload()
        }
      },
    })
    
    return cleanup
  }, [])

  // Global keyboard shortcuts and custom events
  useEffect(() => {
    const handleKeyDown = (e) => {
      // CMD/CTRL + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      // CMD/CTRL + P for project management
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setShowProjectManagement(true)
      }
    }

    const handleProjectManagementTrigger = () => {
      setShowProjectManagement(true)
    }

    const handleExportTrigger = () => {
      setShowFileIO(true)
    }

    const handleImportTrigger = () => {
      setShowFileIO(true)
    }

    const handleToggleTheme = () => {
      toggleTheme()
    }

    const handleToggleLint = () => {
      setShowLintSidebar(!showLintSidebar)
    }

    const handleToggleDevTools = () => {
      setShowDevTools(!showDevTools)
    }

    const handleToggleOperations = () => {
      setShowOperations(!showOperations)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('trigger-project-management', handleProjectManagementTrigger)
    window.addEventListener('trigger-export', handleExportTrigger)
    window.addEventListener('trigger-import', handleImportTrigger)
    window.addEventListener('toggle-theme', handleToggleTheme)
    window.addEventListener('toggle-lint', handleToggleLint)
    window.addEventListener('toggle-devtools', handleToggleDevTools)
    window.addEventListener('toggle-operations', handleToggleOperations)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('trigger-project-management', handleProjectManagementTrigger)
      window.removeEventListener('trigger-export', handleExportTrigger)
      window.removeEventListener('trigger-import', handleImportTrigger)
      window.removeEventListener('toggle-theme', handleToggleTheme)
      window.removeEventListener('toggle-lint', handleToggleLint)
      window.removeEventListener('toggle-devtools', handleToggleDevTools)
      window.removeEventListener('toggle-operations', handleToggleOperations)
    }
  }, [])
  
  const handleNodeSelect = (nodeId) => {
    if (nodeId === 'wizard/pcc5') {
      setShowWizard(true)
      setWizardIdea('')
    } else {
      navigate(`/${nodeId}`)
    }
  }

  const handleWizardClose = () => {
    setShowWizard(false)
    setWizardIdea('')
    navigate('/outline')
  }

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing application...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Left Sidebar */}
      <div 
        className="border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
        style={{ width: `${leftWidth}px` }}
      >
        <DynamicTreeSidebar onSelect={handleNodeSelect} currentPath={location.pathname} />
      </div>

      {/* Left Resizer */}
      <div 
        className="w-1 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX
          const startWidth = leftWidth

          const handleMouseMove = (e) => {
            const newWidth = Math.max(200, Math.min(500, startWidth + e.clientX - startX))
            setLeftWidth(newWidth)
          }

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
      />

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden flex min-w-0">
        <div className="flex-1 min-w-0">
          {location.pathname === '/book/metadata' ? (
            <MetadataViewer />
          ) : location.pathname === '/outline' ? (
            <OutlinePage onOpenWizard={() => setShowWizard(true)} />
          ) : (
            <Editor ref={editorRef} />
          )}
        </div>
        {showLintSidebar && location.pathname !== '/book/metadata' && (
          <LintSidebar onHighlight={(blockId, start, end) => {
            // Implement highlighting in editor
            if (editorRef.current) {
              editorRef.current.highlightText(blockId, start, end);
            }
          }} />
        )}
      </div>

      {/* Right Resizer */}
      <div 
        className="w-1 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX
          const startWidth = rightWidth

          const handleMouseMove = (e) => {
            const newWidth = Math.max(300, Math.min(600, startWidth - (e.clientX - startX)))
            setRightWidth(newWidth)
          }

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
      />

      {/* Right Sidebar - AI Panel */}
      <div 
        className="border-l border-gray-200 dark:border-gray-700 flex-shrink-0"
        style={{ width: `${rightWidth}px` }}
      >
        <RightSidebar 
          showLintSidebar={showLintSidebar}
          onToggleLintSidebar={() => setShowLintSidebar(!showLintSidebar)}
          onToggleDevTools={() => setShowDevTools(!showDevTools)}
          onToggleOperations={() => setShowOperations(!showOperations)}
          onToggleAISettings={() => setShowAISettings(!showAISettings)}
          onToggleFileIO={() => setShowFileIO(!showFileIO)}
          onToggleProjectManagement={() => setShowProjectManagement(!showProjectManagement)}
        />
      </div>

      {/* DevTools Panel */}
      <DevToolsPanel isOpen={showDevTools} onToggle={() => setShowDevTools(!showDevTools)} />
      
      {/* Operations Panel */}
      <OperationsPanel isOpen={showOperations} onToggle={() => setShowOperations(!showOperations)} />

      {/* Apply Changes Panel - Shows when there are accepted changes */}
      {currentBatch && currentBatch.operations.some(op => op.status === 'accepted') && (
        <ApplyChangesPanel />
      )}

      {/* File I/O Panel */}
      <FileIOPanel isOpen={showFileIO} onToggle={() => setShowFileIO(!showFileIO)} />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
      />

      {/* AI Settings Panel */}
      {/* AISettingsPanel removed - using new BookSettings component */}

      {/* Project Management Panel */}
      <ProjectManagementPanel isOpen={showProjectManagement} onToggle={() => setShowProjectManagement(!showProjectManagement)} />

      {/* PCC-5 Wizard */}
      {showWizard && (
        <WizardPCC5
          onClose={handleWizardClose}
          initialIdea={wizardIdea}
        />
      )}

      {/* Auto-save indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <AutoSaveIndicator />
      </div>
    </div>
  )
}

