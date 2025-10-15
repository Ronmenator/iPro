import React, { useState, useRef, useEffect } from 'react';
import { useBookStore } from '../store/bookStore';
import { getCurrentAIProvider } from '../ai/providers';
import { getResearchAITools, executeResearchToolCall } from '../ai/researchTools';
import { getBookAccessAITools, executeBookAccessToolCall } from '../ai/bookAccessTools';
import { useConversation } from '../context/ConversationContext';

interface ResearchChatProps {
  onResearchUpdate: (entry: { title: string; content: string; source: string; tags: string[] }) => void;
  currentSceneId?: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  researchData?: any;
}

export default function ResearchChat({ onResearchUpdate, currentSceneId }: ResearchChatProps) {
  const { book } = useBookStore();
  const {
    messages,
    isLoading: contextLoading,
    activeChatMode,
    setActiveChatMode,
    addMessage,
    clearCurrentConversation,
    getConversationHistory
  } = useConversation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set active chat mode for research on mount
  useEffect(() => {
    setActiveChatMode('research'); // Set research mode
  }, []); // Only run once on mount

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, contextLoading]);

  const addLocalMessage = (role: 'user' | 'assistant', content: string, researchData?: any) => {
    // Also maintain local ChatMessage for UI display if needed
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
      researchData,
    };
    // Note: We'll use the shared context for display instead
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to shared conversation
    await addMessage({
      role: 'user',
      content: userMessage,
      source: 'research',
      researchData: undefined, // User messages don't have research data
    });

    setIsLoading(true);

    try {
      if (!book?.settings) {
        throw new Error('Book settings not configured');
      }

      const aiProvider = getCurrentAIProvider(book.settings);
      if (!aiProvider) {
        throw new Error('AI provider not configured');
      }

      // Build context for the AI
      const systemPrompt = `You are an AI research assistant helping with a fiction book. You can help with:

1. **Character Research**: Find information about character types, personalities, backgrounds
2. **Setting Research**: Research locations, time periods, cultures, environments
3. **Plot Research**: Research story structures, genres, themes, tropes
4. **Technical Research**: Research specific topics, professions, technologies, historical events
5. **Writing Research**: Research writing techniques, styles, publishing information

**Available Tools:**
- **create_research_entry**: Create a research entry for the book with title, content, source, and tags
- **get_current_scene_content**: Get the content of the currently selected scene
- **get_scene_content**: Get the full content of a specific scene (requires sceneId)
- **get_scene_info**: Get basic information about a scene (title, goal, conflict, etc.)
- **expand_description**: Expand a description with more sensory details and immersive language
- **get_book_info**: Get basic information about the book including title, author, genre, and settings
- **get_chapter_list**: Get a list of all chapters with their basic information
- **get_chapter_content**: Get the full content of a specific chapter
- **replace_text**: Replace text in the currently selected scene

**Current Book Context:**
- Title: ${book?.title || 'Untitled'}
- Genre: ${book?.genre || 'Not specified'}
- Author: ${book?.author || 'Not specified'}

**Available Research Entries:**
${book?.research.map(entry => `- ${entry.title}: ${entry.content.substring(0, 100)}...`).join('\n') || 'No research entries yet'}

**Instructions:**
- When providing research, always offer to save valuable information as a research entry
- If the user confirms they want to save something, immediately use the create_research_entry tool
- After using the tool, confirm the action was completed
- If you have detailed research that would be useful to save, proactively suggest creating an entry and use the tool if appropriate`;

      // Build conversation history including previous messages from shared context
      let conversationMessages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Get recent conversation history (last 20 messages to avoid token limits)
      // This includes the user message we just added above
      const recentConversation = await getConversationHistory(undefined, 20, 'research'); // Research conversation

      console.log(`Recent conversation history (${recentConversation.length} messages):`);
      recentConversation.forEach((msg, idx) => {
        console.log(`${idx + 1}. [${msg.role}] ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });

      // Add conversation history (this already includes the current user message we just added to the DB)
      for (const msg of recentConversation) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // Tool calling loop - continue until AI doesn't want to use tools
      let maxIterations = 10; // Prevent infinite loops
      let iteration = 0;

      const availableTools = [...getResearchAITools(), ...getBookAccessAITools()];
      console.log('Starting research AI conversation with tools:', availableTools.map(t => t.function.name));
      console.log('Tool details:', JSON.stringify(availableTools, null, 2));

      while (iteration < maxIterations) {
        iteration++;
        console.log(`\n=== Research AI Iteration ${iteration} ===`);

        const tools = getResearchAITools();
        const request = {
          messages: conversationMessages,
          model: book.settings.aiModel || 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7,
          tools: tools,
          toolChoice: 'auto' as const,
        };

        console.log('Sending request to AI:', {
          model: request.model,
          toolCount: tools.length,
          tools: tools.map(t => t.function.name),
          toolChoice: request.toolChoice,
          messageCount: conversationMessages.length
        });

        const response = await aiProvider.generateWithTools(request, book.settings);

        console.log('Research AI Response:', {
          content: response.content,
          toolCalls: response.toolCalls,
          finishReason: response.finishReason
        });

        // Check if the response contains tool calls
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log(`Found ${response.toolCalls.length} tool calls:`, response.toolCalls);

          // Add AI response with tool calls to conversation
          conversationMessages.push({
            role: 'assistant',
            content: response.content,
            tool_calls: response.toolCalls
          });

          // Execute tool calls
          for (const toolCall of response.toolCalls) {
            console.log('Processing research tool call:', toolCall);

            // Convert API tool call format to our expected format
            let toolCallData;
            if (toolCall.function) {
              toolCallData = {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              };
            } else if (toolCall.type === 'tool_use') {
              toolCallData = {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.input)
              };
            } else {
              console.log('Unknown tool call format:', toolCall);
              continue;
            }

            console.log('Research tool call data:', toolCallData);

            // Try research tools first, then book access tools
            let result = await executeResearchToolCall(toolCallData);
            console.log('Research tool result:', result);

            if (!result.success) {
              result = await executeBookAccessToolCall(toolCallData);
              console.log('Book access tool result:', result);
            }

            // Add tool result to conversation for next iteration
            const toolCallId = toolCall.id || `call_${Date.now()}`;
            conversationMessages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCallId,
            });

            console.log('Added research tool result to conversation');
            const toolName = toolCall.function?.name || toolCall.name || 'unknown';
            await addMessage({
              role: 'assistant',
              content: `Executed tool: ${toolName}. ${result.message}`,
              source: 'research',
              researchData: undefined,
            });
          }
        } else {
          // No tool calls, show the final response and break the loop
          console.log('No tool calls found, ending research conversation');
          await addMessage({
            role: 'assistant',
            content: response.content,
            source: 'research',
            researchData: undefined,
          });
          break;
        }
      }

      if (iteration >= maxIterations) {
        await addMessage({
          role: 'assistant',
          content: 'Reached maximum tool calling iterations. Please try a simpler request.',
          source: 'research',
          researchData: undefined,
        });
      }

    } catch (error) {
      await addMessage({
        role: 'assistant',
        content: `Error: ${error.message}`,
        source: 'research',
        researchData: undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateResearchEntry = async (title: string, content: string, source: string = 'AI Research', tags: string[] = []) => {
    try {
      // Use the book operations to add research as a scene
      const { book } = useBookStore.getState();
      if (book) {
        const { addResearchScene } = useBookStore.getState();
        await addResearchScene({ title, content, source, tags });
      }

      // Also call the original callback for backward compatibility
      onResearchUpdate({ title, content, source, tags });

      await addMessage({
        role: 'assistant',
        content: `Created research entry: "${title}"`,
        source: 'research',
        researchData: undefined,
      });
    } catch (error) {
      console.error('Failed to create research entry:', error);
      await addMessage({
        role: 'assistant',
        content: `Error creating research entry: ${error.message}`,
        source: 'research',
        researchData: undefined,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Research Assistant
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Research topics for your book
            </p>
          </div>
          <button
            onClick={() => clearCurrentConversation()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Clear research conversation"
          >
            New
          </button>
        </div>
      </div>

      {/* Research Entries */}
      {book?.research && book.research.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Saved Research ({book.research.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {book.research.map((entry) => (
              <div
                key={entry.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {entry.title}
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  {entry.content.substring(0, 100)}...
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {entry.tags.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {contextLoading || activeChatMode !== 'research' ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading research conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Start researching topics for your book.</p>
            <p className="text-sm mt-2">
              Try asking things like:
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• "Research medieval sword fighting techniques"</li>
              <li>• "Find information about 1920s New York"</li>
              <li>• "Research character archetypes for fantasy"</li>
              <li>• "Look up information about space travel"</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
                {message.researchData && (
                  <button
                    onClick={() => handleCreateResearchEntry(
                      message.researchData.title,
                      message.researchData.content,
                      message.researchData.source,
                      message.researchData.tags
                    )}
                    className="mt-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Save as Research Entry
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg break-words">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">Researching...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about research topics..."
            disabled={isLoading}
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
