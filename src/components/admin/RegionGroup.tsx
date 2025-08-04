import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Country {
  code: string;
  name: string;
  currency: string;
  is_active: boolean;
  purchase_allowed: boolean;
  shipping_allowed: boolean;
}

interface RegionGroupProps {
  regionName: string;
  countries: Country[];
  selectedCountries: string[];
  onSelectionChange: (countryCodes: string[], selected: boolean) => void;
  onEditCountry: (country: Country) => void;
  children?: React.ReactNode;
}

export const RegionGroup = ({
  regionName,
  countries,
  selectedCountries,
  onSelectionChange,
  onEditCountry,
  children
}: RegionGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate region stats
  const regionCodes = countries.map(c => c.code);
  const selectedInRegion = regionCodes.filter(code => selectedCountries.includes(code)).length;
  const allSelected = selectedInRegion === countries.length && countries.length > 0;
  const someSelected = selectedInRegion > 0 && selectedInRegion < countries.length;
  
  const activeCount = countries.filter(c => c.is_active).length;
  const purchaseCount = countries.filter(c => c.purchase_allowed).length;
  const shippingCount = countries.filter(c => c.shipping_allowed).length;

  const handleRegionSelect = (checked: boolean) => {
    onSelectionChange(regionCodes, checked);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Region Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 h-auto hover:bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </Button>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected || undefined}
              onCheckedChange={handleRegionSelect}
              aria-label={`Select all countries in ${regionName}`}
            />
            <div>
              <h3 className="font-medium text-gray-900">{regionName}</h3>
              <p className="text-sm text-gray-500">
                {countries.length} countries
                {selectedInRegion > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedInRegion} selected)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {purchaseCount} purchase
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {shippingCount} shipping
            </Badge>
          </div>
        </div>
      </div>

      {/* Countries in Region */}
      {isExpanded && (
        <div className="divide-y divide-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};