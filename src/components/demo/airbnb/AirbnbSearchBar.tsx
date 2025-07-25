import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, ShoppingBag, Globe, Package } from 'lucide-react';

export const AirbnbSearchBar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'product' | 'store'>('product');
  const [searchValue, setSearchValue] = useState('');

  const popularSearches = [
    'iPhone 15 Pro',
    'Nike Air Jordan',
    'MacBook Pro',
    'Sony WH-1000XM5',
    'Kindle Oasis'
  ];

  const popularStores = [
    'Amazon US',
    'eBay',
    'Best Buy',
    'Target',
    'Walmart'
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search Container - Airbnb style */}
      <div className="bg-white border border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200">
        <div className="flex">
          {/* Tab Selection */}
          <div className="flex border-r border-gray-200">
            <button
              onClick={() => setActiveTab('product')}
              className={`px-6 py-4 text-sm font-medium rounded-l-full transition-colors ${
                activeTab === 'product'
                  ? 'bg-gray-50 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Product
              </div>
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'store'
                  ? 'bg-gray-50 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Store
              </div>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                activeTab === 'product'
                  ? 'Search for any product...'
                  : 'Search stores like Amazon, eBay...'
              }
              className="w-full px-6 py-4 text-gray-900 placeholder-gray-500 bg-transparent border-0 focus:outline-none text-base"
            />
          </div>

          {/* Search Button */}
          <div className="pr-2 py-2">
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-full h-12 w-12 p-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Popular Suggestions - Airbnb style */}
      <div className="mt-6">
        <p className="text-sm text-gray-600 mb-3 font-light">
          {activeTab === 'product' ? 'Popular products:' : 'Popular stores:'}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(activeTab === 'product' ? popularSearches : popularStores).map((item, index) => (
            <button
              key={index}
              onClick={() => setSearchValue(item)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200 border border-gray-200 hover:border-gray-300"
            >
              {activeTab === 'store' && <Globe className="w-3 h-3 inline mr-1" />}
              {activeTab === 'product' && <Package className="w-3 h-3 inline mr-1" />}
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};