/**
 * Selection Tracker for AI Actions
 * 
 * This module provides a simple event-based system for tracking
 * text selections in the editor and making them available to the AI panel.
 */

export interface TextSelection {
  blockId: string;
  start: number;
  end: number;
  text: string;
}

const SELECTION_CHANGE_EVENT = 'monday-selection-change';

/**
 * Emit a selection change event
 */
export function emitSelectionChange(selection: TextSelection | null) {
  const event = new CustomEvent(SELECTION_CHANGE_EVENT, {
    detail: selection,
  });
  window.dispatchEvent(event);
}

/**
 * Listen for selection changes
 */
export function onSelectionChange(callback: (selection: TextSelection | null) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<TextSelection | null>;
    callback(customEvent.detail);
  };

  window.addEventListener(SELECTION_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener(SELECTION_CHANGE_EVENT, handler);
  };
}

/**
 * Get the current selection from TipTap editor
 * This is a helper that can be called from the editor component
 */
export function extractSelection(editor: any, doc: any): TextSelection | null {
  if (!editor || !doc) return null;

  const { from, to } = editor.state.selection;
  
  // Don't emit if nothing is selected
  if (from === to) return null;

  // Find which block contains this selection
  // We'll need to iterate through blocks and find the one that contains the selection
  let currentPos = 0;
  for (const block of doc.blocks) {
    const blockLength = block.text.length + 1; // +1 for newline
    
    if (from >= currentPos && from < currentPos + blockLength) {
      // Selection is in this block
      const start = from - currentPos;
      const end = Math.min(to - currentPos, block.text.length);
      
      return {
        blockId: block.id,
        start,
        end,
        text: block.text.substring(start, end),
      };
    }
    
    currentPos += blockLength;
  }

  return null;
}

