import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search, Tag, X, FileText, Sparkles, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HSNData {
  code: string;
  description: string;
}

interface HSNSuggestion extends HSNData {
  confidence?: number;
}

interface ModernHSNSelectorProps {
  currentHSN?: HSNData;
  suggestions?: HSNSuggestion[];
  onHSNSelect: (hsn: HSNData) => void;
  onHSNRemove?: () => void;
  className?: string;
}

export const ModernHSNSelector: React.FC<ModernHSNSelectorProps> = ({
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
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <div className="p-1 rounded-md bg-gradient-to-br from-slate-100 to-slate-200">
          <Tag className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <span>HSN Code</span>
      </div>
      
      {currentHSN ? (
        // Show HSN code when selected
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 hover:border-emerald-300 cursor-pointer group transition-all duration-200 hover:shadow-md"
            onClick={() => setIsOpen(true)}
          >
            <div className="p-1 rounded bg-gradient-to-br from-emerald-500 to-teal-600">
              <Hash className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-mono font-semibold text-emerald-800">
              {currentHSN.code}
            </span>
            {onHSNRemove && (
              <X 
                className="w-3.5 h-3.5 text-emerald-600 hover:text-emerald-800 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-emerald-100 rounded" 
                onClick={handleRemove}
              />
            )}
          </div>
          <div className="text-xs text-slate-600 max-w-40 truncate">
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
              className="h-10 px-4 text-sm border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 shadow-sm bg-white/80 backdrop-blur-sm group"
            >
              <Search className="w-3.5 h-3.5 mr-2 text-slate-500 group-hover:text-slate-700 transition-colors" />
              Search HSN
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0 shadow-2xl border border-slate-200 bg-white/95 backdrop-blur-md" align="start">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    HSN Classification Search
                  </div>
                  <div className="text-xs text-slate-600">
                    Find the right harmonized system code for customs
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search HSN code or product description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 border-slate-300 focus:border-slate-400 focus:ring-slate-200 shadow-sm bg-white/80 backdrop-blur-sm text-sm"
                  autoFocus
                />
              </div>
              
              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-4 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    AI Suggestions
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleHSNSelect(suggestion)}
                        className="w-full flex items-center gap-4 p-4 text-left rounded-xl hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-200 border border-transparent hover:border-amber-200 group hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <div className="flex-shrink-0">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 group-hover:from-amber-600 group-hover:to-orange-700 transition-all duration-200">
                            <Hash className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {suggestion.code}
                            </span>
                            {suggestion.confidence && (
                              <div className="flex items-center gap-1">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((dot) => (
                                    <div
                                      key={dot}
                                      className={cn(
                                        'w-1.5 h-1.5 rounded-full transition-all duration-300',
                                        dot <= suggestion.confidence! * 5
                                          ? suggestion.confidence! >= 0.8 ? 'bg-emerald-500' :
                                            suggestion.confidence! >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                          : 'bg-slate-200'
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-semibold text-amber-700">
                                  {Math.round(suggestion.confidence * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-slate-700 truncate">
                            {suggestion.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-5">
                <div className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wide">
                  Search Results
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {mockHSNResults.map((hsn, index) => (
                    <button
                      key={index}
                      onClick={() => handleHSNSelect(hsn)}
                      className="w-full flex items-center gap-4 p-4 text-left rounded-xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-200 group"
                    >
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 group-hover:from-slate-500 group-hover:to-slate-700 transition-all duration-200">
                          <Hash className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-mono font-semibold text-slate-900 text-sm mb-1">
                          {hsn.code}
                        </div>
                        <div className="text-sm text-slate-600 truncate">
                          {hsn.description}
                        </div>
                      </div>
                    </button>
                  ))}
                  {mockHSNResults.length === 0 && searchQuery && (
                    <div className="text-center py-8">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-3">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <div className="text-sm font-medium text-slate-700 mb-1">
                        No HSN codes found
                      </div>
                      <div className="text-xs text-slate-500">
                        Try a different search term or browse categories
                      </div>
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