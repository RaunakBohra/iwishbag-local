import { useCountrySettings } from '@/hooks/useCountrySettings';
import { useExchangeRateOperations } from '@/hooks/useExchangeRateOperations';
import { CountryForm } from './CountryForm';
import { CountryListItem } from './CountryListItem';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Plus, RefreshCw, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export const CountrySettings = () => {
  const {
    countries,
    isLoading,
    error,
    editingCountry,
    isCreating,
    isUpdating,
    isDeleting,
    handleAddNewClick,
    handleEditClick,
    handleCancelClick,
    handleSubmit,
    deleteCountry,
  } = useCountrySettings();

  const { triggerUpdate, isUpdating: isUpdatingRates } = useExchangeRateOperations();
  const [searchTerm, setSearchTerm] = useState('');

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
      <div className="min-h-screen bg-gray-50/40">
        <div className="max-w-7xl mx-auto px-4 py-8">
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
      <div className="min-h-screen bg-gray-50/40">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Globe className="h-4 w-4 text-red-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Country Settings</h1>
            </div>
            <p className="text-gray-600">Manage payment gateways, currencies, and shipping settings for each country</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load countries</h3>
              <p className="text-gray-600 mb-6">
                Error loading country settings: {error.message}
              </p>
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
  const filteredCountries = countries?.filter(country => 
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.currency.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Globe className="h-4 w-4 text-teal-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Country Settings</h1>
          </div>
          <p className="text-gray-600">Manage payment gateways, currencies, and shipping settings for each country</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium text-gray-900">Countries</h2>
                <span className="text-sm text-gray-500">
                  {filteredCountries.length} of {countries?.length || 0}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    console.log('Update Exchange Rates button clicked');
                    triggerUpdate();
                  }}
                  disabled={isCreating || isUpdating || isDeleting || isUpdatingRates}
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
                  disabled={isCreating || isUpdating || isDeleting}
                  size="sm"
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search countries, codes, or currencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {countries && countries.length > 0 ? (
              <>
                {filteredCountries.length > 0 ? (
                  <div className="space-y-3">
                    {filteredCountries.map((country) => (
                      <CountryListItem
                        key={country.code}
                        country={country}
                        onEdit={handleEditClick}
                        onDelete={deleteCountry}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching countries</h3>
                    <p className="text-gray-600 mb-6">
                      No countries match your search criteria. Try a different search term.
                    </p>
                    <Button
                      onClick={() => setSearchTerm('')}
                      variant="outline"
                      size="sm"
                    >
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
                    <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingRates ? 'animate-spin' : ''}`} />
                    Update Rates
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Add Country button clicked');
                      handleAddNewClick();
                    }}
                    disabled={isCreating || isUpdating || isDeleting}
                    size="sm"
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Country
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
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
        <div className="max-w-7xl mx-auto px-4 mt-8">
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
