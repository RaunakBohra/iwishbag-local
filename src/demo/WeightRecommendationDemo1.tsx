import React from 'react';
import { CheckCircle, Info, AlertCircle, ExternalLink } from 'lucide-react';

const WeightRecommendationDemo1 = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">
          Weight Recommendation Demo 1: Professional HSN Display
        </h1>

        {/* Product Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900">iPhone 15 Pro</h2>
            <span className="text-2xl font-bold text-green-600">₹2,222.00</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
              <input
                type="number"
                value="0.5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Weight Recommendations - Professional Design */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Weight Verification</h3>
            </div>

            <div className="space-y-4">
              {/* HSN Database Recommendation */}
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 rounded-full p-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">HSN Official Database</span>
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>

                <div className="flex items-center gap-6 mb-3">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">1.5 kg</span>
                    <span className="text-sm text-gray-500 ml-2">Official Weight</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Range:</span> 1.3 - 1.7 kg
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-green-600">95% Confidence</span>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Based on manufacturer specifications and customs database
                </p>
              </div>

              {/* AI Estimation */}
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 rounded-full p-1">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">AI Estimation</span>
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ML Analyzed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-3">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">0.2 kg</span>
                    <span className="text-sm text-gray-500 ml-2">Estimated</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Source:</span> Product analysis
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-blue-600">90% Confidence</span>
                </div>

                <p className="text-xs text-gray-500 italic">
                  "Found direct match for iPhone 15 Pro"
                </p>
              </div>

              {/* Recommendation Summary */}
              <div className="bg-amber-50 rounded-md p-4 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">
                      Weight Discrepancy Detected
                    </h4>
                    <p className="text-sm text-amber-800 mb-2">
                      HSN database suggests <strong>1.5kg</strong> while AI estimates{' '}
                      <strong>0.2kg</strong>. Consider using HSN data for customs accuracy.
                    </p>
                    <button className="text-sm font-medium text-amber-900 underline hover:no-underline">
                      Apply HSN Recommendation (1.5kg)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HSN Classification */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
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

export default WeightRecommendationDemo1;
