import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Search, Check } from 'lucide-react';

export default function HSNInputDesigns() {
  const [hsnValue, setHsnValue] = useState('170490');
  const [categoryValue, setCategoryValue] = useState('Sugar & Confectionery');
  const [searchOpen, setSearchOpen] = useState(false);
  
  const mockHSNCodes = [
    { code: '170490', category: 'Sugar & Confectionery', description: 'Sugar confectionery not containing cocoa' },
    { code: '620462', category: 'Clothing', description: 'Women\'s or girls\' trousers, breeches' },
    { code: '851712', category: 'Electronics', description: 'Telephones for cellular networks' },
    { code: '640319', category: 'Footwear', description: 'Sports footwear' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">HSN Input Design Options</h1>
      
      {/* Current Design */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Design (Badge with Popover)</h2>
        <div className="border rounded p-4 bg-gray-50">
          <Badge variant="outline" className="cursor-pointer text-xs px-2 py-1">
            <div className="text-center">
              <div className="font-medium">170490</div>
              <div className="text-gray-500 text-[10px] capitalize mt-0.5">
                Sugar & Confectionery
              </div>
            </div>
          </Badge>
        </div>
      </div>

      {/* Option 1: Tab Style like Weight */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Option 1: Tab Style (Similar to Weight)</h2>
        <div className="border rounded p-4 bg-white">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">HSN</label>
          <div className="inline-flex items-end gap-3 border-b border-gray-200">
            <div className="pb-1 px-1 text-xs transition-all relative flex items-center gap-1">
              <input
                type="text"
                value={hsnValue}
                onChange={(e) => setHsnValue(e.target.value)}
                className="w-16 px-0 text-xs text-center text-gray-700 font-medium bg-transparent border-none focus:outline-none"
                placeholder="HSN"
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600" />
            </div>
            <div className="pb-1 px-1 text-xs transition-all relative flex items-center gap-1">
              <input
                type="text"
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="w-24 px-0 text-xs text-center text-gray-700 font-medium bg-transparent border-none focus:outline-none"
                placeholder="Category"
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Option 2: Inline Edit Style */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Option 2: Inline Edit Style</h2>
        <div className="border rounded p-4 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <input
                type="text"
                value={hsnValue}
                onChange={(e) => setHsnValue(e.target.value)}
                className="w-16 px-1 py-0.5 text-xs text-center border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500 font-medium"
                placeholder="HSN"
              />
            </div>
            <span className="text-gray-400">|</span>
            <div className="flex items-center">
              <input
                type="text"
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="w-32 px-1 py-0.5 text-xs border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                placeholder="Category"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Option 3: Stacked Clean */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Option 3: Stacked Clean</h2>
        <div className="border rounded p-4 bg-white">
          <div className="space-y-1">
            <input
              type="text"
              value={hsnValue}
              onChange={(e) => setHsnValue(e.target.value)}
              className="w-20 px-0 text-xs text-center font-medium text-gray-700 bg-transparent border-none focus:outline-none border-b border-gray-300 focus:border-blue-500"
              placeholder="HSN Code"
            />
            <input
              type="text"
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              className="w-full px-0 text-[10px] text-gray-500 bg-transparent border-none focus:outline-none border-b border-gray-200 focus:border-blue-400"
              placeholder="Category"
            />
          </div>
        </div>
      </div>

      {/* Option 4: Search-First Design */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Option 4: Search-First Design</h2>
        <div className="border rounded p-4 bg-white">
          <div className="relative">
            <div className="flex items-center gap-1 border-b border-gray-300 pb-1">
              <Search className="w-3 h-3 text-gray-400" />
              <input
                type="text"
                value={searchOpen ? '' : `${hsnValue} - ${categoryValue}`}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                className="flex-1 px-0 text-xs bg-transparent border-none focus:outline-none"
                placeholder="Search HSN code or category..."
              />
            </div>
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-32 overflow-y-auto">
                {mockHSNCodes.map((hsn) => (
                  <div
                    key={hsn.code}
                    className="p-2 hover:bg-gray-50 cursor-pointer text-xs"
                    onClick={() => {
                      setHsnValue(hsn.code);
                      setCategoryValue(hsn.category);
                      setSearchOpen(false);
                    }}
                  >
                    <div className="font-medium">{hsn.code}</div>
                    <div className="text-gray-500 text-[10px]">{hsn.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Option 5: Minimal Badge Style */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Option 5: Minimal Badge Style</h2>
        <div className="border rounded p-4 bg-white">
          <div className="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 rounded-md hover:border-gray-300 cursor-pointer">
            <input
              type="text"
              value={hsnValue}
              onChange={(e) => setHsnValue(e.target.value)}
              className="w-12 px-0 text-xs text-center font-medium bg-transparent border-none focus:outline-none"
              placeholder="HSN"
            />
            <div className="w-px h-3 bg-gray-300"></div>
            <input
              type="text"
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              className="w-24 px-1 text-[10px] text-gray-600 bg-transparent border-none focus:outline-none"
              placeholder="Category"
            />
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-medium text-blue-900 mb-2">My Recommendations:</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div><strong>Best for consistency:</strong> Option 1 (Tab Style) - matches the weight field design</div>
          <div><strong>Best for functionality:</strong> Option 4 (Search-First) - maintains search capability</div>
          <div><strong>Best for minimalism:</strong> Option 3 (Stacked Clean) - cleanest appearance</div>
        </div>
      </div>
    </div>
  );
}