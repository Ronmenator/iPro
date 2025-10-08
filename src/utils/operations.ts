import { EditOp, DocEditBatch, ApplyResult, SimulateResult, Block, DiffBlock, Document } from '../types/ops';
import { hashDocument, hashBlock, normalizeText, generateBlockId } from './hashing';
import { useOutlineStore } from '../store/outlineStore';

/**
 * Simulate operations on a document without applying them
 * Returns a visual diff showing what would change
 */
export async function simulateOps(
  batch: DocEditBatch,
  currentDoc: Document
): Promise<SimulateResult> {
  // Check base version
  if (batch.baseVersion !== currentDoc.baseVersion) {
    return {
      ok: false,
      code: 'BASE_VERSION_MISMATCH',
    };
  }

  // Clone blocks for simulation
  let blocks = [...currentDoc.blocks];
  const diff: DiffBlock[] = [];
  const changedBlockIds = new Set<string>();

  // Apply each operation
  for (const op of batch.ops) {
    const result = await applyOperation(op, blocks, diff, changedBlockIds, true);
    if (!result.ok) {
      return result;
    }
    blocks = result.blocks;
  }

  // Compute new version
  const newVersion = await hashDocument(blocks);

  return {
    ok: true,
    diff,
    newVersion,
    changedBlocks: Array.from(changedBlockIds),
  };
}

/**
 * Apply operations to a document
 * Returns success or conflict information
 */
export async function applyOps(
  batch: DocEditBatch,
  currentDoc: Document
): Promise<{ result: ApplyResult; newBlocks?: Block[] }> {
  // Check base version
  if (batch.baseVersion !== currentDoc.baseVersion) {
    return {
      result: {
        ok: false,
        code: 'BASE_VERSION_MISMATCH',
      },
    };
  }

  // Clone blocks for application
  let blocks = [...currentDoc.blocks];
  const diff: DiffBlock[] = [];
  const changedBlockIds = new Set<string>();

  // Apply each operation
  for (const op of batch.ops) {
    const result = await applyOperation(op, blocks, diff, changedBlockIds, false);
    if (!result.ok) {
      return { result };
    }
    blocks = result.blocks;
  }

  // Compute new version
  const newVersion = await hashDocument(blocks);

  return {
    result: {
      ok: true,
      newVersion,
      changedBlocks: Array.from(changedBlockIds),
    },
    newBlocks: blocks,
  };
}

/**
 * Apply a single operation to blocks
 */
async function applyOperation(
  op: EditOp,
  blocks: Block[],
  diff: DiffBlock[],
  changedBlockIds: Set<string>,
  isSimulation: boolean
): Promise<{ ok: true; blocks: Block[] } | SimulateResult> {
  switch (op.op) {
    case 'replace': {
      const blockIndex = blocks.findIndex(b => b.id === op.blockId);
      if (blockIndex === -1) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: '', currentHash: '' }],
        };
      }

      const block = blocks[blockIndex];

      // Check expectHash if provided
      if (op.expectHash && block.hash !== op.expectHash) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: block.text, currentHash: block.hash }],
        };
      }

      const oldText = block.text;
      const newText = oldText.slice(0, op.range.start) + op.text + oldText.slice(op.range.end);
      const newHash = await hashBlock(newText);

      blocks[blockIndex] = { ...block, text: newText, hash: newHash };
      changedBlockIds.add(op.blockId);

      if (isSimulation) {
        diff.push({
          blockId: op.blockId,
          type: 'modified',
          oldText,
          newText,
        });
      }

      return { ok: true, blocks };
    }

    case 'replaceBlock': {
      const blockIndex = blocks.findIndex(b => b.id === op.blockId);
      if (blockIndex === -1) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: '', currentHash: '' }],
        };
      }

      const block = blocks[blockIndex];

      // Check expectHash if provided
      if (op.expectHash && block.hash !== op.expectHash) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: block.text, currentHash: block.hash }],
        };
      }

      const oldText = block.text;
      const newHash = await hashBlock(op.text);

      blocks[blockIndex] = { ...block, text: op.text, hash: newHash };
      changedBlockIds.add(op.blockId);

      if (isSimulation) {
        diff.push({
          blockId: op.blockId,
          type: 'modified',
          oldText,
          newText: op.text,
        });
      }

      return { ok: true, blocks };
    }

    case 'insertAfter': {
      const blockIndex = blocks.findIndex(b => b.id === op.blockId);
      if (blockIndex === -1) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: '', currentHash: '' }],
        };
      }

      const newBlockId = op.newBlockId || generateBlockId();
      const newHash = await hashBlock(op.text);
      const newBlock: Block = {
        id: newBlockId,
        type: 'paragraph',
        text: op.text,
        hash: newHash,
      };

      blocks.splice(blockIndex + 1, 0, newBlock);
      changedBlockIds.add(newBlockId);

      if (isSimulation) {
        diff.push({
          blockId: newBlockId,
          type: 'inserted',
          newText: op.text,
        });
      }

      return { ok: true, blocks };
    }

    case 'deleteBlock': {
      const blockIndex = blocks.findIndex(b => b.id === op.blockId);
      if (blockIndex === -1) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: '', currentHash: '' }],
        };
      }

      // Note: Delete guard check should be done before calling this function
      // This is where the actual deletion happens after guard check passes

      const block = blocks[blockIndex];
      blocks.splice(blockIndex, 1);
      changedBlockIds.add(op.blockId);

      if (isSimulation) {
        diff.push({
          blockId: op.blockId,
          type: 'deleted',
          oldText: block.text,
        });
      }

      return { ok: true, blocks };
    }

    case 'moveBlock': {
      const blockIndex = blocks.findIndex(b => b.id === op.blockId);
      const afterIndex = blocks.findIndex(b => b.id === op.afterBlockId);

      if (blockIndex === -1 || afterIndex === -1) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: '', currentHash: '' }],
        };
      }

      const [block] = blocks.splice(blockIndex, 1);
      const newAfterIndex = blocks.findIndex(b => b.id === op.afterBlockId);
      blocks.splice(newAfterIndex + 1, 0, block);
      changedBlockIds.add(op.blockId);

      if (isSimulation) {
        diff.push({
          blockId: op.blockId,
          type: 'moved',
        });
      }

      return { ok: true, blocks };
    }

    case 'annotate': {
      const blockIndex = blocks.findIndex(b => b.id === op.blockId);
      if (blockIndex === -1) {
        return {
          ok: false,
          code: 'EXPECT_HASH_MISMATCH',
          conflicts: [{ blockId: op.blockId, currentText: '', currentHash: '' }],
        };
      }

      // Annotation doesn't change the block text or hash
      changedBlockIds.add(op.blockId);

      if (isSimulation) {
        diff.push({
          blockId: op.blockId,
          type: 'unchanged',
          annotation: op.note,
        });
      }

      return { ok: true, blocks };
    }

    default:
      return { ok: true, blocks };
  }
}

