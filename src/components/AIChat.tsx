import React, { useState, useRef, useEffect } from 'react';
import { useBookStore } from '../store/bookStore';
import { getCurrentAIProvider } from '../ai/providers';
import { getAITools, executeToolCall } from '../ai/chatTools';
import { getBookAccessAITools, executeBookAccessToolCall } from '../ai/bookAccessTools';
import { useConversation } from '../context/ConversationContext';
import { conversationDB } from '../services/conversationDatabase';

interface AIChatProps {
  currentSceneId: string | null;
  onSceneUpdate: (sceneId: string, updates: any) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: any[];
}

export default function AIChat({ currentSceneId, onSceneUpdate }: AIChatProps) {
  const { getSceneById } = useBookStore();
  const {
    currentSceneId: contextSceneId,
    messages,
    isLoading: contextLoading,
    activeChatMode,
    isDBReady,
    setActiveChatMode,
    addMessage,
    clearCurrentConversation,
    getConversationHistory
  } = useConversation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set active chat mode when scene changes
  useEffect(() => {
    if (currentSceneId && isDBReady) {
      setActiveChatMode('scene', currentSceneId);
    }
  }, [currentSceneId, isDBReady]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, contextLoading]);

  const addLocalMessage = (role: 'user' | 'assistant', content: string, toolCalls?: any[]) => {
    // Also maintain local ChatMessage for UI display if needed
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
      toolCalls,
    };
    // Note: We'll use the shared context for display instead
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentSceneId) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to shared conversation
    await addMessage({
      role: 'user',
      content: userMessage,
      source: 'scene',
    });

    setIsLoading(true);

    try {
      const { book } = useBookStore.getState();
      if (!book?.settings) {
        throw new Error('Book settings not found');
      }
      
      const aiProvider = getCurrentAIProvider(book.settings);
      if (!aiProvider) {
        throw new Error('AI provider not configured');
      }

      const scene = getSceneById(currentSceneId);
      if (!scene) {
        throw new Error('Scene not found');
      }

      // Build context for the AI
      const systemPrompt = `You are an AI writing assistant helping with a fiction book. You have access to tools that allow you to edit text directly and access information about the entire book.

**Current Scene:**
- Title: ${scene.title}
- Goal: ${scene.goal || 'Not specified'}
- Conflict: ${scene.conflict || 'Not specified'}
- Outcome: ${scene.outcome || 'Not specified'}
- Location: ${scene.location || 'Not specified'}
- Time: ${scene.time || 'Not specified'}
- Clock: ${scene.clock || 'Not specified'}
- Crucible: ${scene.crucible || 'Not specified'}
- POV: ${scene.pov || 'Not specified'}
- Current Content: ${scene.content.substring(0, 1000)}${scene.content.length > 1000 ? '...' : ''}

**Available Text Editing Tools:**
- replace_text: Replace a specific range of text
- insert_text: Insert text at a specific position
- add_paragraph: Add a new paragraph
- rewrite_sentence: Rewrite a specific sentence
- improve_tone: Improve the tone of a section
- expand_description: Expand a description with more detail
- add_dialogue: Add dialogue between characters
- get_scene_info: Get detailed scene information

**Available Book Access Tools:**
- get_book_info: Get basic information about the book
- get_chapter_list: Get a list of all chapters
- get_chapter_content: Get the full content of a specific chapter
- get_scene_content: Get the full content of a specific scene
- get_chapters_by_numbers: Get content for specific chapters by numbers (e.g., [1, 2])
- get_scene_summary: Get a summary of a scene
- get_chapter_summary: Get a summary of a chapter
- search_scenes: Search for scenes by various criteria
- get_book_statistics: Get comprehensive book statistics

Use these tools to help the user with their book. You can access any chapter or scene in the book to provide comprehensive analysis and feedback. Always explain what you're doing and why.`;

      // Build conversation history including previous messages from shared context
      let conversationMessages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Get recent conversation history (last 20 messages to avoid token limits)
      // This includes the user message we just added above
      const recentConversation = await getConversationHistory(currentSceneId, 20, 'scene');

      console.log(`AI Chat - Recent conversation history (${recentConversation.length} messages):`);
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

      console.log('Starting AI conversation with tools:', [...getAITools(), ...getBookAccessAITools()]);

      while (iteration < maxIterations) {
        iteration++;
        console.log(`\n=== AI Iteration ${iteration} ===`);

        const response = await aiProvider.generateWithTools({
          messages: conversationMessages,
          model: book.settings.aiModel || 'gpt-4',
          maxTokens: 2000,
          temperature: 0.7,
          tools: [...getAITools(), ...getBookAccessAITools()],
          toolChoice: 'auto',
        }, book.settings);

        console.log('AI Response:', {
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
            console.log('Processing tool call:', toolCall);
            
            // Convert API tool call format to our expected format
            // Handle different formats from different providers
            let toolCallData;
            if (toolCall.function) {
              // OpenAI/Azure format
              toolCallData = {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              };
            } else if (toolCall.type === 'tool_use') {
              // Anthropic format
              toolCallData = {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.input)
              };
            } else {
              console.log('Unknown tool call format:', toolCall);
              continue;
            }
            
            console.log('Tool call data:', toolCallData);
            
            // Try text editing tools first, then book access tools
            let result = await executeToolCall(toolCallData);
            console.log('Text editing tool result:', result);
            
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
            
            console.log('Added tool result to conversation');
            const toolName = toolCall.function?.name || toolCall.name || 'unknown';
            await addMessage({
              role: 'assistant',
              content: `Executed tool: ${toolName}. ${result.message}`,
              source: currentSceneId ? 'scene' : 'general',
            });
          }
        } else {
          // No tool calls, show the final response and break the loop
          console.log('No tool calls found, ending conversation');
          await addMessage({
            role: 'assistant',
            content: response.content,
            source: currentSceneId ? 'scene' : 'general',
          });
          break;
        }
      }

      if (iteration >= maxIterations) {
        await addMessage({
          role: 'assistant',
          content: 'Reached maximum tool calling iterations. Please try a simpler request.',
          source: currentSceneId ? 'scene' : 'general',
        });
      }

    } catch (error) {
      await addMessage({
        role: 'assistant',
        content: `Error: ${error.message}`,
        source: currentSceneId ? 'scene' : 'general',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = async () => {
    if (currentSceneId) {
      await clearCurrentConversation();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Writing Assistant
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentSceneId ? 'Ready to help with your scene' : 'Select a scene to get started'}
            </p>
          </div>
          <button
            onClick={handleNewConversation}
            disabled={!currentSceneId}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={currentSceneId ? 'Clear current scene conversation' : 'Select a scene first'}
          >
            New
          </button>
        </div>
      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {contextLoading || activeChatMode !== 'scene' ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Start a conversation with the AI assistant.</p>
            <p className="text-sm mt-2">
              Try asking things like:
            </p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• "Evaluate chapter 1 and 2"</li>
              <li>• "Improve the tone of this paragraph"</li>
              <li>• "Show me all scenes in chapter 3"</li>
              <li>• "Find scenes with dialogue between John and Mary"</li>
              <li>• "Give me book statistics"</li>
              <li>• "Expand this description"</li>
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed height */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentSceneId ? "Ask the AI to help with your scene..." : "Select a scene first"}
            disabled={!currentSceneId || isLoading}
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || !currentSceneId || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
