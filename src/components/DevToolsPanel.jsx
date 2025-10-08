import { useState, useEffect } from 'react'

export default function DevToolsPanel({ isOpen, onToggle }) {
  const [blockIds, setBlockIds] = useState([])

  useEffect(() => {
    const interval = setInterval(() => {
      const blocks = document.querySelectorAll('.ProseMirror [data-block-id]')
      const ids = Array.from(blocks).map(block => ({
        id: block.getAttribute('data-block-id'),
        tag: block.tagName.toLowerCase(),
        text: block.textContent.slice(0, 50) + (block.textContent.length > 50 ? '...' : ''),
      }))
      setBlockIds(ids)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="font-semibold text-sm">Block IDs</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">({blockIds.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {blockIds.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No blocks found. Select a scene or chapter.
          </div>
        ) : (
          blockIds.map((block, idx) => (
            <div
              key={idx}
              className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-xs font-mono"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{block.tag}</span>
                <span className="text-gray-400">→</span>
                <span className="text-green-600 dark:text-green-400 truncate">{block.id}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400 truncate">
                {block.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        💡 Tip: Open browser DevTools to see HTML comments
      </div>
    </div>
  )
}

