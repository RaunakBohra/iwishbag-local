import React from 'react';
import { Zap, Database, TrendingUp, Target, Award, AlertTriangle } from 'lucide-react';

const WeightRecommendationDemo2 = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Weight Recommendation Demo 2: Modern Card Layout</h1>
        
        {/* Product Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
              <input 
                type="text" 
                value="https://amazon.com/iphone-15-pro" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
              <input 
                type="number" 
                value="2222" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input 
                type="number" 
                value="0.5" 
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Weight Recommendations - Modern Card Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Weight Verification System
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Official HSN Database Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 rounded-lg p-2">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">HSN Official Database</h4>
                    <p className="text-sm text-green-700">Government Verified</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-900">1.5</span>
                    <span className="text-lg text-green-700">kg</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Range: 1.3 - 1.7 kg</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Confidence Level</span>
                    <span className="text-sm font-bold text-green-800">95%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '95%'}}></div>
                  </div>
                </div>
                
                <button className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">
                  Use HSN Weight
                </button>
              </div>

              {/* AI Estimation Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">AI Estimation</h4>
                    <p className="text-sm text-blue-700">Machine Learning</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-900">0.2</span>
                    <span className="text-lg text-blue-700">kg</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1 italic">"iPhone 15 Pro match found"</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Confidence Level</span>
                    <span className="text-sm font-bold text-blue-800">90%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '90%'}}></div>
                  </div>
                </div>
                
                <button className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Use AI Weight
                </button>
              </div>
            </div>

            {/* Discrepancy Alert */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 rounded-lg p-2 mt-1">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-2">Significant Weight Difference Detected</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">HSN Database</span>
                        <span className="text-lg font-bold text-green-600">1.5 kg</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Official customs data</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">AI Estimation</span>
                        <span className="text-lg font-bold text-blue-600">0.2 kg</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">ML product analysis</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-800 mb-3">
                    We recommend using the HSN database weight for customs compliance and accurate shipping calculations.
                  </p>
                  <div className="flex gap-3">
                    <button className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors">
                      Accept HSN (1.5 kg)
                    </button>
                    <button className="border border-amber-600 text-amber-700 px-4 py-2 rounded-lg font-medium hover:bg-amber-50 transition-colors">
                      Keep Current (0.5 kg)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HSN Classification */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">HSN Classification:</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                8471 - Electronics
              </span>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View HSN Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightRecommendationDemo2;