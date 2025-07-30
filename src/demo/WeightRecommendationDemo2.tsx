import React from 'react';
import { Zap, Database, TrendingUp, Target, Award, AlertTriangle } from 'lucide-react';

const WeightRecommendationDemo2 = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">
          Weight Recommendation Demo 2: Modern Card Layout
        </h1>

        {}
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
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>

                <button className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">
                  Use HSN Weight
                </button>
              </div>

              {}
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
