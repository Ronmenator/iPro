import { Document, Block } from '../types/ops';

/**
 * Convert a block to markdown format
 */
export function blockToMarkdown(block: Block): string {
  if (block.type === 'heading') {
    const level = block.level || 1;
    return '#'.repeat(level) + ' ' + block.text;
  }
  return block.text;
}

/**
 * Convert a document to markdown content
 */
export function documentToMarkdown(doc: Document): string {
  const lines: string[] = [];
  
  // Add metadata as frontmatter
  lines.push('---');
  lines.push(`id: ${doc.id}`);
  lines.push(`title: ${doc.title}`);
  lines.push(`baseVersion: ${doc.baseVersion}`);
  lines.push(`lastModified: ${doc.lastModified}`);
  lines.push('---');
  lines.push('');
  
  // Add blocks
  doc.blocks.forEach((block, index) => {
    // Add block ID as HTML comment
    lines.push(`<!-- id: ${block.id} -->`);
    if (block.hash) {
      lines.push(`<!-- hash: ${block.hash} -->`);
    }
    lines.push(blockToMarkdown(block));
    
    // Add blank line between blocks
    if (index < doc.blocks.length - 1) {
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

/**
 * Parse markdown content into a document
 */
export function markdownToDocument(content: string, id: string): Partial<Document> {
  const lines = content.split('\n');
  let metadata: any = {};
  let inFrontmatter = false;
  let frontmatterEnd = 0;
  
  // Parse frontmatter
  if (lines[0] === '---') {
    inFrontmatter = true;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        frontmatterEnd = i + 1;
        break;
      }
      const match = lines[i].match(/^(\w+):\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }
  }
  
  // Parse blocks
  const blocks: Block[] = [];
  let currentBlock: Partial<Block> | null = null;
  let currentBlockId: string | null = null;
  let currentBlockHash: string | null = null;
  
  for (let i = frontmatterEnd; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse block ID comment
    if (line.startsWith('<!-- id:')) {
      currentBlockId = line.match(/<!-- id: (.+) -->/)?.[1] || null;
      continue;
    }
    
    // Parse hash comment
    if (line.startsWith('<!-- hash:')) {
      currentBlockHash = line.match(/<!-- hash: (.+) -->/)?.[1] || null;
      continue;
    }
    
    // Skip empty lines
    if (!line) {
      if (currentBlock && currentBlockId) {
        blocks.push({
          id: currentBlockId,
          type: currentBlock.type || 'paragraph',
          text: currentBlock.text || '',
          level: currentBlock.level,
          hash: currentBlockHash || undefined,
        } as Block);
        currentBlock = null;
        currentBlockId = null;
        currentBlockHash = null;
      }
      continue;
    }
    
    // Parse heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentBlock && currentBlockId) {
        blocks.push({
          id: currentBlockId,
          type: currentBlock.type || 'paragraph',
          text: currentBlock.text || '',
          level: currentBlock.level,
          hash: currentBlockHash || undefined,
        } as Block);
      }
      currentBlock = {
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      };
      continue;
    }
    
    // Parse paragraph
    if (!currentBlock) {
      currentBlock = {
        type: 'paragraph',
        text: line,
      };
    } else {
      currentBlock.text = (currentBlock.text || '') + ' ' + line;
    }
  }
  
  // Add last block
  if (currentBlock && currentBlockId) {
    blocks.push({
      id: currentBlockId,
      type: currentBlock.type || 'paragraph',
      text: currentBlock.text || '',
      level: currentBlock.level,
      hash: currentBlockHash || undefined,
    } as Block);
  }
  
  return {
    id: metadata.id || id,
    title: metadata.title || 'Untitled',
    blocks,
    baseVersion: metadata.baseVersion,
    lastModified: metadata.lastModified ? parseInt(metadata.lastModified) : Date.now(),
  };
}

/**
 * Get file path for a document based on its ID
 */
export function getDocumentFilePath(docId: string): string {
  // Convert ID like "scene/scene-01" to "scenes/scene-01.md"
  const parts = docId.split('/');
  if (parts.length === 2) {
    const [category, filename] = parts;
    // Pluralize category
    const folder = category === 'chapter' ? 'chapters' : 
                   category === 'scene' ? 'scenes' : 
                   category;
    return `${folder}/${filename}.md`;
  }
  // Handle special cases like "book/metadata"
  return `${docId}.md`;
}

/**
 * Get document ID from file path
 */
export function getDocumentIdFromPath(filePath: string): string {
  // Convert path like "scenes/scene-01.md" to "scene/scene-01"
  const withoutExt = filePath.replace(/\.md$/, '');
  const parts = withoutExt.split('/');
  
  if (parts.length === 2) {
    const [folder, filename] = parts;
    // Singularize folder
    const category = folder === 'chapters' ? 'chapter' : 
                     folder === 'scenes' ? 'scene' : 
                     folder;
    return `${category}/${filename}`;
  }
  
  return withoutExt;
}

/**
 * Export all documents to a file structure
 * Returns a map of file paths to content
 */
export function exportProject(documents: Document[]): Map<string, string> {
  const files = new Map<string, string>();
  
  documents.forEach(doc => {
    const filePath = getDocumentFilePath(doc.id);
    const content = documentToMarkdown(doc);
    files.set(filePath, content);
  });
  
  return files;
}

/**
 * Import documents from file structure
 * Takes a map of file paths to content
 */
export function importProject(files: Map<string, string>): Partial<Document>[] {
  const documents: Partial<Document>[] = [];
  
  files.forEach((content, filePath) => {
    if (filePath.endsWith('.md')) {
      const docId = getDocumentIdFromPath(filePath);
      const doc = markdownToDocument(content, docId);
      documents.push(doc);
    }
  });
  
  return documents;
}

/**
 * Browser-based export: trigger download of all files as ZIP
 */
export async function downloadProjectAsZip(documents: Document[], projectName: string = 'MyBook') {
  const files = exportProject(documents);
  
  // For browser environment, we'll create a simple structure
  // and let the user download files one by one or as a ZIP if a library is available
  
  // For now, create a data URL with all content
  const manifest: any = {
    projectName,
    exportDate: new Date().toISOString(),
    files: Array.from(files.keys()),
  };
  
  files.set('project.json', JSON.stringify(manifest, null, 2));
  
  return files;
}

/**
 * Browser-based import: read files from FileList
 */
export async function uploadProjectFiles(fileList: FileList): Promise<Partial<Document>[]> {
  const files = new Map<string, string>();
  
  // Read all files
  const readPromises = Array.from(fileList).map(file => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          // Get relative path from file.webkitRelativePath or file.name
          const path = (file as any).webkitRelativePath || file.name;
          // Remove leading folder if present
          const cleanPath = path.split('/').slice(-2).join('/');
          files.set(cleanPath, e.target.result as string);
        }
        resolve();
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  });
  
  await Promise.all(readPromises);
  
  return importProject(files);
}

