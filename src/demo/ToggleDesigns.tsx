import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Hash, Globe, Settings, Package, DollarSign, TrendingUp } from 'lucide-react';

export default function ToggleDesigns() {
  const [taxMethods, setTaxMethods] = useState({
    current: 'hsn',
    segmented: 'hsn',
    tabs: 'hsn',
    tabsEnhanced: 'hsn',
    radio: 'hsn',
    pills: 'hsn',
    icons: 'hsn'
  });

  const [valuationMethods, setValuationMethods] = useState({
    current: 'actual_price',
    segmented: 'actual_price',
    tabs: 'actual_price',
    radio: 'actual_price',
    pills: 'actual_price',
    icons: 'actual_price'
  });

  const [manualTaxRate, setManualTaxRate] = useState(18);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Toggle Switch Design Options</h1>
          <p className="text-gray-600">Alternative designs for 3-way toggle switches</p>
        </div>

        {/* Current Design */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Current Design - 3-Position Slider</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Tax Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="flex items-center gap-2">
                <div className="relative inline-flex h-6 w-16 items-center rounded-full bg-gray-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      let next = taxMethods.current === 'hsn' ? 'country' : 
                                taxMethods.current === 'country' ? 'manual' : 'hsn';
                      setTaxMethods({...taxMethods, current: next});
                    }}
                    className="absolute inset-0 rounded-full focus:outline-none"
                  />
                  <span
                    className="absolute h-5 w-5 transform rounded-full transition-all duration-200 shadow-sm"
                    style={{
                      backgroundColor: taxMethods.current === 'country' ? '#14B8A6' : 
                                     taxMethods.current === 'manual' ? '#8B5CF6' : '#FB923C',
                      transform: taxMethods.current === 'country' ? 'translateX(20px)' : 
                                taxMethods.current === 'manual' ? 'translateX(40px)' : 'translateX(0)'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600">
                  {taxMethods.current === 'country' ? 'Country' : 
                   taxMethods.current === 'manual' ? 'Manual' : 'HSN'}
                </span>
              </div>
            </div>

            {/* Valuation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valuation Method</label>
              <div className="flex items-center gap-2">
                <div className="relative inline-flex h-6 w-16 items-center rounded-full bg-gray-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      let next = valuationMethods.current === 'actual_price' ? 'minimum_valuation' : 
                                valuationMethods.current === 'minimum_valuation' ? 'higher_of_both' : 'actual_price';
                      setValuationMethods({...valuationMethods, current: next});
                    }}
                    className="absolute inset-0 rounded-full focus:outline-none"
                  />
                  <span
                    className="absolute h-5 w-5 transform rounded-full transition-all duration-200 shadow-sm"
                    style={{
                      backgroundColor: valuationMethods.current === 'minimum_valuation' ? '#14B8A6' : 
                                     valuationMethods.current === 'higher_of_both' ? '#8B5CF6' : '#FB923C',
                      transform: valuationMethods.current === 'minimum_valuation' ? 'translateX(20px)' : 
                                valuationMethods.current === 'higher_of_both' ? 'translateX(40px)' : 'translateX(0)'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-600">
                  {valuationMethods.current === 'minimum_valuation' ? 'Min' : 
                   valuationMethods.current === 'higher_of_both' ? 'Higher' : 'Product'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Option 1: Segmented Control */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 1: Segmented Control (iOS Style)</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Tax Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setTaxMethods({...taxMethods, segmented: 'hsn'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all",
                    taxMethods.segmented === 'hsn' 
                      ? "bg-white shadow-sm text-gray-900 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  HSN
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, segmented: 'country'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all",
                    taxMethods.segmented === 'country' 
                      ? "bg-white shadow-sm text-gray-900 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Country
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, segmented: 'manual'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all",
                    taxMethods.segmented === 'manual' 
                      ? "bg-white shadow-sm text-gray-900 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Valuation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valuation Method</label>
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setValuationMethods({...valuationMethods, segmented: 'actual_price'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all",
                    valuationMethods.segmented === 'actual_price' 
                      ? "bg-white shadow-sm text-gray-900 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Product
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, segmented: 'minimum_valuation'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all",
                    valuationMethods.segmented === 'minimum_valuation' 
                      ? "bg-white shadow-sm text-gray-900 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Min
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, segmented: 'higher_of_both'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all",
                    valuationMethods.segmented === 'higher_of_both' 
                      ? "bg-white shadow-sm text-gray-900 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Higher
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Option 2: Tab Style */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 2: Tab Style with Underline</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Tax Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="inline-flex gap-4 border-b-2 border-gray-200">
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabs: 'hsn'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    taxMethods.tabs === 'hsn' 
                      ? "text-orange-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  HSN
                  {taxMethods.tabs === 'hsn' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabs: 'country'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    taxMethods.tabs === 'country' 
                      ? "text-turquoise-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Country
                  {taxMethods.tabs === 'country' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                  )}
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabs: 'manual'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    taxMethods.tabs === 'manual' 
                      ? "text-purple-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Manual
                  {taxMethods.tabs === 'manual' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Valuation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valuation Method</label>
              <div className="inline-flex gap-4 border-b-2 border-gray-200">
                <button
                  onClick={() => setValuationMethods({...valuationMethods, tabs: 'actual_price'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    valuationMethods.tabs === 'actual_price' 
                      ? "text-orange-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Product
                  {valuationMethods.tabs === 'actual_price' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, tabs: 'minimum_valuation'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    valuationMethods.tabs === 'minimum_valuation' 
                      ? "text-turquoise-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Min
                  {valuationMethods.tabs === 'minimum_valuation' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                  )}
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, tabs: 'higher_of_both'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    valuationMethods.tabs === 'higher_of_both' 
                      ? "text-purple-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Higher
                  {valuationMethods.tabs === 'higher_of_both' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Option 2 Enhanced: Tab Style with Inline Input */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 2 Enhanced: Tab Style with Inline Input for Manual</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Tax Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="inline-flex items-end gap-4 border-b-2 border-gray-200">
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabsEnhanced: 'hsn'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    taxMethods.tabsEnhanced === 'hsn' 
                      ? "text-orange-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  HSN
                  {taxMethods.tabsEnhanced === 'hsn' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabsEnhanced: 'country'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    taxMethods.tabsEnhanced === 'country' 
                      ? "text-turquoise-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Country
                  {taxMethods.tabsEnhanced === 'country' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                  )}
                </button>
                
                {taxMethods.tabsEnhanced === 'manual' ? (
                  <div className="relative pb-2 animate-in slide-in-from-right-2 fade-in duration-200">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={manualTaxRate}
                        onChange={(e) => setManualTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-12 px-1 text-xs text-center text-purple-600 font-medium bg-transparent border-none focus:outline-none"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-xs text-purple-600 font-medium">%</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  </div>
                ) : (
                  <button
                    onClick={() => setTaxMethods({...taxMethods, tabsEnhanced: 'manual'})}
                    className={cn(
                      "pb-2 text-xs transition-all relative",
                      "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Manual
                  </button>
                )}
              </div>
              {taxMethods.tabsEnhanced === 'manual' && (
                <p className="text-xs text-purple-600 mt-1">Click on HSN or Country to exit manual mode</p>
              )}
            </div>

            {/* Valuation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valuation Method</label>
              <div className="inline-flex gap-4 border-b-2 border-gray-200">
                <button
                  onClick={() => setValuationMethods({...valuationMethods, tabs: 'actual_price'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    valuationMethods.tabs === 'actual_price' 
                      ? "text-orange-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Product
                  {valuationMethods.tabs === 'actual_price' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, tabs: 'minimum_valuation'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    valuationMethods.tabs === 'minimum_valuation' 
                      ? "text-turquoise-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Min
                  {valuationMethods.tabs === 'minimum_valuation' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                  )}
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, tabs: 'higher_of_both'})}
                  className={cn(
                    "pb-2 text-xs transition-all relative",
                    valuationMethods.tabs === 'higher_of_both' 
                      ? "text-purple-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Higher
                  {valuationMethods.tabs === 'higher_of_both' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Alternative Design - More Integrated */}
          <div className="mt-8 pt-8 border-t">
            <h4 className="text-md font-semibold mb-4 text-gray-700">Alternative: Seamless Integration</h4>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="inline-flex items-center gap-0 border-b-2 border-gray-200">
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabsEnhanced: 'hsn'})}
                  className={cn(
                    "px-3 pb-2 text-xs transition-all relative",
                    taxMethods.tabsEnhanced === 'hsn' 
                      ? "text-orange-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  HSN
                  {taxMethods.tabsEnhanced === 'hsn' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
                <div className="w-px h-4 bg-gray-300 mx-2" />
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabsEnhanced: 'country'})}
                  className={cn(
                    "px-3 pb-2 text-xs transition-all relative",
                    taxMethods.tabsEnhanced === 'country' 
                      ? "text-turquoise-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Country
                  {taxMethods.tabsEnhanced === 'country' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                  )}
                </button>
                <div className="w-px h-4 bg-gray-300 mx-2" />
                <button
                  onClick={() => setTaxMethods({...taxMethods, tabsEnhanced: 'manual'})}
                  className={cn(
                    "px-3 pb-2 text-xs transition-all relative flex items-center gap-1",
                    taxMethods.tabsEnhanced === 'manual' 
                      ? "text-purple-600 font-medium" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Manual
                  {taxMethods.tabsEnhanced === 'manual' && (
                    <>
                      <span>:</span>
                      <input
                        type="number"
                        value={manualTaxRate}
                        onChange={(e) => setManualTaxRate(parseFloat(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 px-1 text-xs text-center text-purple-600 font-medium bg-purple-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-xs">%</span>
                    </>
                  )}
                  {taxMethods.tabsEnhanced === 'manual' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Option 3: Pill Toggle Group */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 3: Pill Toggle Group</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Tax Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="inline-flex gap-1">
                <button
                  onClick={() => setTaxMethods({...taxMethods, pills: 'hsn'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all",
                    taxMethods.pills === 'hsn' 
                      ? "bg-orange-500 text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  HSN
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, pills: 'country'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all",
                    taxMethods.pills === 'country' 
                      ? "bg-teal-500 text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  Country
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, pills: 'manual'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all",
                    taxMethods.pills === 'manual' 
                      ? "bg-purple-500 text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Valuation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valuation Method</label>
              <div className="inline-flex gap-1">
                <button
                  onClick={() => setValuationMethods({...valuationMethods, pills: 'actual_price'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all",
                    valuationMethods.pills === 'actual_price' 
                      ? "bg-orange-500 text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  Product
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, pills: 'minimum_valuation'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all",
                    valuationMethods.pills === 'minimum_valuation' 
                      ? "bg-teal-500 text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  Min
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, pills: 'higher_of_both'})}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full transition-all",
                    valuationMethods.pills === 'higher_of_both' 
                      ? "bg-purple-500 text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )}
                >
                  Higher
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Option 4: Icon-Based Compact */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 4: Icon-Based Compact</h3>
          <div className="grid grid-cols-2 gap-8">
            {/* Tax Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tax Method</label>
              <div className="inline-flex gap-1">
                <button
                  onClick={() => setTaxMethods({...taxMethods, icons: 'hsn'})}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group relative",
                    taxMethods.icons === 'hsn' 
                      ? "bg-orange-100 text-orange-700 ring-2 ring-orange-500" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title="HSN"
                >
                  <Hash className="w-4 h-4" />
                  <span className="absolute -bottom-5 text-[10px] opacity-0 group-hover:opacity-100">HSN</span>
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, icons: 'country'})}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group relative",
                    taxMethods.icons === 'country' 
                      ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title="Country"
                >
                  <Globe className="w-4 h-4" />
                  <span className="absolute -bottom-5 text-[10px] opacity-0 group-hover:opacity-100">Country</span>
                </button>
                <button
                  onClick={() => setTaxMethods({...taxMethods, icons: 'manual'})}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group relative",
                    taxMethods.icons === 'manual' 
                      ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title="Manual"
                >
                  <Settings className="w-4 h-4" />
                  <span className="absolute -bottom-5 text-[10px] opacity-0 group-hover:opacity-100">Manual</span>
                </button>
              </div>
            </div>

            {/* Valuation Method */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Valuation Method</label>
              <div className="inline-flex gap-1">
                <button
                  onClick={() => setValuationMethods({...valuationMethods, icons: 'actual_price'})}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group relative",
                    valuationMethods.icons === 'actual_price' 
                      ? "bg-orange-100 text-orange-700 ring-2 ring-orange-500" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title="Product"
                >
                  <Package className="w-4 h-4" />
                  <span className="absolute -bottom-5 text-[10px] opacity-0 group-hover:opacity-100">Product</span>
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, icons: 'minimum_valuation'})}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group relative",
                    valuationMethods.icons === 'minimum_valuation' 
                      ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title="Minimum"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="absolute -bottom-5 text-[10px] opacity-0 group-hover:opacity-100">Min</span>
                </button>
                <button
                  onClick={() => setValuationMethods({...valuationMethods, icons: 'higher_of_both'})}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group relative",
                    valuationMethods.icons === 'higher_of_both' 
                      ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title="Higher"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="absolute -bottom-5 text-[10px] opacity-0 group-hover:opacity-100">Higher</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Design Comparison</h3>
          <div className="prose prose-sm">
            <h4>My Recommendations:</h4>
            <ol>
              <li><strong>For your use case: Segmented Control (Option 1)</strong>
                <ul>
                  <li>Clean, modern look that matches table aesthetics</li>
                  <li>Clear visual feedback</li>
                  <li>Compact and space-efficient</li>
                  <li>Works well with the manual tax input</li>
                </ul>
              </li>
              <li><strong>Alternative: Pill Toggle Group (Option 3)</strong>
                <ul>
                  <li>More visual impact with brand colors</li>
                  <li>Clear active state</li>
                  <li>Good for important settings</li>
                </ul>
              </li>
            </ol>
            
            <h4>Why not the others?</h4>
            <ul>
              <li><strong>Current slider:</strong> Can be confusing with 3 positions</li>
              <li><strong>Tabs:</strong> Takes more vertical space</li>
              <li><strong>Icons:</strong> Less clear for non-technical users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}