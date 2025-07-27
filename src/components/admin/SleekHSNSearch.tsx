import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Hash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface HSNOption {
  hsn_code: string;
  description: string;
  category: string;
  icon?: string;
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
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<HSNOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreateOption, setShowCreateOption] = useState(false);
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
          .select('hsn_code, description, category')
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
    onChange(hsnCode);
    setSearch('');
    setIsOpen(false);
  };

  const handleCreateHSN = async () => {
    if (!search || !/^\d+$/.test(search)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('hsn_requests')
        .insert({
          hsn_code: search,
          description: 'User requested HSN code',
          category: 'Uncategorized',
          source: 'manual',
          status: 'pending'
        });

      if (error) throw error;

      handleSelect(search);
    } catch (error) {
      console.error('Error creating HSN request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-7 pr-7 py-1 text-xs border border-gray-200 rounded",
            "focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20",
            "placeholder:text-gray-400",
            className
          )}
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (options.length > 0 || showCreateOption) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {options.map((option, index) => (
            <button
              key={option.hsn_code}
              onClick={() => handleSelect(option.hsn_code)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors",
                "border-b border-gray-100 last:border-0",
                selectedIndex === index && "bg-blue-50"
              )}
            >
              <div className="flex items-start gap-2">
                <Hash className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {option.hsn_code}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {option.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-0.5">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {showCreateOption && (
            <button
              onClick={handleCreateHSN}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors",
                "border-t border-gray-200",
                selectedIndex === options.length && "bg-blue-50"
              )}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">
                  Add HSN "{search}"
                </span>
              </div>
              <p className="text-xs text-gray-500 ml-5 mt-0.5">
                Create new HSN code
              </p>
            </button>
          )}
        </div>
      )}
    </div>
  );
};