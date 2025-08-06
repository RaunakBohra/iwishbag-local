import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MapPin,
  Truck,
  CreditCard,
  Shield,
  Package,
  Clock,
  CheckCircle,
  Check,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { formatCountryDisplay, sortCountriesByPopularity } from '@/utils/countryUtils';
import { delhiveryService, type DelhiveryServiceOption } from '@/services/DelhiveryService';
import NCMService from '@/services/NCMService';
import { ncmBranchMappingService } from '@/services/NCMBranchMappingService';
import { smartNCMBranchMapper, type SmartBranchMapping } from '@/services/SmartNCMBranchMapper';
import { currencyService } from '@/services/CurrencyService';

interface CustomsSectionProps {
  // Origin settings
  originCountry: string;
  onOriginCountryChange: (country: string) => void;
  originState: string;
  onOriginStateChange: (state: string) => void;
  
  // Destination settings
  destinationCountry: string;
  onDestinationCountryChange: (country: string) => void;
  destinationPincode: string;
  onDestinationPincodeChange: (pincode: string) => void;
  destinationState: string;
  onDestinationStateChange: (state: string) => void;
  
  // Shipping settings
  shippingMethod: string;
  onShippingMethodChange: (method: string) => void;
  ncmServiceType: 'pickup' | 'collect';
  onNcmServiceTypeChange: (type: 'pickup' | 'collect') => void;
  delhiveryServiceType: 'standard' | 'express' | 'same_day';
  onDelhiveryServiceTypeChange: (type: 'standard' | 'express' | 'same_day') => void;
  
  // Payment settings
  paymentGateway: string;
  onPaymentGatewayChange: (gateway: string) => void;
  insuranceEnabled: boolean;
  onInsuranceEnabledChange: (enabled: boolean) => void;
  
  // NCM branch selection
  selectedNCMBranch: any;
  onSelectedNCMBranchChange: (branch: any) => void;
  
  // UI state
  userOverrodeDestination: boolean;
  userOverrodeNCMBranch: boolean;
  
  // Data and loading states
  calculationResult: any;
  dynamicShippingMethods: any[];
  loadingNCMRates: boolean;
  loadingServices: boolean;
  ncmRates: any;
  availableServices: DelhiveryServiceOption[];
}

