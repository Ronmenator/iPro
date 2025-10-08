export interface StyleConfig {
  tense: 'past' | 'present' | 'future';
  person: 'first' | 'second' | 'third';
  banlist: string[];
  preferences: {
    maxParagraphLength?: number;
    maxSentenceLength?: number;
    avoidPassiveVoice?: boolean;
    limitAdverbs?: boolean;
    avoidClichés?: boolean;
  };
  toneGuidelines: string;
  clichés?: string[];
}

export interface LintIssue {
  id: string;
  blockId: string;
  blockIndex: number;
  type: 'adverb' | 'passive' | 'banlist' | 'cliché' | 'length' | 'tense' | 'person';
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  suggestion?: string;
  position: {
    start: number;
    end: number;
  };
  matched: string;
}

export interface LintReport {
  docId: string;
  timestamp: number;
  issues: LintIssue[];
  summary: {
    errors: number;
    warnings: number;
    suggestions: number;
  };
}

