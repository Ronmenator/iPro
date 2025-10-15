import React, { useState } from 'react';
import { BookSettings } from '../types/book';
import { AIProviderFactory } from '../ai/providers';
import { useBookStore } from '../store/bookStore';

interface BookSettingsProps {
  settings: BookSettings;
  onSettingsUpdate: (settings: Partial<BookSettings>) => void;
}

export default function BookSettingsPanel({ settings, onSettingsUpdate }: BookSettingsProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { book } = useBookStore();

  const providers = AIProviderFactory.getAllProviders();

  // Safety check for undefined settings
  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Settings not available</p>
        </div>
      </div>
    );
  }

  const handleProviderChange = (provider: string) => {
    onSettingsUpdate({ aiProvider: provider as any });
  };

  const handleModelChange = (model: string) => {
    onSettingsUpdate({ aiModel: model });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onSettingsUpdate({ aiApiKey: apiKey });
  };

  const handleBaseUrlChange = (baseUrl: string) => {
    onSettingsUpdate({ aiBaseUrl: baseUrl });
  };

  const handleMaxTokensChange = (maxTokens: number) => {
    onSettingsUpdate({ aiMaxTokens: maxTokens });
  };

  const handleTemperatureChange = (temperature: number) => {
    onSettingsUpdate({ aiTemperature: temperature });
  };

  const handleAzureEndpointChange = (endpoint: string) => {
    onSettingsUpdate({ azureEndpoint: endpoint });
  };

  const handleAzureDeploymentChange = (deployment: string) => {
    onSettingsUpdate({ azureDeploymentName: deployment });
  };

  const handleAzureApiVersionChange = (version: string) => {
    onSettingsUpdate({ azureApiVersion: version });
  };

  const handleAutoSaveChange = (autoSave: boolean) => {
    onSettingsUpdate({ autoSave });
  };

  const handleAutoSaveIntervalChange = (interval: number) => {
    onSettingsUpdate({ autoSaveInterval: interval });
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const provider = AIProviderFactory.getProvider(settings.aiProvider);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const isValid = provider.validateSettings(settings);
      if (!isValid) {
        throw new Error('Invalid settings');
      }

      const isConnected = await provider.testConnection(settings);
      if (isConnected) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ success: false, message: 'Connection failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBookMetadataUpdate = (field: 'title' | 'author' | 'genre' | 'description', value: string) => {
    if (!book) return;
    useBookStore.setState({
      book: {
        ...book,
        [field]: value,
        lastModified: Date.now(),
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Book Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure book metadata and AI provider settings
        </p>
      </div>

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Book Metadata Section */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            Book Information
          </h4>
          
          {/* Book Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Book Title
            </label>
            <input
              type="text"
              value={book?.title || ''}
              onChange={(e) => handleBookMetadataUpdate('title', e.target.value)}
              placeholder="Enter book title"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Author */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author
            </label>
            <input
              type="text"
              value={book?.author || ''}
              onChange={(e) => handleBookMetadataUpdate('author', e.target.value)}
              placeholder="Enter author name"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Genre */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Genre
            </label>
            <input
              type="text"
              value={book?.genre || ''}
              onChange={(e) => handleBookMetadataUpdate('genre', e.target.value)}
              placeholder="Enter genre"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={book?.description || ''}
              onChange={(e) => handleBookMetadataUpdate('description', e.target.value)}
              placeholder="Enter book description"
              rows={3}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* AI Provider Section */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            AI Configuration
          </h4>
        </div>
        {/* AI Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            AI Provider
          </label>
          <select
            value={settings.aiProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            aria-label="Select AI provider"
          >
            {providers.map((provider) => (
              <option key={provider.name} value={provider.name.toLowerCase()}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Model - Hidden for Azure since deployment name serves as model */}
        {settings.aiProvider !== 'azure openai' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI Model
            </label>
            <select
              value={settings.aiModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              aria-label="Select AI model"
            >
              {providers
                .find(p => p.name.toLowerCase() === settings.aiProvider)
                ?.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={settings.aiApiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter your API key"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Base URL (for custom endpoints) */}
        {settings.aiProvider === 'openai' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base URL (Optional)
            </label>
            <input
              type="url"
              value={settings.aiBaseUrl || ''}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Azure Specific Settings */}
        {settings.aiProvider === 'azure openai' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Azure Endpoint
              </label>
              <input
                type="url"
                value={settings.azureEndpoint || ''}
                onChange={(e) => handleAzureEndpointChange(e.target.value)}
                placeholder="https://your-resource.openai.azure.com"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deployment Name
              </label>
              <input
                type="text"
                value={settings.azureDeploymentName || ''}
                onChange={(e) => handleAzureDeploymentChange(e.target.value)}
                placeholder="gpt-4-deployment"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Version
              </label>
              <input
                type="text"
                value={settings.azureApiVersion || '2024-02-15-preview'}
                onChange={(e) => handleAzureApiVersionChange(e.target.value)}
                placeholder="2024-02-15-preview"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </>
        )}

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Tokens: {settings.aiMaxTokens}
          </label>
          <input
            type="range"
            min="1000"
            max="32000"
            step="1000"
            value={settings.aiMaxTokens}
            onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
            className="w-full"
            aria-label="Max tokens slider"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temperature: {settings.aiTemperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.aiTemperature}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Temperature slider"
          />
        </div>

        {/* Auto-save */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => handleAutoSaveChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Auto-save
            </span>
          </label>
        </div>

        {/* Auto-save Interval */}
        {settings.autoSave && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Auto-save Interval: {settings.autoSaveInterval} seconds
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={settings.autoSaveInterval}
              onChange={(e) => handleAutoSaveIntervalChange(parseInt(e.target.value))}
              className="w-full"
              aria-label="Auto-save interval slider"
            />
          </div>
        )}

        {/* Test Connection */}
        <div>
          <button
            onClick={testConnection}
            disabled={isTesting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <div className={`mt-2 p-2 rounded text-sm ${
              testResult.success
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
