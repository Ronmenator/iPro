/**
 * Research Types - AI Research Database for Book Writing
 * 
 * This module defines the data structures for storing and managing research
 * that the AI assistant gathers from the internet to help with book writing.
 */

/**
 * Research Item - A single piece of research data
 */
export interface ResearchItem {
  id: string;                    // Unique identifier, e.g., "research-001"
  title: string;                 // Human-readable title
  type: ResearchType;            // Type of research (character, location, etc.)
  content: string;               // Main content/description
  source: ResearchSource;        // Where the information came from
  tags: string[];                // Searchable tags
  relevance: number;             // Relevance score (0-1) for AI context
  lastAccessed: number;          // Timestamp of last access
  created: number;               // Creation timestamp
  modified: number;              // Last modification timestamp
  
  // Optional structured data
  metadata?: Record<string, any>; // Type-specific metadata
  relatedItems?: string[];       // IDs of related research items
  notes?: string;                // User notes about this research
}

/**
 * Types of research items
 */
export type ResearchType = 
  | 'character'      // Character research (personalities, backgrounds, etc.)
  | 'location'       // Location research (places, settings, geography)
  | 'timeline'       // Timeline research (historical events, chronology)
  | 'concept'        // Conceptual research (themes, ideas, concepts)
  | 'fact'           // Factual research (verifiable facts, statistics)
  | 'reference'      // Reference material (books, articles, sources)
  | 'inspiration'    // Inspiration and creative ideas
  | 'technical'      // Technical details (procedures, terminology)
  | 'cultural'       // Cultural context (traditions, customs, beliefs)
  | 'other';         // Other types of research

/**
 * Source of research information
 */
export interface ResearchSource {
  type: 'web' | 'book' | 'article' | 'video' | 'document' | 'user' | 'ai';
  name: string;                  // Source name (e.g., "Wikipedia", "National Geographic")
  url?: string;                  // URL if web source
  author?: string;               // Author if applicable
  date?: string;                 // Publication date
  credibility: number;           // Credibility score (0-1)
}

/**
 * Research Query - A search query that generated research items
 */
export interface ResearchQuery {
  id: string;                    // Unique identifier
  query: string;                 // Original search query
  timestamp: number;             // When the query was made
  results: string[];             // IDs of research items found
  context?: string;              // Context for the search (e.g., "Chapter 3 research")
  aiGenerated: boolean;          // Whether this was an AI-generated search
}

/**
 * Research Collection - A group of related research items
 */
export interface ResearchCollection {
  id: string;                    // Unique identifier
  name: string;                  // Collection name
  description?: string;          // Collection description
  items: string[];               // IDs of research items in this collection
  tags: string[];                // Collection tags
  created: number;               // Creation timestamp
  modified: number;              // Last modification timestamp
}

/**
 * Research Search Result - Result from web search
 */
export interface ResearchSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number;
  credibility: number;
}

/**
 * Research Statistics
 */
export interface ResearchStats {
  totalItems: number;
  itemsByType: Record<ResearchType, number>;
  itemsBySource: Record<string, number>;
  lastActivity: number;
  mostAccessed: string[];        // IDs of most accessed items
  recentQueries: ResearchQuery[];
}

/**
 * Research Search Configuration
 */
export interface ResearchSearchConfig {
  maxResults: number;            // Maximum number of results to return
  minRelevance: number;          // Minimum relevance score (0-1)
  minCredibility: number;        // Minimum credibility score (0-1)
  preferredSources: string[];    // Preferred source types
  excludedDomains: string[];     // Domains to exclude from search
}

/**
 * Default research search configuration
 */
export const DEFAULT_RESEARCH_CONFIG: ResearchSearchConfig = {
  maxResults: 10,
  minRelevance: 0.3,
  minCredibility: 0.5,
  preferredSources: ['wikipedia', 'national-geographic', 'britannica', 'academic'],
  excludedDomains: ['spam.com', 'fake-news.com']
};

/**
 * Helper function to create a new research item
 */
export function createResearchItem(
  title: string,
  type: ResearchType,
  content: string,
  source: ResearchSource,
  tags: string[] = []
): Omit<ResearchItem, 'id' | 'created' | 'modified' | 'lastAccessed'> {
  return {
    title,
    type,
    content,
    source,
    tags,
    relevance: 0.5, // Default relevance
    metadata: {},
    relatedItems: [],
    notes: ''
  };
}

/**
 * Helper function to create a research source
 */
export function createResearchSource(
  type: ResearchSource['type'],
  name: string,
  url?: string,
  author?: string,
  credibility: number = 0.7
): ResearchSource {
  return {
    type,
    name,
    url,
    author,
    credibility,
    date: new Date().toISOString()
  };
}

