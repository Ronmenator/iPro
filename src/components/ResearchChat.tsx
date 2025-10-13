import React, { useState, useRef, useEffect } from 'react';
import { useBookStore } from '../store/bookStore';
import { getCurrentAIProvider } from '../ai/providers';

interface ResearchChatProps {
  onResearchUpdate: (entry: { title: string; content: string; source: string; tags: string[] }) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  researchData?: any;
}

export default function ResearchChat({ onResearchUpdate }: ResearchChatProps) {
  const { book } = useBookStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, researchData?: any) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
      researchData,
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    setIsLoading(true);

    try {
      const aiProvider = getCurrentAIProvider();
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

**Current Book Context:**
- Title: ${book?.title || 'Untitled'}
- Genre: ${book?.genre || 'Not specified'}
- Author: ${book?.author || 'Not specified'}

**Available Research Entries:**
${book?.research.map(entry => `- ${entry.title}: ${entry.content.substring(0, 100)}...`).join('\n') || 'No research entries yet'}

When the user asks for research, provide detailed, helpful information and suggest creating a research entry to save the information for future reference.`;

      const response = await aiProvider.generateText({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
      });

      addMessage('assistant', response.content);

    } catch (error) {
      addMessage('assistant', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateResearchEntry = (title: string, content: string, source: string = 'AI Research', tags: string[] = []) => {
    onResearchUpdate({ title, content, source, tags });
    addMessage('assistant', `Created research entry: "${title}"`);
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Research Assistant
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Research topics for your book
        </p>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
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
