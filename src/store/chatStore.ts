import { create } from 'zustand';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Chat message interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  hasPreview?: boolean;
  preview?: string;
  batch?: any;
  toolCalls?: Array<{
    name: string;
    arguments: any;
    result?: any;
  }>;
}

// Chat conversation interface
export interface ChatConversation {
  structureItemId: string; // scene-01, chapter-01, etc.
  messages: ChatMessage[];
  lastModified: number;
}

// IndexedDB Schema
interface ChatDB extends DBSchema {
  conversations: {
    key: string; // structureItemId
    value: ChatConversation;
  };
}

// Zustand Store
interface ChatStore {
  conversations: Map<string, ChatConversation>;
  currentStructureItemId: string | null;
  db: IDBPDatabase<ChatDB> | null;
  messages: ChatMessage[];
  isLoading: boolean;
  
  // Actions
  initDB: () => Promise<void>;
  setCurrentStructureItem: (structureItemId: string) => void;
  getCurrentConversation: () => ChatConversation | null;
  addMessage: (message: ChatMessage) => void;
  sendMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearCurrentConversation: () => void;
  saveConversation: (conversation: ChatConversation) => Promise<void>;
  loadConversation: (structureItemId: string) => Promise<ChatConversation | null>;
  clearMessages: () => void;
}

