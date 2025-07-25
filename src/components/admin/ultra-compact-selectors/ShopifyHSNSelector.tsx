import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search, Tag, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HSNData {
  code: string;
  description: string;
}

interface HSNSuggestion extends HSNData {
  confidence?: number;
}

interface ShopifyHSNSelectorProps {
  currentHSN?: HSNData;
  suggestions?: HSNSuggestion[];
  onHSNSelect: (hsn: HSNData) => void;
  onHSNRemove?: () => void;
  className?: string;
}

export const ShopifyHSNSelector: React.FC<ShopifyHSNSelectorProps> = ({
  currentHSN,
  suggestions = [],
  onHSNSelect,
  onHSNRemove,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock HSN search results
  const mockHSNResults = [
    { code: '8517', description: 'Telephone sets, mobile phones' },
    { code: '8471', description: 'Electronics and computers' },
    { code: '8504', description: 'Electrical transformers and chargers' },
    { code: '9013', description: 'Optical instruments and equipment' },
    { code: '8525', description: 'Transmission apparatus for radio' }
  ].filter(hsn => 
    hsn.code.includes(searchQuery) || 
    hsn.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleHSNSelect = (hsn: HSNData) => {
    onHSNSelect(hsn);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHSNRemove?.();
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Tag className="w-4 h-4 text-gray-500" />
        <span>HSN Code</span>
      </div>
      
      {currentHSN ? (
        // Show HSN code when selected
        <div className="flex items-center gap-2">
          <Badge 
            variant="success" 
            className="h-9 px-3 text-sm font-mono bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer group transition-colors"
            onClick={() => setIsOpen(true)}
          >
            {currentHSN.code}
            {onHSNRemove && (
              <X 
                className="w-3.5 h-3.5 ml-2 text-green-600 hover:text-green-800 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={handleRemove}
              />
            )}
          </Badge>
          <div className="text-xs text-gray-500 max-w-32 truncate">
            {currentHSN.description}
          </div>
        </div>
      ) : (
        // Show search button when no HSN selected
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm border-gray-300 hover:bg-green-50 hover:border-green-300 transition-colors shadow-sm"
            >
              <Search className="w-3.5 h-3.5 mr-2" />
              Search HSN
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0 shadow-xl border border-gray-200" align="start">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="text-sm font-semibold text-gray-900 mb-1">
                HSN Classification Search
              </div>
              <div className="text-xs text-gray-600">
                Find the right HSN code for customs and tax classification
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by HSN code or product description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-gray-300 focus:border-green-500 focus:ring-green-200"
                  autoFocus
                />
              </div>
              
              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-3">
                    <FileText className="w-3.5 h-3.5" />
                    Suggestions for this product
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleHSNSelect(suggestion)}
                        className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-green-50 transition-colors border border-transparent hover:border-green-200"
                      >
                        <div className="flex-shrink-0">
                          <Badge variant="success" className="text-xs font-mono">
                            {suggestion.code}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.description}
                          </div>
                          {suggestion.confidence && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className={cn('w-2 h-2 rounded-full',
                                suggestion.confidence >= 0.8 ? 'bg-green-500' :
                                suggestion.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                              )} />
                              <span className="text-xs text-gray-500">
                                {Math.round(suggestion.confidence * 100)}% match
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-gray-700 mb-3">
                  Search Results
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mockHSNResults.map((hsn, index) => (
                    <button
                      key={index}
                      onClick={() => handleHSNSelect(hsn)}
                      className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                    >
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs font-mono">
                          {hsn.code}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900 truncate">
                          {hsn.description}
                        </div>
                      </div>
                    </button>
                  ))}
                  {mockHSNResults.length === 0 && searchQuery && (
                    <div className="text-sm text-gray-500 text-center py-6">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No HSN codes found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};