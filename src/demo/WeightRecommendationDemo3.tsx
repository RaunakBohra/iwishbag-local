import React, { useState } from 'react';
import { Scale, Shield, Brain, ChevronRight, Check, X, Info } from 'lucide-react';

const WeightRecommendationDemo3 = () => {
  const [selectedWeight, setSelectedWeight] = useState<'hsn' | 'ai' | 'manual' | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">
          Weight Recommendation Demo 3: Unified Decision Flow
        </h1>

        {}
              <div
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  selectedWeight === 'hsn'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
                onClick={() => setSelectedWeight('hsn')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-2 ${selectedWeight === 'hsn' ? 'bg-green-100' : 'bg-slate-100'}`}
                    >
                      <Shield
                        className={`h-5 w-5 ${selectedWeight === 'hsn' ? 'text-green-600' : 'text-slate-600'}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">1.5 kg</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          HSN Official
                        </span>
                        <span className="text-sm text-slate-600">95% confidence</span>
                      </div>
                      {showDetails && (
                        <p className="text-sm text-slate-600 mt-1">
                          Government database • Range: 1.3-1.7 kg • Best for customs
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedWeight === 'hsn' && <Check className="h-5 w-5 text-green-600" />}
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${selectedWeight === 'hsn' ? 'rotate-90' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {}
            {selectedWeight && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Selected weight:{' '}
                  <strong>
                    {selectedWeight === 'hsn'
                      ? '1.5 kg (HSN)'
                      : selectedWeight === 'ai'
                        ? '0.2 kg (AI)'
                        : '0.5 kg (Manual)'}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedWeight(null)}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Reset
                  </button>
                  <button className="px-4 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Apply Weight
                  </button>
                </div>
              </div>
            )}
          </div>

          {}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">HSN Classification:</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                8471 - Electronics
              </span>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 underline">
              HSN: 8471
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightRecommendationDemo3;
