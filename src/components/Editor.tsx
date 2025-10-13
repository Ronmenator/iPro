import React, { forwardRef, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import TipTapEditor from './TipTapEditor'
import PartSummaryView from './PartSummaryView'
import ChapterSummaryView from './ChapterSummaryView'
import OutlinePanel from './OutlinePanel'
import { useDocumentStore } from '../store/documentStore'
import { useSceneStore } from '../store/sceneStore'
// sceneWriter removed - using new AI chat system

interface SceneWriteResult {
  success: boolean;
  message: string;
  error?: string;
}

const EditorComponent = forwardRef((props, ref) => {
  const location = useLocation()
  const currentPath = location.pathname === '/' ? 'No selection' : location.pathname.slice(1)
  const [isWritingScene, setIsWritingScene] = useState(false)
  const [writeResult, setWriteResult] = useState<SceneWriteResult | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [streamingStatus, setStreamingStatus] = useState<string>('')
  const [streamingContent, setStreamingContent] = useState<string>('')

  const { loadScene, currentScene, saveScene } = useSceneStore()
  const { loadDocument, setCurrentDoc } = useDocumentStore()

  // Check if this is a part path (starts with 'part-')
  const isPartPath = currentPath.startsWith('part-')
  
  // Check if this is a chapter path (starts with 'ch-')
  const isChapterPath = currentPath.startsWith('ch-')
  
  // Only show editor for scene and research document paths
  const shouldShowEditor = currentPath.includes('scene') || currentPath.startsWith('research-')
  
  // Check if this is a scene path
  const isScenePath = currentPath.includes('scene/')
  
  // Get scene ID from path
  const sceneId = isScenePath ? currentPath.replace('scene/', '') : null

  const handleWriteScene = async () => {
    setWriteResult({
      success: false,
      message: 'AI Write Scene has been moved to the new AI Chat system. Use the AI Chat tab for scene writing assistance.',
      error: 'Feature moved'
    });
  }

  // Load scene when path changes
  useEffect(() => {
    if (shouldShowEditor && sceneId) {
      loadScene(sceneId)
    }
  }, [currentPath, shouldShowEditor, sceneId, loadScene])

  return (
    <div className="h-full flex flex-col min-w-0">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between min-w-0">
        <h1 className="text-xl font-semibold">{currentPath}</h1>
        {shouldShowEditor && currentScene && (
          <div className="flex gap-2">
            {isScenePath && (
              <>
                <button
                  onClick={saveScene}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  💾 Save Scene
                </button>
                <button
                  onClick={handleWriteScene}
                  disabled={isWritingScene}
                  className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-2 ${
                    isWritingScene
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isWritingScene ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {streamingStatus || 'Writing...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      AI Write Scene
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {shouldShowEditor && <OutlinePanel sceneId={sceneId} />}
      
      {/* AI Streaming Content */}
      {streamingContent && (
        <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-3 mx-4 my-2 rounded-r-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              AI Writing in Progress...
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {streamingStatus}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto bg-white dark:bg-gray-800 p-3 rounded border">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {streamingContent}
            </pre>
          </div>
        </div>
      )}

      {/* AI Writing Result */}
      {writeResult && (
        <div className={`border-l-4 p-3 mx-4 my-2 rounded-r-lg ${
          writeResult.success 
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${
                writeResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {writeResult.success ? 'Scene Written Successfully' : 'Writing Failed'}
              </span>
            </div>
            <button
              onClick={() => setWriteResult(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close result"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className={`text-sm mt-1 ${
            writeResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {writeResult.message}
          </p>
          {writeResult.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
              {writeResult.error}
            </p>
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        {isPartPath ? (
          <PartSummaryView partId={currentPath} />
        ) : isChapterPath ? (
          <ChapterSummaryView chapterId={currentPath} />
        ) : shouldShowEditor && currentScene ? (
          <TipTapEditor ref={ref} key={`${currentScene.id}-${refreshKey}`} sceneData={currentScene} />
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
              Select a part, chapter, or scene to view the editor.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

export default EditorComponent