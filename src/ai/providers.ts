/**
 * Modular AI Provider System
 * Supports OpenAI, Azure OpenAI, and Anthropic Claude
 */

import { BookSettings } from '../types/book';

export interface AIProvider {
  name: string;
  models: string[];
  maxTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
  toolCalls?: any[];
}

export interface AIStreamResponse {
  content: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: AIToolCall[];
  tool_call_id?: string;
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface AIRequest {
  messages: AIMessage[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  tools?: AITool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
}

export interface AIProviderInterface {
  // Provider info
  getProvider(): AIProvider;
  
  // Basic operations
  generateText(request: AIRequest, settings: BookSettings): Promise<AIResponse>;
  generateStream(request: AIRequest, settings: BookSettings, onChunk: (chunk: AIStreamResponse) => void): Promise<AIResponse>;
  
  // Tool operations
  generateWithTools(request: AIRequest, settings: BookSettings): Promise<AIResponse>;
  
  // Validation
  validateSettings(settings: BookSettings): boolean;
  testConnection(settings: BookSettings): Promise<boolean>;
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider implements AIProviderInterface {
  getProvider(): AIProvider {
    return {
      name: 'OpenAI',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-5', 'gpt-5-turbo'],
      maxTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
    };
  }

  async generateText(request: AIRequest, settings: BookSettings): Promise<AIResponse> {
    const endpoint = settings.aiBaseUrl || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens || settings.aiMaxTokens,
        temperature: request.temperature || settings.aiTemperature,
        tools: request.tools,
        tool_choice: request.toolChoice,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('OpenAI API Response:', JSON.stringify(data, null, 2));
    
    const message = data.choices[0].message;
    console.log('Message from API:', message);
    console.log('Message tool_calls:', message.tool_calls);
    console.log('Finish reason:', data.choices[0].finish_reason);
    
    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('Found tool calls in API response:', message.tool_calls);
      return {
        content: JSON.stringify(message.tool_calls),
        usage: data.usage,
        model: data.model,
        finishReason: data.choices[0].finish_reason,
        toolCalls: message.tool_calls,
      };
    }
    
    // Check if finish reason is tool_calls but no tool_calls in message
    if (data.choices[0].finish_reason === 'tool_calls') {
      console.log('WARNING: finish_reason is tool_calls but no tool_calls found in message');
      console.log('Message keys:', Object.keys(message));
      console.log('Full message structure:', JSON.stringify(message, null, 2));
    }
    
    console.log('No tool calls found, returning regular content');
    return {
      content: message.content || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }

  async generateStream(request: AIRequest, settings: BookSettings, onChunk: (chunk: AIStreamResponse) => void): Promise<AIResponse> {
    const endpoint = settings.aiBaseUrl || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens || settings.aiMaxTokens,
        temperature: request.temperature || settings.aiTemperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let usage: any = undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk({
                  content: fullContent,
                  isComplete: false,
                  usage: parsed.usage,
                });
              }
            } catch (e) {
              // Ignore parsing errors for streaming
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onChunk({
      content: fullContent,
      isComplete: true,
      usage,
    });

    return {
      content: fullContent,
      usage,
      model: request.model,
    };
  }

  async generateWithTools(request: AIRequest, settings: BookSettings): Promise<AIResponse> {
    return this.generateText(request, settings);
  }

  validateSettings(settings: BookSettings): boolean {
    return !!(settings.aiApiKey && settings.aiModel);
  }

  async testConnection(settings: BookSettings): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.aiApiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

}

/**
 * Azure OpenAI Provider
 */
export class AzureOpenAIProvider implements AIProviderInterface {
  getProvider(): AIProvider {
    return {
      name: 'Azure OpenAI',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      maxTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
    };
  }

  async generateText(request: AIRequest, settings: BookSettings): Promise<AIResponse> {
    const endpoint = `${settings.azureEndpoint}/openai/deployments/${settings.azureDeploymentName}/chat/completions?api-version=${settings.azureApiVersion || '2024-02-15-preview'}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': settings.aiApiKey,
      },
      body: JSON.stringify({
        model: settings.azureDeploymentName, // Use deployment name as model for Azure
        messages: request.messages,
        max_tokens: request.maxTokens || settings.aiMaxTokens,
        temperature: request.temperature || settings.aiTemperature,
        tools: request.tools,
        tool_choice: request.toolChoice,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('Azure OpenAI API Response:', JSON.stringify(data, null, 2));
    
    const message = data.choices[0].message;
    console.log('Azure Message from API:', message);
    console.log('Azure Message tool_calls:', message.tool_calls);
    console.log('Azure Finish reason:', data.choices[0].finish_reason);
    
    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('Found tool calls in Azure API response:', message.tool_calls);
      return {
        content: JSON.stringify(message.tool_calls),
        usage: data.usage,
        model: data.model,
        finishReason: data.choices[0].finish_reason,
        toolCalls: message.tool_calls,
      };
    }
    
    // Check if finish reason is tool_calls but no tool_calls in message
    if (data.choices[0].finish_reason === 'tool_calls') {
      console.log('WARNING: Azure finish_reason is tool_calls but no tool_calls found in message');
      console.log('Azure Message keys:', Object.keys(message));
      console.log('Azure Full message structure:', JSON.stringify(message, null, 2));
    }
    
    console.log('No tool calls found in Azure response, returning regular content');
    return {
      content: message.content || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }

  async generateStream(request: AIRequest, settings: BookSettings, onChunk: (chunk: AIStreamResponse) => void): Promise<AIResponse> {
    const endpoint = `${settings.azureEndpoint}/openai/deployments/${settings.azureDeploymentName}/chat/completions?api-version=${settings.azureApiVersion || '2024-02-15-preview'}`;
    
    const requestBody = {
      model: settings.azureDeploymentName, // Use deployment name as model for Azure
      messages: request.messages,
      max_tokens: request.maxTokens || settings.aiMaxTokens,
      temperature: request.temperature || settings.aiTemperature,
      stream: true,
    };
    
    // Debug: Log the actual request being sent
    console.log('Azure OpenAI Request:', {
      endpoint,
      max_tokens: requestBody.max_tokens,
      model: requestBody.model,
      messageCount: requestBody.messages.length
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': settings.aiApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let usage: any = undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              const finishReason = parsed.choices?.[0]?.finish_reason;
              
              if (finishReason) {
                console.log('Azure OpenAI finish reason:', finishReason);
              }
              
              if (content) {
                fullContent += content;
                onChunk({
                  content: fullContent,
                  isComplete: false,
                  usage: parsed.usage,
                });
              }
            } catch (e) {
              // Ignore parsing errors for streaming
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onChunk({
      content: fullContent,
      isComplete: true,
      usage,
    });

    return {
      content: fullContent,
      usage,
      model: settings.azureDeploymentName,
    };
  }

  async generateWithTools(request: AIRequest, settings: BookSettings): Promise<AIResponse> {
    return this.generateText(request, settings);
  }

  validateSettings(settings: BookSettings): boolean {
    return !!(settings.aiApiKey && settings.azureEndpoint && settings.azureDeploymentName);
  }

  async testConnection(settings: BookSettings): Promise<boolean> {
    try {
      const endpoint = `${settings.azureEndpoint}/openai/deployments/${settings.azureDeploymentName}/chat/completions?api-version=${settings.azureApiVersion || '2024-02-15-preview'}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': settings.aiApiKey,
        },
        body: JSON.stringify({
          model: settings.azureDeploymentName, // Use deployment name as model for Azure
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

}

/**
 * Anthropic Claude Provider
 */
export class AnthropicProvider implements AIProviderInterface {
  getProvider(): AIProvider {
    return {
      name: 'Anthropic Claude',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      maxTokens: 200000,
      supportsStreaming: true,
      supportsTools: true,
    };
  }

  async generateText(request: AIRequest, settings: BookSettings): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens || settings.aiMaxTokens,
        temperature: request.temperature || settings.aiTemperature,
        tools: request.tools,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('Anthropic API Response:', JSON.stringify(data, null, 2));
    
    // Anthropic handles tool calls differently - they're in the content array
    const content = data.content[0];
    console.log('Anthropic Content:', content);
    
    // Check if this is a tool use
    if (content.type === 'tool_use') {
      console.log('Found tool use in Anthropic response:', content);
      return {
        content: JSON.stringify([content]),
        usage: data.usage,
        model: data.model,
        finishReason: data.stop_reason,
        toolCalls: [content],
      };
    }
    
    // Check if there are multiple content items with tool uses
    const toolCalls = data.content.filter((item: any) => item.type === 'tool_use');
    if (toolCalls.length > 0) {
      console.log('Found multiple tool uses in Anthropic response:', toolCalls);
      return {
        content: JSON.stringify(toolCalls),
        usage: data.usage,
        model: data.model,
        finishReason: data.stop_reason,
        toolCalls: toolCalls,
      };
    }
    
    console.log('No tool calls found in Anthropic response, returning regular content');
    return {
      content: content.text || '',
      usage: data.usage,
      model: data.model,
      finishReason: data.stop_reason,
    };
  }

  async generateStream(request: AIRequest, settings: BookSettings, onChunk: (chunk: AIStreamResponse) => void): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens || settings.aiMaxTokens,
        temperature: request.temperature || settings.aiTemperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let usage: any = undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.delta?.text;
              if (content) {
                fullContent += content;
                onChunk({
                  content: fullContent,
                  isComplete: false,
                  usage: parsed.usage,
                });
              }
            } catch (e) {
              // Ignore parsing errors for streaming
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onChunk({
      content: fullContent,
      isComplete: true,
      usage,
    });

    return {
      content: fullContent,
      usage,
      model: request.model,
    };
  }

  async generateWithTools(request: AIRequest, settings: BookSettings): Promise<AIResponse> {
    return this.generateText(request, settings);
  }

  validateSettings(settings: BookSettings): boolean {
    return !!(settings.aiApiKey && settings.aiModel);
  }

  async testConnection(settings: BookSettings): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.aiApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.aiModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

}

/**
 * AI Provider Factory
 */
export class AIProviderFactory {
  private static providers = new Map<string, AIProviderInterface>([
    ['openai', new OpenAIProvider()],
    ['azure openai', new AzureOpenAIProvider()],
    ['anthropic claude', new AnthropicProvider()],
  ]);

  static getProvider(providerName: string): AIProviderInterface | null {
    return this.providers.get(providerName) || null;
  }

  static getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values()).map(p => p.getProvider());
  }

  static getProviderForSettings(settings: BookSettings): AIProviderInterface | null {
    return this.getProvider(settings.aiProvider);
  }
}

/**
 * Get the current AI provider based on book settings
 * This function should be called from components that have access to the book store
 */
export function getCurrentAIProvider(settings: BookSettings): AIProviderInterface | null {
  if (!settings?.aiProvider) {
    return null;
  }
  
  const provider = AIProviderFactory.getProvider(settings.aiProvider);
  if (!provider) {
    return null;
  }
  
  // Return a wrapper that automatically passes the settings
  return {
    getProvider: () => provider.getProvider(),
    generateText: (request: AIRequest) => provider.generateText(request, settings),
    generateStream: (request: AIRequest, onChunk: (chunk: AIStreamResponse) => void) => 
      provider.generateStream(request, settings, onChunk),
    generateWithTools: (request: AIRequest) => provider.generateWithTools(request, settings),
    validateSettings: (settings: BookSettings) => provider.validateSettings(settings),
    testConnection: (settings: BookSettings) => provider.testConnection(settings),
  };
}