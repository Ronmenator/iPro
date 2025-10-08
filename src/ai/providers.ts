import { LlmMessage } from './adapter';

// Enhanced types for function calling
export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface FunctionMessage {
  role: 'assistant';
  content: string | null;
  function_call?: FunctionCall;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: any;
}

export type LlmClientWithTools = (messages: LlmMessage[], tools?: FunctionDefinition[]) => Promise<string | FunctionMessage>;

// Configuration types
export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
}

/**
 * OpenAI API client with function calling support
 */

export function createOpenAIClient(config: OpenAIConfig): LlmClientWithTools {
  const model = config.model || 'gpt-4o-mini';
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

  console.log('Creating OpenAI client with model:', model);

  return async (messages: LlmMessage[], tools?: FunctionDefinition[]): Promise<string | FunctionMessage> => {
    const requestBody: any = {
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4096, // Increased for complex content generation
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      requestBody.tool_choice = 'auto';
      console.log('OpenAI request with tools:', JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    // Handle network errors more gracefully
    if (!response) {
      throw new Error('No response received from OpenAI API. Please check your internet connection and API key.');
    }

    const data = await response.json();
    console.log('OpenAI response data:', data);

    if (!data.choices || data.choices.length === 0) {
      console.error('No choices in OpenAI response:', data);
      return "I'm sorry, I didn't receive a proper response from the AI service.";
    }

    const choice = data.choices[0];
    console.log('OpenAI choice:', choice);

    if (!choice.message) {
      console.error('No message in OpenAI choice:', choice);
      return "I'm sorry, I didn't receive a proper message from the AI service.";
    }


    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      // Handle tool calls (new format)
      const toolCall = choice.message.tool_calls[0];
      console.log('OpenAI tool call:', toolCall);
      return {
        role: 'assistant',
        content: choice.message.content,
        function_call: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments
        }
      };
    } else if (choice.message.function_call) {
      // Handle function calls (legacy format)
      console.log('OpenAI function call:', choice.message.function_call);
      return {
        role: 'assistant',
        content: choice.message.content,
        function_call: {
          name: choice.message.function_call.name,
          arguments: choice.message.function_call.arguments
        }
      };
    }

    console.log('OpenAI text response:', choice.message.content);
    return choice.message.content;
  };
}

/**
 * Anthropic (Claude) API client with function calling support
 */
export function createAnthropicClient(config: AnthropicConfig): LlmClientWithTools {
  const model = config.model || 'claude-3-5-sonnet-20241022';
  
  return async (messages: LlmMessage[], tools?: FunctionDefinition[]): Promise<string | FunctionMessage> => {
    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const requestBody: any = {
      model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: 4096, // Increased for complex content generation
      temperature: 0.3,
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters
      }));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.content[0];


    if (content.type === 'tool_use') {
      return {
        role: 'assistant',
        content: null,
        function_call: {
          name: content.name,
          arguments: JSON.stringify(content.input)
        }
      };
    }

    return content.text;
  };
}


/**
 * Get configured LLM client from settings
 */
export function getLLMClient(): LlmClientWithTools | null {
  console.log('=== GETTING LLM CLIENT ===');
  try {
    const settings = localStorage.getItem('monday-ai-settings');
    console.log('Settings from localStorage:', settings);
    
    if (!settings) {
      console.warn('No AI settings found. Please configure AI in settings.');
      return null;
    }

    const config = JSON.parse(settings);
    console.log('Parsed config:', config);
    
    if (!config.enabled) {
      console.warn('AI is disabled. Please enable AI in settings.');
      return null;
    }

    switch (config.provider) {
      case 'openai':
        if (!config.openaiApiKey) {
          console.warn('OpenAI API key not configured. Please add your API key in settings.');
          return null;
        }
        return createOpenAIClient({
          apiKey: config.openaiApiKey,
          model: config.openaiModel,
          baseUrl: config.openaiBaseUrl,
        });

      case 'anthropic':
        if (!config.anthropicApiKey) {
          console.warn('Anthropic API key not configured. Please add your API key in settings.');
          return null;
        }
        return createAnthropicClient({
          apiKey: config.anthropicApiKey,
          model: config.anthropicModel,
        });

      default:
        console.warn(`Unknown provider: ${config.provider}. Please configure a valid AI provider.`);
        return null;
    }
  } catch (error) {
    console.error('Error getting LLM client:', error);
    return null;
  }
}

/**
 * Save AI settings to localStorage
 */
export function saveAISettings(settings: {
  enabled: boolean;
  provider: 'openai' | 'anthropic';
  openaiApiKey?: string;
  openaiModel?: string;
  openaiBaseUrl?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
}) {
  localStorage.setItem('monday-ai-settings', JSON.stringify(settings));
}

/**
 * Load AI settings from localStorage
 */
export function loadAISettings() {
  const stored = localStorage.getItem('monday-ai-settings');
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    enabled: false,
    provider: 'openai',
  };
}