export const CustomsSection: React.FC<CustomsSectionProps> = ({
  originCountry,
  onOriginCountryChange,
  originState,
  onOriginStateChange,
  destinationCountry,
  onDestinationCountryChange,
  destinationPincode,
  onDestinationPincodeChange,
  destinationState,
  onDestinationStateChange,
  shippingMethod,
  onShippingMethodChange,
  ncmServiceType,
  onNcmServiceTypeChange,
  delhiveryServiceType,
  onDelhiveryServiceTypeChange,
  paymentGateway,
  onPaymentGatewayChange,
  insuranceEnabled,
  onInsuranceEnabledChange,
  selectedNCMBranch,
  onSelectedNCMBranchChange,
  userOverrodeDestination,
  userOverrodeNCMBranch,
  calculationResult,
  dynamicShippingMethods,
  loadingNCMRates,
  loadingServices,
  ncmRates,
  availableServices
}) => {
  // Country data
  const { data: purchaseCountries = [], isLoading: loadingCountries } = usePurchaseCountries();
  const sortedCountries = sortCountriesByPopularity(purchaseCountries);

  // NCM branch state
  const [ncmComboboxOpen, setNCMComboboxOpen] = useState(false);
  const [ncmBranches, setNCMBranches] = useState<any[]>([]);
  const [suggestedNCMBranches, setSuggestedNCMBranches] = useState<SmartBranchMapping[]>([]);
  const [isAutoSelected, setIsAutoSelected] = useState(false);

  // Currency display
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [weightUnit, setWeightUnit] = useState('lb');

  useEffect(() => {
    const updateCurrencyDisplay = async () => {
      try {
        const currency = await currencyService.getCurrency(destinationCountry);
        const symbol = currencyService.getCurrencySymbol(currency);
        setCurrencySymbol(symbol);
        
        // Set weight unit based on country
        const unit = destinationCountry === 'US' ? 'lb' : 'kg';
        setWeightUnit(unit);
      } catch (error) {
        console.error('Error updating currency display:', error);
        setCurrencySymbol('$');
        setWeightUnit('kg');
      }
    };
    
    updateCurrencyDisplay();
  }, [destinationCountry]);

  // Load NCM branches when Nepal is selected
  useEffect(() => {
    if (destinationCountry === 'NP') {
      loadNCMBranches();
    } else {
      setNCMBranches([]);
      setSuggestedNCMBranches([]);
    }
  }, [destinationCountry]);

  const loadNCMBranches = async () => {
    try {
      const branches = await NCMService.getBranches();
      setNCMBranches(branches);
      
      // Get smart suggestions
      const suggestions = await smartNCMBranchMapper.getSuggestedBranches({
        destinationCountry: 'NP',
        items: [] // Would need items passed in for better suggestions
      });
      setSuggestedNCMBranches(suggestions);
      
      // Auto-select if available
      if (suggestions.length > 0 && !userOverrodeNCMBranch) {
        const topSuggestion = suggestions[0];
        onSelectedNCMBranchChange(topSuggestion.branch);
        setIsAutoSelected(true);
      }
    } catch (error) {
      console.error('Failed to load NCM branches:', error);
    }
  };

  const handleUserDestinationChange = (country: string) => {
    onDestinationCountryChange(country);
    // Reset related fields when country changes
    if (country !== 'IN') {
      onDestinationPincodeChange('');
    }
    if (country !== 'NP') {
      onSelectedNCMBranchChange(null);
    }
  };

  const getDeliveryEstimate = (branch: any): string => {
    // Simple delivery estimate based on branch location
    const estimates: Record<string, string> = {
      'Kathmandu': '2-3 days',
      'Pokhara': '3-4 days',
      'Chitwan': '4-5 days',
      'Biratnagar': '5-6 days',
      'Birgunj': '4-5 days',
    };
    return estimates[branch.district] || '3-7 days';
  };

  // Use dynamic shipping methods if available, otherwise fallback to hardcoded
  const shippingMethods = dynamicShippingMethods.length > 0 
    ? dynamicShippingMethods 
    : simplifiedQuoteCalculator.getShippingMethods();

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900">Route Configuration</CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-1">
            Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Compact 4-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Origin Column */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-600" />
              Origin
            </Label>
            <div className="space-y-2">
              <Select value={originCountry} onValueChange={onOriginCountryChange} disabled={loadingCountries}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingCountries ? "Loading..." : "Origin country"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingCountries ? (
                    <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                  ) : sortedCountries.length > 0 ? (
                    sortedCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {formatCountryDisplay(country, true)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {originCountry === 'US' && (
                <Select value={originState} onValueChange={onOriginStateChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tax (0%)</SelectItem>
                    {simplifiedQuoteCalculator.getUSStates().map(state => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.code} - {state.rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Destination Column */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
              <MapPin className="h-3 w-3 text-green-600" />
              Destination
              {userOverrodeDestination && (
                <span className="text-xs text-blue-600 font-medium ml-1">Manual</span>
              )}
            </Label>
            <div className="space-y-2">
              <Select 
                value={destinationCountry} 
                onValueChange={handleUserDestinationChange}
                key={`destination-${destinationCountry}`}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="NP">Nepal</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Location-specific inputs */}
              {destinationCountry === 'IN' && (
                <Input
                  type="text"
                  placeholder="Pincode (e.g., 400001)"
                  value={destinationPincode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      onDestinationPincodeChange(value);
                    }
                  }}
                  className={`h-8 text-xs ${
                    destinationPincode && !/^[1-9][0-9]{5}$/.test(destinationPincode) 
                      ? 'border-orange-500 bg-orange-50' 
                      : destinationPincode && /^[1-9][0-9]{5}$/.test(destinationPincode)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300'
                  }`}
                />
              )}

              {destinationCountry === 'NP' && (
                <div className="space-y-2">
                  <Popover open={ncmComboboxOpen} onOpenChange={setNCMComboboxOpen}>
                    <PopoverTrigger asChild>
                      <div className="w-full cursor-pointer">
                        <div className={`flex items-center justify-between h-8 px-3 py-1 text-xs border rounded-md ${
                          selectedNCMBranch 
                            ? 'border-green-500 bg-green-50 text-green-800' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          {selectedNCMBranch ? (
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-medium truncate">
                                {selectedNCMBranch.district} ({selectedNCMBranch.name})
                              </span>
                              {isAutoSelected && !userOverrodeNCMBranch && (
                                <Badge variant="secondary" className="text-xs h-4 px-1">
                                  Auto
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">Select NCM branch</span>
                          )}
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search branches..." 
                          className="h-8 text-xs"
                        />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>No branches found.</CommandEmpty>
                          {(() => {
                            const primaryBranches = suggestedNCMBranches.slice(0, 3);
                            const otherBranches = ncmBranches.filter(branch => 
                              !primaryBranches.some(suggestion => 
                                suggestion.branch.name === branch.name
                              )
                            );

                            return (
                              <>
                                {primaryBranches.length > 0 && (
                                  <CommandGroup heading="Suggested Branches">
                                    {primaryBranches.map((suggestion) => (
                                      <CommandItem
                                        key={suggestion.branch.name}
                                        value={`${suggestion.branch.district} ${suggestion.branch.name} ${suggestion.branch.coveredAreas?.join(' ') || ''}`}
                                        onSelect={() => {
                                          onSelectedNCMBranchChange(suggestion.branch);
                                          setNCMComboboxOpen(false);
                                          setSuggestedNCMBranches([]);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col gap-1 w-full">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                              {suggestion.branch.district} ({suggestion.branch.name})
                                            </span>
                                            <Badge variant="secondary" className="text-xs">
                                              {suggestion.confidence}% match
                                            </Badge>
                                          </div>
                                          <div className="flex items-center justify-between text-xs">
                                            {suggestion.branch.coveredAreas && suggestion.branch.coveredAreas.length > 0 && (
                                              <span className="text-gray-500 truncate">
                                                Covers: {suggestion.branch.coveredAreas.slice(0, 2).join(', ')}
                                              </span>
                                            )}
                                            <span className="text-blue-600 ml-2">
                                              {getDeliveryEstimate(suggestion.branch)}
                                            </span>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}

                                {otherBranches.length > 0 && (
                                  <CommandGroup heading="Other Branches">
                                    {otherBranches.map((branch) => (
                                      <CommandItem
                                        key={branch.name}
                                        value={`${branch.district} ${branch.name} ${branch.coveredAreas?.join(' ') || ''}`}
                                        onSelect={() => {
                                          onSelectedNCMBranchChange(branch);
                                          setNCMComboboxOpen(false);
                                          setSuggestedNCMBranches([]);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col gap-1 w-full">
                                          <span className="font-medium text-gray-900">
                                            {branch.district} ({branch.name})
                                          </span>
                                          <div className="flex items-center justify-between text-xs">
                                            {branch.coveredAreas && branch.coveredAreas.length > 0 && (
                                              <span className="text-gray-500 truncate">
                                                Covers: {branch.coveredAreas.slice(0, 2).join(', ')}
                                              </span>
                                            )}
                                            <span className="text-blue-600 ml-2">
                                              {getDeliveryEstimate(branch)}
                                            </span>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </>
                            );
                          })()}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {(!destinationPincode && destinationCountry !== 'IN' && destinationCountry !== 'NP') && (
                <Select value={destinationState} onValueChange={onDestinationStateChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {simplifiedQuoteCalculator.getDeliveryTypes().map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Shipping Column */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
              <Truck className="h-3 w-3 text-blue-600" />
              International Shipping
              {calculationResult?.route_calculations?.delivery_option_used?.id === shippingMethod && (
                <span className="text-xs text-green-600 ml-1">(Auto)</span>
              )}
            </Label>
            <div className="space-y-2">
              <Select 
                value={shippingMethod} 
                onValueChange={onShippingMethodChange}
                key={`shipping-${shippingMethod}`}
              >
                <SelectTrigger className={`h-9 text-sm ${
                  calculationResult?.route_calculations?.delivery_option_used?.id === shippingMethod 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300'
                }`}>
                  <SelectValue placeholder="Shipping method" />
                </SelectTrigger>
                <SelectContent>
                  {shippingMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{method.label}</span>
                        <span className="text-xs text-gray-500">
                          {currencySymbol}{method.rate}/{weightUnit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Nepal Delivery Method */}
              {selectedNCMBranch && destinationCountry === 'NP' && (
                <Select 
                  value={ncmServiceType} 
                  onValueChange={onNcmServiceTypeChange}
                  disabled={loadingNCMRates}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Delivery method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Door Delivery</SelectItem>
                    <SelectItem value="collect">Branch Pickup</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* India Service Options */}
              {destinationCountry === 'IN' && destinationPincode && /^[1-9][0-9]{5}$/.test(destinationPincode) && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-4 rounded bg-blue-200 flex items-center justify-center">
                      <Truck className="h-3 w-3 text-blue-700" />
                    </div>
                    <Label className="text-sm font-medium text-blue-800">India Service Type</Label>
                  </div>
                  <Select 
                    value={delhiveryServiceType} 
                    onValueChange={onDelhiveryServiceTypeChange}
                    disabled={loadingServices}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border-blue-300">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center">
                              {service.value === 'standard' && <Package className="h-3 w-3 text-gray-600" />}
                              {service.value === 'express' && <Clock className="h-3 w-3 text-blue-600" />}
                              {service.value === 'same_day' && <CheckCircle className="h-3 w-3 text-green-600" />}
                            </div>
                            <span>{service.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Payment Column */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-green-600" />
              Payment
            </Label>
            <div className="space-y-2">
              <Select value={paymentGateway} onValueChange={onPaymentGatewayChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Payment gateway" />
                </SelectTrigger>
                <SelectContent>
                  {simplifiedQuoteCalculator.getPaymentGateways().map(gateway => (
                    <SelectItem key={gateway.value} value={gateway.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{gateway.label}</span>
                        <span className="text-xs text-gray-500">
                          {gateway.fees.percentage}%
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Insurance Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-600" />
                  Insurance
                </Label>
                <Switch
                  checked={insuranceEnabled}
                  onCheckedChange={onInsuranceEnabledChange}
                  disabled={!calculationResult?.route_calculations?.insurance?.available}
                  className="data-[state=checked]:bg-blue-600 scale-75"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status indicators for validation */}
        <div className="flex flex-wrap gap-2 text-xs mt-3 pt-2 border-t">
          {destinationCountry === 'IN' && destinationPincode && (
            <div className="flex items-center">
              {/^[1-9][0-9]{5}$/.test(destinationPincode) ? (
                <span className="text-green-600 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Pincode valid - Delhivery rates active
                </span>
              ) : (
                <span className="text-orange-600 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {destinationPincode.length < 6 
                    ? `Enter ${6 - destinationPincode.length} more digits` 
                    : 'Invalid pincode - fallback rates'
                  }
                </span>
              )}
            </div>
          )}
          {destinationCountry === 'NP' && loadingNCMRates && (
            <span className="text-blue-600 flex items-center">
              <Clock className="h-3 w-3 mr-1 animate-spin" />
              Loading NCM rates...
            </span>
          )}
          {destinationCountry === 'NP' && ncmRates?.rates && (
            <span className="text-green-600 flex items-center">
              <Check className="h-3 w-3 mr-1" />
              NCM rates loaded • {ncmRates.markup_applied}% markup
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};