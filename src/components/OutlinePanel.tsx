import React, { useState } from 'react';
import { useOutlineStore } from '../store/outlineStore';
import { useManuscriptStore } from '../store/manuscriptStore';
import { OutlineCard } from '../types/outline';

interface OutlinePanelProps {
  sceneId: string | null;
}

export default function OutlinePanel({ sceneId }: OutlinePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCard, setEditedCard] = useState<Partial<OutlineCard>>({});

  const card = useOutlineStore(state => sceneId ? state.getCard(sceneId) : null);
  const updateCard = useOutlineStore(state => state.updateCard);
  const setCard = useOutlineStore(state => state.setCard);
  
  // Get scene metadata and chapter context
  const getScene = useManuscriptStore(state => state.getScene);
  const getChapter = useManuscriptStore(state => state.getChapter);
  const getChapterCard = useOutlineStore(state => state.getChapterCard);
  
  const sceneMetadata = sceneId ? getScene(sceneId) : null;
  const chapterMetadata = sceneMetadata ? getChapter(sceneMetadata.chapter) : null;
  const chapterCard = chapterMetadata ? getChapterCard(chapterMetadata.id) : null;

  if (!sceneId || !sceneId.includes('scene')) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a scene to view or edit its outline.
        </p>
      </div>
    );
  }

  const handleEdit = () => {
    setEditedCard(card || {
      sceneId,
      title: sceneId.split('/').pop() || '',
      goal: '',
      conflict: '',
      outcome: '',
      clock: '',
      crucible: '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (card) {
      updateCard(sceneId, editedCard);
    } else {
      setCard({
        id: `outline_${sceneId.replace('/', '_')}`,
        sceneId,
        title: editedCard.title || sceneId,
        goal: editedCard.goal || '',
        conflict: editedCard.conflict || '',
        outcome: editedCard.outcome || '',
        clock: editedCard.clock || '',
        crucible: editedCard.crucible || '',
        requiredBeats: [],
        lastModified: Date.now(),
      } as OutlineCard);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedCard({});
  };

  if (isEditing) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Edit Outline</h3>
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
            Title
          </label>
          <input
            type="text"
            value={editedCard.title || ''}
            onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })}
            className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            placeholder="Scene title"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
            Goal (What they want)
          </label>
          <textarea
            value={editedCard.goal || ''}
            onChange={(e) => setEditedCard({ ...editedCard, goal: e.target.value })}
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
            value={editedCard.conflict || ''}
            onChange={(e) => setEditedCard({ ...editedCard, conflict: e.target.value })}
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
            value={editedCard.outcome || ''}
            onChange={(e) => setEditedCard({ ...editedCard, outcome: e.target.value })}
            className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            rows={2}
            placeholder="How does this scene end?"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
            Clock (Time pressure)
          </label>
          <input
            type="text"
            value={editedCard.clock || ''}
            onChange={(e) => setEditedCard({ ...editedCard, clock: e.target.value })}
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
            value={editedCard.crucible || ''}
            onChange={(e) => setEditedCard({ ...editedCard, crucible: e.target.value })}
            className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            placeholder="What keeps them from leaving?"
          />
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Scene Outline</h3>
          <button
            onClick={handleEdit}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Create Outline
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No outline created for this scene yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
      {/* Chapter Context */}
      {chapterMetadata && (
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            📖 Chapter Context
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {chapterMetadata.title}
            </div>
            {chapterCard && (
              <>
                {chapterCard.pov && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    POV: {chapterCard.pov}
                  </div>
                )}
                {chapterCard.theme && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Theme: {chapterCard.theme}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Scene Metadata */}
      {sceneMetadata && (
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            🎬 Scene Details
          </div>
          <div className="space-y-1 text-xs">
            {sceneMetadata.location && (
              <div className="text-gray-600 dark:text-gray-400">
                📍 {sceneMetadata.location}
              </div>
            )}
            {sceneMetadata.time && (
              <div className="text-gray-600 dark:text-gray-400">
                🕐 {sceneMetadata.time}
              </div>
            )}
            {sceneMetadata.wordsTarget && (
              <div className="text-gray-600 dark:text-gray-400">
                Target: {sceneMetadata.wordsTarget} words
                {sceneMetadata.wordsCurrent && 
                  ` (${sceneMetadata.wordsCurrent}/${sceneMetadata.wordsTarget})`
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scene Outline */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Scene Outline</h3>
        <button
          onClick={handleEdit}
          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
        >
          Edit
        </button>
      </div>

      {card.title && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {card.title}
          </div>
        </div>
      )}

      <OutlineField label="Goal" value={card.goal} icon="🎯" />
      <OutlineField label="Conflict" value={card.conflict} icon="⚔️" />
      <OutlineField label="Outcome" value={card.outcome} icon="🏁" />
      <OutlineField label="Clock" value={card.clock} icon="⏰" />
      <OutlineField label="Crucible" value={card.crucible} icon="🔥" />

      {card.requiredBeats.length > 0 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Protected Blocks: {card.requiredBeats.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            These blocks contain required story beats and cannot be deleted without confirmation.
          </div>
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
  if (!value) return null;

  return (
    <div>
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

