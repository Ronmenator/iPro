import { Document, Block } from '../types/ops';
import { StyleConfig, LintIssue, LintReport } from '../types/lint';

/**
 * Lint a document based on style rules
 */
export function lintDocument(doc: Document, config: StyleConfig): LintReport {
  const issues: LintIssue[] = [];

  doc.blocks.forEach((block, index) => {
    // Check adverbs (-ly words)
    if (config.preferences.limitAdverbs) {
      const adverbIssues = findAdverbs(block, index);
      issues.push(...adverbIssues);
    }

    // Check passive voice
    if (config.preferences.avoidPassiveVoice) {
      const passiveIssues = findPassiveVoice(block, index);
      issues.push(...passiveIssues);
    }

    // Check banlist words
    if (config.banlist.length > 0) {
      const banlistIssues = findBanlistWords(block, index, config.banlist);
      issues.push(...banlistIssues);
    }

    // Check clichés
    if (config.preferences.avoidClichés && config.clichés) {
      const clichéIssues = findClichés(block, index, config.clichés);
      issues.push(...clichéIssues);
    }

    // Check paragraph length
    if (config.preferences.maxParagraphLength && block.type === 'paragraph') {
      const lengthIssue = checkParagraphLength(block, index, config.preferences.maxParagraphLength);
      if (lengthIssue) issues.push(lengthIssue);
    }
  });

  const summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    suggestions: issues.filter(i => i.severity === 'suggestion').length,
  };

  return {
    docId: doc.id,
    timestamp: Date.now(),
    issues,
    summary,
  };
}

/**
 * Find -ly adverbs in text
 */
function findAdverbs(block: Block, blockIndex: number): LintIssue[] {
  const issues: LintIssue[] = [];
  const adverbRegex = /\b(\w+ly)\b/gi;
  
  // Common -ly words that aren't adverbs
  const exceptions = ['early', 'only', 'daily', 'family', 'likely', 'lonely', 'lovely', 'holy', 'silly'];
  
  let match;
  while ((match = adverbRegex.exec(block.text)) !== null) {
    const word = match[1].toLowerCase();
    if (!exceptions.includes(word)) {
      issues.push({
        id: `adverb_${block.id}_${match.index}`,
        blockId: block.id,
        blockIndex,
        type: 'adverb',
        severity: 'suggestion',
        message: `Consider removing or replacing the adverb "${match[1]}"`,
        suggestion: 'Adverbs can often weaken prose. Try using a stronger verb instead.',
        position: {
          start: match.index,
          end: match.index + match[1].length,
        },
        matched: match[1],
      });
    }
  }

  return issues;
}

/**
 * Find passive voice constructions
 */
function findPassiveVoice(block: Block, blockIndex: number): LintIssue[] {
  const issues: LintIssue[] = [];
  
  // Simple heuristic: "was/were/is/are/been/be" + past participle
  const passivePattern = /\b(was|were|is|are|been|be|being)\s+(\w+ed|done|gone|taken|given|made|seen|known)\b/gi;
  
  let match;
  while ((match = passivePattern.exec(block.text)) !== null) {
    issues.push({
      id: `passive_${block.id}_${match.index}`,
      blockId: block.id,
      blockIndex,
      type: 'passive',
      severity: 'warning',
      message: `Possible passive voice: "${match[0]}"`,
      suggestion: 'Consider using active voice for more direct, engaging prose.',
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
      matched: match[0],
    });
  }

  return issues;
}

/**
 * Find banned words in text
 */
function findBanlistWords(block: Block, blockIndex: number, banlist: string[]): LintIssue[] {
  const issues: LintIssue[] = [];
  
  banlist.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(block.text)) !== null) {
      issues.push({
        id: `banlist_${block.id}_${match.index}`,
        blockId: block.id,
        blockIndex,
        type: 'banlist',
        severity: 'warning',
        message: `Avoid weak word: "${match[0]}"`,
        suggestion: `The word "${word}" is on your banlist. Consider removing or replacing it.`,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
        matched: match[0],
      });
    }
  });

  return issues;
}

/**
 * Find clichés in text
 */
function findClichés(block: Block, blockIndex: number, clichés: string[]): LintIssue[] {
  const issues: LintIssue[] = [];
  
  clichés.forEach(cliché => {
    const index = block.text.toLowerCase().indexOf(cliché.toLowerCase());
    if (index !== -1) {
      issues.push({
        id: `cliché_${block.id}_${index}`,
        blockId: block.id,
        blockIndex,
        type: 'cliché',
        severity: 'suggestion',
        message: `Cliché detected: "${cliché}"`,
        suggestion: 'Try to find a more original way to express this idea.',
        position: {
          start: index,
          end: index + cliché.length,
        },
        matched: block.text.substring(index, index + cliché.length),
      });
    }
  });

  return issues;
}

/**
 * Check paragraph length
 */
function checkParagraphLength(block: Block, blockIndex: number, maxLength: number): LintIssue | null {
  if (block.text.length > maxLength) {
    return {
      id: `length_${block.id}`,
      blockId: block.id,
      blockIndex,
      type: 'length',
      severity: 'suggestion',
      message: `Paragraph is ${block.text.length} characters (max: ${maxLength})`,
      suggestion: 'Consider breaking this into multiple paragraphs for better readability.',
      position: {
        start: 0,
        end: block.text.length,
      },
      matched: block.text,
    };
  }
  return null;
}

/**
 * Load style config from JSON
 */
export async function loadStyleConfig(): Promise<StyleConfig> {
  try {
    const response = await fetch('/style/voice.json');
    if (!response.ok) {
      throw new Error('Failed to load style config');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load style config:', error);
    // Return default config
    return {
      tense: 'past',
      person: 'third',
      banlist: [],
      preferences: {
        limitAdverbs: true,
        avoidPassiveVoice: true,
      },
      toneGuidelines: '',
    };
  }
}

