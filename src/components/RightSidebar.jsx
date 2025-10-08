import { useState, useEffect } from 'react'
import { getLLMClient } from '../ai/providers'
import { createAgentTools, getCurrentContext } from '../ai/agentTools'
import AIActionsPanel from './AIActionsPanel'
import SceneBatchActionsPanel from './SceneBatchActionsPanel'
import AIResearchPanel from './AIResearchPanel'
import ThemeToggle from './ThemeToggle'
import { useDocumentStore } from '../store/documentStore'
import { useChatStore } from '../store/chatStore'
import { onSelectionChange } from '../utils/selectionTracker'

export default function RightSidebar({
  showLintSidebar,
  onToggleLintSidebar,
  onToggleDevTools,
  onToggleOperations,
  onToggleAISettings,
  onToggleFileIO,
  onToggleProjectManagement
}) {
  const [activeTab, setActiveTab] = useState('ai') // 'chat', 'ai', 'batch', or 'research'
  const [selection, setSelection] = useState(null)
  const currentDocId = useDocumentStore(state => state.currentDocId)
  
  // Chat store
  const {
    initDB: initChatDB,
    setCurrentStructureItem,
    getCurrentConversation,
    addMessage,
    clearCurrentConversation
  } = useChatStore()

  // Listen for selection changes
  useEffect(() => {
    const cleanup = onSelectionChange((newSelection) => {
      setSelection(newSelection)
    })
    return cleanup
  }, [])

  // Initialize chat DB and set current structure item
  useEffect(() => {
    initChatDB()
  }, [initChatDB])

  // Update current structure item when document changes
  useEffect(() => {
    if (currentDocId) {
      // Extract structure item ID from docId (e.g., "scene/scene-01" -> "scene-01")
      const structureItemId = currentDocId.replace(/^(scene|chapter)\//, '')
      setCurrentStructureItem(structureItemId)
    }
  }, [currentDocId, setCurrentStructureItem])

  // Get current conversation
  const currentConversation = getCurrentConversation()
  const messages = currentConversation?.messages || []

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [pendingBatch, setPendingBatch] = useState(null)
  const [agentMode, setAgentMode] = useState('agent') // 'agent' or 'discussion'

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isSending) return

    const userMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    addMessage(userMsg)
    setInput('')

    try {
      setIsSending(true)
      const llm = getLLMClient()
      console.log('Got LLM client:', llm)
      if (!llm) {
        throw new Error('AI is not configured. Please configure in AI Settings.')
      }

      // Test the LLM client
      try {
        const testResponse = await llm([{ role: 'user', content: 'test' }], [])
        console.log('Test response:', testResponse)
      } catch (testError) {
        console.error('Test error:', testError)
      }

      // Get current context
      const context = {
        ...getCurrentContext(),
        selection
      }

      // Create agent tools
      const tools = createAgentTools(llm, context)
      console.log('Created tools:', tools.map(t => t.name))
      const toolDefinitions = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
      console.log('Tool definitions:', toolDefinitions)

      // Check if user wants discussion mode
      const userInput = input.toLowerCase()
      const wantsDiscussion = userInput.includes('discuss') || 
                             userInput.includes('talk about') || 
                             userInput.includes('advice') ||
                             userInput.includes('what do you think')

      const system = `You are an AI writing agent integrated with a manuscript editor. You have access to tools to apply edits directly to the document or discuss ideas.

Current Context:
- Document: ${context.currentDoc?.title || 'None open'}
- Selection: ${context.selection ? `Block ${context.selection.blockId}, chars ${context.selection.start}-${context.selection.end}` : 'None'}
- Mode: ${agentMode}

IMPORTANT WORKFLOW:
1. For content generation requests (like "write the rest of the scene", "continue the story", "add dialogue"):
   - FIRST: Generate the actual content in your response
   - THEN: Use the apply_edit tool to apply that generated content to the document
   
2. For editing existing content (like "make this more dramatic", "fix grammar", "expand this paragraph"):
   - Use the apply_edit tool directly with the instruction
   
3. For discussion and advice (like "what do you think about this character", "discuss plot ideas"):
   - Use the discuss_changes tool

You can:
1. Apply edits directly to the document using apply_edit tool
2. Discuss ideas and provide advice using discuss_changes tool
3. Get context about the document using get_context tool

${wantsDiscussion ? 'The user wants to discuss ideas rather than apply changes. Use discuss_changes tool.' : 'The user wants to make changes. Use apply_edit tool when appropriate.'}

Always be helpful and proactive. When generating new content, write it first, then apply it. When editing existing content, use the tool directly.`

      const llmMessages = [
        { role: 'system', content: system },
        ...messages
          .filter(m => m.type === 'user' || m.type === 'assistant')
          .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))
      ]

      console.log('Sending to LLM:', { messages: llmMessages, tools: toolDefinitions })

      // Call LLM with tools
      const response = await llm(llmMessages, toolDefinitions)

      console.log('AI Response:', response) // Debug logging

      if (typeof response === 'string') {
        // Simple text response
        const aiResponse = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'assistant',
          content: response,
          timestamp: new Date()
        }
        addMessage(aiResponse)
      } else if (response && response.function_call) {
        // Function call response - we need to continue the conversation with proper looping
        let currentMessages = [...llmMessages]
        let currentResponse = response
        let iteration = 0
        const maxIterations = 10 // Prevent infinite loops
        
        while (currentResponse && currentResponse.function_call && iteration < maxIterations) {
          iteration++
          console.log(`Tool call iteration ${iteration}:`, currentResponse.function_call.name)
          
          const tool = tools.find(t => t.name === currentResponse.function_call.name)
          if (!tool) {
            throw new Error(`Unknown tool: ${currentResponse.function_call.name}`)
          }

          try {
            const params = JSON.parse(currentResponse.function_call.arguments)
            const result = await tool.handler(params)

            // Add the assistant's tool call to the conversation
            const assistantMessage = {
              role: 'assistant',
              content: currentResponse.content,
              tool_calls: [{
                id: 'call_' + Date.now() + '_' + iteration,
                type: 'function',
                function: {
                  name: currentResponse.function_call.name,
                  arguments: currentResponse.function_call.arguments
                }
              }]
            }

            // Add the tool response to the conversation
            const toolMessage = {
              role: 'tool',
              tool_call_id: 'call_' + Date.now() + '_' + iteration,
              content: JSON.stringify(result)
            }

            // Add messages to the conversation
            currentMessages.push(assistantMessage, toolMessage)

            // Handle special cases for apply_edit tool
            if (currentResponse.function_call.name === 'apply_edit' && result.success && result.batch) {
              console.log('apply_edit tool returned a batch, storing for application')
              setPendingBatch(result.batch)
              
              // Add a message showing the preview
              const previewMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'assistant',
                content: `I've prepared an edit for you. Here's what I'll change:\n\n${result.message}`,
                timestamp: new Date(),
                hasPreview: true,
                preview: result.preview,
                batch: result.batch
              }
              addMessage(previewMessage)
              
              // If this is the last tool call, we're done
              break
            }

            console.log(`Tool ${currentResponse.function_call.name} completed, getting next response...`)

            // Get the next response from the AI
            currentResponse = await llm(currentMessages, toolDefinitions)
            console.log(`Next AI response (iteration ${iteration}):`, currentResponse)

          } catch (toolError) {
            console.error(`Tool execution error in iteration ${iteration}:`, toolError)
            const errorResponse = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'assistant',
              content: `Error executing tool ${currentResponse.function_call.name}: ${toolError.message}`,
              timestamp: new Date()
            }
            addMessage(errorResponse)
            break
          }
        }

        if (iteration >= maxIterations) {
          console.warn('Reached maximum tool call iterations, stopping')
          const maxIterationsResponse = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant',
            content: "I've reached the maximum number of tool calls. Please try a simpler request.",
            timestamp: new Date()
          }
          addMessage(maxIterationsResponse)
        } else if (typeof currentResponse === 'string') {
          // AI returned a regular text response - we're done
          const aiResponse = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant',
            content: currentResponse,
            timestamp: new Date()
          }
          addMessage(aiResponse)
        } else if (currentResponse && currentResponse.function_call) {
          // This shouldn't happen if we're out of the loop, but handle it gracefully
          const aiResponse = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant',
            content: "I've completed the requested actions.",
            timestamp: new Date()
          }
          addMessage(aiResponse)
        }
      } else {
        // Handle unexpected response format
        console.error('Unexpected response format:', response)
        const fallbackResponse = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'assistant',
          content: "I'm sorry, I encountered an issue processing your request. Please try again.",
          timestamp: new Date()
        }
        addMessage(fallbackResponse)
      }
    } catch (err) {
      const errorResponse = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: `Error: ${err?.message || 'Failed to get response from AI provider.'}`,
        timestamp: new Date()
      }
      addMessage(errorResponse)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const handleApplyBatch = async (batch) => {
    try {
      const llm = getLLMClient()
      if (!llm) {
        throw new Error('AI is not configured')
      }

      const context = {
        ...getCurrentContext(),
        selection
      }

      const tools = createAgentTools(llm, context)
      const applyTool = tools.find(t => t.name === 'apply_batch_edit')
      
      if (!applyTool) {
        throw new Error('Apply tool not found')
      }

      const result = await applyTool.handler({ batch })
      
      if (result.success) {
        setPendingBatch(null)
        const successMsg = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'assistant',
          content: `✅ Edit applied successfully! ${result.message}`,
          timestamp: new Date()
        }
        addMessage(successMsg)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'assistant',
        content: `❌ Failed to apply edit: ${error.message}`,
        timestamp: new Date()
      }
      addMessage(errorMsg)
    }
  }

  const handleDiscardBatch = () => {
    setPendingBatch(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Action Buttons */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleProjectManagement}
              className="p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600"
              aria-label="Project Management"
              title="Manage Projects (Ctrl+P)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={onToggleFileIO}
              className="p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-green-600 hover:text-white dark:hover:bg-green-600"
              aria-label="File I/O"
              title="Export/Import"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            <button
              onClick={onToggleOperations}
              className="p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600"
              aria-label="Operations"
              title="Operations Panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            <button
              onClick={onToggleDevTools}
              className="p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-gray-600 hover:text-white dark:hover:bg-gray-600"
              aria-label="DevTools"
              title="Developer Tools"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleLintSidebar}
              className={`p-2 rounded-lg transition-colors ${
                showLintSidebar 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              aria-label="Toggle lint sidebar"
              title="Style Lints"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={onToggleAISettings}
              className="p-2 rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600"
              aria-label="AI Settings"
              title="AI Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'ai'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            ✨ Quick
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'batch'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            📚 Batch
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'chat'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors ${
              activeTab === 'research'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            🔍 Research
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'ai' ? (
        <AIActionsPanel 
          currentDocId={currentDocId}
          selection={selection}
        />
      ) : activeTab === 'batch' ? (
        <SceneBatchActionsPanel 
          currentDocId={currentDocId}
        />
      ) : activeTab === 'research' ? (
        <AIResearchPanel 
          currentDocId={currentDocId}
        />
      ) : activeTab === 'chat' ? (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map(message => (
          <div 
            key={message.id}
            className={`
              ${message.type === 'system' ? 'text-center' : ''}
            `}
          >
            {message.type === 'system' ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 inline-block">
                {message.content}
              </div>
            ) : (
              <div className={`
                ${message.type === 'user' ? 'ml-auto' : 'mr-auto'}
                max-w-[85%]
              `}>
                <div className={`
                  rounded-lg p-3
                  ${message.type === 'user' 
                    ? 'bg-blue-600 text-white ml-auto' 
                    : 'bg-gray-100 dark:bg-gray-800'
                  }
                `}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show preview if available */}
                  {message.hasPreview && message.preview && (
                    <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Preview:</div>
                      <div 
                        className="text-xs prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: message.preview }}
                      />
                    </div>
                  )}
                  
                  {/* Show action buttons if batch is available */}
                  {message.batch && (
                    <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3 flex gap-2">
                      <button
                        onClick={() => handleApplyBatch(message.batch)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                      >
                        Apply Edit
                      </button>
                      <button
                        onClick={() => handleDiscardBatch()}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                      >
                        Discard
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* System Events Stream Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>System ready</span>
          </div>
        </div>
      </div>

          {/* Mode Toggle and Clear Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Mode:</span>
                <button
                  onClick={() => setAgentMode('agent')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    agentMode === 'agent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  🤖 Agent
                </button>
                <button
                  onClick={() => setAgentMode('discussion')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    agentMode === 'discussion'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  💬 Discussion
                </button>
              </div>
              <button
                onClick={clearCurrentConversation}
                className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="Clear conversation for this scene/chapter"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={agentMode === 'agent' ? "Tell me what to edit..." : "Ask for advice or discuss ideas..."}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim() || isSending}
              >
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  )
}

