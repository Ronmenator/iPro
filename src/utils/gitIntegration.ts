/**
 * Git Integration Module
 * 
 * Optional feature to commit changes per accepted batch.
 * This module provides hooks for Git operations that can be
 * implemented via Electron's file system access.
 */

import { Operation } from '../types/ops';
import { gitCommitBatch } from './electronFileIO';

export interface GitConfig {
  enabled: boolean;
  autoCommit: boolean;
  commitPrefix: string;
  userName?: string;
  userEmail?: string;
}

const DEFAULT_CONFIG: GitConfig = {
  enabled: false,
  autoCommit: false,
  commitPrefix: '[Monday Writer]',
};

/**
 * Get Git configuration from localStorage
 */
export function getGitConfig(): GitConfig {
  try {
    const stored = localStorage.getItem('monday-git-config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading Git config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save Git configuration to localStorage
 */
export function saveGitConfig(config: Partial<GitConfig>): void {
  try {
    const current = getGitConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('monday-git-config', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving Git config:', error);
  }
}

/**
 * Generate commit message from operations
 */
export function generateCommitMessage(operations: Operation[]): string {
  const config = getGitConfig();
  
  const stats = {
    replace: 0,
    replaceBlock: 0,
    insertAfter: 0,
    deleteBlock: 0,
    moveBlock: 0,
    annotate: 0,
  };
  
  operations.forEach(op => {
    stats[op.type] = (stats[op.type] || 0) + 1;
  });
  
  const parts: string[] = [];
  if (stats.replace) parts.push(`${stats.replace} text replacement${stats.replace > 1 ? 's' : ''}`);
  if (stats.replaceBlock) parts.push(`${stats.replaceBlock} block replacement${stats.replaceBlock > 1 ? 's' : ''}`);
  if (stats.insertAfter) parts.push(`${stats.insertAfter} insertion${stats.insertAfter > 1 ? 's' : ''}`);
  if (stats.deleteBlock) parts.push(`${stats.deleteBlock} deletion${stats.deleteBlock > 1 ? 's' : ''}`);
  if (stats.moveBlock) parts.push(`${stats.moveBlock} move${stats.moveBlock > 1 ? 's' : ''}`);
  if (stats.annotate) parts.push(`${stats.annotate} annotation${stats.annotate > 1 ? 's' : ''}`);
  
  const summary = parts.join(', ');
  return `${config.commitPrefix} ${summary}`;
}

/**
 * Commit a batch of operations to Git
 */
export async function commitOperationBatch(
  batchId: string,
  operations: Operation[],
  customMessage?: string
): Promise<{ success: boolean; message?: string }> {
  const config = getGitConfig();
  
  if (!config.enabled) {
    return { success: false, message: 'Git integration is disabled' };
  }
  
  try {
    const message = customMessage || generateCommitMessage(operations);
    const result = await gitCommitBatch(message, operations);
    
    if (result.success) {
      console.log(`Git commit successful: ${message}`);
    } else {
      console.error('Git commit failed:', result.message);
    }
    
    return result;
  } catch (error: any) {
    console.error('Error committing to Git:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Auto-commit hook to be called after applying operations
 */
export async function autoCommitIfEnabled(
  batchId: string,
  operations: Operation[]
): Promise<void> {
  const config = getGitConfig();
  
  if (config.enabled && config.autoCommit) {
    await commitOperationBatch(batchId, operations);
  }
}

/**
 * Check if Git is available (Electron only)
 */
export function isGitAvailable(): boolean {
  return window.electron?.isElectron === true;
}

