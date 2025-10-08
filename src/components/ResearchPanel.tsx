import React, { useState, useEffect } from 'react';
import { 
  ResearchItem, 
  ResearchType, 
  ResearchCollection,
  createResearchItem,
  createResearchSource
} from '../types/research';
import { useResearchStore } from '../store/researchStore';
import { searchResearch, searchResearchByType } from '../services/webSearchService';

interface ResearchPanelProps {
  currentDocId?: string;
}

export default function ResearchPanel({ currentDocId }: ResearchPanelProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'browse' | 'collections'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<ResearchType>('other');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  const {
    researchItems,
    researchCollections,
    addResearchItem,
    addResearchQuery,
    createCollection,
    addItemToCollection,
    getResearchStats,
    markItemAccessed
  } = useResearchStore();

  const stats = getResearchStats();

  // Load research items on mount
  useEffect(() => {
    // Research items are loaded automatically by the store
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Perform web search
      const results = searchType === 'other' 
        ? await searchResearch(searchQuery)
        : await searchResearchByType(searchQuery, searchType as any);

      setSearchResults(results);
      
      // Save search query
      await addResearchQuery({
        query: searchQuery,
        timestamp: Date.now(),
        results: [],
        aiGenerated: false,
        context: currentDocId ? `Document: ${currentDocId}` : undefined
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveResult = async (result: any) => {
    try {
      const source = createResearchSource(
        'web',
        result.source,
        result.url,
        undefined,
        result.credibility
      );

      const item = createResearchItem(
        result.title,
        searchType,
        result.snippet,
        source,
        [searchQuery.toLowerCase()]
      );

      const savedItem = await addResearchItem(item);
      setSelectedItems(prev => [...prev, savedItem.id]);
    } catch (error) {
      console.error('Failed to save research item:', error);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      await createCollection(newCollectionName, '', []);
      setNewCollectionName('');
      setShowCreateCollection(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleAddToCollection = async (collectionId: string, itemId: string) => {
    try {
      await addItemToCollection(collectionId, itemId);
    } catch (error) {
      console.error('Failed to add item to collection:', error);
    }
  };

  const handleItemClick = async (itemId: string) => {
    await markItemAccessed(itemId);
  };

  const researchTypes: { value: ResearchType; label: string; icon: string }[] = [
    { value: 'character', label: 'Character', icon: '👤' },
    { value: 'location', label: 'Location', icon: '📍' },
    { value: 'timeline', label: 'Timeline', icon: '⏰' },
    { value: 'concept', label: 'Concept', icon: '💡' },
    { value: 'fact', label: 'Fact', icon: '📊' },
    { value: 'reference', label: 'Reference', icon: '📚' },
    { value: 'inspiration', label: 'Inspiration', icon: '✨' },
    { value: 'technical', label: 'Technical', icon: '⚙️' },
    { value: 'cultural', label: 'Cultural', icon: '🌍' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          🔍 Research Assistant
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          AI-powered research for your book
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'browse'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Browse ({stats.totalItems})
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'collections'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Collections
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Query
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What would you like to research?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Research Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as ResearchType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  aria-label="Research Type"
                >
                  {researchTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {isSearching ? 'Searching...' : 'Search Web'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                  Search Results ({searchResults.length})
                </h3>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {result.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {result.snippet}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Source: {result.source}</span>
                          <span>•</span>
                          <span>Relevance: {Math.round(result.relevance * 100)}%</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveResult(result)}
                        className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalItems}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Items
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Object.keys(stats.itemsByType).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Categories
                </div>
              </div>
            </div>

            {/* Research Items by Type */}
            {researchTypes.map(type => {
              const items = Array.from(researchItems.values()).filter(item => item.type === type.value);
              if (items.length === 0) return null;

              return (
                <div key={type.value} className="space-y-2">
                  <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                    {type.icon} {type.label} ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {item.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Source: {item.source.name}</span>
                          <span>•</span>
                          <span>Relevance: {Math.round(item.relevance * 100)}%</span>
                        </div>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        ... and {items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                Collections
              </h3>
              <button
                onClick={() => setShowCreateCollection(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors"
              >
                New Collection
              </button>
            </div>

            {/* Create Collection Form */}
            {showCreateCollection && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 mb-2"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateCollection}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateCollection(false)}
                    className="bg-gray-400 hover:bg-gray-500 text-white text-sm px-3 py-1 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Collections List */}
            <div className="space-y-2">
              {Array.from(researchCollections.values()).map(collection => (
                <div
                  key={collection.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {collection.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {collection.description || 'No description'}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {collection.items.length} items
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
