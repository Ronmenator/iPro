import Dexie, { Table } from 'dexie';

export interface ConversationMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  source?: 'general' | 'research' | 'scene' | 'chapter';
  toolCalls?: any[];
  toolCallId?: string;
  researchData?: any;
}

export interface Conversation {
  id?: number;
  bookId: string;
  sceneId?: string; // undefined for research conversations
  type: 'scene' | 'research' | 'general';
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export class ConversationDatabase extends Dexie {
  conversations!: Table<Conversation>;
  messages!: Table<ConversationMessage>;

  constructor() {
    super('NovelWriterDB');

    this.version(2).stores({
      conversations: '++id, [bookId+sceneId+type], bookId, sceneId, type, createdAt, updatedAt',
      messages: '++id, conversationId, timestamp, role',
    });
  }

  // Conversation management
  async createConversation(bookId: string, sceneId?: string, type: 'scene' | 'research' | 'general' = 'scene'): Promise<string> {
    const conversationId = `${bookId}_${sceneId || 'research'}_${Date.now()}`;

    const conversation: Conversation = {
      bookId,
      sceneId,
      type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const id = await this.conversations.add(conversation);
    return conversationId;
  }

  async getConversation(bookId: string, sceneId?: string, type: 'scene' | 'research' | 'general' = 'scene'): Promise<Conversation | undefined> {
    if (sceneId) {
      return await this.conversations
        .where({ bookId, sceneId, type })
        .first();
    } else {
      return await this.conversations
        .where({ bookId, type })
        .first();
    }
  }

  async getOrCreateConversation(bookId: string, sceneId?: string, type: 'scene' | 'research' | 'general' = 'scene'): Promise<string> {
    let conversation = await this.getConversation(bookId, sceneId, type);

    if (!conversation) {
      const conversationId = await this.createConversation(bookId, sceneId, type);
      return conversationId;
    }

    // Generate consistent conversation ID based on the existing conversation
    const existingConvId = `${bookId}_${sceneId || 'research'}_${conversation.createdAt}`;
    return existingConvId;
  }

  async deleteConversation(bookId: string, sceneId?: string, type: 'scene' | 'research' | 'general' = 'scene'): Promise<void> {
    const conversation = await this.getConversation(bookId, sceneId, type);
    if (conversation) {
      await this.conversations.delete(conversation.id!);
      const conversationId = `${bookId}_${sceneId || 'research'}_${conversation.createdAt}`;
      await this.messages.where({ conversationId }).delete();
    }
  }

  // Message management
  async addMessage(conversationId: string, message: Omit<ConversationMessage, 'id' | 'conversationId' | 'timestamp'>): Promise<void> {
    const fullMessage: ConversationMessage = {
      ...message,
      conversationId,
      timestamp: Date.now(),
    };

    await this.messages.add(fullMessage);

    // Update conversation timestamp - we need to find the conversation by its generated ID
    // For now, we'll just update the first conversation that matches the pattern
    // In a more sophisticated implementation, we'd store the conversation ID mapping
  }

  async getMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]> {
    const messages = await this.messages.where({ conversationId }).toArray();

    messages.sort((a, b) => a.timestamp - b.timestamp);

    if (limit && messages.length > limit) {
      return messages.slice(-limit);
    }

    return messages;
  }

  async clearConversation(conversationId: string): Promise<void> {
    await this.messages.where({ conversationId }).delete();
  }

  // Book management
  async getBookConversations(bookId: string): Promise<Conversation[]> {
    return await this.conversations.where({ bookId }).sortBy('updatedAt');
  }

  async getConversationById(conversationId: string): Promise<Conversation | undefined> {
    return await this.conversations.where({ id: conversationId }).first();
  }

  async deleteBookConversations(bookId: string): Promise<void> {
    const conversations = await this.getBookConversations(bookId);
    for (const conversation of conversations) {
      await this.conversations.delete(conversation.id!);
      const conversationId = `${bookId}_${conversation.sceneId || 'research'}_${conversation.createdAt}`;
      await this.messages.where({ conversationId }).delete();
    }
  }

  // Utility methods
  async getConversationStats(bookId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    sceneConversations: number;
    researchConversations: number;
  }> {
    const conversations = await this.getBookConversations(bookId);

    let totalMessages = 0;
    for (const conversation of conversations) {
      const conversationId = `${bookId}_${conversation.sceneId || 'research'}_${conversation.createdAt}`;
      totalMessages += await this.messages.where({ conversationId }).count();
    }

    return {
      totalConversations: conversations.length,
      totalMessages,
      sceneConversations: conversations.filter(c => c.type === 'scene').length,
      researchConversations: conversations.filter(c => c.type === 'research').length,
    };
  }
}

// Export singleton instance
export const conversationDB = new ConversationDatabase();
