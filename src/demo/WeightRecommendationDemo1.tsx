import React from 'react';
import { CheckCircle, Info, AlertCircle, ExternalLink } from 'lucide-react';

const WeightRecommendationDemo1 = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">
          Weight Recommendation Demo 1: Professional HSN Display
        </h1>

        {}
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

              {}
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
