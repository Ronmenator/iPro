import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import BlockIdExtension from '../extensions/BlockIdExtension'
import { emitSelectionChange } from '../utils/selectionTracker'
import { useDocumentStore } from '../store/documentStore'
import { marked } from 'marked'

// Start with empty content; real doc content is loaded via DocumentStore
const initialContent = ''

// Highlight decoration function
const createHighlightDecoration = (from, to) => {
  return Decoration.inline(from, to, {
    class: 'bg-yellow-200 dark:bg-yellow-800 rounded px-1',
    style: 'background-color: rgba(254, 240, 138, 0.5); border-radius: 2px; padding: 1px;'
  })
}

// Create decorations plugin
const createDecorationsPlugin = (highlightDecorations) => {
  return new Plugin({
    key: new PluginKey('decorations'),
    props: {
      decorations: (state) => {
        return DecorationSet.create(state.doc, highlightDecorations)
      }
    }
  })
}

const TipTapEditorComponent = ({ readOnly = true, doc, docId }, ref) => {
  const [hoveredBlock, setHoveredBlock] = useState(null)
  const [selectionInfo, setSelectionInfo] = useState(null)
  const [showReplaceButton, setShowReplaceButton] = useState(false)
  const [highlightDecorations, setHighlightDecorations] = useState([])
  const getCurrentDoc = useDocumentStore(state => state.getCurrentDoc)
  const updateDocument = useDocumentStore(state => state.updateDocument)

  // Highlight function
  const highlightText = (blockId, start, end) => {
    if (!editor) return

    // Find the block in the document
    const doc = editor.state.doc
    let targetPos = null

    // Simple approach: highlight based on character position within the document
    // In a real implementation, you'd want to map block IDs to actual positions
    const totalLength = doc.content.size
    const highlightStart = Math.max(0, Math.floor((start / 100) * totalLength))
    const highlightEnd = Math.min(totalLength, Math.floor((end / 100) * totalLength))

    if (highlightStart < highlightEnd) {
      const decoration = createHighlightDecoration(highlightStart, highlightEnd)
      setHighlightDecorations([decoration])

      // Scroll to highlight
      editor.commands.scrollIntoView()
    }
  }

  // Expose highlight function via ref
  useImperativeHandle(ref, () => ({
    highlightText
  }))

  const decorationsPlugin = createDecorationsPlugin(highlightDecorations)

  const editor = useEditor({
    extensions: [
      StarterKit,
      BlockIdExtension,
      decorationsPlugin,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none px-8 py-6 break-words overflow-wrap-anywhere',
      },
    },
    content: doc?.blocks?.length
      ? (() => {
          // Convert blocks to markdown string
          const markdownContent = doc.blocks.map(b => {
            const prefix = b.type === 'heading' ? '# '.repeat(b.level || 1) : ''
            return `${prefix}${b.text}`
          }).join('\n\n')

          // Convert markdown to HTML
          try {
            return marked.parse(markdownContent)
          } catch (error) {
            console.error('Error parsing markdown:', error)
            return markdownContent
          }
        })()
      : initialContent,
    editable: !readOnly,
    onCreate: ({ editor }) => {
      // Sync block IDs from document to TipTap nodes
      syncBlockIdsFromDoc(editor, doc)
    },
    onUpdate: ({ editor }) => {
      updateSelectionInfo(editor)
      if (!readOnly) {
        debouncedPersist(editor)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      updateSelectionInfo(editor)
    },
  })

  // React to readOnly prop changes after initialization
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  // Debounce helper
  let persistTimeout
  const debouncedPersist = (editor) => {
    clearTimeout(persistTimeout)
    persistTimeout = setTimeout(() => persistEditor(editor), 400)
  }

  const extractBlocksFromEditor = (editor) => {
    const blocks = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        // Convert HTML node back to markdown text
        let text = ''
        if (node.type.name === 'heading') {
          const level = node.attrs.level || 1
          text = '#'.repeat(level) + ' ' + node.textContent
        } else {
          // For paragraphs, we need to convert HTML back to markdown
          // This is a simplified approach - in practice you might want more sophisticated conversion
          text = node.textContent || ''
        }
        
        const id = node.attrs.blockId || `p_${Date.now()}_${Math.random().toString(36).substr(2,9)}`
        const block = { id, type: node.type.name === 'heading' ? 'heading' : 'paragraph', level: node.attrs.level, text }
        blocks.push(block)
      }
    })
    return blocks
  }

  const persistEditor = async (editor) => {
    try {
      if (!docId) return
      const blocks = extractBlocksFromEditor(editor)
      await updateDocument(docId, blocks)
    } catch (e) {
      console.error('Failed to save document:', e)
    }
  }

  const syncBlockIdsFromDoc = (editor, doc) => {
    if (!editor) return
    if (!doc?.blocks?.length) return

    let modified = false
    const { doc: editorDoc } = editor.state
    const tr = editor.state.tr
    let docBlockIndex = 0

    editorDoc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        const docBlock = doc.blocks[docBlockIndex]
        if (docBlock && docBlock.id) {
          // Use the document's block ID
          tr.setNodeMarkup(pos, null, { ...node.attrs, blockId: docBlock.id })
          modified = true
        }
        docBlockIndex++
      }
    })

    if (modified) {
      editor.view.dispatch(tr)
    }
  }

  // Save on unmount/navigation
  useEffect(() => {
    return () => {
      if (editor && !readOnly) {
        try { persistEditor(editor) } catch {}
      }
    }
  }, [editor, readOnly])

  const updateSelectionInfo = (editor) => {
    if (!editor) return

    const { from, to, empty } = editor.state.selection
    
    if (empty) {
      setSelectionInfo(null)
      setShowReplaceButton(false)
      emitSelectionChange(null)
      return
    }

    // Find the block containing the selection
    const { doc } = editor.state
    let blockId = null
    let blockPos = null

    doc.nodesBetween(from, to, (node, pos) => {
      if (!blockId && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
        blockId = node.attrs.blockId
        blockPos = pos
      }
    })

    if (blockId && blockPos !== null) {
      const charOffsetStart = from - blockPos - 1
      const charOffsetEnd = to - blockPos - 1
      const selectedText = editor.state.doc.textBetween(from, to, ' ')
      
      const selInfo = {
        blockId,
        from: charOffsetStart,
        to: charOffsetEnd,
        text: selectedText
      }
      
      setSelectionInfo(selInfo)
      setShowReplaceButton(true)
      
      // Emit selection for AI Actions using the current document's block IDs
      emitSelectionChange({
        blockId,
        start: charOffsetStart,
        end: charOffsetEnd,
        text: selectedText,
      })
    }
  }

  // Sync block IDs when document changes
  useEffect(() => {
    if (editor && doc) {
      syncBlockIdsFromDoc(editor, doc)
    }
  }, [editor, doc])

  const handleMouseMove = (e) => {
    if (!editor) return

    const target = e.target.closest('.ProseMirror [data-block-id]')
    if (target) {
      const blockId = target.getAttribute('data-block-id')
      setHoveredBlock(blockId)
    } else {
      setHoveredBlock(null)
    }
  }

  const handleApplyReplace = () => {
    if (!editor || !selectionInfo) return

    const { from, to } = editor.state.selection
    const replacementText = `[REPLACED: ${selectionInfo.text}]`
    
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .insertContent(replacementText)
      .run()

    setSelectionInfo(null)
    setShowReplaceButton(false)
  }

  const handleReplaceBlock = () => {
    if (!editor || !selectionInfo) return

    const { doc } = editor.state
    let targetPos = null
    let targetNode = null

    doc.descendants((node, pos) => {
      if (node.attrs.blockId === selectionInfo.blockId) {
        targetPos = pos
        targetNode = node
        return false
      }
    })

    if (targetPos !== null && targetNode) {
      const from = targetPos
      const to = targetPos + targetNode.nodeSize
      
      editor
        .chain()
        .focus()
        .setTextSelection({ from: from + 1, to: to - 1 })
        .insertContent(`[BLOCK REPLACED: Original content was in block ${selectionInfo.blockId}]`)
        .run()

      setSelectionInfo(null)
      setShowReplaceButton(false)
    }
  }

  useEffect(() => {
    const editorElement = document.querySelector('.ProseMirror')
    if (editorElement) {
      editorElement.addEventListener('mousemove', handleMouseMove)
      return () => {
        editorElement.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [editor])

  if (!editor) {
    return <div className="flex items-center justify-center h-full">Loading editor...</div>
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Editor Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {readOnly ? '📖 Read-Only Mode' : '✏️ Edit Mode'}
        </div>
        {!readOnly && showReplaceButton && selectionInfo && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleApplyReplace}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Apply Replace
            </button>
            <button
              onClick={handleReplaceBlock}
              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              Replace Block
            </button>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative min-w-0">
        <style>{`
          .ProseMirror [data-block-id] {
            position: relative;
            padding-left: 24px;
          }
          
          .ProseMirror [data-block-id]:hover::before {
            content: '¶';
            position: absolute;
            left: 4px;
            color: #9ca3af;
            font-size: 14px;
            opacity: 0.6;
            cursor: pointer;
          }

          .ProseMirror [data-block-id].hovered::before {
            opacity: 1;
            color: #3b82f6;
          }

          .ProseMirror p {
            margin: 1em 0;
          }

          .ProseMirror h1 {
            font-size: 2.25em;
            font-weight: bold;
            margin: 0.67em 0;
          }

          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.83em 0;
          }

          .ProseMirror h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin: 1em 0;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      {/* Selection Info Status Bar */}
      {selectionInfo && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 dark:text-gray-400">Block ID:</span>
            <span className="text-blue-600 dark:text-blue-400">{selectionInfo.blockId}</span>
            <span className="text-gray-600 dark:text-gray-400">Offsets:</span>
            <span className="text-green-600 dark:text-green-400">
              {selectionInfo.from} - {selectionInfo.to}
            </span>
            <span className="text-gray-600 dark:text-gray-400">Selected:</span>
            <span className="text-purple-600 dark:text-purple-400 truncate max-w-xs">
              "{selectionInfo.text}"
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default forwardRef(TipTapEditorComponent)

