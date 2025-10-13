import React, { useState, useEffect } from 'react';
import { generatePcc5Incremental, regenerateSection, getWordCountEstimates, GenerationProgress, deduceStoryProperties } from '../ai/pcc5Wizard';
import { IdeaInput, Pcc5Payload } from '../types/pcc5';
import { savePcc5ToFiles, createSceneFiles } from '../utils/pcc5FileIO';
import { markdownToDocument } from '../utils/fileIO';
import { useDocumentStore } from '../store/documentStore';
import OutlineTab from './pcc5/OutlineTab';
import CharactersTab from './pcc5/CharactersTab';
import ChaptersTab from './pcc5/ChaptersTab';
import ScenesTab from './pcc5/ScenesTab';

interface WizardPCC5Props {
  onClose: () => void;
  initialIdea?: string;
}

type TabType = 'form' | 'outline' | 'characters' | 'chapters' | 'scenes';

export default function WizardPCC5({ onClose, initialIdea = '' }: WizardPCC5Props) {
  const [currentTab, setCurrentTab] = useState<TabType>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDeducingProperties, setIsDeducingProperties] = useState(false);

  // Get document store
  const documentStore = useDocumentStore();
  
  // Form state
  const [formData, setFormData] = useState<IdeaInput>({
    idea: initialIdea,
    genre: '',
    theme: '',
    tone: '',
    world: '',
    audience: '',
  });
  
  // Generated data
  const [pcc5Data, setPcc5Data] = useState<Pcc5Payload | null>(null);
  const [wordCounts, setWordCounts] = useState<any>(null);

  const handleInputChange = (field: keyof IdeaInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIdeaBlur = async () => {
    if (!formData.idea.trim() || isDeducingProperties) return;

    // Check if any properties are empty (should be deduced)
    const shouldDeduce = !formData.genre || !formData.theme || !formData.tone || !formData.world || !formData.audience;

    if (!shouldDeduce) return;

    setIsDeducingProperties(true);

    try {
      const deducedProperties = await deduceStoryProperties(formData.idea);

      // Only update empty fields
      setFormData(prev => ({
        ...prev,
        genre: prev.genre || deducedProperties.genre || '',
        theme: prev.theme || deducedProperties.theme || '',
        tone: prev.tone || deducedProperties.tone || '',
        world: prev.world || deducedProperties.world || '',
        audience: prev.audience || deducedProperties.audience || ''
      }));
    } catch (error) {
      console.error('Failed to deduce story properties:', error);
      // Silently fail - don't show error to user for this feature
    } finally {
      setIsDeducingProperties(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.idea.trim()) {
      setError('Please enter a story idea');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generatePcc5Incremental(formData, (progress) => {
        setGenerationProgress(progress);
      });

      // Check if generation was successful but with validation warnings
      if (result) {
        setPcc5Data(result);
        setWordCounts(getWordCountEstimates(result));
        setCurrentTab('outline');
        setGenerationProgress(null);
        setWarnings([]); // Clear any previous warnings
      } else {
        setError('Failed to generate structure: No data returned');
        setGenerationProgress(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate structure');
      setGenerationProgress(null);
      setWarnings([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section: 'outline' | 'characters' | 'chapters' | 'scenes') => {
    if (!pcc5Data) return;

    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setGenerationProgress(`Regenerating ${section}...`);

    try {
      const result = await regenerateSection(section, pcc5Data, formData);
      setPcc5Data(result);
      setWordCounts(getWordCountEstimates(result));
      setGenerationProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to regenerate ${section}`);
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadOutline = (outline: Outline) => {
    if (!pcc5Data) return;

    // Update only the outline section while keeping other data
    setPcc5Data({
      ...pcc5Data,
      outline
    });
    setWordCounts(getWordCountEstimates({
      ...pcc5Data,
      outline
    }));
  };

  const handleSave = async () => {
    if (!pcc5Data) return;

    try {
      setIsGenerating(true);
      setError(null);
      setWarnings([]);

      // Show saving progress
      const savingProgress: GenerationProgress = {
        currentPhase: 'saving',
        phases: {
          saving: { name: 'Saving to project files...', status: 'generating' }
        },
        isComplete: false
      };
      setGenerationProgress(savingProgress);

      // Save main structure files
      const structureFiles = await savePcc5ToFiles(pcc5Data);

      // Create scene files
      const sceneFiles = await createSceneFiles(pcc5Data);

      // Combine all files
      const allFiles = new Map([...structureFiles, ...sceneFiles]);

      console.log('Generated files:', Array.from(allFiles.keys()));

      // Save JSON files for download (structure files)
      const jsonFiles = Array.from(structureFiles.entries()).filter(([path]) => path.endsWith('.json'));

      if (jsonFiles.length > 0) {
        // Create a single JSON file with all the data
        const combinedData = {
          outline: JSON.parse(jsonFiles.find(([path]) => path.includes('outline'))?.[1] || '{}'),
          characters: JSON.parse(jsonFiles.find(([path]) => path.includes('cast'))?.[1] || '[]'),
          ...JSON.parse(jsonFiles.find(([path]) => path.includes('structure'))?.[1] || '{}')
        };

        const jsonContent = JSON.stringify(combinedData, null, 2);

        // Create download link for JSON files
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = 'pcc5-story-structure.json';
        jsonLink.click();
        URL.revokeObjectURL(jsonUrl);
      }

      // Save scene markdown files as project documents
      const mdFiles = Array.from(sceneFiles.entries()).filter(([path]) => path.endsWith('.md'));

      for (const [path, content] of mdFiles) {
        // Extract scene ID from path (e.g., "manuscript/part-01/ch-01/scene-01.md")
        const sceneId = path.replace('manuscript/part-01/', '').replace('.md', '');

        // Use existing markdown parser to create proper document structure
        const document = markdownToDocument(content, sceneId);

        // Add to document store if available
        if (documentStore.createDocument) {
          documentStore.createDocument(sceneId, document.title, document.blocks || []);
        }
      }

      // Show success message with download info
      const message = `Successfully generated ${allFiles.size} files!\n\n` +
        `✅ ${jsonFiles.length} JSON structure files downloaded\n` +
        `✅ ${mdFiles.length} scene documents saved to project\n\n` +
        `Files generated:\n${Array.from(allFiles.keys()).join('\n')}`;

      alert(message);

      // Update progress to completed
      savingProgress.phases.saving.status = 'completed';
      savingProgress.isComplete = true;
      setGenerationProgress(savingProgress);

      setTimeout(() => {
        onClose(); // Close wizard after successful save
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save files');
      setGenerationProgress(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTabContent = () => {
    if (currentTab === 'form') {
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Story Idea *
            </label>
            <div className="relative">
              <textarea
                value={formData.idea}
                onChange={(e) => handleInputChange('idea', e.target.value)}
                onBlur={handleIdeaBlur}
                placeholder="Describe your story idea in 1-5 sentences..."
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                disabled={isGenerating || isDeducingProperties}
              />
              {isDeducingProperties && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Genre
              </label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                placeholder="e.g., Fantasy, Thriller, Romance"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isGenerating || isDeducingProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <input
                type="text"
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                placeholder="e.g., Redemption, Sacrifice, Identity"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isGenerating || isDeducingProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tone
              </label>
              <input
                type="text"
                value={formData.tone}
                onChange={(e) => handleInputChange('tone', e.target.value)}
                placeholder="e.g., Dark, Hopeful, Mysterious"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isGenerating || isDeducingProperties}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                World Setting
              </label>
              <input
                type="text"
                value={formData.world}
                onChange={(e) => handleInputChange('world', e.target.value)}
                placeholder="e.g., Medieval fantasy, Modern day, Space opera"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isGenerating || isDeducingProperties}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Audience
            </label>
            <input
              type="text"
              value={formData.audience}
              onChange={(e) => handleInputChange('audience', e.target.value)}
              placeholder="e.g., Young Adult, Adult, Middle Grade"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isGenerating || isDeducingProperties}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              disabled={isGenerating || isDeducingProperties}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !formData.idea.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Structure'}
            </button>
          </div>
        </div>
      );
    }

    if (!pcc5Data) return null;

    switch (currentTab) {
      case 'outline':
        return (
          <OutlineTab
            data={pcc5Data.outline}
            onRegenerate={() => handleRegenerateSection('outline')}
            onLoad={handleLoadOutline}
            isGenerating={isGenerating}
          />
        );
      case 'characters':
        return (
          <CharactersTab 
            data={pcc5Data.characters} 
            onRegenerate={() => handleRegenerateSection('characters')}
            isGenerating={isGenerating}
          />
        );
      case 'chapters':
        return (
          <ChaptersTab 
            data={pcc5Data.chapters} 
            onRegenerate={() => handleRegenerateSection('chapters')}
            isGenerating={isGenerating}
          />
        );
      case 'scenes':
        return (
          <ScenesTab 
            data={pcc5Data.scenes} 
            onRegenerate={() => handleRegenerateSection('scenes')}
            isGenerating={isGenerating}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            PCC-5 Story Structure Wizard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Close wizard"
            aria-label="Close wizard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress indicator */}
        {isGenerating && generationProgress && (
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900 border-b border-blue-200 dark:border-blue-700">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {generationProgress.currentPhase.charAt(0).toUpperCase() + generationProgress.currentPhase.slice(1)}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {Object.values(generationProgress.phases).filter(p => p.status === 'completed').length} / {Object.keys(generationProgress.phases).length} phases
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(Object.values(generationProgress.phases).filter(p => p.status === 'completed').length / Object.keys(generationProgress.phases).length) * 100}%`
                  }}
                ></div>
              </div>

              {/* Phase status */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(generationProgress.phases).map(([key, phase]) => (
                  <div key={key} className={`flex items-center space-x-1 ${
                    phase.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    phase.status === 'generating' ? 'text-blue-600 dark:text-blue-400' :
                    phase.status === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      phase.status === 'completed' ? 'bg-green-500' :
                      phase.status === 'generating' ? 'bg-blue-500 animate-pulse' :
                      phase.status === 'error' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}></div>
                    <span className="truncate">{phase.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-700">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Validation warnings */}
        {warnings.length > 0 && (
          <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-700">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Validation Warnings (Generation Continued)
                </div>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {pcc5Data && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8">
              {[
                { id: 'form', label: 'Story Idea' },
                { id: 'outline', label: 'Outline' },
                { id: 'characters', label: 'Characters' },
                { id: 'chapters', label: 'Chapters' },
                { id: 'scenes', label: 'Scenes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as TabType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderTabContent()}
        </div>

        {/* Footer */}
        {pcc5Data && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {wordCounts && (
                <span>
                  {wordCounts.sceneCount} scenes • {wordCounts.chapterCount} chapters • ~{wordCounts.totalWords.toLocaleString()} words
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500"
              >
                Save to Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
