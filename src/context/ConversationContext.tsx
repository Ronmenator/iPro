import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBookStore } from '../store/bookStore';
import { conversationDB, ConversationMessage as DBConversationMessage } from '../services/conversationDatabase';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  source?: 'general' | 'research' | 'scene' | 'chapter';
  toolCalls?: any[];
  toolCallId?: string;
  researchData?: any; // For research-specific UI data
}

interface ConversationContextType {
  currentBookId: string | null;
  currentSceneId: string | null;
  currentConversationType: 'scene' | 'research' | 'general';
  activeChatMode: 'scene' | 'research' | 'general' | null;
  messages: ConversationMessage[];
  conversationId: string | null;
  isLoading: boolean;
  isDBReady: boolean;

  // Chat mode management
  setActiveChatMode: (mode: 'scene' | 'research' | 'general', sceneId?: string) => Promise<void>;

  // Message management
  addMessage: (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => Promise<void>;
  clearCurrentConversation: () => Promise<void>;

  // Conversation management
  loadConversation: (sceneId?: string, type?: 'scene' | 'research' | 'general') => Promise<void>;
  getConversationHistory: (sceneId?: string, maxMessages?: number, type?: 'scene' | 'research' | 'general') => Promise<ConversationMessage[]>;
  deleteConversation: (sceneId?: string, type?: 'scene' | 'research' | 'general') => Promise<void>;

  // Research management
  getResearchConversations: () => Promise<ConversationMessage[]>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { book } = useBookStore();
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [currentConversationType, setCurrentConversationType] = useState<'scene' | 'research' | 'general'>('scene');
  const [activeChatMode, setActiveChatModeState] = useState<'scene' | 'research' | 'general' | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isDBReady, setIsDBReady] = useState(false);

  // Initialize database
  useEffect(() => {
    const initDB = async () => {
      try {
        await conversationDB.open();
        setIsDBReady(true);
        console.log('Conversation database initialized');
      } catch (error) {
        console.error('Failed to initialize conversation database:', error);
      }
    };
    initDB();
  }, []);

  // Update current book when book changes
  useEffect(() => {
    if (book?.id && book.id !== currentBookId) {
      setCurrentBookId(book.id);
      // Only load conversation if we have a scene or if we're in research mode
      if (currentSceneId || currentConversationType === 'research') {
        loadConversation(currentSceneId, currentConversationType);
      }
    }
  }, [book?.id, currentSceneId, currentConversationType]);

  // Convert DB messages to UI messages
  const convertDBMessageToUIMessage = (dbMessage: DBConversationMessage): ConversationMessage => ({
    id: dbMessage.id?.toString() || Date.now().toString(),
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: dbMessage.timestamp,
    source: dbMessage.source,
    toolCalls: dbMessage.toolCalls,
    toolCallId: dbMessage.toolCallId,
    researchData: dbMessage.researchData,
  });

  const loadConversation = async (sceneId?: string, type: 'scene' | 'research' | 'general' = 'scene') => {
    if (!book?.id) {
      console.log('Cannot load conversation: no book loaded');
      return;
    }

    if (!isDBReady) {
      console.log('Cannot load conversation: database not ready');
      return;
    }

    console.log(`Loading conversation: ${type}${sceneId ? ` for scene ${sceneId}` : ''}`);

    setIsLoading(true);
    try {
      const convId = await conversationDB.getOrCreateConversation(book.id, sceneId, type);
      console.log(`Loaded conversation ID: ${convId}`);

      setConversationId(convId);
      setCurrentSceneId(sceneId || null);
      setCurrentConversationType(type);

      const dbMessages = await conversationDB.getMessages(convId);
      const uiMessages = dbMessages.map(convertDBMessageToUIMessage);

      console.log(`Loaded ${uiMessages.length} messages for conversation`);
      setMessages(uiMessages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = async (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    if (!isDBReady) {
      console.log('Cannot add message: database not ready');
      return;
    }

    if (!conversationId) {
      await loadConversation(currentSceneId, currentConversationType);
      if (!conversationId) return;
    }

    try {
      // Add to database
      await conversationDB.addMessage(conversationId, message);

      // Add to UI state
      const newMessage: ConversationMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Failed to add message:', error);
    }
  };

  const clearCurrentConversation = async () => {
    if (!conversationId || !isDBReady) return;

    try {
      await conversationDB.clearConversation(conversationId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  const getConversationHistory = async (sceneId?: string, maxMessages?: number, type: 'scene' | 'research' | 'general' = 'scene'): Promise<ConversationMessage[]> => {
    if (!book?.id || !isDBReady) return [];

    try {
      const convId = await conversationDB.getOrCreateConversation(book.id, sceneId, type);
      const dbMessages = await conversationDB.getMessages(convId, maxMessages);
      return dbMessages.map(convertDBMessageToUIMessage);
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  };

  const deleteConversation = async (sceneId?: string, type: 'scene' | 'research' | 'general' = 'scene') => {
    if (!book?.id || !isDBReady) return;

    try {
      await conversationDB.deleteConversation(book.id, sceneId, type);
      if (sceneId === currentSceneId && type === currentConversationType) {
        setMessages([]);
        setConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const getResearchConversations = async (): Promise<ConversationMessage[]> => {
    return await getConversationHistory(undefined, 50, 'research'); // Get last 50 research messages
  };

  const setActiveChatMode = async (mode: 'scene' | 'research' | 'general', sceneId?: string) => {
    if (!book?.id) {
      console.log('Cannot set active chat mode: no book loaded');
      return;
    }

    if (!isDBReady) {
      console.log('Cannot set active chat mode: database not ready');
      return;
    }

    // Prevent multiple simultaneous mode changes
    if (isLoadingConversation) {
      console.log('Already setting chat mode, skipping...');
      return;
    }

    console.log(`Setting active chat mode: ${mode}${sceneId ? ` for scene ${sceneId}` : ''}`);

    setIsLoadingConversation(true);
    setActiveChatModeState(mode);
    setCurrentSceneId(sceneId || null);
    setCurrentConversationType(mode);

    try {
      // Load the appropriate conversation
      await loadConversation(sceneId, mode);
      console.log(`Active chat mode set to: ${mode}`);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  return (
    <ConversationContext.Provider value={{
      currentBookId,
      currentSceneId,
      currentConversationType,
      activeChatMode,
      messages,
      conversationId,
      isLoading,
      isDBReady,
      setActiveChatMode,
      addMessage,
      clearCurrentConversation,
      loadConversation,
      getConversationHistory,
      deleteConversation,
      getResearchConversations,
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}
