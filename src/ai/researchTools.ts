/**
 * Research Tools for AI Agent
 * 
 * This module provides research tools that the AI can use to search for information
 * and retrieve content from various sources.
 */

import { AgentTool } from './agentTools';
import { ResearchSearchResult } from '../types/research';

/**
 * DuckDuckGo Web Search Tool
 */
export function createDuckDuckGoSearchTool(): AgentTool {
  return {
    name: 'duckduckgo_search',
    description: 'Search the web using DuckDuckGo to find information on any topic. Use this for general web research, finding facts, news, or any information available on the internet.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on DuckDuckGo'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5
        }
      },
      required: ['query']
    },
    handler: async (params) => {
      const { query, maxResults = 5 } = params;
      
      try {
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        // Use CORS proxy to bypass browser restrictions
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'MondayWriter/1.0 (AI Research Assistant)',
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`DuckDuckGo API error: ${response.status}`);
        }
        
        const data = await response.json();
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
        if (data.RelatedTopics && results.length < maxResults) {
          data.RelatedTopics.forEach(topic => {
            if (topic.Text && topic.FirstURL && results.length < maxResults) {
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
        if (data.Results && results.length < maxResults) {
          data.Results.forEach(result => {
            if (result.Text && result.FirstURL && results.length < maxResults) {
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
        
        return {
          success: true,
          results: results.slice(0, maxResults),
          totalFound: results.length,
          query
        };
      } catch (error) {
        return {
          success: false,
          error: `DuckDuckGo search failed: ${error.message}`,
          query
        };
      }
    }
  };
}

/**
 * Wikipedia Search Tool
 */
export function createWikipediaSearchTool(): AgentTool {
  return {
    name: 'wikipedia_search',
    description: 'Search Wikipedia for detailed information on topics. Use this for authoritative, well-sourced information on people, places, concepts, historical events, and other encyclopedic topics.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on Wikipedia'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 3)',
          default: 3
        }
      },
      required: ['query']
    },
    handler: async (params) => {
      const { query, maxResults = 3 } = params;
      
      try {
        // First, search for pages using the search API
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${maxResults}&srprop=snippet`;
        // Use CORS proxy to bypass browser restrictions
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'MondayWriter/1.0 (AI Research Assistant)',
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Wikipedia API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.query?.search || data.query.search.length === 0) {
          return {
            success: true,
            results: [],
            totalFound: 0,
            query
          };
        }
        
        const results: ResearchSearchResult[] = [];
        
        // Get detailed information for each search result
        for (const item of data.query.search) {
          try {
            const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title)}`;
            // Use CORS proxy for summary API
            const proxySummaryUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(summaryUrl)}`;
            
            const summaryResponse = await fetch(proxySummaryUrl, {
              headers: {
                'User-Agent': 'MondayWriter/1.0 (AI Research Assistant)',
                'Accept': 'application/json',
              }
            });
            
            if (summaryResponse.ok) {
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
            } else if (item.snippet) {
              // If summary fails, use search snippet
              results.push({
                title: item.title,
                url: pageUrl,
                snippet: item.snippet.replace(/<[^>]*>/g, ''),
                source: 'Wikipedia',
                relevance: 0.7,
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
        
        return {
          success: true,
          results: results.slice(0, maxResults),
          totalFound: results.length,
          query
        };
      } catch (error) {
        return {
          success: false,
          error: `Wikipedia search failed: ${error.message}`,
          query
        };
      }
    }
  };
}

/**
 * URL Content Retrieval Tool
 */
export function createUrlContentTool(): AgentTool {
  return {
    name: 'get_url_content',
    description: 'Retrieve the full content from a specific URL. Use this to get detailed information from web pages, articles, or other online sources that were found in search results.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to retrieve content from'
        },
        maxLength: {
          type: 'number',
          description: 'Maximum length of content to return (default: 5000 characters)',
          default: 5000
        }
      },
      required: ['url']
    },
    handler: async (params) => {
      const { url, maxLength = 5000 } = params;
      
      try {
        // Validate URL
        new URL(url);
        
        // Use CORS proxy for URL content retrieval
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'MondayWriter/1.0 (AI Research Assistant)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Basic HTML parsing to extract text content
        const textContent = extractTextFromHtml(html);
        
        // Truncate if too long
        const truncatedContent = textContent.length > maxLength 
          ? textContent.substring(0, maxLength) + '...'
          : textContent;
        
        return {
          success: true,
          url,
          content: truncatedContent,
          fullLength: textContent.length,
          truncated: textContent.length > maxLength
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to retrieve content from ${url}: ${error.message}`,
          url
        };
      }
    }
  };
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#039;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Research Query Tool - Combines multiple search sources
 */
