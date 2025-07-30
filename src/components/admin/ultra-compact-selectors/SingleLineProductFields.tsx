import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Search, Tag, Scale, Info, Package, DollarSign, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeightSuggestion {
  value: number;
  source: 'hsn' | 'ai';
  confidence: number;
  description: string;
}

interface HSNData {
  code: string;
  description: string;
  category?: string;
  tax_rate?: number;
  duty_rate?: number;
}

interface HSNSuggestion extends HSNData {
  confidence?: number;
}

interface SingleLineProductFieldsProps {
  quantity: number;
  price: number;
  weight: number;
  currentsource: 'hsn' | 'ai' | 'manual') => void;
  onHSNSelect: (hsn: HSNData) => void;
  onHSNRemove?: () => void;
  className?: string;
  disabled?: boolean;
}

export const SingleLineProductFields: React.FC<SingleLineProductFieldsProps> = ({
  quantity,
  price,
  weight,
  currentcurrency = 'USD',
  weightSuggestions = [],
  hsnSuggestions = [],
  onQuantityChange,
  onPriceChange,
  onWeightChange,
  ononclassName,
  disabled = false,
}) => {
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [issetIssetIssetSearchQuery] = useState('');

  // Mock description: 'Telephone sets, mobile phones',
      category: 'Electronics',
      tax_rate: 18,
      duty_rate: 10,
    },
    {
      code: '8471',
      description: 'Electronics and computers',
      category: 'Computing',
      tax_rate: 18,
      duty_rate: 0,
    },
    {
      code: '8504',
      description: 'Electrical transformers',
      category: 'Electrical',
      tax_rate: 12,
      duty_rate: 7.5,
    },
  ].filter(
    (hsn) =>
      hsn.code.includes(searchQuery) ||
      hsn.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleWeightSelect = (suggestion: WeightSuggestion) => {
    onWeightChange(suggestion.value, suggestion.source);
    setIsWeightOpen(false);
  };

  const handleHSNSelect = (hsn: HSNData) => {
    onHSNSelect(hsn);
    setIsHSNOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {}
      <div className="flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-sm text-gray-600">HSN</span>

        {currentHSN ? (
          <div className="flex items-center gap-2">
            <Popover open={isHSNDetailsOpen} onOpenChange={setIsHSNDetailsOpen}>
              <PopoverTrigger asChild>
                <Badge
                  variant="outline"
                  className="h-8 px-2 text-sm font-mono border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer group"
                >
                  {currentHSN.code}
                  <Info className="w-3 h-3 ml-1 text-gray-400 group-hover:text-gray-600" />
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-600" />
                    <h4 className="font-semibold text-gray-900">HSN Details</h4>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Code:</span>
                      <span className="text-sm font-mono font-semibold">{currentHSN.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Description:</span>
                      <span className="text-sm font-medium text-right max-w-48">
                        {currentHSN.description}
                      </span>
                    </div>
                    {currentHSN.category && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Category:</span>
                        <Badge variant="secondary" className="text-xs">
                          {currentHSN.category}
                        </Badge>
                      </div>
                    )}
                    {currentHSN.tax_rate !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">GST Rate:</span>
                        <span className="text-sm font-medium">{currentHSN.tax_rate}%</span>
                      </div>
                    )}
                    {currentHSN.duty_rate !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Duty Rate:</span>
                        <span className="text-sm font-medium">{currentHSN.duty_rate}%</span>
                      </div>
                    )}
                  </div>

                  {onHSNRemove && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onHSNRemove();
                        setIsHSNDetailsOpen(false);
                      }}
                      className="w-full text-xs"
                    >
                      Remove HSN Classification
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Popover open={isHSNOpen} onOpenChange={setIsHSNOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 text-sm" disabled={disabled}>
                <Search className="w-3 h-3 mr-1" />
                Search
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search HSN code or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 p-0 text-sm focus:ring-0"
                    autoFocus
                  />
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {mockindex) => (
                    <button
                      key={index}
                      onClick={() => handleHSNSelect(hsn)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left rounded hover:bg-gray-50"
                    >
                      <Badge variant="outline" className="text-xs font-mono">
                        {hsn.code}
                      </Badge>
                      <div className="flex-1">
                        <div className="text-sm text-gray-700 truncate">{hsn.description}</div>
                        <div className="text-xs text-gray-500">
                          {hsn.category} • GST: {hsn.tax_rate}% • Duty: {hsn.duty_rate}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
