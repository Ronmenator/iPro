import React from 'react';
import { Character } from '../../types/pcc5';

interface CharactersTabProps {
  data: Character[];
  onRegenerate: () => void;
  isGenerating: boolean;
}

export default function CharactersTab({ data, onRegenerate, isGenerating }: CharactersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Character Roster</h3>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate Characters'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((character, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">{character.name}</h4>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                  {character.role}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Motivation:</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {character.motivation}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conflict:</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {character.conflict}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Arc:</span>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {character.arc}
                  </p>
                </div>
                
                {character.relationships.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationships:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {character.relationships.map((relationship, relIndex) => (
                        <li key={relIndex} className="text-sm text-gray-900 dark:text-white">
                          {typeof relationship === 'string'
                            ? relationship
                            : `${relationship.name}${relationship.relation ? ` - ${relationship.relation}` : ''}`
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No characters generated yet</p>
        </div>
      )}
    </div>
  );
}
