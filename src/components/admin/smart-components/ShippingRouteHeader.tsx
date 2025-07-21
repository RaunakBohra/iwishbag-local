import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import { useAllCountries } from '@/hooks/useAllCountries';
import { ArrowRight, Globe, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AdminQuoteFormValues } from '../admin-quote-form-validation';

interface ShippingRouteHeaderProps {
  form: UseFormReturn<AdminQuoteFormValues>;
  isEditMode?: boolean;
  displayOriginCountry?: string;
  displayDestinationCountry?: string;
}

export const ShippingRouteHeader: React.FC<ShippingRouteHeaderProps> = ({
  form,
  isEditMode = false,
  displayOriginCountry,
  displayDestinationCountry,
}) => {
  const { data: allCountries } = useAllCountries();

  // Get country details for display
  const getCountryDisplay = (countryCode: string) => {
    if (!countryCode || !allCountries) return null;
    return allCountries.find(c => c.code === countryCode);
  };

  const originCountry = getCountryDisplay(displayOriginCountry || form.watch('origin_country'));
  const destinationCountry = getCountryDisplay(displayDestinationCountry || form.watch('destination_country'));

  if (!isEditMode) {
    // View Mode: Compact horizontal display
    return (
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <Globe className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Route:</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Origin */}
          <div className="flex items-center space-x-1 bg-white rounded px-2 py-1 border border-gray-200">
            <span className="text-sm">{originCountry?.flag || '🌍'}</span>
            <span className="text-xs font-medium text-gray-700">
              {originCountry?.name || 'Not set'}
            </span>
          </div>

          <ArrowRight className="w-3 h-3 text-gray-400" />

          {/* Destination */}
          <div className="flex items-center space-x-1 bg-white rounded px-2 py-1 border border-gray-200">
            <span className="text-sm">{destinationCountry?.flag || '🌍'}</span>
            <span className="text-xs font-medium text-gray-700">
              {destinationCountry?.name || 'Not set'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode: Compact horizontal form fields
  return (
    <Card className="shadow-sm border-cyan-200 bg-gradient-to-r from-cyan-50 to-teal-50">
      <CardContent className="p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3 h-3 text-cyan-600" />
            <span className="text-xs font-medium text-cyan-700">Shipping Route</span>
          </div>
          <Badge variant="outline" className="text-xs bg-cyan-100 text-cyan-600 border-cyan-300 h-5">
            Required
          </Badge>
        </div>

        <div className="flex items-center space-x-4 mt-3">
          {/* Origin Country */}
          <div className="flex-1">
            <FormField
              control={form.control}
              name="origin_country"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-gray-600 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
                    From
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-cyan-400 focus:ring-cyan-400">
                        <SelectValue placeholder="Origin country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {(allCountries || []).map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{country.flag}</span>
                            <span className="text-sm">{country.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <ArrowRight className="w-4 h-4 text-cyan-400 mt-4" />

          {/* Destination Country */}
          <div className="flex-1">
            <FormField
              control={form.control}
              name="destination_country"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-gray-600 flex items-center">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                    To
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-cyan-400 focus:ring-cyan-400">
                        <SelectValue placeholder="Destination country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {(allCountries || []).map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{country.flag}</span>
                            <span className="text-sm">{country.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingRouteHeader;