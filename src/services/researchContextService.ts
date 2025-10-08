/**
 * Research Context Service - Provides research context to AI
 * 
 * This service integrates research data with the AI system to provide
 * relevant research context when making suggestions or edits.
 */

import { useResearchStore } from '../store/researchStore';
import { ResearchItem, ResearchType } from '../types/research';

/**
 * Research context for AI operations
 */
export interface ResearchContext {
  relevantItems: ResearchItem[];
  contextSummary: string;
  suggestions: string[];
}

/**
 * Get research context for a given query or document
 */
export function getResearchContext(
  query: string,
  docId?: string,
  maxItems: number = 5
): ResearchContext {
  const { searchResearchItems, getAllResearchItems } = useResearchStore.getState();
  
  // Search for relevant research items
  const relevantItems = searchResearchItems(query, undefined)
    .slice(0, maxItems);
  
  // If no specific results, get recent items
  if (relevantItems.length === 0) {
    const allItems = getAllResearchItems();
    relevantItems.push(...allItems
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, maxItems)
    );
  }
  
  // Generate context summary
  const contextSummary = generateContextSummary(relevantItems, query);
  
  // Generate suggestions
  const suggestions = generateSuggestions(relevantItems, query);
  
  return {
    relevantItems,
    contextSummary,
    suggestions
  };
}

/**
 * Get research context for a specific research type
 */
export function getResearchContextByType(
  query: string,
  type: ResearchType,
  maxItems: number = 5
): ResearchContext {
  const { searchResearchItems, getResearchItemsByType } = useResearchStore.getState();
  
  // Search for items of specific type
  const typeItems = getResearchItemsByType(type);
  const searchResults = searchResearchItems(query, type);
  
  // Combine and deduplicate
  const allItems = [...typeItems, ...searchResults];
  const uniqueItems = allItems.filter((item, index, self) => 
    index === self.findIndex(t => t.id === item.id)
  );
  
  const relevantItems = uniqueItems.slice(0, maxItems);
  
  const contextSummary = generateContextSummary(relevantItems, query);
  const suggestions = generateSuggestions(relevantItems, query);
  
  return {
    relevantItems,
    contextSummary,
    suggestions
  };
}

/**
 * Generate a context summary from research items
 */
function generateContextSummary(items: ResearchItem[], query: string): string {
  if (items.length === 0) {
    return 'No relevant research found.';
  }
  
  const summaries = items.map(item => {
    const typeLabel = getTypeLabel(item.type);
    return `${typeLabel}: ${item.title} - ${item.content.substring(0, 100)}...`;
  });
  
  return `Research Context for "${query}":\n${summaries.join('\n')}`;
}

/**
 * Generate suggestions based on research items
 */
function generateSuggestions(items: ResearchItem[], query: string): string[] {
  const suggestions: string[] = [];
  
  // Group by type
  const byType = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<ResearchType, ResearchItem[]>);
  
  // Generate type-specific suggestions
  Object.entries(byType).forEach(([type, typeItems]) => {
    const typeLabel = getTypeLabel(type as ResearchType);
    if (typeItems.length > 0) {
      suggestions.push(`Consider ${typeLabel.toLowerCase()} details: ${typeItems.map(i => i.title).join(', ')}`);
    }
  });
  
  // Add general suggestions
  if (items.length > 0) {
    suggestions.push(`Use research from ${items.length} sources to enhance authenticity`);
    suggestions.push(`Cross-reference information for accuracy`);
  }
  
  return suggestions;
}

/**
 * Get human-readable type label
 */
function getTypeLabel(type: ResearchType): string {
  const labels: Record<ResearchType, string> = {
    character: 'Character',
    location: 'Location',
    timeline: 'Timeline',
    concept: 'Concept',
    fact: 'Fact',
    reference: 'Reference',
    inspiration: 'Inspiration',
    technical: 'Technical',
    cultural: 'Cultural',
    other: 'Other'
  };
  
  return labels[type] || 'Research';
}

/**
 * Get research context for AI editing
 */
export function getResearchContextForEditing(
  docId: string,
  selection: any,
  instruction: string
): ResearchContext {
  // Extract keywords from instruction and document context
  const keywords = extractKeywords(instruction);
  
  // Get research context
  const context = getResearchContext(keywords.join(' '), docId);
  
  return context;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - could be enhanced with NLP
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !isStopWord(word));
  
  // Remove duplicates
  return [...new Set(words)];
}

/**
 * Check if word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);
  
  return stopWords.has(word);
}

/**
 * Format research context for AI prompt
 */
export function formatResearchContextForAI(context: ResearchContext): string {
  if (context.relevantItems.length === 0) {
    return '';
  }
  
  let prompt = '\n\n--- RESEARCH CONTEXT ---\n';
  prompt += context.contextSummary + '\n\n';
  
  if (context.suggestions.length > 0) {
    prompt += 'Suggestions:\n';
    context.suggestions.forEach(suggestion => {
      prompt += `- ${suggestion}\n`;
    });
  }
  
  prompt += '--- END RESEARCH CONTEXT ---\n';
  
  return prompt;
}

