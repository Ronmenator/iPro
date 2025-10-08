/**
 * Chunk Index - Lightweight BM25-style search for paragraphs
 * 
 * This module provides fast lexical search over document blocks
 * to enable efficient retrieval for AI operations.
 */

export type Chunk = { 
  docId: string; 
  blockId: string; 
  text: string; 
  hash: string; 
  meta?: Record<string, any>;
  type?: 'paragraph' | 'heading';
  level?: number;
};

export type Hit = { 
  docId: string; 
  blockId: string; 
  score: number; 
  preview: string;
  chunk?: Chunk;
};

/**
 * Tokenize text into searchable terms
 */
function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z]+/g) ?? [];
}

/**
 * Calculate BM25-like score
 * Simple implementation without IDF for now
 */
function calculateScore(
  termFreq: number,
  docLength: number,
  avgDocLength: number,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const numerator = termFreq * (k1 + 1);
  const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
  return numerator / denominator;
}

/**
 * ChunkIndex - Fast lexical search over document blocks
 */
export class ChunkIndex {
  private lex = new Map<string, Set<string>>();  // term -> set(blockKey)
  private blocks = new Map<string, Chunk>();     // blockKey -> chunk
  private docLengths = new Map<string, number>(); // blockKey -> term count
  private avgDocLength: number = 0;

  /**
   * Add a chunk to the index
   */
  add(chunk: Chunk): void {
    const key = `${chunk.docId}#${chunk.blockId}`;
    this.blocks.set(key, chunk);
    
    const terms = tokenize(chunk.text);
    this.docLengths.set(key, terms.length);
    
    // Update term index
    for (const t of terms) {
      if (!this.lex.has(t)) {
        this.lex.set(t, new Set());
      }
      this.lex.get(t)!.add(key);
    }
    
    // Update average document length
    this.recalculateAvgLength();
  }

  /**
   * Remove a chunk from the index
   */
  remove(docId: string, blockId: string): void {
    const key = `${docId}#${blockId}`;
    const chunk = this.blocks.get(key);
    
    if (!chunk) return;
    
    // Remove from term index
    const terms = tokenize(chunk.text);
    for (const t of terms) {
      const set = this.lex.get(t);
      if (set) {
        set.delete(key);
        if (set.size === 0) {
          this.lex.delete(t);
        }
      }
    }
    
    // Remove chunk
    this.blocks.delete(key);
    this.docLengths.delete(key);
    this.recalculateAvgLength();
  }

  /**
   * Update a chunk in the index
   */
  update(chunk: Chunk): void {
    this.remove(chunk.docId, chunk.blockId);
    this.add(chunk);
  }

  /**
   * Search the index with BM25 scoring
   */
  search(query: string, limit: number = 20): Hit[] {
    const queryTerms = tokenize(query);
    const scores = new Map<string, number>();
    
    // Calculate scores for each document
    for (const term of queryTerms) {
      const postingList = this.lex.get(term);
      if (!postingList) continue;
      
      for (const key of postingList) {
        const docLength = this.docLengths.get(key) ?? 1;
        const termFreq = tokenize(this.blocks.get(key)!.text)
          .filter(t => t === term).length;
        
        const score = calculateScore(termFreq, docLength, this.avgDocLength);
        scores.set(key, (scores.get(key) ?? 0) + score);
      }
    }
    
    // Sort by score and return top results
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, score]) => {
        const chunk = this.blocks.get(key)!;
        return { 
          docId: chunk.docId, 
          blockId: chunk.blockId, 
          score, 
          preview: chunk.text.slice(0, 160),
          chunk,
        };
      });
  }

  /**
   * Search within a specific document
   */
  searchInDoc(docId: string, query: string, limit: number = 20): Hit[] {
    return this.search(query, limit * 2)
      .filter(hit => hit.docId === docId)
      .slice(0, limit);
  }

  /**
   * Get all chunks for a document
   */
  getDocumentChunks(docId: string): Chunk[] {
    const chunks: Chunk[] = [];
    for (const [key, chunk] of this.blocks.entries()) {
      if (chunk.docId === docId) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  /**
   * Get a specific chunk
   */
  getChunk(docId: string, blockId: string): Chunk | undefined {
    const key = `${docId}#${blockId}`;
    return this.blocks.get(key);
  }

  /**
   * Clear the entire index
   */
  clear(): void {
    this.lex.clear();
    this.blocks.clear();
    this.docLengths.clear();
    this.avgDocLength = 0;
  }

  /**
   * Get index statistics
   */
  getStats(): { totalChunks: number; totalTerms: number; avgDocLength: number } {
    return {
      totalChunks: this.blocks.size,
      totalTerms: this.lex.size,
      avgDocLength: this.avgDocLength,
    };
  }

  /**
   * Recalculate average document length
   */
  private recalculateAvgLength(): void {
    if (this.docLengths.size === 0) {
      this.avgDocLength = 0;
      return;
    }
    
    let total = 0;
    for (const length of this.docLengths.values()) {
      total += length;
    }
    this.avgDocLength = total / this.docLengths.size;
  }

  /**
   * Rebuild index from documents
   */
  rebuildFromDocuments(documents: Array<{ id: string; blocks: Array<{ id: string; text: string; hash: string; type?: string; level?: number }> }>): void {
    this.clear();
    
    for (const doc of documents) {
      for (const block of doc.blocks) {
        this.add({
          docId: doc.id,
          blockId: block.id,
          text: block.text,
          hash: block.hash,
          type: block.type as any,
          level: block.level,
        });
      }
    }
  }
}

// Singleton instance
let globalIndex: ChunkIndex | null = null;

/**
 * Get or create the global index
 */
export function getGlobalIndex(): ChunkIndex {
  if (!globalIndex) {
    globalIndex = new ChunkIndex();
  }
  return globalIndex;
}

/**
 * Initialize index from document store
 */
export async function initializeIndex(documents: any[]): Promise<ChunkIndex> {
  const index = getGlobalIndex();
  index.rebuildFromDocuments(documents);
  return index;
}

