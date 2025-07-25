import React, { useState } from 'react';
import { Scale, Shield, Brain, ChevronRight, Check, X, Info } from 'lucide-react';

const WeightRecommendationDemo3 = () => {
  const [selectedWeight, setSelectedWeight] = useState<'hsn' | 'ai' | 'manual' | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Weight Recommendation Demo 3: Unified Decision Flow</h1>
        
        {/* Product Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-semibold text-gray-900">iPhone 15 Pro</h2>
            <span className="text-2xl font-bold text-green-600">₹2,222.00</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input 
                type="text" 
                value="iPhone 15 Pro" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
              <input 
                type="text" 
                value="https://amazon.com/iphone-15-pro" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
              <input 
                type="number" 
                value="2222" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={selectedWeight === 'hsn' ? '1.5' : selectedWeight === 'ai' ? '0.2' : '0.5'} 
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedWeight && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Unified Weight Recommendation System */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Scale className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Weight Verification</h3>
              </div>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Info className="h-4 w-4" />
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            {/* Weight Options */}
            <div className="space-y-3 mb-6">
              {/* HSN Database Option */}
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
                    <div className={`rounded-full p-2 ${selectedWeight === 'hsn' ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Shield className={`h-5 w-5 ${selectedWeight === 'hsn' ? 'text-green-600' : 'text-slate-600'}`} />
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
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedWeight === 'hsn' ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>

              {/* AI Estimation Option */}
              <div 
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  selectedWeight === 'ai' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
                onClick={() => setSelectedWeight('ai')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${selectedWeight === 'ai' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Brain className={`h-5 w-5 ${selectedWeight === 'ai' ? 'text-blue-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">0.2 kg</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          AI Estimated
                        </span>
                        <span className="text-sm text-slate-600">90% confidence</span>
                      </div>
                      {showDetails && (
                        <p className="text-sm text-slate-600 mt-1">
                          Machine learning • Product match found • May vary from actual
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedWeight === 'ai' && <Check className="h-5 w-5 text-blue-600" />}
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedWeight === 'ai' ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Manual Entry Option */}
              <div 
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  selectedWeight === 'manual' 
                    ? 'border-slate-500 bg-slate-50' 
                    : 'border-gray-200 bg-white hover:border-slate-300'
                }`}
                onClick={() => setSelectedWeight('manual')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${selectedWeight === 'manual' ? 'bg-slate-100' : 'bg-slate-100'}`}>
                      <Scale className={`h-5 w-5 ${selectedWeight === 'manual' ? 'text-slate-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">0.5 kg</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Manual Entry
                        </span>
                      </div>
                      {showDetails && (
                        <p className="text-sm text-slate-600 mt-1">
                          User specified • Use if you have accurate measurements
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedWeight === 'manual' && <Check className="h-5 w-5 text-slate-600" />}
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedWeight === 'manual' ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation Alert */}
            {selectedWeight !== 'hsn' && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-900">Recommendation</span>
                </div>
                <p className="text-sm text-amber-800 mb-3">
                  For international shipping and customs compliance, we recommend using the HSN database weight (1.5 kg) 
                  as it's based on official trade classifications.
                </p>
                <button 
                  onClick={() => setSelectedWeight('hsn')}
                  className="text-sm font-medium text-amber-900 underline hover:no-underline"
                >
                  Switch to HSN Weight (1.5 kg)
                </button>
              </div>
            )}

            {/* Confirmation */}
            {selectedWeight && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Selected weight: <strong>
                    {selectedWeight === 'hsn' ? '1.5 kg (HSN)' : 
                     selectedWeight === 'ai' ? '0.2 kg (AI)' : 
                     '0.5 kg (Manual)'}
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

          {/* HSN Classification */}
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