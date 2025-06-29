import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAllCountries } from "@/hooks/useAllCountries";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Truck, AlertTriangle, ArrowRight, Zap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatch } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const QuoteDetailForm = ({ form, shippingAddress }: {
  form: any;
  shippingAddress?: any;
}) => {
  const { toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const [tieredCustomsSuggestion, setTieredCustomsSuggestion] = useState<{
    percentage: number;
    category: string;
    tier: string;
    confidence: string;
  } | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isAutoApplied, setIsAutoApplied] = useState(false);
  const [originalSuggestion, setOriginalSuggestion] = useState<number | null>(null);
  const [userHasEdited, setUserHasEdited] = useState(false);

  // Watch form values for auto-suggestion
  const watchedValues = useWatch({
    control: form.control,
    name: ["country_code", "items"]
  });

  const [countryCode, items] = watchedValues;

  // Watch customs percentage for auto-apply logic
  const currentCustomsPercentage = useWatch({
    control: form.control,
    name: "customs_percentage"
  });

  // Get country currency and name from country settings
  const countryCurrency = useMemo(() => {
    if (!countryCode || !allCountries) return 'USD';
    const country = allCountries.find(c => c.code === countryCode);
    return country?.currency || 'USD';
  }, [countryCode, allCountries]);

  const countryName = useMemo(() => {
    if (!countryCode || !allCountries) return '';
    const country = allCountries.find(c => c.code === countryCode);
    return country?.name || '';
  }, [countryCode, allCountries]);

  // Watch final currency for dynamic labels
  const finalCurrency = useWatch({
    control: form.control,
    name: "final_currency"
  }) || countryCurrency;

  // Robust extraction of shipping country code with fallback to quote's country_code
  const shippingCountryCode = shippingAddress?.country_code || shippingAddress?.country || shippingAddress?.countryCode || countryCode;

  // Function to convert country name to country code
  const getCountryCode = (countryNameOrCode: string): string => {
    if (!countryNameOrCode) return '';
    
    // If it's already a 2-3 letter code, return as is
    if (countryNameOrCode.length <= 3) {
      return countryNameOrCode.toUpperCase();
    }
    
    // Convert common country names to codes
    const countryMap: { [key: string]: string } = {
      'india': 'IN',
      'united states': 'US',
      'usa': 'US',
      'united kingdom': 'GB',
      'uk': 'GB',
      'china': 'CN',
      'canada': 'CA',
      'australia': 'AU',
      'germany': 'DE',
      'france': 'FR',
      'japan': 'JP',
      'brazil': 'BR',
      'mexico': 'MX',
      'singapore': 'SG'
    };
    
    const normalized = countryNameOrCode.toLowerCase().trim();
    return countryMap[normalized] || countryNameOrCode.toUpperCase();
  };

  // Get normalized country codes
  const normalizedCountryCode = getCountryCode(countryCode);
  const normalizedShippingCountryCode = getCountryCode(shippingCountryCode);

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CNY': '¥',
      'SGD': 'S$',
      'AED': 'د.إ',
      'SAR': 'ر.س',
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = getCurrencySymbol(countryCurrency);

  // Function to get tiered customs suggestion
  const getTieredCustomsSuggestion = async () => {
    if (!countryCode || !shippingCountryCode || !items?.length) {
      setTieredCustomsSuggestion(null);
      return;
    }

    setIsLoadingSuggestion(true);
    try {
      // Calculate total price and weight from items
      const totalPrice = items.reduce((sum: number, item: any) => {
        return sum + ((item.item_price || 0) * (item.quantity || 1));
      }, 0);

      const totalWeight = items.reduce((sum: number, item: any) => {
        return sum + ((item.item_weight || 0) * (item.quantity || 1));
      }, 0);

      // Get route-specific customs tiers
      const { data: customsTiers, error } = await supabase
        .from('route_customs_tiers')
        .select('*')
        .eq('origin_country', normalizedCountryCode)        // Purchase country (where product is from)
        .eq('destination_country', normalizedShippingCountryCode)  // Shipping country (where product is going)
        .eq('is_active', true)
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('Error fetching customs tiers:', error);
        setTieredCustomsSuggestion(null);
        return;
      }

      // Find matching tier based on price and weight conditions
      let bestMatch = null;
      let highestPriority = -1;

      for (const tier of customsTiers || []) {
        // Check if conditions match
        let matches = true;
        
        // Price conditions
        if (tier.price_min !== null && totalPrice < tier.price_min) {
          matches = false;
        }
        if (tier.price_max !== null && totalPrice > tier.price_max) {
          matches = false;
        }
        
        // Weight conditions  
        if (tier.weight_min !== null && totalWeight < tier.weight_min) {
          matches = false;
        }
        if (tier.weight_max !== null && totalWeight > tier.weight_max) {
          matches = false;
        }
        
        if (matches && tier.priority_order > highestPriority) {
          bestMatch = tier;
          highestPriority = tier.priority_order;
        }
      }

      if (bestMatch) {
        setTieredCustomsSuggestion({
          percentage: bestMatch.customs_percentage,
          category: 'Tiered',
          tier: bestMatch.rule_name,
          confidence: '85' // Default confidence since it's not in the schema
        });
      } else {
        setTieredCustomsSuggestion(null);
      }

    } catch (error) {
      console.error('Error getting tiered customs suggestion:', error);
      setTieredCustomsSuggestion(null);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Auto-suggest when relevant values change
  useEffect(() => {
    getTieredCustomsSuggestion();
  }, [countryCode, shippingCountryCode, items]);

  // Auto-apply suggestion when confidence is high enough
  useEffect(() => {
    if (tieredCustomsSuggestion && !userHasEdited) {
      const confidence = parseFloat(tieredCustomsSuggestion.confidence);
      
      if (confidence > 80) {
        // Auto-apply the suggestion
        if (currentCustomsPercentage !== tieredCustomsSuggestion.percentage) {
          form.setValue('customs_percentage', tieredCustomsSuggestion.percentage);
          setIsAutoApplied(true);
          setOriginalSuggestion(tieredCustomsSuggestion.percentage);
          
          toast({
            title: "Customs Duty Auto-Applied",
            description: `${tieredCustomsSuggestion.percentage}% based on route analysis (${tieredCustomsSuggestion.confidence}% confidence)`,
          });
        }
      }
    } else if (!tieredCustomsSuggestion) {
      // Clear auto-applied state when no suggestion is available
      setIsAutoApplied(false);
      setOriginalSuggestion(null);
      setUserHasEdited(false);
    }
  }, [tieredCustomsSuggestion, userHasEdited, form, toast, currentCustomsPercentage]);

  const handleCustomsPercentageChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (isAutoApplied && numValue !== originalSuggestion) {
      setUserHasEdited(true);
      setIsAutoApplied(false);
    }
  };

  const handleRevertToSuggestion = () => {
    if (originalSuggestion !== null) {
      form.setValue('customs_percentage', originalSuggestion);
      setIsAutoApplied(true);
      setUserHasEdited(false);
      
      toast({
        title: "Reverted to Suggestion",
        description: `Customs duty set to ${originalSuggestion}%`,
      });
    }
  };

  const handleNumberInputWheel = (e: React.WheelEvent) => {
    e.currentTarget.blur();
  };

  // Auto-update currency field when country_code changes
  useEffect(() => {
    if (!countryCode || !allCountries) return;
    const country = allCountries.find(c => c.code === countryCode);
    if (country && country.currency) {
      form.setValue('currency', country.currency);
    }
  }, [countryCode, allCountries, form]);

  return (
    <div className="space-y-6">
      {/* Tiered Customs Suggestion */}
      {tieredCustomsSuggestion && (
        <div className={`p-4 border rounded-lg ${
          isAutoApplied 
            ? 'bg-green-50 border-green-200' 
            : parseFloat(tieredCustomsSuggestion.confidence) > 80 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`h-4 w-4 ${
              isAutoApplied ? 'text-green-600' : 'text-blue-600'
            }`} />
            <h4 className={`font-medium ${
              isAutoApplied ? 'text-green-900' : 'text-blue-900'
            }`}>
              {isAutoApplied ? 'Auto-Applied Customs Duty' : 'Tiered Customs Suggestion'}
            </h4>
            <Badge variant={parseFloat(tieredCustomsSuggestion.confidence) > 80 ? 'default' : 'secondary'}>
              {tieredCustomsSuggestion.confidence}% confidence
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className={`font-medium ${
                isAutoApplied ? 'text-green-700' : 'text-blue-700'
              }`}>Suggested Duty:</span>
              <span className={`ml-2 ${
                isAutoApplied ? 'text-green-900' : 'text-blue-900'
              }`}>{tieredCustomsSuggestion.percentage}%</span>
            </div>
            <div>
              <span className={`font-medium ${
                isAutoApplied ? 'text-green-700' : 'text-blue-700'
              }`}>Category:</span>
              <span className={`ml-2 ${
                isAutoApplied ? 'text-green-900' : 'text-blue-900'
              }`}>{tieredCustomsSuggestion.category}</span>
            </div>
            <div>
              <span className={`font-medium ${
                isAutoApplied ? 'text-green-700' : 'text-blue-700'
              }`}>Tier:</span>
              <span className={`ml-2 ${
                isAutoApplied ? 'text-green-900' : 'text-blue-900'
              }`}>{tieredCustomsSuggestion.tier}</span>
            </div>
            <div>
              <span className={`font-medium ${
                isAutoApplied ? 'text-green-700' : 'text-blue-700'
              }`}>Route:</span>
              <span className={`ml-2 ${
                isAutoApplied ? 'text-green-900' : 'text-blue-900'
              }`}>{normalizedCountryCode} → {normalizedShippingCountryCode}</span>
            </div>
          </div>
          {isAutoApplied && userHasEdited && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevertToSuggestion}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Revert to Suggestion
              </Button>
            </div>
          )}
          {!isAutoApplied && parseFloat(tieredCustomsSuggestion.confidence) <= 80 && (
            <div className="mt-3 pt-3 border-t border-yellow-200">
              <p className="text-xs text-yellow-600 mb-2">
                Low confidence suggestion. Please review before applying.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue('customs_percentage', tieredCustomsSuggestion.percentage);
                  setIsAutoApplied(true);
                  setOriginalSuggestion(tieredCustomsSuggestion.percentage);
                  setUserHasEdited(false);
                  
                  toast({
                    title: "Customs Duty Applied",
                    description: `${tieredCustomsSuggestion.percentage}% applied manually`,
                  });
                }}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                <Zap className="h-3 w-3 mr-1" />
                Apply Suggestion
              </Button>
            </div>
          )}
        </div>
      )}

      {isLoadingSuggestion && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span className="text-sm text-gray-600">Calculating customs suggestion...</span>
          </div>
        </div>
      )}

      {/* Existing form fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="country_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Country</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchase country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allCountries?.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center gap-2">
                        <span>{country.name}</span>
                        {!country.purchase_allowed && (
                          <Badge variant="secondary" className="text-xs">
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            No Purchase
                          </Badge>
                        )}
                        {!country.shipping_allowed && (
                          <Badge variant="secondary" className="text-xs">
                            <Truck className="w-3 h-3 mr-1" />
                            No Shipping
                          </Badge>
                        )}
                        {(!country.purchase_allowed || !country.shipping_allowed) && (
                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Hidden currency field to ensure form state is updated */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <input type="hidden" {...field} value={countryCurrency} />
          )}
        />
        <FormField
          control={form.control}
          name="customs_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customs Percentage (%)</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    max="100"
                    {...field} 
                    value={field.value ?? ''} 
                    onWheel={handleNumberInputWheel}
                    onChange={(e) => {
                      field.onChange(e);
                      handleCustomsPercentageChange(e.target.value);
                    }}
                    placeholder="0.00"
                    className={
                      isAutoApplied 
                        ? 'border-green-300 bg-green-50' 
                        : userHasEdited && originalSuggestion !== null
                          ? 'border-orange-300 bg-orange-50'
                          : ''
                    }
                  />
                </FormControl>
                {isAutoApplied && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    Auto-applied
                  </Badge>
                )}
                {userHasEdited && originalSuggestion !== null && !isAutoApplied && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    Modified
                  </Badge>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sales_tax_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sales Tax ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="merchant_shipping_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant Shipping ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="domestic_shipping"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domestic Shipping ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="handling_charge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Handling Charge ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="discount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="insurance_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance ({currencySymbol})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  value={field.value ?? ''} 
                  onWheel={handleNumberInputWheel}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="col-span-2">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Set priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="col-span-2">
          <FormField
            control={form.control}
            name="internal_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add internal notes for your team..."
                    rows={4}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="col-span-2">
          {/* Removed Send to Customer button, as this action is handled by the parent component. */}
        </div>
        {/* Read-only currency field */}
        {countryCode && (
          <div className="flex items-center gap-2">
            <FormLabel>Quote Currency</FormLabel>
            <Badge variant="secondary" className="text-sm font-medium">
              {getCurrencySymbol(countryCurrency)} {countryCurrency} (from {countryName})
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};
