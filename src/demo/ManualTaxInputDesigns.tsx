import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ManualTaxInputDesigns() {
  const [values, setValues] = useState({
    inline: 18,
    slider: 25,
    pill: 15,
    stepper: 20,
    popover: 12,
    floating: 30,
    icon: 10,
    current: 18
  });

  const updateValue = (type: string, value: number) => {
    setValues(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Tax Input Designs</h1>
          <p className="text-gray-600">Choose the perfect design for your manual tax input</p>
        </div>

        {/* Current Design */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Current Design</h3>
          <div className="flex items-center gap-4">
            <div className="animate-in slide-in-from-top-1 fade-in duration-200">
              <div className="flex items-center gap-1.5 p-1.5 bg-purple-50 rounded-lg border border-purple-200">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={values.current}
                  onChange={(e) => updateValue('current', parseFloat(e.target.value) || 0)}
                  className="w-14 px-2 py-1 text-xs text-center bg-white border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                  placeholder="0"
                />
                <span className="text-xs text-purple-600 font-medium">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Option 1: Inline Minimal */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 1: Inline Minimal</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="relative">
                <input
                  type="number"
                  value={values.inline}
                  onChange={(e) => updateValue('inline', parseFloat(e.target.value) || 0)}
                  className="w-12 pl-1 pr-5 py-0.5 text-xs text-right bg-transparent border-b border-purple-400 focus:border-purple-600 focus:outline-none"
                />
                <span className="absolute right-1 top-0.5 text-xs text-purple-500">%</span>
              </div>
            </div>
            <span className="text-sm text-gray-500">Clean underline style</span>
          </div>
        </div>

        {/* Option 2: Slider */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 2: Slider Design</h3>
          <div className="space-y-2 max-w-xs">
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={values.slider}
              onChange={(e) => updateValue('slider', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="font-medium text-purple-600">{values.slider}%</span>
              <span>50%</span>
            </div>
          </div>
        </div>

        {/* Option 3: Pill/Badge */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 3: Pill/Badge Style</h3>
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-full">
              <span className="text-xs text-purple-600">Tax:</span>
              <input
                type="number"
                value={values.pill}
                onChange={(e) => updateValue('pill', parseFloat(e.target.value) || 0)}
                className="w-10 text-xs text-center bg-transparent border-none focus:outline-none font-semibold text-purple-700"
              />
              <span className="text-xs text-purple-600">%</span>
            </div>
            <span className="text-sm text-gray-500">Gradient pill design</span>
          </div>
        </div>

        {/* Option 4: Stepper */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 4: Stepper Design</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => updateValue('stepper', Math.max(0, values.stepper - 0.5))}
                className="w-6 h-6 rounded bg-purple-100 hover:bg-purple-200 text-purple-600 text-xs font-bold flex items-center justify-center"
              >
                −
              </button>
              <div className="px-3 py-1 bg-white border border-purple-200 rounded">
                <span className="text-xs font-medium text-purple-700">{values.stepper}%</span>
              </div>
              <button 
                onClick={() => updateValue('stepper', Math.min(100, values.stepper + 0.5))}
                className="w-6 h-6 rounded bg-purple-100 hover:bg-purple-200 text-purple-600 text-xs font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
            <span className="text-sm text-gray-500">Plus/minus controls</span>
          </div>
        </div>

        {/* Option 5: Popover */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 5: Popover Style</h3>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors">
                  Tax: {values.popover}%
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium">Manual Tax Rate</Label>
                    <Input 
                      type="number" 
                      value={values.popover}
                      onChange={(e) => updateValue('popover', parseFloat(e.target.value) || 0)}
                      className="h-8 mt-1" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Cancel</Button>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">Apply</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <span className="text-sm text-gray-500">Click to edit in popover</span>
          </div>
        </div>

        {/* Option 6: Floating Label */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 6: Floating Label</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="number"
                value={values.floating}
                onChange={(e) => updateValue('floating', parseFloat(e.target.value) || 0)}
                className="peer w-20 px-2 pt-4 pb-1 text-sm border border-purple-300 rounded focus:border-purple-500 focus:outline-none"
              />
              <label className="absolute left-2 top-1 text-xs text-purple-600 peer-focus:text-purple-700">
                Tax %
              </label>
            </div>
            <span className="text-sm text-gray-500">Material design inspired</span>
          </div>
        </div>

        {/* Option 7: Icon-Based */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Option 7: Icon-Based Compact</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center px-2 py-1 bg-purple-50 rounded-md border border-purple-200">
              <Percent className="w-3 h-3 text-purple-500 mr-1" />
              <input
                type="number"
                value={values.icon}
                onChange={(e) => updateValue('icon', parseFloat(e.target.value) || 0)}
                className="w-10 text-xs bg-transparent border-none focus:outline-none text-purple-700 font-medium"
              />
            </div>
            <span className="text-sm text-gray-500">Icon with inline input</span>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Design Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Design</th>
                  <th className="text-center py-2">Space Used</th>
                  <th className="text-center py-2">Mobile Friendly</th>
                  <th className="text-center py-2">Accessibility</th>
                  <th className="text-center py-2">Visual Impact</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Current (Box)</td>
                  <td className="text-center">Medium</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">High</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Inline Minimal</td>
                  <td className="text-center">Minimal</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">Low</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Slider</td>
                  <td className="text-center">Large</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Excellent</td>
                  <td className="text-center">Medium</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Pill/Badge</td>
                  <td className="text-center">Small</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">Medium</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Stepper</td>
                  <td className="text-center">Medium</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Excellent</td>
                  <td className="text-center">Medium</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Popover</td>
                  <td className="text-center">Minimal</td>
                  <td className="text-center">—</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">Low</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Floating Label</td>
                  <td className="text-center">Small</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">High</td>
                </tr>
                <tr>
                  <td className="py-2">Icon-Based</td>
                  <td className="text-center">Small</td>
                  <td className="text-center">✓</td>
                  <td className="text-center">Good</td>
                  <td className="text-center">Medium</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}