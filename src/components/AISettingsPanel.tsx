import React, { useState, useEffect } from 'react';
import { loadAISettings, saveAISettings } from '../ai/providers';

export default function AISettingsPanel({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [settings, setSettings] = useState(loadAISettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(loadAISettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveAISettings(settings);
    onToggle();
    // Reload to apply new settings
    window.location.reload();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Settings
          </h2>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Enable AI */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold">Enable AI Features</label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use AI to assist with editing
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" title="Toggle AI features">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
                aria-label="Enable AI features"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* Provider Selection */}
              <div>
                <label htmlFor="ai-provider" className="block font-semibold mb-2">AI Provider</label>
                <select
                  id="ai-provider"
                  value={settings.provider}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  aria-label="Select AI provider"
                  title="Choose AI provider"
                >
                  <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
              </div>

              {/* OpenAI Settings */}
              {settings.provider === 'openai' && (
                <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">OpenAI Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.openaiApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a>
                    </p>
                  </div>

                  <div>
                    <label htmlFor="openai-model" className="block text-sm font-medium mb-1">Model</label>
                    <select
                      id="openai-model"
                      value={settings.openaiModel || 'gpt-4o-mini'}
                      onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      aria-label="Select OpenAI model"
                      title="Choose OpenAI model"
                    >
                      <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
                    <input
                      type="text"
                      value={settings.openaiBaseUrl || ''}
                      onChange={(e) => setSettings({ ...settings, openaiBaseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      For OpenAI-compatible APIs (leave empty for default)
                    </p>
                  </div>
                </div>
              )}

              {/* Anthropic Settings */}
              {settings.provider === 'anthropic' && (
                <div className="space-y-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">Anthropic Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.anthropicApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">console.anthropic.com</a>
                    </p>
                  </div>

                  <div>
                    <label htmlFor="anthropic-model" className="block text-sm font-medium mb-1">Model</label>
                    <select
                      id="anthropic-model"
                      value={settings.anthropicModel || 'claude-3-5-sonnet-20241022'}
                      onChange={(e) => setSettings({ ...settings, anthropicModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      aria-label="Select Anthropic model"
                      title="Choose Anthropic model"
                    >
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                    </select>
                  </div>
                </div>
              )}

            </>
          )}

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
            <h4 className="font-semibold mb-2">Privacy Note</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Your API keys are stored locally in your browser and never sent to our servers. 
              Only selected text is sent to your chosen AI provider for processing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onToggle}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

