import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { lintDocument, loadStyleConfig } from '../utils/linting';
import { LintReport, LintIssue, StyleConfig } from '../types/lint';

interface LintSidebarProps {
  onHighlight: (blockId: string, start: number, end: number) => void;
}

export default function LintSidebar({ onHighlight }: LintSidebarProps) {
  const [report, setReport] = useState<LintReport | null>(null);
  const [config, setConfig] = useState<StyleConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'suggestion'>('all');

  const currentDoc = useDocumentStore(state => state.getCurrentDoc());

  useEffect(() => {
    loadStyleConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (currentDoc && config) {
      const newReport = lintDocument(currentDoc, config);
      setReport(newReport);
    }
  }, [currentDoc, config]);

  if (!report) {
    return (
      <div className="border-l border-gray-200 dark:border-gray-700 w-80 flex-shrink-0 bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading linter...</p>
      </div>
    );
  }

  const filteredIssues = filter === 'all' 
    ? report.issues 
    : report.issues.filter(issue => issue.severity === filter);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'suggestion': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 dark:bg-red-900/20';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'suggestion': return 'bg-blue-100 dark:bg-blue-900/20';
      default: return 'bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="border-l border-gray-200 dark:border-gray-700 w-80 flex-shrink-0 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Style Lints
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded ${filter === 'all' ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'}`}
          >
            All ({report.issues.length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-2 py-1 rounded ${filter === 'error' ? 'bg-red-200 dark:bg-red-900' : 'bg-gray-200 dark:bg-gray-800'}`}
          >
            Errors ({report.summary.errors})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-2 py-1 rounded ${filter === 'warning' ? 'bg-yellow-200 dark:bg-yellow-900' : 'bg-gray-200 dark:bg-gray-800'}`}
          >
            Warnings ({report.summary.warnings})
          </button>
          <button
            onClick={() => setFilter('suggestion')}
            className={`px-2 py-1 rounded ${filter === 'suggestion' ? 'bg-blue-200 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-800'}`}
          >
            Suggestions ({report.summary.suggestions})
          </button>
        </div>
      </div>

      {/* Issues List */}
      {isExpanded && (
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No {filter !== 'all' ? filter + 's' : 'issues'} found!
              </p>
            </div>
          ) : (
            filteredIssues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={() => onHighlight(issue.blockId, issue.position.start, issue.position.end)}
                getSeverityColor={getSeverityColor}
                getSeverityBg={getSeverityBg}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface IssueCardProps {
  issue: LintIssue;
  onClick: () => void;
  getSeverityColor: (severity: string) => string;
  getSeverityBg: (severity: string) => string;
}

function IssueCard({ issue, onClick, getSeverityColor, getSeverityBg }: IssueCardProps) {
  const typeLabels: Record<string, string> = {
    adverb: 'Adverb',
    passive: 'Passive Voice',
    banlist: 'Banned Word',
    cliché: 'Cliché',
    length: 'Length',
    tense: 'Tense',
    person: 'Person',
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow ${getSeverityBg(issue.severity)}`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className={`text-xs font-semibold uppercase ${getSeverityColor(issue.severity)}`}>
          {typeLabels[issue.type]}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          #{issue.blockIndex + 1}
        </span>
      </div>

      <p className="text-sm font-medium mb-1">{issue.message}</p>

      {issue.matched && (
        <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <code className="text-xs text-red-600 dark:text-red-400">"{issue.matched}"</code>
        </div>
      )}

      {issue.suggestion && (
        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
          {issue.suggestion}
        </p>
      )}
    </div>
  );
}

