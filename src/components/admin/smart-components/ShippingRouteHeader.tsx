import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    return allCountries.find((c) => c.code === countryCode);
  };

  const originCountry = getCountryDisplay(displayOriginCountry || form.watch('origin_country'));
  const destinationCountry = getCountryDisplay(
    displayDestinationCountry || form.watch('destination_country'),
  );

  if (!isEditMode) {
    // View Mode: Professional compact display
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Shipping Route
          </span>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-slate-500">International</span>
            </div>
            <div className="flex items-center space-x-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">Express Service</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center space-x-4">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800">
              {originCountry?.name || 'Not Set'}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {displayOriginCountry || form.watch('origin_country') || 'N/A'}
            </div>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <div className="w-8 h-0.5 bg-slate-300"></div>
            <ArrowRight className="w-4 h-4" />
            <div className="w-8 h-0.5 bg-slate-300"></div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm font-semibold text-slate-800">
              {destinationCountry?.name || 'Not Set'}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {displayDestinationCountry || form.watch('destination_country') || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode: Professional form fields
  return (
    <Card className="shadow-sm border-slate-200 bg-slate-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Shipping Route Configuration
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-600 border-blue-200 h-6 px-2"
          >
            Required
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Origin Country */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="origin_country"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-slate-700 flex items-center">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Origin Country
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="h-10 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                        <SelectValue placeholder="Select origin country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {(allCountries || []).map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{country.name}</span>
                            <span className="text-xs text-slate-500 font-mono">
                              ({country.code})
                            </span>
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

          {/* Destination Country */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="destination_country"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-slate-700 flex items-center">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Destination Country
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="h-10 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                        <SelectValue placeholder="Select destination country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {(allCountries || []).map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{country.name}</span>
                            <span className="text-xs text-slate-500 font-mono">
                              ({country.code})
                            </span>
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
