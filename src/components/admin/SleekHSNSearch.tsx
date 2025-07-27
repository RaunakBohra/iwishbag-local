import React, { useState, useEffect, useRef } from 'react';
import { Plus, Hash, Package, DollarSign, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { HSNCreationModal } from './HSNCreationModal';

interface HSNOption {
  hsn_code: string;
  description: string;
  category: string;
  subcategory?: string | null;
  keywords?: string[] | null;
  minimum_valuation_usd?: number | null;
  tax_data?: any;
  weight_data?: any;
}

interface SleekHSNSearchProps {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SleekHSNSearch: React.FC<SleekHSNSearchProps> = ({
  value,
  onChange,
  onCancel,
  placeholder = "Search HSN...",
  className,
  autoFocus = true,
}) => {
  console.log('🔍 [HSN-COMPONENT] SleekHSNSearch rendered with value:', value, 'at', new Date().toISOString());
  
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<HSNOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreateOption, setShowCreateOption] = useState(false);
  const [showHSNModal, setShowHSNModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search HSN codes
  useEffect(() => {
    const searchHSN = async () => {
      if (!search || search.length < 2) {
        setOptions([]);
        setShowCreateOption(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('hsn_master')
          .select('hsn_code, description, category, subcategory, keywords, minimum_valuation_usd, tax_data, weight_data')
          .or(`hsn_code.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
          .limit(6);

        if (error) throw error;

        setOptions(data || []);
        setShowCreateOption(
          (data?.length === 0 || !data?.some(item => item.hsn_code === search)) && 
          /^\d+$/.test(search)
        );
        setIsOpen(true);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Error searching HSN:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchHSN, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = showCreateOption ? options.length : options.length - 1;
      setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showCreateOption && selectedIndex === options.length) {
        handleCreateHSN();
      } else if (options[selectedIndex]) {
        handleSelect(options[selectedIndex].hsn_code);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSelect = (hsnCode: string) => {
    console.log('🔍 [HSN] handleSelect called with:', hsnCode);
    console.log('🔍 [HSN] Calling onChange callback...');
    onChange(hsnCode);
    setSearch('');
    setIsOpen(false);
    console.log('🔍 [HSN] handleSelect completed, search cleared, dropdown closed');
  };

  const handleCreateHSN = () => {
    setIsOpen(false);
    setShowHSNModal(true);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          "flex h-6 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-950",
          "placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950",
          "disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-400",
          "dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:file:text-gray-50",
          "dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300",
          className
        )}
        autoFocus={autoFocus}
      />

      {/* Dropdown */}
      {isOpen && (options.length > 0 || showCreateOption) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg left-1/2 -translate-x-1/2 flex flex-col"
          style={{ minWidth: '400px', maxWidth: '500px', maxHeight: '320px' }}
        >
          {/* Scrollable options area */}
          <div className="overflow-y-auto flex-1">
            {options.map((option, index) => {
            // Extract tax rate from tax_data (correct structure)
            const taxRate = option.tax_data?.typical_rates?.customs?.common || 
                           option.tax_data?.typical_rates?.gst?.standard ||
                           option.tax_data?.gst_rate || 
                           option.tax_data?.customs_rate || 
                           18;
            
            // Debug logging for HSN search dropdown rates
            if (option.tax_data) {
              console.log(`[HSN Search] ${option.hsn_code}: customs=${option.tax_data?.typical_rates?.customs?.common}%, gst=${option.tax_data?.typical_rates?.gst?.standard}%, displaying=${taxRate}%`);
            }
            const hasMinValuation = option.minimum_valuation_usd && option.minimum_valuation_usd > 0;
            
            return (
              <button
                key={option.hsn_code}
                onClick={() => handleSelect(option.hsn_code)}
                className={cn(
                  "w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0",
                  selectedIndex === index && "bg-blue-50"
                )}
              >
                <div className="space-y-1.5">
                  {/* First row: HSN code and category */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-mono font-semibold text-sm text-gray-900">
                        {option.hsn_code}
                      </span>
                      <span className="text-xs text-gray-500">
                        {option.category}
                        {option.subcategory && ` › ${option.subcategory}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <Percent className="h-3 w-3" />
                        {taxRate}%
                      </span>
                      {hasMinValuation && (
                        <span className="flex items-center gap-1 text-xs text-orange-600">
                          <DollarSign className="h-3 w-3" />
                          Min ${option.minimum_valuation_usd}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Second row: Description */}
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {option.description}
                  </p>
                  
                  {/* Third row: Keywords if available */}
                  {option.keywords && option.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {option.keywords.slice(0, 3).map((keyword, idx) => (
                        <span 
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                      {option.keywords.length > 3 && (
                        <span className="text-[10px] text-gray-400">
                          +{option.keywords.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          </div>

          {/* Sticky Add HSN button */}
          {showCreateOption && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2">
              <button
                onClick={handleCreateHSN}
                className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors rounded-md bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-600">
                        Add HSN "{search}"
                      </p>
                      <p className="text-xs text-gray-500">
                        Request for admin approval
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* HSN Creation Modal */}
      <HSNCreationModal
        open={showHSNModal}
        onOpenChange={setShowHSNModal}
        mode="user_request"
        initialData={{
          hsn_code: search,
        }}
        onSuccess={(hsnData) => {
          // Select the newly created HSN
          handleSelect(search);
          setShowHSNModal(false);
        }}
      />
    </div>
  );
};