import React, { useState, useEffect } from 'react';
import { 
  ResearchItem, 
  ResearchType,
  createResearchItem,
  createResearchSource
} from '../types/research';
import { useResearchStore } from '../store/researchStore';
import { useChatStore } from '../store/chatStore';
import { useDocumentStore } from '../store/documentStore';
import { getLLMClient } from '../ai/providers';

interface AIResearchPanelProps {
  currentDocId?: string;
}

export default function AIResearchPanel({ currentDocId }: AIResearchPanelProps) {
  const [researchQuery, setResearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);

  const {
    addResearchItem,
    addResearchQuery,
    getResearchStats
  } = useResearchStore();

  const {
    createDocument
  } = useDocumentStore();

  const {
    messages,
    sendMessage,
    isLoading,
    clearMessages
  } = useChatStore();

  const stats = getResearchStats();

  // Initialize chat store
  useEffect(() => {
    // Initialize the chat store if needed
    const initChat = async () => {
      try {
        // Chat store is already initialized in RightSidebar
        // No additional initialization needed here
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    initChat();
  }, []);

  const handleResearchQuery = async () => {
    if (!researchQuery.trim()) return;

    setIsResearching(true);
    try {
      // Send the research query to the AI
      await sendMessage({
        content: `Please research: ${researchQuery}`,
        role: 'user'
      });

      // Save the research query
      await addResearchQuery({
        query: researchQuery,
        timestamp: Date.now(),
        results: [],
        aiGenerated: true,
        context: currentDocId ? `Document: ${currentDocId}` : undefined
      });

    } catch (error) {
      console.error('Research failed:', error);
    } finally {
      setIsResearching(false);
    }
  };

  const handleSaveAsResearchDocument = async (content: string, title: string) => {
    try {
      // Generate a meaningful two-word name using AI
      let meaningfulTitle = title;
      try {
        const llm = getLLMClient();
        if (llm) {
          const response = await llm([
            {
              role: 'system',
              content: 'You are a helpful assistant that creates concise, meaningful titles for research documents. Given the content of a research document, generate a two-word title that captures the main topic or subject. Return ONLY the two words, separated by a space, with no additional text or punctuation.'
            },
            {
              role: 'user',
              content: `Please create a two-word title for this research document:\n\n${content.substring(0, 1000)}...`
            }
          ]);
          
          if (response && typeof response === 'string') {
            const words = response.trim().split(/\s+/);
            if (words.length >= 2) {
              meaningfulTitle = words.slice(0, 2).join(' ');
            }
          }
        }
      } catch (aiError) {
        console.warn('Failed to generate AI title, using fallback:', aiError);
        // Fallback to a simplified version of the original title
        const words = title.split(/\s+/).slice(0, 2);
        meaningfulTitle = words.join(' ');
      }

      // Create a new research document
      const docId = `research-${Date.now()}`;
      const blocks = [
        {
          id: 'block-1',
          text: content,
          type: 'paragraph',
          level: 0,
          created: Date.now(),
          modified: Date.now()
        }
      ];

      await createDocument(docId, meaningfulTitle, blocks);
      
      // Also save as research item
      const researchSource = createResearchSource(
        'ai',
        'AI Research Assistant',
        undefined,
        undefined,
        0.9
      );

      const researchItem = createResearchItem(
        meaningfulTitle,
        'reference',
        content,
        researchSource,
        ['ai-generated', 'research-document']
      );

      await addResearchItem(researchItem);

      console.log('Research document created:', docId);
    } catch (error) {
      console.error('Failed to save research document:', error);
    }
  };


  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          🤖 AI Research Assistant
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Conversational research powered by AI
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-4xl mb-4">🤖</div>
              <p>Start a conversation with your AI research assistant!</p>
              <p className="text-sm mt-2">Ask me to research anything for your book.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 group ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</div>
                  {message.role === 'assistant' && message.toolCalls && (
                    <div className="mt-2 space-y-2">
                      {message.toolCalls.map((toolCall, index) => (
                        <div key={index} className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded break-words overflow-wrap-anywhere">
                          <strong>{toolCall.name}:</strong> {JSON.stringify(toolCall.arguments)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Save as Research Document Button */}
                  {message.role === 'assistant' && message.content && (
                    <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const title = message.content.split('\n')[0].replace(/[#*]/g, '').trim() || 'Research Document';
                          handleSaveAsResearchDocument(message.content, title);
                        }}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                        title="Save as Research Document"
                      >
                        📄 Save as Research Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder="Ask me to research something..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              onKeyPress={(e) => e.key === 'Enter' && !isResearching && handleResearchQuery()}
            />
            <button
              onClick={handleResearchQuery}
              disabled={isResearching || !researchQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-md transition-colors"
              title={isResearching ? 'Researching...' : 'Send message'}
            >
              {isResearching ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
            <button
              onClick={clearMessages}
              className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-md transition-colors"
              title="Clear conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
