import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';

interface Command {
  id: string;
  label: string;
  description: string;
  category: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const getAllDocuments = useDocumentStore(state => state.getAllDocuments);

  // Define commands
  const getCommands = (): Command[] => {
    const commands: Command[] = [
      // Navigation
      {
        id: 'nav-scenes',
        label: 'Go to Scenes',
        description: 'Navigate to scenes folder',
        category: 'Navigation',
        action: () => navigate('/scenes'),
      },
      {
        id: 'nav-chapters',
        label: 'Go to Chapters',
        description: 'Navigate to chapters folder',
        category: 'Navigation',
        action: () => navigate('/chapters'),
      },
      {
        id: 'nav-research',
        label: 'Go to Research',
        description: 'Navigate to research folder',
        category: 'Navigation',
        action: () => navigate('/research'),
      },
      {
        id: 'nav-outline',
        label: 'Go to Outline',
        description: 'Navigate to outline folder',
        category: 'Navigation',
        action: () => navigate('/outline'),
      },
      // Actions
      {
        id: 'action-project-management',
        label: 'Manage Projects',
        description: 'Create, load, save, and manage books/projects',
        category: 'Actions',
        action: () => {
          const event = new CustomEvent('trigger-project-management');
          window.dispatchEvent(event);
        },
        keywords: ['project', 'book', 'new', 'load', 'save', 'open'],
      },
      {
        id: 'action-export',
        label: 'Export Project',
        description: 'Export all documents to files',
        category: 'Actions',
        action: () => {
          // Trigger export
          const event = new CustomEvent('trigger-export');
          window.dispatchEvent(event);
        },
      },
      {
        id: 'action-import',
        label: 'Import Project',
        description: 'Import documents from files',
        category: 'Actions',
        action: () => {
          const event = new CustomEvent('trigger-import');
          window.dispatchEvent(event);
        },
      },
      {
        id: 'action-toggle-theme',
        label: 'Toggle Theme',
        description: 'Switch between light and dark mode',
        category: 'Actions',
        action: () => {
          const event = new CustomEvent('toggle-theme');
          window.dispatchEvent(event);
        },
      },
      {
        id: 'action-toggle-lint',
        label: 'Toggle Style Lints',
        description: 'Show or hide lint sidebar',
        category: 'Actions',
        action: () => {
          const event = new CustomEvent('toggle-lint');
          window.dispatchEvent(event);
        },
      },
      // View
      {
        id: 'view-devtools',
        label: 'Toggle DevTools',
        description: 'Show or hide block IDs panel',
        category: 'View',
        action: () => {
          const event = new CustomEvent('toggle-devtools');
          window.dispatchEvent(event);
        },
      },
      {
        id: 'view-operations',
        label: 'Toggle Operations',
        description: 'Show or hide operations panel',
        category: 'View',
        action: () => {
          const event = new CustomEvent('toggle-operations');
          window.dispatchEvent(event);
        },
      },
    ];

    return commands;
  };

  const [commands] = useState<Command[]>(getCommands());

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => {
    const searchText = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchText) ||
      cmd.description.toLowerCase().includes(searchText) ||
      cmd.category.toLowerCase().includes(searchText) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(searchText))
    );
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const executeCommand = (command: Command) => {
    command.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent border-none outline-none text-lg"
            />
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
              ESC
            </kbd>
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {category}
                </div>
                {cmds.map((cmd, index) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{cmd.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {cmd.description}
                        </div>
                      </div>
                      {isSelected && (
                        <kbd className="px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
              select
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}

