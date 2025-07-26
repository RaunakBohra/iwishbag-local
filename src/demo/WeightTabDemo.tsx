import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WeightTabDemo() {
  const [weightSource, setWeightSource] = useState('manual');
  const [manualWeight, setManualWeight] = useState(0.5);
  const hsnWeight = 0.75; // Example HSN weight
  const mlWeight = 0.68; // Example ML predicted weight
  
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Weight Input Tab Style Demo</h1>
      
      {/* Current SmartDualWeightField Style */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Design (SmartDualWeightField)</h2>
        <div className="border rounded p-4 bg-gray-50">
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              className="w-20 px-2 py-1 text-sm border rounded"
              value={0.5}
              step="0.01"
            />
            <span className="text-sm text-gray-600">kg</span>
            <div className="flex gap-1 ml-2">
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">HSN: 0.75kg</span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">ML: 0.68kg</span>
            </div>
          </div>
        </div>
      </div>

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
          
          {/* Display value based on selected source */}
          <div className="mt-2 text-sm">
            {weightSource === 'manual' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={manualWeight}
                  onChange={(e) => setManualWeight(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1 py-0.5 text-sm border rounded"
                  step="0.01"
                />
                <span className="text-gray-600">kg</span>
              </div>
            )}
            {weightSource === 'hsn' && (
              <div className="text-green-600 font-medium">{hsnWeight} kg (from HSN database)</div>
            )}
            {weightSource === 'ml' && (
              <div className="text-blue-600 font-medium">{mlWeight} kg (ML prediction)</div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison */}
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
          (Manual, HSN, ML) simultaneously allows users to make informed decisions by comparing values.
          The current design is more functional for this use case.
        </p>
      </div>
    </div>
  );
}