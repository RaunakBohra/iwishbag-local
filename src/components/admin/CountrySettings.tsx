import { useState } from 'react';
import { useCountrySettings } from '@/hooks/useCountrySettings';
import { useExchangeRateOperations } from '@/hooks/useExchangeRateOperations';
import { CountryForm } from './CountryForm';
import { RegionGroup } from './RegionGroup';
import { CountryItem } from './CountryItem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Plus, RefreshCw, Search, Globe, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const CountrySettings = () => {
  const {
    countries,
    isLoading,
    error,
    editingCountry,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkUpdating,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry,
    bulkUpdateCountries,
  } = useCountrySettings();

  const { triggerUpdate, isUpdating: isUpdatingRates } = useExchangeRateOperations();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Group countries by continent/region
  const groupCountriesByRegion = (countries: any[]) => {
    const filtered = countries.filter(country => 
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.currency.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = filtered.reduce((acc, country) => {
      const region = country.continent || 'Other';
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region].push(country);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort regions with Asia first
    const regionOrder = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Other'];
    return regionOrder
      .filter(region => groups[region])
      .map(region => ({
        name: region,
        countries: groups[region].sort((a, b) => 
          (a.display_name || a.name).localeCompare(b.display_name || b.name)
        )
      }));
  };

  const regionGroups = countries ? groupCountriesByRegion(countries) : [];

  // Handle region selection
  const handleRegionSelection = (countryCodes: string[], selected: boolean) => {
    if (selected) {
      setSelectedCountries(prev => [...new Set([...prev, ...countryCodes])]);
    } else {
      setSelectedCountries(prev => prev.filter(code => !countryCodes.includes(code)));
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation: string) => {
    if (selectedCountries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select countries before applying bulk operations.",
        variant: "destructive",
      });
      return;
    }

    console.log('Bulk operation:', operation, 'for countries:', selectedCountries);
    
    // Show confirmation dialog
    const operationName = operation.replace('-', ' ');
    const confirm = window.confirm(
      `Are you sure you want to ${operationName} ${selectedCountries.length} selected countries?`
    );
    
    if (!confirm) return;

    try {
      let updates: any = {};
      
      switch (operation) {
        case 'activate':
          updates = { is_active: true };
          break;
        case 'deactivate':
          updates = { is_active: false };
          break;
        case 'enable-purchase':
          updates = { purchase_allowed: true };
          break;
        case 'disable-purchase':
          updates = { purchase_allowed: false };
          break;
        case 'enable-shipping':
          updates = { shipping_allowed: true };
          break;
        case 'disable-shipping':
          updates = { shipping_allowed: false };
          break;
        case 'update-gateway':
          const gateway = prompt('Enter new payment gateway (stripe, paypal, payu):');
          if (gateway) {
            updates = { payment_gateway: gateway };
          } else {
            return; // User cancelled
          }
          break;
        default:
          toast({
            title: "Unknown Operation",
            description: `Unknown bulk operation: ${operation}`,
            variant: "destructive",
          });
          return;
      }

      // Store count before clearing selection
      const countryCount = selectedCountries.length;

      // Call the API to update countries
      await new Promise<void>((resolve, reject) => {
        bulkUpdateCountries(
          { countryCodes: selectedCountries, updates },
          {
            onSuccess: () => {
              toast({
                title: "Success!",
                description: `Successfully applied ${operationName} to ${countryCount} countries.`,
              });
              
              // Clear selection after successful operation
              setSelectedCountries([]);
              resolve();
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: "Operation Failed",
        description: "Bulk operation failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle select all functionality
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCountries = regionGroups.flatMap(region => region.countries.map(c => c.code));
      setSelectedCountries(allCountries);
    } else {
      setSelectedCountries([]);
    }
  };

  const allFilteredCountries = regionGroups.flatMap(region => region.countries);
  const isAllSelected = allFilteredCountries.length > 0 && selectedCountries.length === allFilteredCountries.length;
  const isSomeSelected = selectedCountries.length > 0 && selectedCountries.length < allFilteredCountries.length;

  if (isLoading) {
    return (
      <div className="w-full p-8">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-gray-400" />
          <h1 className="text-xl font-semibold">Loading Country Settings...</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h1 className="text-xl font-semibold text-red-900">Error Loading Countries</h1>
        </div>
        <p className="text-red-700 mb-4">Error: {error.message}</p>
        <Button onClick={handleAddNewClick} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Country
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-semibold">Country Settings</h1>
        </div>
        <div className="flex gap-3">
          {/* Bulk Operations */}
          {selectedCountries.length > 0 && (
            <Select onValueChange={handleBulkOperation} value="" disabled={isBulkUpdating}>
              <SelectTrigger className="w-[200px]">
                {isBulkUpdating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings2 className="h-4 w-4 mr-2" />
                )}
                <SelectValue placeholder={isBulkUpdating ? "Processing..." : "Bulk actions"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">Activate Selected</SelectItem>
                <SelectItem value="deactivate">Deactivate Selected</SelectItem>
                <SelectItem value="enable-purchase">Enable Purchase</SelectItem>
                <SelectItem value="disable-purchase">Disable Purchase</SelectItem>
                <SelectItem value="enable-shipping">Enable Shipping</SelectItem>
                <SelectItem value="disable-shipping">Disable Shipping</SelectItem>
                <SelectItem value="update-gateway">Update Payment Gateway</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={triggerUpdate}
            disabled={isCreating || isUpdating || isDeleting || isUpdatingRates || isBulkUpdating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingRates ? 'animate-spin' : ''}`} />
            Update Rates
          </Button>
          <Button
            onClick={handleAddNewClick}
            disabled={isCreating || isUpdating || isDeleting || isBulkUpdating}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Stats and Select All */}
        {countries && countries.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Total: {countries.length} countries</span>
              <span>Filtered: {regionGroups.reduce((sum, region) => sum + region.countries.length, 0)}</span>
              {selectedCountries.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {selectedCountries.length} selected
                </Badge>
              )}
            </div>
            
            {allFilteredCountries.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected || undefined}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all countries"
                />
                <span className="text-sm text-gray-600">Select all visible</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Countries by Region */}
      <div className="space-y-4">
        {regionGroups.length > 0 ? (
          regionGroups.map((region) => (
            <RegionGroup
              key={region.name}
              regionName={region.name}
              countries={region.countries}
              selectedCountries={selectedCountries}
              onSelectionChange={handleRegionSelection}
              onEditCountry={handleEditClick}
            >
              {region.countries.map((country) => (
                <CountryItem
                  key={country.code}
                  country={country}
                  isSelected={selectedCountries.includes(country.code)}
                  onSelectionChange={(selected) => {
                    if (selected) {
                      setSelectedCountries([...selectedCountries, country.code]);
                    } else {
                      setSelectedCountries(selectedCountries.filter(c => c !== country.code));
                    }
                  }}
                  onEdit={handleEditClick}
                />
              ))}
            </RegionGroup>
          ))
        ) : countries && countries.length > 0 ? (
          <div className="p-8 text-center bg-white border rounded-lg">
            <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No countries match your search</p>
          </div>
        ) : (
          <div className="p-8 text-center bg-white border rounded-lg">
            <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No countries configured</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog
        open={isCreating || !!editingCountry}
        onOpenChange={(open) => {
          if (!open) handleCancelClick();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingCountry ? 'Edit Country' : 'Add New Country'}
            </DialogTitle>
          </DialogHeader>
          <CountryForm
            editingCountry={editingCountry}
            onSubmit={handleSubmit}
            onCancel={handleCancelClick}
          />
        </DialogContent>
      </Dialog>

      {/* Debug info */}
      {import.meta.env.DEV && (
        <div className="w-full mt-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(
                {
                  countriesCount: countries?.length || 0,
                  filteredCount: allFilteredCountries.length,
                  selectedCount: selectedCountries.length,
                  regionsCount: regionGroups.length,
                  searchTerm,
                  isLoading,
                  error: error?.message,
                  isCreating,
                  isUpdating,
                  isDeleting,
                  isBulkUpdating,
                  editingCountry: editingCountry?.code,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySettings;
