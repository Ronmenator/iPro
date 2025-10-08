export type TextRange = { start: number; end: number }; // UTF-16

export type EditOp =
  | { op: 'replace'; blockId: string; range: TextRange; expectHash?: string; text: string }
  | { op: 'replaceBlock'; blockId: string; expectHash?: string; text: string }
  | { op: 'insertAfter'; blockId: string; newBlockId?: string; text: string }
  | { op: 'deleteBlock'; blockId: string }
  | { op: 'moveBlock'; blockId: string; afterBlockId: string }
  | { op: 'annotate'; blockId: string; note: string };

export type DocEditBatch = {
  type: 'DocEditBatch';
  docId: string;
  baseVersion: string;       // sha256 of the full doc
  ops: EditOp[];
  simulate?: boolean;        // if true, return diff only
  notes?: string;            // rationale
};

export type ApplyResult =
  | { ok: true; newVersion: string; changedBlocks: string[] }
  | { ok: false; code: 'BASE_VERSION_MISMATCH' | 'EXPECT_HASH_MISMATCH'; conflicts?: { blockId: string; currentText: string; currentHash: string }[] };

export type Block = {
  id: string;
  type: 'paragraph' | 'heading';
  level?: number;  // for headings (1-6)
  text: string;
  hash: string;    // sha256 of normalized text
};

export type Document = {
  id: string;
  title: string;
  blocks: Block[];
  baseVersion: string;  // sha256 of full normalized document
  lastModified: number;
};

export type SimulateResult = {
  ok: true;
  diff: DiffBlock[];
  newVersion: string;
  changedBlocks: string[];
} | {
  ok: false;
  code: 'BASE_VERSION_MISMATCH' | 'EXPECT_HASH_MISMATCH';
  conflicts?: { blockId: string; currentText: string; currentHash: string }[];
};

export type DiffBlock = {
  blockId: string;
  type: 'unchanged' | 'modified' | 'inserted' | 'deleted' | 'moved';
  oldText?: string;
  newText?: string;
  annotation?: string;
};

// Tool Surface Types for AI Integration
export type ToolReadBlock = { 
  blockId: string; 
  text: string; 
  hash: string;
  type?: 'paragraph' | 'heading';
  level?: number;
};

export type ToolReadRequest =
  | { docId: string; blockIds: string[] }
  | { docId: string; selection: { blockId: string; start: number; end: number } };

export type ToolSurface = {
  readBlocks(req: ToolReadRequest): Promise<ToolReadBlock[]>;
  simulateOps(batch: DocEditBatch): Promise<{ diffHtml: string; changedBlocks: string[] }>;
  applyOps(batch: DocEditBatch): Promise<{ ok: true; newVersion: string } | { ok: false; code: string }>;
  getStyleRules(): Promise<{ rules: string[]; banlist: string[] }>;
};

