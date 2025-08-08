/**
 * PricingTableView - Table-based Pricing Display Component
 * 
 * Features:
 * - Searchable and filterable pricing table
 * - Inline editing capabilities
 * - Continental color coding
 * - Responsive design
 * - Real-time rate updates
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Edit2, 
  Save, 
  X,
  DollarSign,
  Coins,
  Loader2
} from 'lucide-react';
import { LocalCurrencyPricingModal } from './LocalCurrencyPricingModal';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface Country {
  code: string;
  name: string;
  continent: string | null;
  currency: string | null;
}

interface PricingMatrix {
  service_key: string;
  service_name: string;
  pricing_type: 'percentage' | 'fixed';
  countries: Record<string, {
    rate: number;
    tier: 'global' | 'continental' | 'regional' | 'country';
    source: string;
    min_amount: number;
    max_amount?: number;
  }>;
}

interface PricingTableViewProps {
  pricingMatrix: PricingMatrix | null;
  countries: Country[];
  onEditRate: (countryCode: string, newRate: number, currency?: string, localAmount?: number) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  pricingType?: 'percentage' | 'fixed';
}

// ============================================================================
// CONTINENTAL COLORS
// ============================================================================

const ContinentalColors = {
  'Asia': 'bg-blue-500',
  'Europe': 'bg-green-500',
  'North America': 'bg-purple-500',
  'South America': 'bg-orange-500',
  'Africa': 'bg-yellow-500',
  'Oceania': 'bg-pink-500',
  'Antarctica': 'bg-gray-500',
} as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PricingTableView: React.FC<PricingTableViewProps> = ({
  pricingMatrix,
  countries,
  onEditRate,
  isLoading = false,
  className = "",
  pricingType = 'percentage'
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterContinent, setFilterContinent] = useState<string>('all');
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [currencyModalOpen, setCurrencyModalOpen] = useState<boolean>(false);
  const [selectedCountryForModal, setSelectedCountryForModal] = useState<Country | null>(null);
  const [savingCountries, setSavingCountries] = useState<Set<string>>(new Set());
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, number>>(new Map());

  // ============================================================================
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  // ============================================================================

  // Prepare table data
  const allTableData = useMemo(() => {
    if (!pricingMatrix || countries.length === 0) return [];
    
    return countries.map((country) => {
      const pricing = pricingMatrix.countries[country.code];
      return {
        code: country.code,
        name: country.name,
        continent: country.continent || 'Other',
        currency: country.currency || 'USD',
        rate: optimisticUpdates?.get(country.code) ?? pricing?.rate ?? 0,
        tier: pricing?.tier || 'global',
        source: pricing?.source || 'Default',
        min_amount: pricing?.min_amount || 0,
        max_amount: pricing?.max_amount,
      };
    });
  }, [pricingMatrix, countries, optimisticUpdates?.size]);

  // Apply filters
  const tableData = useMemo(() => {
    return allTableData.filter((row) => {
      const matchesSearch = !searchTerm || 
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesContinent = filterContinent === 'all' || 
        row.continent === filterContinent;
      
      return matchesSearch && matchesContinent;
    });
  }, [allTableData, searchTerm, filterContinent]);

  // Get unique continents for filter
  const continents = useMemo(() => {
    return Array.from(new Set(allTableData.map(row => row.continent))).sort();
  }, [allTableData]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleEditStart = useCallback((countryCode: string, currentRate: number) => {
    setEditingCountry(countryCode);
    setEditRate(currentRate.toString());
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingCountry(null);
    setEditRate('');
  }, []);

  const handleEditSave = async (countryCode: string) => {
    const newRate = parseFloat(editRate);
    if (isNaN(newRate) || newRate < 0) {
      return;
    }

    try {
      // Add to saving state
      setSavingCountries(prev => new Set([...prev, countryCode]));
      
      // Optimistically update the UI
      setOptimisticUpdates(prev => new Map([...prev, [countryCode, newRate]]));
      
      await onEditRate(countryCode, newRate);
      
      // Clear states on success
      setEditingCountry(null);
      setEditRate('');
      
    } catch (error) {
      console.error('Failed to save edit:', error);
      
      // Remove optimistic update on error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(countryCode);
        return newMap;
      });
    } finally {
      // Always remove from saving state
      setSavingCountries(prev => {
        const newSet = new Set(prev);
        newSet.delete(countryCode);
        return newSet;
      });
      
      // Clear optimistic update after a delay to allow server data to arrive
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(countryCode);
          return newMap;
        });
      }, 2000);
    }
  };

  const handleCurrencyModalOpen = useCallback((country: Country) => {
    setSelectedCountryForModal(country);
    setCurrencyModalOpen(true);
  }, []);

  const handleCurrencyModalSave = async (rate: number, currency: string, localAmount: number) => {
    if (!selectedCountryForModal) return;
    
    const countryCode = selectedCountryForModal.code;
    
    try {
      // Add to saving state
      setSavingCountries(prev => new Set([...prev, countryCode]));
      
      // Optimistically update the UI
      setOptimisticUpdates(prev => new Map([...prev, [countryCode, rate]]));
      
      await onEditRate(countryCode, rate, currency, localAmount);
      
      setCurrencyModalOpen(false);
      setSelectedCountryForModal(null);
      
    } catch (error) {
      console.error('Failed to save currency rate:', error);
      
      // Remove optimistic update on error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(countryCode);
        return newMap;
      });
      
      throw error; // Let modal handle the error display
    } finally {
      // Always remove from saving state
      setSavingCountries(prev => {
        const newSet = new Set(prev);
        newSet.delete(countryCode);
        return newSet;
      });
      
      // Clear optimistic update after a delay
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(countryCode);
          return newMap;
        });
      }, 2000);
    }
  };

  const handleCurrencyModalClose = useCallback(() => {
    setCurrencyModalOpen(false);
    setSelectedCountryForModal(null);
  }, []);

  // ============================================================================
  // EARLY RETURNS (AFTER ALL HOOKS ARE DECLARED)
  // ============================================================================

  if (!pricingMatrix) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-500 mb-2">No pricing data available</div>
          <div className="text-sm text-gray-400">Select a service to view pricing details</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded w-full"></div>
              <div className="h-64 bg-gray-200 rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Continent:</Label>
              <Select value={filterContinent} onValueChange={setFilterContinent}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Continents</SelectItem>
                  {continents.map((continent) => (
                    <SelectItem key={continent} value={continent}>
                      {continent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="text-sm">
              {tableData.length} of {countries.length} countries
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Regional Pricing Configuration - {pricingMatrix.service_name}
          </CardTitle>
          <CardDescription>
            {pricingMatrix.pricing_type} pricing • Showing {tableData.length} countries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Code</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Continent</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Min Amount</TableHead>
                <TableHead className="text-right">Max Amount</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => {
                const isSaving = savingCountries?.has(row.code) || false;
                const hasOptimisticUpdate = optimisticUpdates?.has(row.code) || false;
                
                return (
                <TableRow key={row.code} className={`hover:bg-gray-50 ${
                  isSaving ? 'bg-blue-50' : hasOptimisticUpdate ? 'bg-green-50' : ''
                }`}>
                  <TableCell className="font-mono font-medium">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${ContinentalColors[row.continent as keyof typeof ContinentalColors] || 'bg-gray-400'}`} />
                      {row.continent}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{row.currency}</TableCell>
                  <TableCell className="text-right">
                    {editingCountry === row.code ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Input
                          type="number"
                          step="0.001"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-20 text-right"
                          autoFocus
                        />
                        <span className="text-xs text-gray-500">
                          {pricingMatrix.pricing_type === 'percentage' ? '%' : 'USD'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        {isSaving && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        )}
                        <span className={`font-bold ${
                          hasOptimisticUpdate 
                            ? 'text-blue-600' 
                            : isSaving 
                            ? 'text-gray-400' 
                            : 'text-green-600'
                        }`}>
                          {pricingMatrix.pricing_type === 'percentage' 
                            ? (row.rate * 100).toFixed(3) + '%'
                            : '$' + row.rate.toFixed(2)
                          }
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={row.tier === 'country' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {row.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={row.source}>
                    {row.source}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${row.min_amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.max_amount ? '$' + row.max_amount.toFixed(2) : '—'}
                  </TableCell>
                  <TableCell>
                    {editingCountry === row.code ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(row.code)}
                          className="h-8 w-8 p-0"
                          title="Save changes"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEditCancel}
                          className="h-8 w-8 p-0"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditStart(row.code, row.rate)}
                          className="h-8 w-8 p-0"
                          title="Quick edit (USD)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCurrencyModalOpen(row)}
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                          title="Set local currency price"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Coins className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Local Currency Pricing Modal */}
      <LocalCurrencyPricingModal
        isOpen={currencyModalOpen}
        onClose={handleCurrencyModalClose}
        onSave={handleCurrencyModalSave}
        country={selectedCountryForModal}
        currentRate={selectedCountryForModal && pricingMatrix ? 
          pricingMatrix.countries[selectedCountryForModal.code]?.rate || 0 : 0}
        currentCurrency="USD"
        pricingType={pricingType}
      />
    </div>
  );
};