const DB_NAME = 'MondayChatDB';
const DB_VERSION = 1;

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: new Map(),
  currentStructureItemId: null,
  db: null,
  messages: [],
  isLoading: false,

  initDB: async () => {
    const db = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'structureItemId' });
        }
      },
    });
    set({ db });
  },

  setCurrentStructureItem: (structureItemId: string) => {
    set({ currentStructureItemId: structureItemId });
    
    // Load conversation for this structure item if not already loaded
    const { conversations, loadConversation } = get();
    if (!conversations.has(structureItemId)) {
      loadConversation(structureItemId);
    }
  },

  getCurrentConversation: () => {
    const { conversations, currentStructureItemId } = get();
    if (!currentStructureItemId) return null;
    return conversations.get(currentStructureItemId) || null;
  },

  addMessage: (message: ChatMessage) => {
    const { currentStructureItemId, conversations } = get();
    if (!currentStructureItemId) return;

    // Get or create conversation for current structure item
    let conversation = conversations.get(currentStructureItemId);
    if (!conversation) {
      conversation = {
        structureItemId: currentStructureItemId,
        messages: [],
        lastModified: Date.now(),
      };
    }

    // Add message to conversation
    conversation.messages.push(message);
    conversation.lastModified = Date.now();

    // Update store
    conversations.set(currentStructureItemId, conversation);
    set({ conversations: new Map(conversations) });

    // Save to IndexedDB
    get().saveConversation(conversation);
  },

  clearCurrentConversation: () => {
    const { currentStructureItemId, conversations } = get();
    if (!currentStructureItemId) return;

    // Create fresh conversation with just system message
    const freshConversation: ChatConversation = {
      structureItemId: currentStructureItemId,
      messages: [
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'system',
          content: 'AI Agent initialized - Ready to help with your writing',
          timestamp: new Date(),
        }
      ],
      lastModified: Date.now(),
    };

    // Update store
    conversations.set(currentStructureItemId, freshConversation);
    set({ conversations: new Map(conversations) });

    // Save to IndexedDB
    get().saveConversation(freshConversation);
  },

  saveConversation: async (conversation: ChatConversation) => {
    const { db } = get();
    if (!db) return;

    try {
      await db.put('conversations', conversation);
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  },

  loadConversation: async (structureItemId: string) => {
    const { db, conversations } = get();
    if (!db) return null;

    try {
      const conversation = await db.get('conversations', structureItemId);
      if (conversation) {
        // Convert timestamp strings back to Date objects
        conversation.messages = conversation.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));

        conversations.set(structureItemId, conversation);
        set({ conversations: new Map(conversations) });
        return conversation;
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }

    return null;
  },

  sendMessage: async (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const { messages } = get();
    
    // Add user message
    const userMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    set({ 
      messages: [...messages, userMessage],
      isLoading: true 
    });

    try {
      // Import AI components dynamically to avoid circular dependencies
      const { getLLMClient } = await import('../ai/providers');
      const { createAgentTools, getCurrentContext } = await import('../ai/agentTools');
      
      const llm = getLLMClient();
      if (!llm) {
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: 'AI is not configured. Please go to AI Settings and configure your OpenAI or Anthropic API key to use the research features.',
          timestamp: Date.now()
        };
        set({ 
          messages: [...messages, userMessage, errorMessage],
          isLoading: false 
        });
        return;
      }

      // Get current context
      const context = getCurrentContext();
      
      // Create agent tools (includes research tools)
      const tools = createAgentTools(llm, context);
      
      // Prepare messages for AI - include the current user message and recent conversation
      const recentMessages = messages.slice(-10); // Only use last 10 messages to avoid context issues
      const llmMessages = [
        { 
          role: 'system', 
          content: `You are an AI research assistant. You have access to web search tools including DuckDuckGo, Wikipedia, and URL content retrieval. 

IMPORTANT: Only respond to the current user query. Do not reference previous conversations or topics unless directly relevant to the current request.

When users ask for research, use the appropriate tools:
- Use 'duckduckgo_search' for general web searches
- Use 'wikipedia_search' for authoritative information on topics
- Use 'research_query' for comprehensive multi-source research
- Use 'get_url_content' to get detailed information from specific URLs

Always provide helpful, accurate information and cite your sources.` 
        },
        // Include the current user message first
        { role: 'user', content: userMessage.content },
        // Then include recent conversation history (excluding the current user message)
        ...recentMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .filter(m => m.id !== userMessage.id) // Exclude the current user message to avoid duplication
          .map(m => ({ role: m.role, content: m.content }))
      ];

      // Convert tools to OpenAI format
      const toolDefinitions = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      // Call LLM with tools
      console.log('Calling LLM with messages:', JSON.stringify(llmMessages, null, 2));
      console.log('Calling LLM with tools:', toolDefinitions.length, 'tools available');
      const response = await llm(llmMessages, toolDefinitions);
      console.log('LLM response:', response);

      if (typeof response === 'string') {
        // Simple text response
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        };
        set({ 
          messages: [...messages, userMessage, assistantMessage],
          isLoading: false 
        });
      } else if (response && response.function_call) {
        // Handle function calls
        let currentMessages = [...llmMessages];
        let currentResponse = response;
        let iteration = 0;
        const maxIterations = 5;
        
        while (currentResponse && currentResponse.function_call && iteration < maxIterations) {
          iteration++;
          
          const tool = tools.find(t => t.name === currentResponse.function_call.name);
          if (!tool) {
            throw new Error(`Unknown tool: ${currentResponse.function_call.name}`);
          }

          try {
            const params = JSON.parse(currentResponse.function_call.arguments);
            console.log(`Executing tool: ${currentResponse.function_call.name} with params:`, params);
            const result = await tool.handler(params);
            console.log(`Tool result:`, result);

            // Add tool call to conversation
            const toolCallId = 'call_' + Date.now() + '_' + iteration;
            const assistantMessage = {
              role: 'assistant',
              content: currentResponse.content || '',
              tool_calls: [{
                id: toolCallId,
                type: 'function',
                function: {
                  name: currentResponse.function_call.name,
                  arguments: currentResponse.function_call.arguments
                }
              }]
            };

            const toolMessage = {
              role: 'tool',
              tool_call_id: toolCallId,
              content: JSON.stringify(result)
            };

            console.log('Adding messages to conversation:', { assistantMessage, toolMessage });
            currentMessages.push(assistantMessage, toolMessage);

            // Get next response
            currentResponse = await llm(currentMessages, toolDefinitions);
          } catch (toolError) {
            console.error(`Tool execution error:`, toolError);
            break;
          }
        }

        // Final response
        const finalMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: typeof currentResponse === 'string' ? currentResponse : 'Research completed.',
          timestamp: Date.now()
        };
        
        set({ 
          messages: [...messages, userMessage, finalMessage],
          isLoading: false 
        });
      } else {
        // Fallback response
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: 'I apologize, but I encountered an issue processing your request. Please try again.',
          timestamp: Date.now()
        };
        set({ 
          messages: [...messages, userMessage, assistantMessage],
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process your request.'}`,
        timestamp: Date.now()
      };
      set({ 
        messages: [...messages, userMessage, errorMessage],
        isLoading: false 
      });
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
