import React, { forwardRef, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useSceneStore } from '../store/sceneStore'

const TipTapEditor = forwardRef(({ sceneData }, ref) => {
  const { updateSceneContent } = useSceneStore()
  const persistTimeoutRef = useRef(null)
  const isUpdatingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: sceneData?.content || '<p>Start writing...</p>',
    editable: true,
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return
      
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }
      
      persistTimeoutRef.current = setTimeout(() => {
        try {
          if (!sceneData?.id) return
          
          isUpdatingRef.current = true
          
          // Get the HTML content from the editor
          const content = editor.getHTML()
          
          // Update the scene content in the global store
          updateSceneContent(content)
          
          isUpdatingRef.current = false
        } catch (e) {
          console.error('Failed to save scene content:', e)
          isUpdatingRef.current = false
        }
      }, 2000)
    },
  })

  // Expose editor methods
  React.useImperativeHandle(ref, () => ({
    highlightText: (blockId, start, end) => {
      if (editor) {
        editor.commands.setTextSelection({ from: start, to: end })
      }
    }
  }))

  // Handle scene data changes
  useEffect(() => {
    if (!editor || !sceneData || isUpdatingRef.current) return
    
    const currentContent = editor.getHTML()
    if (currentContent !== sceneData.content) {
      isUpdatingRef.current = true
      editor.commands.setContent(sceneData.content)
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 100)
    }
  }, [editor, sceneData])

  // Cleanup
  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }
    }
  }, [])

  if (!editor) {
    return <div className="flex items-center justify-center h-full">Loading editor...</div>
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          ✏️ Edit Mode
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
          Auto-saves every 2 seconds
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative min-w-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
})

TipTapEditor.displayName = 'TipTapEditor'

export default TipTapEditor