import React from 'react';
import { useAutoSave } from '../services/autoSaveService';

interface AutoSaveIndicatorProps {
  className?: string;
}

export default function AutoSaveIndicator({ className = '' }: AutoSaveIndicatorProps) {
  const { isSaving, lastSaveTime, timeSinceLastSave } = useAutoSave();

  const getStatusText = () => {
    if (isSaving) {
      return 'Saving...';
    }
    
    if (lastSaveTime && timeSinceLastSave !== null) {
      if (timeSinceLastSave < 1000) {
        return 'Saved just now';
      } else if (timeSinceLastSave < 60000) {
        return `Saved ${Math.floor(timeSinceLastSave / 1000)}s ago`;
      } else {
        return `Saved ${Math.floor(timeSinceLastSave / 60000)}m ago`;
      }
    }
    
    return 'Not saved';
  };

  const getStatusColor = () => {
    if (isSaving) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    
    if (lastSaveTime && timeSinceLastSave !== null && timeSinceLastSave < 30000) {
      return 'text-green-600 dark:text-green-400';
    }
    
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isSaving 
          ? 'bg-yellow-500 animate-pulse' 
          : lastSaveTime && timeSinceLastSave !== null && timeSinceLastSave < 30000
            ? 'bg-green-500'
            : 'bg-gray-400'
      }`} />
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
    </div>
  );
}
