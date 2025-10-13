import React from 'react';
import { Outline } from '../../types/pcc5';
import { loadPcc5FromFiles } from '../../utils/pcc5FileIO';

interface OutlineTabProps {
  data: Outline;
  onRegenerate: () => void;
  onLoad?: (outline: Outline) => void;
  isGenerating: boolean;
}

export default function OutlineTab({ data, onRegenerate, onLoad, isGenerating }: OutlineTabProps) {
  const handleLoadFromJson = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        if (onLoad && jsonData) {
          onLoad(jsonData);
        }
      } catch (error) {
        console.error('Error loading JSON file:', error);
        alert(`Failed to load JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PCC-5 Outline</h3>
        <div className="flex gap-2">
          {onLoad && (
            <button
              onClick={handleLoadFromJson}
              disabled={isGenerating}
              className="px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md hover:bg-green-100 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load from JSON
            </button>
          )}
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Regenerating...' : 'Regenerate Outline'}
          </button>
        </div>
      </div>

      {/* Step 1: Promise */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold px-2 py-1 rounded-full mr-2">1</span>
          Promise (The Contract with the Reader)
        </h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logline</label>
            <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border">
              {data.step1_promise.logline}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contract Questions</label>
            <ul className="list-disc list-inside space-y-1">
              {data.step1_promise.contract.map((question, index) => (
                <li key={index} className="text-sm text-gray-900 dark:text-white">
                  {question}
                </li>
              ))}
            </ul>
          </div>
          
          {(data.step1_promise.genre || data.step1_promise.theme) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.step1_promise.genre && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genre</label>
                  <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                    {data.step1_promise.genre}
                  </p>
                </div>
              )}
              {data.step1_promise.theme && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                  <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                    {data.step1_promise.theme}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Countdown */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-bold px-2 py-1 rounded-full mr-2">2</span>
          Countdown (The Clock of Urgency)
        </h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
            <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border">
              {data.step2_countdown.deadline}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stakes</label>
            <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border">
              {data.step2_countdown.stakes}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Story Beats</label>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Setup:</span>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                  {data.step2_countdown.beats.setup}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Midpoint:</span>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                  {data.step2_countdown.beats.midpoint}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Climax:</span>
                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border mt-1">
                  {data.step2_countdown.beats.climax}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Crucible */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-bold px-2 py-1 rounded-full mr-2">3</span>
          Crucible (The Trap or Pressure Chamber)
        </h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Protagonist</label>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{data.step3_crucible.protagonist.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Motivation:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{data.step3_crucible.protagonist.motivation}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Limitation:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{data.step3_crucible.protagonist.limitation}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transformation:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{data.step3_crucible.protagonist.transformation}</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Antagonist</label>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{data.step3_crucible.antagonist.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Leverage:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{data.step3_crucible.antagonist.leverage}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Constraints</label>
            <ul className="list-disc list-inside space-y-1">
              {data.step3_crucible.constraints.map((constraint, index) => (
                <li key={index} className="text-sm text-gray-900 dark:text-white">
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Step 4: Expansion */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-bold px-2 py-1 rounded-full mr-2">4</span>
          Expansion (The 3-Act Growth Blueprint)
        </h4>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Act I:</span>
              <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border mt-1">
                {data.step4_expansion.acts.act1}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Act II:</span>
              <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border mt-1">
                {data.step4_expansion.acts.act2}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Act III:</span>
              <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border mt-1">
                {data.step4_expansion.acts.act3}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escalation Notes</label>
            <ul className="list-disc list-inside space-y-1">
              {data.step4_expansion.escalation_notes.map((note, index) => (
                <li key={index} className="text-sm text-gray-900 dark:text-white">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Step 5: Fulfillment */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-bold px-2 py-1 rounded-full mr-2">5</span>
          Fulfillment (Resolution of the Contract)
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resolutions</label>
            <div className="space-y-2">
              {Object.entries(data.step5_fulfillment.resolutions).map(([promise, resolution]) => (
                <div key={promise} className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Q: {promise}</div>
                  <div className="text-sm text-gray-900 dark:text-white">A: {resolution}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Success Criteria</label>
            <ul className="list-disc list-inside space-y-1">
              {data.step5_fulfillment.success_criteria.map((criterion, index) => (
                <li key={index} className="text-sm text-gray-900 dark:text-white">
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
