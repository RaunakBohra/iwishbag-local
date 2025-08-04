import { useState } from 'react';
import { useCountrySettings } from '@/hooks/useCountrySettings';
import { useExchangeRateOperations } from '@/hooks/useExchangeRateOperations';
import { CountryForm } from './CountryForm';
import { CountryListItem } from './CountryListItem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Plus, RefreshCw, Search, Globe, Settings2, ChevronRight, ChevronDown, Activity, ShoppingCart, Truck } from 'lucide-react';
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
          <Button
            onClick={triggerUpdate}
            disabled={isCreating || isUpdating || isDeleting || isUpdatingRates}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingRates ? 'animate-spin' : ''}`} />
            Update Rates
          </Button>
          <Button
            onClick={handleAddNewClick}
            disabled={isCreating || isUpdating || isDeleting}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search countries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Countries List */}
      <div className="bg-white border rounded-lg">
        {countries && countries.length > 0 ? (
          <div className="divide-y">
            {countries
              .filter(country => 
                country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                country.code.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((country) => (
                <div key={country.code} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedCountries.includes(country.code)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCountries([...selectedCountries, country.code]);
                          } else {
                            setSelectedCountries(selectedCountries.filter(c => c !== country.code));
                          }
                        }}
                      />
                      <div>
                        <h3 className="font-medium">{country.name}</h3>
                        <p className="text-sm text-gray-600">{country.code} • {country.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={country.is_active ? "default" : "secondary"}>
                        {country.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        onClick={() => handleEditClick(country)}
                        variant="ghost"
                        size="sm"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="p-8 text-center">
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
        <DialogContent className="max-w-2xl">
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
    </div>
  );
};

export default CountrySettings;
