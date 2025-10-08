import { useState, useEffect, forwardRef } from 'react'
import { useLocation } from 'react-router-dom'
import TipTapEditor from './TipTapEditor'
import VersionPanel from './VersionPanel'
import OutlinePanel from './OutlinePanel'
import { useDocumentStore } from '../store/documentStore'

const EditorComponent = forwardRef((props, ref) => {
  const location = useLocation()
  const currentPath = location.pathname === '/' ? 'No selection' : location.pathname.slice(1)
  const [editorMode, setEditorMode] = useState('readonly')

  const loadDocument = useDocumentStore(state => state.loadDocument)
  const setCurrentDoc = useDocumentStore(state => state.setCurrentDoc)
  const currentDoc = useDocumentStore(state => state.getCurrentDoc())

  // Only show editor for scene, chapter, and research document paths
  const shouldShowEditor = currentPath.includes('scene') || currentPath.includes('chapter') || currentPath.startsWith('research-')

  useEffect(() => {
    if (shouldShowEditor) {
      const docId = currentPath
      loadDocument(docId).then(() => {
        setCurrentDoc(docId)
      })
    }
  }, [currentPath, shouldShowEditor, loadDocument, setCurrentDoc])

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between min-w-0">
        <h1 className="text-xl font-semibold">{currentPath}</h1>
        {shouldShowEditor && currentDoc && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditorMode('readonly')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                editorMode === 'readonly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Read-Only
            </button>
            <button
              onClick={() => setEditorMode('edit')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                editorMode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Edit Mode
            </button>
          </div>
        )}
      </div>
      
      {shouldShowEditor && currentDoc && <VersionPanel />}
      {shouldShowEditor && currentDoc && <OutlinePanel sceneId={currentPath} />}
      
      <div className="flex-1 overflow-hidden">
        {shouldShowEditor && currentDoc ? (
          <TipTapEditor ref={ref} key={`${currentDoc.id}-${currentDoc.baseVersion}`} readOnly={editorMode === 'readonly'} doc={currentDoc} docId={currentDoc.id} />
        ) : shouldShowEditor ? (
          <div className="p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading document...</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-gray-500 dark:text-gray-400">
              Select a scene or chapter to view the editor.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

export default EditorComponent

