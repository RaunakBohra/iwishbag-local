import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Globe, Phone, ChevronDown, Smartphone, MapPin } from 'lucide-react';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { CompactPhoneInputA } from '@/components/ui/CompactPhoneInputA';
import { CompactPhoneInputB } from '@/components/ui/CompactPhoneInputB';
import { CompactPhoneInputC } from '@/components/ui/CompactPhoneInputC';
import { CompactPhoneInputD } from '@/components/ui/CompactPhoneInputD';
import { useAllCountries } from '@/hooks/useAllCountries';

const CompactPhoneInputDemo = () => {
  const { data: countries = [] } = useAllCountries();
  const [currentValue, setCurrentValue] = useState('');
  const [optionAValue, setOptionAValue] = useState('');
  const [optionBValue, setOptionBValue] = useState('');
  const [optionCValue, setOptionCValue] = useState('');
  const [optionDValue, setOptionDValue] = useState('');

  const designs = [
    {
      id: 'current',
      title: 'Current Design',
      description: 'Your existing phone input with flag and full dial code',
      component: (
        <WorldClassPhoneInput
          countries={countries}
          value={currentValue}
          onChange={setCurrentValue}
          placeholder="Enter phone number"
        />
      ),
      metrics: {
        selectorWidth: '~100px',
        spaceUsage: '100%',
        mobileReady: 'Good'
      },
      pros: [
        'Clear country identification',
        'Visible dial code',
        'Familiar pattern'
      ],
      cons: [
        'Takes significant horizontal space',
        'Dial code might be redundant',
        'Less room for phone number on mobile'
      ]
    },
    {
      id: 'optionA',
      title: 'Option A: Flag Only',
      description: 'Compact flag selector with dial code as input prefix',
      badge: 'Recommended',
      badgeColor: 'bg-green-500',
      component: (
        <CompactPhoneInputA
          countries={countries}
          value={optionAValue}
          onChange={setOptionAValue}
          placeholder="Enter phone number"
        />
      ),
      metrics: {
        selectorWidth: '~40px',
        spaceUsage: '40%',
        mobileReady: 'Excellent'
      },
      pros: [
        'Saves 60% horizontal space',
        'Clean, modern look',
        'Dial code still visible in input',
        'Great for mobile'
      ],
      cons: [
        'Country name only in tooltip',
        'Might need user education'
      ]
    },
    {
      id: 'optionB',
      title: 'Option B: Compact Flag + Code',
      description: 'Reduced padding and smaller font for dial code',
      component: (
        <CompactPhoneInputB
          countries={countries}
          value={optionBValue}
          onChange={setOptionBValue}
          placeholder="Enter phone number"
        />
      ),
      metrics: {
        selectorWidth: '~70px',
        spaceUsage: '70%',
        mobileReady: 'Good'
      },
      pros: [
        'Still shows dial code',
        'Moderate space savings',
        'Minimal learning curve'
      ],
      cons: [
        'Less space saved than other options',
        'Might look cramped'
      ]
    },
    {
      id: 'optionC',
      title: 'Option C: Icon Only',
      description: 'Minimalist design with globe icon',
      badge: 'Most Compact',
      badgeColor: 'bg-blue-500',
      component: (
        <CompactPhoneInputC
          countries={countries}
          value={optionCValue}
          onChange={setOptionCValue}
          placeholder="Enter phone number"
        />
      ),
      metrics: {
        selectorWidth: '~35px',
        spaceUsage: '35%',
        mobileReady: 'Excellent'
      },
      pros: [
        'Maximum space efficiency',
        'Clean, minimal design',
        'Universal icon'
      ],
      cons: [
        'No visual country indicator',
        'Requires dropdown interaction',
        'Less discoverable'
      ]
    },
    {
      id: 'optionD',
      title: 'Option D: Inline Country',
      description: 'Flag and code inside the input field (WhatsApp style)',
      badge: 'Modern',
      badgeColor: 'bg-purple-500',
      component: (
        <CompactPhoneInputD
          countries={countries}
          value={optionDValue}
          onChange={setOptionDValue}
          placeholder="Enter phone number"
        />
      ),
      metrics: {
        selectorWidth: 'N/A',
        spaceUsage: '100%*',
        mobileReady: 'Excellent'
      },
      pros: [
        'Familiar from messaging apps',
        'No separate selector button',
        'Full width for input',
        'Clean appearance'
      ],
      cons: [
        'Click target less obvious',
        'Might confuse some users',
        'Complex implementation'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Compact Phone Input Designs
          </h1>
          <p className="text-gray-600">
            Compare different phone input designs to find the most space-efficient solution
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {designs.map((design) => (
            <Card key={design.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {design.title}
                      {design.badge && (
                        <Badge className={`${design.badgeColor} text-white`}>
                          {design.badge}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {design.description}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Selector Width</div>
                    <div className="text-lg font-semibold">{design.metrics.selectorWidth}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Component Preview */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Desktop View</div>
                  <div className="bg-white p-4 rounded-lg border">
                    {design.component}
                  </div>
                  
                  <div className="text-sm font-medium text-gray-700 mb-2">Mobile View (375px)</div>
                  <div className="bg-white p-4 rounded-lg border max-w-[375px]">
                    {React.cloneElement(design.component, { className: 'w-full' })}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 py-4 border-y">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {design.metrics.spaceUsage}
                    </div>
                    <div className="text-sm text-gray-500">Space Usage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {design.metrics.selectorWidth}
                    </div>
                    <div className="text-sm text-gray-500">Selector Width</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      design.metrics.mobileReady === 'Excellent' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {design.metrics.mobileReady}
                    </div>
                    <div className="text-sm text-gray-500">Mobile Ready</div>
                  </div>
                </div>

                {/* Pros and Cons */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Pros
                    </h4>
                    <ul className="space-y-1">
                      {design.pros.map((pro, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">
                      Cons
                    </h4>
                    <ul className="space-y-1">
                      {design.cons.map((con, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Implementation Notes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ul className="space-y-2 text-gray-600">
              <li>
                <strong>Option A (Flag Only)</strong> provides the best balance of space efficiency 
                and usability. The dial code remains visible as an input prefix.
              </li>
              <li>
                <strong>Option C (Icon Only)</strong> offers maximum space savings but sacrifices 
                immediate country visibility.
              </li>
              <li>
                <strong>Option D (Inline)</strong> follows modern messaging app patterns but requires 
                more complex implementation and user education.
              </li>
              <li>
                All options maintain full functionality including country search, validation, and 
                proper E.164 formatting.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompactPhoneInputDemo;