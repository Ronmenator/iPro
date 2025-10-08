import React, { useState, useRef } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useProjectStore } from '../store/projectStore';
import { 
  exportProject, 
  downloadProjectAsZip, 
  uploadProjectFiles 
} from '../utils/fileIO';
import { hashDocument, hashBlock } from '../utils/hashing';

export default function FileIOPanel({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { getAllDocuments, saveDocument } = useDocumentStore();
  const { metadata } = useProjectStore();

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage('');
    
    try {
      const documents = await getAllDocuments();
      const files = await downloadProjectAsZip(documents, metadata.name);
      
      // Create a blob for each file and trigger downloads
      let count = 0;
      for (const [path, content] of files.entries()) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${metadata.name}/${path}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        count++;
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setExportMessage(`✓ Exported ${count} files successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      setExportMessage(`✗ Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsImporting(true);
    setImportMessage('');
    
    try {
      const documents = await uploadProjectFiles(files);
      
      // Recompute hashes and save each document
      let count = 0;
      for (const doc of documents) {
        if (!doc.id || !doc.title || !doc.blocks) continue;
        
        // Recompute hashes
        const blocksWithHashes = await Promise.all(
          doc.blocks.map(async (block) => ({
            ...block,
            hash: await hashBlock(block.text),
          }))
        );
        
        const baseVersion = await hashDocument(blocksWithHashes);
        
        await saveDocument({
          id: doc.id,
          title: doc.title,
          blocks: blocksWithHashes,
          baseVersion,
          lastModified: doc.lastModified || Date.now(),
        });
        
        count++;
      }
      
      setImportMessage(`✓ Imported ${count} documents successfully!`);
      
      // Refresh the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Import failed:', error);
      setImportMessage(`✗ Import failed: ${error}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">File I/O - Export/Import Project</h2>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close dialog"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Project Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Project: {metadata.name}</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Export your project to markdown files or import from an existing project folder.
            </p>
          </div>

          {/* Export Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Export Project</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download all documents as markdown files in the standard folder structure:
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-xs font-mono">
              /{metadata.name}/<br />
              &nbsp;&nbsp;/scenes/<br />
              &nbsp;&nbsp;&nbsp;&nbsp;scene-01.md<br />
              &nbsp;&nbsp;&nbsp;&nbsp;scene-02.md<br />
              &nbsp;&nbsp;/chapters/<br />
              &nbsp;&nbsp;&nbsp;&nbsp;chapter-01.md<br />
              &nbsp;&nbsp;/book/<br />
              &nbsp;&nbsp;/outline/<br />
              &nbsp;&nbsp;/research/<br />
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Project
                </>
              )}
            </button>
            {exportMessage && (
              <p className={`text-sm ${exportMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {exportMessage}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Import Project</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select markdown files to import. All existing documents will be replaced.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Warning: This will replace all current documents. Make sure to export first if you want to keep your current work.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.markdown"
              onChange={handleFileSelect}
              className="hidden"
              webkitdirectory=""
              directory=""
              aria-label="Select markdown files"
              title="Select project files"
            />
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Project
                </>
              )}
            </button>
            {importMessage && (
              <p className={`text-sm ${importMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {importMessage}
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
            <h4 className="font-semibold mb-2">Notes:</h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Exported files include metadata and block IDs</li>
              <li>File structure follows the project tree organization</li>
              <li>Use the desktop app for better file system integration</li>
              <li>Git integration available in desktop version</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onToggle}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

