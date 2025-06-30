import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type FilterType = 'all' | 'pending' | 'approved' | 'in_cart';

interface QuotesFilterProps {
  onFilterChange: (filter: FilterType) => void;
  onSearchChange: (searchTerm: string) => void;
  activeFilter: FilterType;
  isSearching?: boolean;
}

export const QuotesFilter = ({ 
  onFilterChange, 
  onSearchChange, 
  activeFilter,
  isSearching = false
}: QuotesFilterProps) => {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Call the parent's search handler when debounced value changes
  React.useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant={activeFilter === 'all' ? 'default' : 'outline'} onClick={() => onFilterChange('all')}>All</Button>
        <Button size="sm" variant={activeFilter === 'pending' ? 'default' : 'outline'} onClick={() => onFilterChange('pending')}>Pending</Button>
        <Button size="sm" variant={activeFilter === 'approved' ? 'default' : 'outline'} onClick={() => onFilterChange('approved')}>Approved</Button>
        <Button size="sm" variant={activeFilter === 'in_cart' ? 'default' : 'outline'} onClick={() => onFilterChange('in_cart')}>In Cart</Button>
      </div>
      
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quotes..."
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          className="pl-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
};
