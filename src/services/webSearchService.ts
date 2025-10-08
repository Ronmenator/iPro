/**
 * Web Search Service - AI Research Web Search
 * 
 * This service provides web search capabilities for the AI research system.
 * It uses DuckDuckGo and other free APIs to gather research information.
 */

import { ResearchSearchResult, ResearchSource, createResearchSource } from '../types/research';

/**
 * Web search configuration
 */
interface WebSearchConfig {
  maxResults: number;
  timeout: number;
  userAgent: string;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  maxResults: 10,
  timeout: 10000,
  userAgent: 'MondayWriter/1.0 (AI Research Assistant)'
};

/**
 * DuckDuckGo Instant Answer API response
 */
interface DuckDuckGoResponse {
  Abstract: string;
  AbstractText: string;
  AbstractSource: string;
  AbstractURL: string;
  Image: string;
  Heading: string;
  Answer: string;
  AnswerType: string;
  Definition: string;
  DefinitionSource: string;
  DefinitionURL: string;
  Entity: string;
  Redirect: string;
  RelatedTopics: Array<{
    FirstURL: string;
    Icon: { URL: string };
    Result: string;
    Text: string;
  }>;
  Results: Array<{
    FirstURL: string;
    Icon: { URL: string };
    Result: string;
    Text: string;
  }>;
  Type: string;
}

/**
 * Web Search Service Class
 */
export class WebSearchService {
  private config: WebSearchConfig;

