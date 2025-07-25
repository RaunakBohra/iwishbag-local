import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HSNData {
  code: string;
  description: string;
}

interface HSNSuggestion extends HSNData {
  confidence?: number;
}

interface StripeHSNSelectorProps {
  currentHSN?: HSNData;
  suggestions?: HSNSuggestion[];
  onHSNSelect: (hsn: HSNData) => void;
  onHSNRemove?: () => void;
  className?: string;
}

export const StripeHSNSelector: React.FC<StripeHSNSelectorProps> = ({
  currentHSN,
  suggestions = [],
  onHSNSelect,
  onHSNRemove,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock HSN search results - in real app, this would be from your HSN service
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
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Tag className="w-3.5 h-3.5" />
        <span>HSN</span>
      </div>
      
      {currentHSN ? (
        // Show HSN code when selected
        <Badge 
          variant="outline" 
          className="h-8 px-2 text-sm font-mono border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer group"
          onClick={() => setIsOpen(true)}
        >
          {currentHSN.code}
          {onHSNRemove && (
            <X 
              className="w-3 h-3 ml-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" 
              onClick={handleRemove}
            />
          )}
        </Badge>
      ) : (
        // Show search button when no HSN selected
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-sm border-gray-300 hover:bg-gray-50"
            >
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
                  className="border-0 p-0 text-sm focus:ring-0 placeholder:text-gray-400"
                  autoFocus
                />
              </div>
              
              {suggestions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleHSNSelect(suggestion)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-gray-50 transition-colors"
                      >
                        <Badge variant="outline" className="text-xs font-mono">
                          {suggestion.code}
                        </Badge>
                        <span className="text-sm text-gray-700 truncate">
                          {suggestion.description}
                        </span>
                        {suggestion.confidence && (
                          <div className="ml-auto flex items-center gap-1">
                            <div className={cn('w-1.5 h-1.5 rounded-full',
                              suggestion.confidence >= 0.8 ? 'bg-green-500' :
                              suggestion.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            )} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-2">
                <div className="text-xs font-medium text-gray-500 mb-2">Search Results</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {mockHSNResults.map((hsn, index) => (
                    <button
                      key={index}
                      onClick={() => handleHSNSelect(hsn)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-gray-50 transition-colors"
                    >
                      <Badge variant="outline" className="text-xs font-mono">
                        {hsn.code}
                      </Badge>
                      <span className="text-sm text-gray-700 truncate">
                        {hsn.description}
                      </span>
                    </button>
                  ))}
                  {mockHSNResults.length === 0 && searchQuery && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      No HSN codes found
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