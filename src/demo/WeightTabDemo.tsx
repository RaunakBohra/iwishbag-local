import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WeightTabDemo() {
  const [weightSource, setWeightSource] = useState('manual');
  const [manualWeight, setManualWeight] = useState(0.5);
  const hsnWeight = 0.75; 
  const mlWeight = 0.68; // Example ML predicted weight
  
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Weight Input Tab Style Demo</h1>
      
      {/* Tab Style Design */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">New Tab Style Design</h2>
        <div className="border rounded p-4 bg-white">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">Weight</label>
          <div className="inline-flex items-end gap-3 border-b border-gray-200">
            <button
              onClick={() => setWeightSource('manual')}
              className={cn(
                "pb-1 px-1 text-xs transition-all relative",
                weightSource === 'manual'
                  ? "text-gray-700 font-medium" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Manual
              {weightSource === 'manual' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600" />
              )}
            </button>
            <button
              onClick={() => setWeightSource('hsn')}
              className={cn(
                "pb-1 px-1 text-xs transition-all relative",
                weightSource === 'hsn'
                  ? "text-green-600 font-medium" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              HSN
              {weightSource === 'hsn' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
              )}
            </button>
            <button
              onClick={() => setWeightSource('ml')}
              className={cn(
                "pb-1 px-1 text-xs transition-all relative",
                weightSource === 'ml'
                  ? "text-blue-600 font-medium" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              ML
              {weightSource === 'ml' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          </div>
          
          {/* Content based on selected tab */}
          <div className="mt-4">
            {weightSource === 'manual' && (
              <input
                type="number"
                value={manualWeight}
                onChange={(e) => setManualWeight(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                placeholder="Enter weight manually"
                step="0.01"
              />
            )}
            {weightSource === 'hsn' && (
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <span className="text-green-800">HSN Suggested: {hsnWeight} kg</span>
              </div>
            )}
            {weightSource === 'ml' && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <span className="text-blue-800">ML Predicted: {mlWeight} kg</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Comparison</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4">
            <h3 className="font-medium mb-2">Current Design Pros:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Shows all options at once</li>
              <li>• Compact single-line display</li>
              <li>• Quick comparison of values</li>
            </ul>
          </div>
          <div className="border rounded p-4">
            <h3 className="font-medium mb-2">Tab Style Pros:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Consistent with tax/valuation UI</li>
              <li>• Clear source selection</li>
              <li>• Less cluttered interface</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-medium text-blue-900 mb-2">My Recommendation:</h3>
        <p className="text-sm text-blue-800">
          Keep the current SmartDualWeightField design. The tab style works well for tax/valuation 
          because those are mutually exclusive choices. For weight, showing all available sources 
          (Manual, ML) simultaneously allows users to make informed decisions by comparing values.
          The current design is more functional for this use case.
        </p>
      </div>
    </div>
  );
}