  constructor(config: Partial<WebSearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search for information using DuckDuckGo
   */
  async searchDuckDuckGo(query: string): Promise<ResearchSearchResult[]> {
    try {
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await this.fetchWithTimeout(searchUrl);
      const data: DuckDuckGoResponse = await response.json();
      
      const results: ResearchSearchResult[] = [];
      
      // Add instant answer if available
      if (data.Abstract && data.AbstractText) {
        results.push({
          title: data.Heading || data.Abstract,
          url: data.AbstractURL || '',
          snippet: data.AbstractText,
          source: data.AbstractSource || 'DuckDuckGo',
          relevance: 0.9,
          credibility: 0.8
        });
      }
      
      // Add related topics
      if (data.RelatedTopics) {
        data.RelatedTopics.forEach(topic => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Result || topic.Text.substring(0, 100),
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo Related',
              relevance: 0.7,
              credibility: 0.7
            });
          }
        });
      }
      
      // Add regular results
      if (data.Results) {
        data.Results.forEach(result => {
          if (result.Text && result.FirstURL) {
            results.push({
              title: result.Result || result.Text.substring(0, 100),
              url: result.FirstURL,
              snippet: result.Text,
              source: 'DuckDuckGo',
              relevance: 0.6,
              credibility: 0.6
            });
          }
        });
      }
      
      return results.slice(0, this.config.maxResults);
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
      return [];
    }
  }

  /**
   * Search using Wikipedia API
   */
  async searchWikipedia(query: string): Promise<ResearchSearchResult[]> {
    try {
      // First, search for pages using the search API
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&srprop=snippet`;
      
      const response = await this.fetchWithTimeout(searchUrl);
      const data = await response.json();
      
      if (!data.query?.search || data.query.search.length === 0) {
        return [];
      }
      
      const results: ResearchSearchResult[] = [];
      
      // Get detailed information for each search result
      for (const item of data.query.search) {
        try {
          const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
          
          const summaryResponse = await this.fetchWithTimeout(summaryUrl);
          const summaryData = await summaryResponse.json();
          
          if (summaryData.extract) {
            results.push({
              title: item.title,
              url: pageUrl,
              snippet: summaryData.extract,
              source: 'Wikipedia',
              relevance: 0.9,
              credibility: 0.9
            });
          } else if (item.snippet) {
            // Fallback to search snippet if summary fails
            results.push({
              title: item.title,
              url: pageUrl,
              snippet: item.snippet.replace(/<[^>]*>/g, ''), // Remove HTML tags
              source: 'Wikipedia',
              relevance: 0.8,
              credibility: 0.8
            });
          }
        } catch (error) {
          // If individual page summary fails, use search snippet
          const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
          results.push({
            title: item.title,
            url: pageUrl,
            snippet: item.snippet?.replace(/<[^>]*>/g, '') || 'No description available',
            source: 'Wikipedia',
            relevance: 0.7,
            credibility: 0.8
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Wikipedia search failed:', error);
      return [];
    }
  }

  /**
   * Search Wikipedia disambiguation pages
   */
  private async searchWikipediaDisambiguation(query: string): Promise<ResearchSearchResult[]> {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5`;
      
      const response = await this.fetchWithTimeout(searchUrl);
      const data = await response.json();
      
      const results: ResearchSearchResult[] = [];
      
      if (data.query?.search) {
        for (const item of data.query.search) {
          const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
          
          try {
            const summaryResponse = await this.fetchWithTimeout(summaryUrl);
            const summaryData = await summaryResponse.json();
            
            if (summaryData.extract) {
              results.push({
                title: item.title,
                url: pageUrl,
                snippet: summaryData.extract,
                source: 'Wikipedia',
                relevance: 0.8,
                credibility: 0.9
              });
            }
          } catch (error) {
            // If summary fails, use the search snippet
            results.push({
              title: item.title,
              url: pageUrl,
              snippet: item.snippet,
              source: 'Wikipedia',
              relevance: 0.7,
              credibility: 0.8
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Wikipedia disambiguation search failed:', error);
      return [];
    }
  }

  /**
   * Search using multiple sources and combine results
   */
  async searchMultiple(query: string): Promise<ResearchSearchResult[]> {
    // Clean the query first
    const cleanQuery = this.cleanQuery(query);
    
    try {
      const [duckDuckGoResults, wikipediaResults] = await Promise.allSettled([
        this.searchDuckDuckGo(cleanQuery),
        this.searchWikipedia(cleanQuery)
      ]);
      
      // Extract results from settled promises
      const allResults: ResearchSearchResult[] = [];
      
      if (duckDuckGoResults.status === 'fulfilled') {
        allResults.push(...duckDuckGoResults.value);
      } else {
        console.warn('DuckDuckGo search failed:', duckDuckGoResults.reason);
      }
      
      if (wikipediaResults.status === 'fulfilled') {
        allResults.push(...wikipediaResults.value);
      } else {
        console.warn('Wikipedia search failed:', wikipediaResults.reason);
      }
      
      // If no results from either source, try a fallback search
      if (allResults.length === 0) {
        console.log('No results from primary sources, trying fallback search...');
        const fallbackResults = await this.fallbackSearch(cleanQuery);
        allResults.push(...fallbackResults);
      }
      
      // Combine and deduplicate results
      const uniqueResults = this.deduplicateResults(allResults);
      
      // Sort by relevance and credibility
      return uniqueResults
        .sort((a, b) => (b.relevance + b.credibility) - (a.relevance + a.credibility))
        .slice(0, this.config.maxResults);
    } catch (error) {
      console.error('Search failed completely:', error);
      return [];
    }
  }

  /**
   * Deduplicate search results based on URL and title similarity
   */
  private deduplicateResults(results: ResearchSearchResult[]): ResearchSearchResult[] {
    const seen = new Set<string>();
    const deduplicated: ResearchSearchResult[] = [];
    
    for (const result of results) {
      const key = result.url || result.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }
    
    return deduplicated;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Create research source from search result
   */
  createResearchSource(result: ResearchSearchResult): ResearchSource {
    return createResearchSource(
      'web',
      result.source,
      result.url,
      undefined,
      result.credibility
    );
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if URL is from a credible source
   */
  isCredibleSource(url: string): boolean {
    const credibleDomains = [
      'wikipedia.org',
      'britannica.com',
      'nationalgeographic.com',
      'history.com',
      'biography.com',
      'britannica.com',
      'academic.edu',
      'jstor.org',
      'scholar.google.com',
      'pubmed.ncbi.nlm.nih.gov'
    ];
    
    const domain = this.extractDomain(url);
    return credibleDomains.some(credibleDomain => 
      domain.includes(credibleDomain)
    );
  }

  /**
   * Clean and optimize search query
   */
  cleanQuery(query: string): string {
    // Remove common stop words and clean up the query
    const stopWords = ['find', 'information', 'about', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .join(' ')
      .trim();
  }

  /**
   * Fallback search when primary sources fail
   */
  private async fallbackSearch(query: string): Promise<ResearchSearchResult[]> {
    try {
      // Try a simplified Wikipedia search with just the main terms
      const simplifiedQuery = query.split(' ').slice(0, 3).join(' ');
      return await this.searchWikipedia(simplifiedQuery);
    } catch (error) {
      console.error('Fallback search failed:', error);
      return [];
    }
  }
}

/**
 * Default web search service instance
 */
export const webSearchService = new WebSearchService();

/**
 * Search for research information
 */
export async function searchResearch(query: string): Promise<ResearchSearchResult[]> {
  return webSearchService.searchMultiple(query);
}

  /**
   * Search for specific types of research
   */
export async function searchResearchByType(
  query: string, 
  type: 'character' | 'location' | 'timeline' | 'concept' | 'fact'
): Promise<ResearchSearchResult[]> {
  const typeModifiers = {
    character: 'biography personality traits background',
    location: 'place geography history location',
    timeline: 'timeline chronology history events',
    concept: 'theory idea definition concept',
    fact: 'facts statistics data information'
  };
  
  // Clean the base query first
  const cleanBaseQuery = webSearchService.cleanQuery(query);
  
  // Add type-specific modifiers
  const enhancedQuery = `${cleanBaseQuery} ${typeModifiers[type]}`;
  return searchResearch(enhancedQuery);
}