export function createResearchQueryTool(): AgentTool {
  return {
    name: 'research_query',
    description: 'Perform comprehensive research on a topic by searching multiple sources (DuckDuckGo and Wikipedia) and providing a summary of findings. Use this for thorough research on any topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The research query or topic to investigate'
        },
        researchType: {
          type: 'string',
          enum: ['general', 'academic', 'news', 'historical', 'biographical', 'technical'],
          description: 'Type of research to perform (default: general)',
          default: 'general'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results per source (default: 3)',
          default: 3
        }
      },
      required: ['query']
    },
    handler: async (params) => {
      const { query, researchType = 'general', maxResults = 3 } = params;
      
      try {
        // Create search tools
        const duckDuckGoTool = createDuckDuckGoSearchTool();
        const wikipediaTool = createWikipediaSearchTool();
        
        // Perform searches in parallel
        console.log(`Starting research for: "${query}"`);
        const [duckDuckGoResult, wikipediaResult] = await Promise.allSettled([
          duckDuckGoTool.handler({ query, maxResults }),
          wikipediaTool.handler({ query, maxResults })
        ]);
        
        console.log('DuckDuckGo result:', duckDuckGoResult);
        console.log('Wikipedia result:', wikipediaResult);
        
        const allResults: ResearchSearchResult[] = [];
        const sources: string[] = [];
        
        // Collect results from DuckDuckGo
        if (duckDuckGoResult.status === 'fulfilled' && duckDuckGoResult.value.success) {
          allResults.push(...duckDuckGoResult.value.results);
          sources.push('DuckDuckGo');
        }
        
        // Collect results from Wikipedia
        if (wikipediaResult.status === 'fulfilled' && wikipediaResult.value.success) {
          allResults.push(...wikipediaResult.value.results);
          sources.push('Wikipedia');
        }
        
        // Deduplicate results
        const uniqueResults = deduplicateResults(allResults);
        
        // Sort by relevance and credibility
        const sortedResults = uniqueResults
          .sort((a, b) => (b.relevance + b.credibility) - (a.relevance + a.credibility))
          .slice(0, maxResults * 2); // Allow more results since we're combining sources
        
        return {
          success: true,
          query,
          researchType,
          results: sortedResults,
          totalFound: sortedResults.length,
          sources: sources,
          summary: generateResearchSummary(sortedResults, query, researchType)
        };
      } catch (error) {
        return {
          success: false,
          error: `Research query failed: ${error.message}`,
          query
        };
      }
    }
  };
}

/**
 * Deduplicate search results based on URL and title similarity
 */
function deduplicateResults(results: ResearchSearchResult[]): ResearchSearchResult[] {
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
 * Generate a research summary
 */
function generateResearchSummary(results: ResearchSearchResult[], query: string, researchType: string): string {
  if (results.length === 0) {
    return `No results found for "${query}" in ${researchType} research.`;
  }
  
  const sourceCounts = results.reduce((acc, result) => {
    acc[result.source] = (acc[result.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => `${source} (${count})`)
    .join(', ');
  
  return `Found ${results.length} results for "${query}" from ${sources}. The most relevant sources include ${results.slice(0, 3).map(r => r.title).join(', ')}.`;
}

/**
 * Get all research tools
 */
export function getResearchTools(): AgentTool[] {
  return [
    createDuckDuckGoSearchTool(),
    createWikipediaSearchTool(),
    createUrlContentTool(),
    createResearchQueryTool()
  ];
}
