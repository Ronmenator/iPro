import React, { useState } from 'react';
import { useSceneStore } from '../store/sceneStore';

interface OutlinePanelProps {
  sceneId: string | null;
}

export default function OutlinePanel({ sceneId }: OutlinePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editedDetails, setEditedDetails] = useState({
    goal: '',
    conflict: '',
    outcome: '',
    location: '',
    clock: '',
    crucible: '',
    pov: ''
  });
  
  const { currentScene, updateSceneOutline } = useSceneStore();

  // Get outline details directly from the global scene store
  const outlineDetails = currentScene?.outline || {
    goal: '',
    conflict: '',
    outcome: '',
    location: '',
    clock: '',
    crucible: '',
    pov: ''
  };

  const handleEdit = () => {
    setEditedDetails(outlineDetails);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!currentScene) return;
    
    // Update the scene outline in the global store
    updateSceneOutline(editedDetails);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDetails(outlineDetails);
    setIsEditing(false);
  };

  if (!sceneId || !sceneId.includes('scene')) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a scene to view or edit its outline.
        </p>
      </div>
    );
  }

  // Check if we have any outline details
  const hasOutlineDetails = Object.values(outlineDetails).some(value => value && value !== 'TBD' && value.trim() !== '');
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          📋 Scene Outline
        </h3>
        <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Edit Outline</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  Goal (What they want)
                </label>
                <textarea
                  value={editedDetails.goal || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, goal: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  rows={2}
                  placeholder="What does the protagonist want in this scene?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  Conflict (What's in the way)
                </label>
                <textarea
                  value={editedDetails.conflict || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, conflict: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  rows={2}
                  placeholder="What stands in their way?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  Outcome (How it ends)
                </label>
                <textarea
                  value={editedDetails.outcome || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, outcome: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  rows={2}
                  placeholder="How does this scene end?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editedDetails.location || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, location: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  placeholder="Where does this scene take place?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  Clock (Time pressure)
                </label>
                <input
                  type="text"
                  value={editedDetails.clock || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, clock: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  placeholder="What's the urgency?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  Crucible (Why they stay)
                </label>
                <input
                  type="text"
                  value={editedDetails.crucible || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, crucible: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  placeholder="What keeps them from leaving?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                  POV (Point of View)
                </label>
                <input
                  type="text"
                  value={editedDetails.pov || ''}
                  onChange={(e) => setEditedDetails({ ...editedDetails, pov: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  placeholder="Who is the POV character?"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scene Metadata */}
              {currentScene && (
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    🎬 Scene Details
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-gray-600 dark:text-gray-400">
                      📖 {currentScene.title}
                    </div>
                    {currentScene.metadata.location && (
                      <div className="text-gray-600 dark:text-gray-400">
                        📍 {currentScene.metadata.location}
                      </div>
                    )}
                    {currentScene.metadata.time && (
                      <div className="text-gray-600 dark:text-gray-400">
                        🕐 {currentScene.metadata.time}
                      </div>
                    )}
                    {currentScene.metadata.wordsTarget && (
                      <div className="text-gray-600 dark:text-gray-400">
                        Target: {currentScene.metadata.wordsTarget} words
                        {currentScene.metadata.wordsCurrent && 
                          ` (${currentScene.metadata.wordsCurrent}/${currentScene.metadata.wordsTarget})`
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scene Outline */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Scene Outline</h4>
                <button
                  onClick={handleEdit}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  Edit
                </button>
              </div>

              {!hasOutlineDetails ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No outline details found. Click "Edit" to add them.
                </p>
              ) : (
                <div className="space-y-2">
                  <OutlineField label="Goal" value={outlineDetails.goal} icon="🎯" />
                  <OutlineField label="Conflict" value={outlineDetails.conflict} icon="⚔️" />
                  <OutlineField label="Outcome" value={outlineDetails.outcome} icon="🏁" />
                  <OutlineField label="Location" value={outlineDetails.location} icon="📍" />
                  <OutlineField label="Clock" value={outlineDetails.clock} icon="⏰" />
                  <OutlineField label="Crucible" value={outlineDetails.crucible} icon="🔥" />
                  <OutlineField label="POV" value={outlineDetails.pov} icon="👤" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OutlineFieldProps {
  label: string;
  value: string;
  icon: string;
}

function OutlineField({ label, value, icon }: OutlineFieldProps) {
  if (!value || value === 'TBD' || value.trim() === '') {
    return null;
  }

  return (
    <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-2">
        <span className="text-sm">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {label}
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100 mt-1 break-words">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}