import React, { useState } from 'react';
import { useProjectStore } from '../store/projectStore';

export default function MetadataViewer() {
  const { metadata, saveMetadata } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: metadata.name,
    author: metadata.author,
    description: metadata.description,
    version: metadata.version,
  });

  const handleEdit = () => {
    setFormData({
      name: metadata.name,
      author: metadata.author,
      description: metadata.description,
      version: metadata.version,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await saveMetadata(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: metadata.name,
      author: metadata.author,
      description: metadata.description,
      version: metadata.version,
    });
    setIsEditing(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full overflow-auto p-6 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Project Metadata
          </h1>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          /* Edit Form */
          <div className="space-y-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="My Novel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Author
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="A brief description of your project..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="1.0.0"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Project Info Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {metadata.name}
              </h2>
              {metadata.author && (
                <p className="text-lg text-blue-700 dark:text-blue-300 mb-4">
                  by {metadata.author}
                </p>
              )}
              {metadata.description && (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {metadata.description}
                </p>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Version
                </h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {metadata.version}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Created
                </h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(metadata.created)}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Last Modified
                </h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(metadata.lastModified)}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Project ID
                </h3>
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {metadata.created}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                💡 Tip
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Keep your project metadata up to date. This information will be included in exports
                and helps you organize multiple books.
              </p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const event = new CustomEvent('trigger-project-management');
                  window.dispatchEvent(event);
                }}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Manage Projects
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Save, load, or create new books
                </div>
              </button>

              <button
                onClick={() => {
                  const event = new CustomEvent('trigger-export');
                  window.dispatchEvent(event);
                }}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">Export Project</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Download as markdown files
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

