import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CompactConfidenceIndicator } from './CompactConfidenceIndicator';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import { Tag, ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HSNClassification {
  code: string;
  description: string;
  confidence?: number;
}

interface CompactHSNSelectorProps {
  currentHSN?: HSNClassification;
  suggestions?: HSNClassification[];
  onHSNChange: (hsn: HSNClassification) => void;
  className?: string;
  disabled?: boolean;
}

export const CompactHSNSelector: React.FC<CompactHSNSelectorProps> = ({
  currentHSN,
  suggestions = [],
  onHSNChange,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleHSNSelect = (hsn: HSNClassification) => {
    onHSNChange(hsn);
    setIsOpen(false);
    setShowSearch(false);
  };

  const handleSearchOpen = () => {
    setShowSearch(true);
    setIsOpen(false);
  };

  // Get top 2 suggestions for quick apply
  const quickSuggestions = suggestions
    .filter(s => s.code !== currentHSN?.code)
    .slice(0, 2);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Current HSN Display */}
      <div className="flex items-center gap-1">
        <Tag className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">HSN:</span>
        
        {currentHSN ? (
          <div className="flex items-center gap-1">
            <Badge variant="success" className="text-xs font-medium">
              {currentHSN.code}
            </Badge>
            <span className="text-sm text-gray-600 max-w-32 truncate">
              {currentHSN.description}
            </span>
            {currentHSN.confidence && (
              <CompactConfidenceIndicator 
                confidence={currentHSN.confidence}
                className="ml-1"
              />
            )}
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">
            Not classified
          </Badge>
        )}
      </div>

      {/* Quick Apply Suggestions */}
      {quickSuggestions.length > 0 && (
        <div className="flex items-center gap-1">
          {quickSuggestions.map((suggestion, index) => (
            <Button
              key={`${suggestion.code}-${index}`}
              variant="outline"
              size="sm"
              onClick={() => handleHSNSelect(suggestion)}
              disabled={disabled}
              className="h-7 px-2 text-xs border-gray-300 hover:border-green-400 hover:bg-green-50"
            >
              <span className="font-medium">{suggestion.code}</span>
              {suggestion.confidence && (
                <CompactConfidenceIndicator 
                  confidence={suggestion.confidence}
                  className="ml-1"
                />
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Search Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSearchOpen}
        disabled={disabled}
        className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100"
      >
        <Search className="w-3 h-3 mr-1" />
        Search
      </Button>

      {/* More Options Popover */}
      {suggestions.length > 2 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-3" align="start">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Tag className="w-4 h-4" />
                HSN Suggestions
              </div>
              
              {suggestions.map((suggestion, index) => {
                const isSelected = suggestion.code === currentHSN?.code;
                
                return (
                  <div
                    key={`${suggestion.code}-${index}`}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                    onClick={() => handleHSNSelect(suggestion)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="success" className="text-xs">
                          {suggestion.code}
                        </Badge>
                        {suggestion.confidence && (
                          <CompactConfidenceIndicator 
                            confidence={suggestion.confidence}
                            showPercentage
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {suggestion.description}
                      </p>
                    </div>
                    
                    {isSelected && (
                      <Check className="w-4 h-4 text-green-600 ml-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })}

              <div className="pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearchOpen}
                  className="w-full text-xs"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Search All HSN Codes
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* HSN Search Modal */}
      {showSearch && (
        <SmartHSNSearch
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onSelect={(hsnData) => {
            handleHSNSelect({
              code: hsnData.code,
              description: hsnData.description,
              confidence: 1.0
            });
          }}
          productName=""
        />
      )}
    </div>
  );
};