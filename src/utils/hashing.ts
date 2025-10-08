/**
 * Utility functions for SHA-256 hashing
 */

/**
 * Normalize text for consistent hashing:
 * - Trim whitespace
 * - Normalize line endings to \n
 * - Remove multiple consecutive spaces
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/ +/g, ' ');
}

/**
 * Compute SHA-256 hash of text
 * Uses Web Crypto API (browser native)
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Compute hash for a single block
 */
export async function hashBlock(text: string): Promise<string> {
  const normalized = normalizeText(text);
  return sha256(normalized);
}

/**
 * Compute base version hash for entire document
 */
export async function hashDocument(blocks: Array<{ text: string }>): Promise<string> {
  const allText = blocks.map(b => normalizeText(b.text)).join('\n\n');
  return sha256(allText);
}

/**
 * Generate a unique block ID
 */
export function generateBlockId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

