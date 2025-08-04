import { useCountrySettings } from '@/hooks/useCountrySettings';
import { useExchangeRateOperations } from '@/hooks/useExchangeRateOperations';
import { CountryForm } from './CountryForm';
import { CountryListItem } from './CountryListItem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Plus, RefreshCw, Search, Globe, Settings2, ChevronRight, ChevronDown, Activity, ShoppingCart, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
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
  const [expandedContinents, setExpandedContinents] = useState<string[]>([]);

  console.log('CountrySettings render:', {
    countriesCount: countries?.length,
    isLoading,
    error: error?.message,
    isCreating,
    isUpdating,
    isDeleting,
    editingCountry: editingCountry?.code,
    dialogOpen: isCreating || !!editingCountry,
  }); // DEBUG

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-40" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 grid grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Globe className="h-4 w-4 text-red-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Country Settings</h1>
            </div>
            <p className="text-gray-600">
              Manage payment gateways, currencies, and shipping settings for each country
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load countries</h3>
              <p className="text-gray-600 mb-6">Error loading country settings: {error.message}</p>
              <Button onClick={handleAddNewClick} disabled variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Country
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter countries based on search term
  const filteredCountries =
    countries?.filter(
      (country) =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.continent?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  // Group countries by continent for list view
  const continentGroups = filteredCountries.reduce((groups, country) => {
    const continent = country.continent || 'Other';
    if (!groups[continent]) {
      groups[continent] = [];
    }
    groups[continent].push(country);
    return groups;
  }, {} as Record<string, typeof filteredCountries>);

  // Sort continents and countries within each continent (Asia first)
  const sortedContinents = Object.keys(continentGroups)
    .sort((a, b) => {
      const order = ['Asia', 'North America', 'Europe', 'South America', 'Africa', 'Oceania', 'Other'];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(continent => ({
      name: continent,
      countries: continentGroups[continent].sort((a, b) => 
        (a.display_name || a.name).localeCompare(b.display_name || b.name)
      )
    }));

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
    
    // Show confirmation toast
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

      // Call the real API to update countries
      await new Promise<void>((resolve, reject) => {
        bulkUpdateCountries(
          { countryCodes: selectedCountries, updates },
          {
            onSuccess: () => {
              // Show success toast
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
      setSelectedCountries(filteredCountries.map(c => c.code));
    } else {
      setSelectedCountries([]);
    }
  };

  const isAllSelected = filteredCountries.length > 0 && selectedCountries.length === filteredCountries.length;
  const isSomeSelected = selectedCountries.length > 0 && selectedCountries.length < filteredCountries.length;

  // Handle continent expansion
  const toggleContinent = (continentName: string) => {
    setExpandedContinents(prev =>
      prev.includes(continentName)
        ? prev.filter(name => name !== continentName)
        : [...prev, continentName]
    );
  };

  // Handle continent-level selection
  const handleSelectAllInContinent = (continentCountries: typeof filteredCountries, checked: boolean) => {
    const continentCodes = continentCountries.map(c => c.code);
    if (checked) {
      setSelectedCountries(prev => [...new Set([...prev, ...continentCodes])]);
    } else {
      setSelectedCountries(prev => prev.filter(code => !continentCodes.includes(code)));
    }
  };

  // Get continent selection stats
  const getContinentStats = (continentCountries: typeof filteredCountries) => {
    const continentCodes = continentCountries.map(c => c.code);
    const selectedInContinent = continentCodes.filter(code => selectedCountries.includes(code)).length;
    const allSelected = selectedInContinent === continentCountries.length && continentCountries.length > 0;
    const someSelected = selectedInContinent > 0 && selectedInContinent < continentCountries.length;
    
    const active = continentCountries.filter(c => c.is_active).length;
    const purchaseEnabled = continentCountries.filter(c => c.purchase_allowed).length;
    const shippingEnabled = continentCountries.filter(c => c.shipping_allowed).length;

    return { selectedInContinent, allSelected, someSelected, active, purchaseEnabled, shippingEnabled };
  };

  return (
    <div className="w-full space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Globe className="h-4 w-4 text-teal-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Country Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage payment gateways, currencies, and shipping settings for each country
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium text-gray-900">Countries</h2>
                <span className="text-sm text-gray-500">
                  {filteredCountries.length} of {countries?.length || 0}
                </span>
                {selectedCountries.length > 0 && (
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {selectedCountries.length} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">

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
                  onClick={() => {
                    console.log('Update Exchange Rates button clicked');
                    triggerUpdate();
                  }}
                  disabled={isCreating || isUpdating || isDeleting || isUpdatingRates || isBulkUpdating}
                  variant="outline"
                  size="sm"
                  className="text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingRates ? 'animate-spin' : ''}`} />
                  Update Rates
                </Button>
                <Button
                  onClick={() => {
                    console.log('Add Country button clicked');
                    handleAddNewClick();
                  }}
                  disabled={isCreating || isUpdating || isDeleting || isBulkUpdating}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search countries, codes, currencies, or continents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {countries && countries.length > 0 ? (
              <>
                {/* Continent Grouped List View */}
                {filteredCountries.length > 0 ? (
                    <div className="space-y-4">
                      {/* Global Header */}
                      <div className="bg-white border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <Checkbox
                                checked={isAllSelected}
                                indeterminate={isSomeSelected || undefined}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all countries"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700">All Countries by Continent</span>
                              </div>
                            </div>
                            
                            <div className="hidden lg:flex items-center gap-8 px-8">
                              <div className="text-center min-w-[80px]">
                                <span className="text-sm font-medium text-gray-700">Exchange Rate</span>
                              </div>
                              <div className="text-center min-w-[100px]">
                                <span className="text-sm font-medium text-gray-700">Payment Gateway</span>
                              </div>
                              <div className="text-center min-w-[60px]">
                                <span className="text-sm font-medium text-gray-700">Tax</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700">Status</span>
                              <div className="w-16"></div> {/* Space for actions */}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Continent Groups */}
                      {sortedContinents.map((continent) => {
                        const isExpanded = expandedContinents.includes(continent.name);
                        const stats = getContinentStats(continent.countries);

                        return (
                          <div key={continent.name} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            {/* Continent Header */}
                            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleContinent(continent.name)}
                                    className="p-0 h-auto hover:bg-transparent"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-5 w-5 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5 text-gray-500" />
                                    )}
                                  </Button>
                                  <Checkbox
                                    checked={stats.allSelected}
                                    indeterminate={stats.someSelected || undefined}
                                    onCheckedChange={(checked) => handleSelectAllInContinent(continent.countries, checked as boolean)}
                                    aria-label={`Select all countries in ${continent.name}`}
                                  />
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900">{continent.name}</h3>
                                    <p className="text-sm text-gray-500">
                                      {continent.countries.length} countries
                                      {stats.selectedInContinent > 0 && (
                                        <span className="ml-2 text-blue-600 font-medium">
                                          ({stats.selectedInContinent} selected)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      <Activity className="h-3 w-3 mr-1" />
                                      {stats.active} active
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      {stats.purchaseEnabled} purchase
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      <Truck className="h-3 w-3 mr-1" />
                                      {stats.shippingEnabled} shipping
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Countries in Continent */}
                            {isExpanded && (
                              <div className="divide-y divide-gray-200">
                                {continent.countries.map((country) => (
                                  <CountryListItem
                                    key={country.code}
                                    country={country}
                                    onEdit={handleEditClick}
                                    onDelete={deleteCountry}
                                    isSelected={selectedCountries.includes(country.code)}
                                    onSelectionChange={(selected) => {
                                      if (selected) {
                                        setSelectedCountries([...selectedCountries, country.code]);
                                      } else {
                                        setSelectedCountries(selectedCountries.filter(c => c !== country.code));
                                      }
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No matching countries
                      </h3>
                      <p className="text-gray-600 mb-6">
                        No countries match your search criteria. Try a different search term.
                      </p>
                      <Button onClick={() => setSearchTerm('')} variant="outline" size="sm">
                        Clear search
                      </Button>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No countries configured</h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding your first country with currency and payment settings.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      console.log('Update Exchange Rates button clicked');
                      triggerUpdate();
                    }}
                    disabled={isCreating || isUpdating || isDeleting || isUpdatingRates}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isUpdatingRates ? 'animate-spin' : ''}`}
                    />
                    Update Rates
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Add Country button clicked');
                      handleAddNewClick();
                    }}
                    disabled={isCreating || isUpdating || isDeleting}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Country
                  </Button>
                </div>
              </div>
            )}
        </div>

      {/* Dialog for Add/Edit Country Form */}
      <Dialog
        open={isCreating || !!editingCountry}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelClick();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
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
                  filteredCount: filteredCountries.length,
                  searchTerm,
                  isLoading,
                  error: error?.message,
                  isCreating,
                  isUpdating,
                  isDeleting,
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
