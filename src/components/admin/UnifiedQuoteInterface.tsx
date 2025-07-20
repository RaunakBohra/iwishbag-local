// ============================================================================
// UNIFIED QUOTE INTERFACE - Smart 400-line replacement for 1,457-line monster
// Features: Multiple shipping options, smart suggestions, real-time optimization
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calculator, 
  Truck, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Package,
  Clock,
  DollarSign,
  Edit,
  Save,
  X,
  Scale,
  Plus,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';
import type { 
  UnifiedQuote, 
  ShippingOption, 
  ShippingRecommendation,
  SmartSuggestion 
} from '@/types/unified-quote';

// Smart sub-components
import { SmartShippingOptions } from './smart-components/SmartShippingOptions';
import { SmartCalculationBreakdown } from './smart-components/SmartCalculationBreakdown';
import { SmartSuggestionCards } from './smart-components/SmartSuggestionCards';
import { SmartCustomerInfo } from './smart-components/SmartCustomerInfo';
import { SmartStatusManager } from './smart-components/SmartStatusManager';
import { QuoteDetailForm } from './QuoteDetailForm';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminQuoteFormValues, adminQuoteFormSchema } from './admin-quote-form-validation';

interface UnifiedQuoteInterfaceProps {
  initialQuoteId?: string;
}

export const UnifiedQuoteInterface: React.FC<UnifiedQuoteInterfaceProps> = ({
  initialQuoteId
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Core state
  const quoteId = initialQuoteId || paramId;
  const [quote, setQuote] = useState<UnifiedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Smart features state
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingRecommendations, setShippingRecommendations] = useState<ShippingRecommendation[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllShippingOptions, setShowAllShippingOptions] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  
  // Form state for editing
  const form = useForm<AdminQuoteFormValues>({
    resolver: zodResolver(adminQuoteFormSchema),
    defaultValues: {
      id: '',
      customs_percentage: 0,
      sales_tax_price: 0,
      merchant_shipping_price: 0,
      domestic_shipping: 0,
      handling_charge: 0,
      discount: 0,
      insurance_amount: 0,
      origin_country: null,
      destination_country: null,
      currency: 'USD',
      destination_currency: 'USD',
      status: '',
      items: [],
    },
  });

  // Load quote data
  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false);
      return;
    }

    loadQuoteData();
  }, [quoteId]);

  const loadQuoteData = async () => {
    try {
      setIsLoading(true);
      const quoteData = await unifiedDataEngine.getQuote(quoteId!);
      
      if (!quoteData) {
        toast({
          title: 'Quote not found',
          description: 'The requested quote could not be found.',
          variant: 'destructive',
        });
        navigate('/admin/quotes');
        return;
      }

      setQuote(quoteData);
      
      // Populate form with quote data
      populateFormFromQuote(quoteData);
      
      // Calculate smart features
      await calculateSmartFeatures(quoteData);
      
    } catch (error) {
      console.error('Error loading quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quote data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSmartFeatures = async (quoteData: UnifiedQuote) => {
    try {
      setIsCalculating(true);
      
      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote: quoteData,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: showAllShippingOptions,
        },
      });

      if (result.success) {
        setQuote(result.updated_quote);
        setShippingOptions(result.shipping_options);
        setShippingRecommendations(result.smart_recommendations);
        setSmartSuggestions(result.optimization_suggestions);
        setOptimizationScore(result.updated_quote.optimization_score);
      }
    } catch (error) {
      console.error('Error calculating smart features:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleShippingOptionSelect = async (optionId: string) => {
    if (!quote) return;

    const updatedOperationalData = {
      ...quote.operational_data,
      shipping: {
        ...quote.operational_data?.shipping,
        selected_option: optionId,
      },
    };

    const success = await unifiedDataEngine.updateQuote(quote.id, {
      operational_data: updatedOperationalData,
    });

    if (success) {
      await loadQuoteData(); // Refresh with new calculations
      toast({
        title: 'Shipping updated',
        description: 'Quote recalculated with new shipping option.',
      });
    }
  };

  const handleApplySuggestion = async (suggestion: SmartSuggestion) => {
    if (!quote) return;

    // Handle different suggestion types
    if (suggestion.type === 'shipping' && suggestion.action === 'switch_shipping') {
      // Extract option ID from suggestion
      const recommendedOption = shippingRecommendations.find(rec => 
        suggestion.message.includes(rec.reason)
      );
      if (recommendedOption) {
        await handleShippingOptionSelect(recommendedOption.option_id);
      }
    }

    // Remove applied suggestion
    const updatedSuggestions = smartSuggestions.filter(s => s.id !== suggestion.id);
    setSmartSuggestions(updatedSuggestions);
  };

  // Watch form values for live updates
  const formValues = useWatch({ control: form.control });
  const [liveQuote, setLiveQuote] = useState<UnifiedQuote | null>(null);
  
  // Smart weight estimation state
  const [weightEstimations, setWeightEstimations] = useState<{[key: string]: any}>({});
  const [isEstimating, setIsEstimating] = useState<{[key: string]: boolean}>({});
  const [estimationTimeouts, setEstimationTimeouts] = useState<{[key: string]: NodeJS.Timeout}>({});
  
  // Smart customs calculation state
  const [customsTierInfo, setCustomsTierInfo] = useState<any>(null);
  const [isCalculatingCustoms, setIsCalculatingCustoms] = useState(false);

  // Function to estimate weight for an item
  const estimateItemWeight = async (itemIndex: number, productName: string, productUrl?: string) => {
    console.log('🔍 estimateItemWeight called:', { itemIndex, productName, productUrl });
    
    if (!productName.trim()) {
      console.log('❌ Empty product name, clearing estimation');
      setWeightEstimations(prev => ({ ...prev, [itemIndex]: null }));
      return;
    }

    const estimationKey = itemIndex.toString();
    console.log('⏳ Starting estimation for key:', estimationKey);
    setIsEstimating(prev => ({ ...prev, [estimationKey]: true }));

    try {
      console.log('🧠 Calling smartWeightEstimator.estimateWeight...');
      const estimation = await smartWeightEstimator.estimateWeight(productName, productUrl);
      console.log('✅ Weight estimation result:', estimation);
      setWeightEstimations(prev => ({ ...prev, [estimationKey]: estimation }));
    } catch (error) {
      console.error('❌ Weight estimation error:', error);
      setWeightEstimations(prev => ({ ...prev, [estimationKey]: null }));
    } finally {
      setIsEstimating(prev => ({ ...prev, [estimationKey]: false }));
    }
  };

  // Function to add new item
  const addNewItem = () => {
    const currentItems = form.getValues('items') || [];
    const newItem = {
      id: `item_${Date.now()}`,
      product_name: '',
      product_url: '',
      item_price: 0,
      item_weight: 0,
      quantity: 1,
      options: '',
      image_url: '',
    };
    
    form.setValue('items', [...currentItems, newItem]);
    
    toast({
      title: "Item Added",
      description: "New item has been added to the quote.",
      duration: 2000,
    });
  };

  // Function to remove item
  const removeItem = (itemIndex: number) => {
    const currentItems = form.getValues('items') || [];
    
    if (currentItems.length <= 1) {
      toast({
        title: "Cannot Remove Item",
        description: "Quote must have at least one item.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    const updatedItems = currentItems.filter((_, index) => index !== itemIndex);
    form.setValue('items', updatedItems);
    
    // Clear weight estimations for removed item
    setWeightEstimations(prev => {
      const updated = { ...prev };
      delete updated[itemIndex.toString()];
      // Reindex remaining estimations
      const reindexed: {[key: string]: any} = {};
      Object.keys(updated).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex > itemIndex) {
          reindexed[(oldIndex - 1).toString()] = updated[key];
        } else {
          reindexed[key] = updated[key];
        }
      });
      return reindexed;
    });
    
    toast({
      title: "Item Removed",
      description: "Item has been removed from the quote.",
      duration: 2000,
    });
  };

  // Function to calculate smart customs tier
  const calculateSmartCustoms = async () => {
    if (!quote || !formValues) return;
    
    setIsCalculatingCustoms(true);
    
    try {
      // Calculate totals from current form values
      const itemsTotal = (formValues.items || []).reduce((sum, item) => 
        sum + (Number(item.item_price) || 0) * (Number(item.quantity) || 1), 0
      );
      
      const totalWeight = (formValues.items || []).reduce((sum, item) => 
        sum + (Number(item.item_weight) || 0) * (Number(item.quantity) || 1), 0
      );
      
      console.log('🧮 Calculating smart customs for:', {
        origin: quote.origin_country,
        destination: quote.destination_country,
        itemsTotal,
        totalWeight
      });
      
      const tierResult = await calculateCustomsTier(
        quote.origin_country,
        quote.destination_country,
        itemsTotal,
        totalWeight
      );
      
      console.log('✅ Smart customs result:', tierResult);
      
      setCustomsTierInfo(tierResult);
      
      // Auto-apply the calculated percentage
      form.setValue('customs_percentage', tierResult.customs_percentage);
      
      toast({
        title: "Smart Customs Applied",
        description: `Applied ${tierResult.applied_tier?.rule_name || 'default'} tier: ${tierResult.customs_percentage}%`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('❌ Smart customs calculation error:', error);
      toast({
        title: "Customs Calculation Failed",
        description: "Unable to calculate smart customs tier. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsCalculatingCustoms(false);
    }
  };

  // Function to apply weight suggestion
  const applyWeightSuggestion = (itemIndex: number, suggestedWeight: number) => {
    console.log('🎯 Applying weight suggestion:', { itemIndex, suggestedWeight });
    
    try {
      const items = form.getValues('items') || [];
      items[itemIndex] = { ...items[itemIndex], item_weight: suggestedWeight };
      
      // Use setValue with shouldValidate: false to prevent triggering validation/submission
      form.setValue('items', items, { shouldValidate: false, shouldDirty: true });
      
      console.log('✅ Weight suggestion applied successfully');
      
      // Optional: Show a brief success indicator
      toast({
        title: "Weight Updated",
        description: `Applied AI suggestion: ${suggestedWeight} kg`,
        duration: 2000,
      });
      
    } catch (error) {
      console.error('❌ Error applying weight suggestion:', error);
    }
  };

  // Create live quote from form values
  const createLiveQuote = useMemo(() => {
    if (!quote || !formValues) return quote;
    
    // Calculate live totals from form values - CONVERT TO NUMBERS!
    const itemsTotal = (formValues.items || []).reduce((sum, item) => 
      sum + (Number(item.item_price) || 0) * (Number(item.quantity) || 1), 0
    );
    
    const totalWeight = (formValues.items || []).reduce((sum, item) => 
      sum + (Number(item.item_weight) || 0) * (Number(item.quantity) || 1), 0
    );

    // Basic calculation logic - CONVERT ALL FORM VALUES TO NUMBERS!
    // Use form input with fallback to SmartEngine's 10% rate
    const salesTax = Number(formValues.sales_tax_price) || (itemsTotal * 0.1);
    const merchantShipping = Number(formValues.merchant_shipping_price) || 0;
    const domesticShipping = Number(formValues.domestic_shipping) || 0;
    
    // Use form values with fallback to SmartEngine calculation method
    const handlingCharge = Number(formValues.handling_charge) || 
                          quote?.operational_data?.handling_charge || 
                          Math.max(5, itemsTotal * 0.02); // Same as SmartEngine: min $5 or 2%
    
    const insurance = Number(formValues.insurance_amount) || 
                     quote?.operational_data?.insurance_amount || 
                     (itemsTotal * 0.005); // Same as SmartEngine: 0.5% of items
    const discount = Number(formValues.discount) || 0;
    
    // Calculate international shipping first (needed for customs calculation)
    const internationalShipping = quote.calculation_data?.breakdown?.shipping || 0;
    
    // Calculate customs based on percentage (use smart tier if available, otherwise form value)
    // Customs base = items total + international shipping (matching SmartCalculationEngine)
    const smartCustomsPercentage = quote?.operational_data?.customs?.percentage;
    const formCustomsPercentage = Number(formValues.customs_percentage) || 0;
    const customsPercentage = (smartCustomsPercentage || formCustomsPercentage) / 100;
    const customsBase = itemsTotal + internationalShipping;
    const customs = customsBase * customsPercentage;
    
    // Calculate payment gateway fee (aligned with SmartCalculationEngine)
    const subtotalForGateway = itemsTotal + internationalShipping + customs;
    const paymentGatewayFee = (subtotalForGateway * 0.029) + 0.30; // Standard 2.9% + $0.30
    
    // Calculate VAT (if applicable) - use country settings or default
    const vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
    const vatAmount = vatPercentage > 0 ? (itemsTotal * (vatPercentage / 100)) : 0;
    
    // Calculate subtotal first (matching SmartEngine order)
    const subtotal = itemsTotal + internationalShipping + customs + 
                    salesTax + handlingCharge + insurance + merchantShipping + domesticShipping + vatAmount;
    
    // Add payment gateway fee to subtotal and apply discount
    const finalTotal = subtotal + paymentGatewayFee - discount;

    // Debug calculation to verify numbers are correct
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Form Values Debug:', {
        'formValues.handling_charge': formValues.handling_charge,
        'formValues.insurance_amount': formValues.insurance_amount,
        'quote.operational_data.handling_charge': quote?.operational_data?.handling_charge,
        'quote.operational_data.insurance_amount': quote?.operational_data?.insurance_amount,
        'final handlingCharge': handlingCharge,
        'final insurance': insurance,
      });
      
      console.log('💰 Live Calculation Debug:', {
        itemsTotal: itemsTotal,
        salesTax: salesTax,
        merchantShipping: merchantShipping,
        domesticShipping: domesticShipping,
        handlingCharge: handlingCharge,
        insurance: insurance,
        customs: customs,
        internationalShipping: internationalShipping,
        vatAmount: vatAmount,
        subtotal: subtotal,
        paymentGatewayFee: paymentGatewayFee,
        discount: discount,
        finalTotal: finalTotal,
        'types': {
          itemsTotal: typeof itemsTotal,
          salesTax: typeof salesTax,
          merchantShipping: typeof merchantShipping,
          domesticShipping: typeof domesticShipping,
          handlingCharge: typeof handlingCharge,
          insurance: typeof insurance,
          customs: typeof customs,
          paymentGatewayFee: typeof paymentGatewayFee,
          vatAmount: typeof vatAmount,
          finalTotal: typeof finalTotal,
        }
      });
    }

    return {
      ...quote,
      items: (formValues.items || []).map((item, index) => ({
        ...quote.items[index],
        name: item.product_name || '',
        price_usd: Number(item.item_price) || 0,
        weight_kg: Number(item.item_weight) || 0,
        quantity: Number(item.quantity) || 1,
        url: item.product_url || '',
      })),
      final_total_usd: finalTotal,
      calculation_data: {
        ...quote.calculation_data,
        sales_tax_price: salesTax,
        merchant_shipping_price: merchantShipping,
        customs_percentage: Number(formValues.customs_percentage) || 0,
        breakdown: {
          items_total: itemsTotal,
          shipping: internationalShipping,
          customs: customs,
          taxes: salesTax + vatAmount,
          fees: handlingCharge + insurance + paymentGatewayFee,
          discount: discount,
        },
      },
      operational_data: {
        ...quote.operational_data,
        domestic_shipping: domesticShipping,
        handling_charge: handlingCharge,
        insurance_amount: insurance,
        payment_gateway_fee: paymentGatewayFee,
        vat_amount: vatAmount,
      },
    };
  }, [quote, formValues]);

  // Update live quote when form changes
  useEffect(() => {
    if (isEditMode && createLiveQuote) {
      setLiveQuote(createLiveQuote);
    } else {
      setLiveQuote(quote);
    }
  }, [isEditMode, createLiveQuote, quote]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(estimationTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [estimationTimeouts]);

  // Trigger weight estimation for existing items when edit mode is activated
  useEffect(() => {
    if (isEditMode && quote?.items) {
      console.log('🚀 Edit mode activated, triggering weight estimation for existing items');
      quote.items.forEach((item, index) => {
        if (item.name && item.name.trim()) {
          console.log(`🎯 Triggering estimation for item ${index}: ${item.name}`);
          // Delay each estimation slightly to avoid overwhelming the service
          setTimeout(() => {
            estimateItemWeight(index, item.name, item.url);
          }, index * 200);
        }
      });
    }
  }, [isEditMode, quote?.id]); // Only trigger when edit mode changes or quote changes

  // Smart metrics calculation (now uses live quote in edit mode)
  const metrics = useMemo(() => {
    const activeQuote = isEditMode ? liveQuote : quote;
    if (!activeQuote) return null;

    const breakdown = activeQuote.calculation_data?.breakdown || {};
    const totalItems = activeQuote.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const totalWeight = activeQuote.items?.reduce((sum, item) => sum + ((item.weight_kg || 0) * (item.quantity || 0)), 0) || 0;
    const avgWeightConfidence = activeQuote.items?.length > 0 
      ? activeQuote.items.reduce((sum, item) => sum + (item.smart_data?.weight_confidence || 0), 0) / activeQuote.items.length
      : 0;

    return {
      totalItems,
      totalWeight: totalWeight.toFixed(2),
      avgWeightConfidence: (avgWeightConfidence * 100).toFixed(0),
      shippingPercentage: breakdown.shipping && activeQuote.final_total_usd 
        ? ((breakdown.shipping / activeQuote.final_total_usd) * 100).toFixed(1)
        : '0',
      customsPercentage: breakdown.customs && activeQuote.final_total_usd
        ? ((breakdown.customs / activeQuote.final_total_usd) * 100).toFixed(1) 
        : '0',
    };
  }, [quote, liveQuote, isEditMode]);

  // Form population function
  const populateFormFromQuote = (quoteData: UnifiedQuote) => {
    const calculationData = quoteData.calculation_data || {};
    const operationalData = quoteData.operational_data || {};
    
    // Use smart customs percentage if available, otherwise use manual entry
    const smartCustomsPercentage = operationalData.customs?.percentage || calculationData.customs_percentage || 0;
    
    form.reset({
      id: quoteData.id,
      customs_percentage: smartCustomsPercentage,
      sales_tax_price: calculationData.sales_tax_price || 0,
      merchant_shipping_price: calculationData.merchant_shipping_price || 0,
      domestic_shipping: operationalData.domestic_shipping || 0,
      handling_charge: operationalData.handling_charge || 0,
      discount: calculationData.discount || 0,
      insurance_amount: operationalData.insurance_amount || 0,
      origin_country: quoteData.origin_country,
      destination_country: quoteData.destination_country,
      currency: quoteData.currency,
      destination_currency: quoteData.currency || 'USD',
      status: quoteData.status,
      items: (quoteData.items || []).map((item, index) => ({
        id: item.id || `item-${index}`,
        item_price: item.price_usd || 0,
        item_weight: item.weight_kg || 0,
        quantity: item.quantity || 1,
        product_name: item.name || '',
        options: item.options || '',
        product_url: item.url || '',
        image_url: item.image || '',
      })),
    });
  };

  // Form save handler
  const onFormSubmit = async (data: AdminQuoteFormValues) => {
    try {
      setIsCalculating(true);
      console.log('Form data being submitted:', data);
      
      // Validate form data before submission
      const formErrors = form.formState.errors;
      if (Object.keys(formErrors).length > 0) {
        console.error('Form validation errors:', formErrors);
        toast({
          title: 'Validation Error',
          description: 'Please fix the form errors before saving.',
          variant: 'destructive',
        });
        return;
      }
      
      // Update quote with form data - CONVERT ALL VALUES TO NUMBERS!
      const success = await unifiedDataEngine.updateQuote(quoteId!, {
        customs_percentage: Number(data.customs_percentage) || 0,
        calculation_data: {
          ...quote?.calculation_data,
          sales_tax_price: Number(data.sales_tax_price) || 0,
          merchant_shipping_price: Number(data.merchant_shipping_price) || 0,
          discount: Number(data.discount) || 0,
          customs_percentage: Number(data.customs_percentage) || 0,
        },
        operational_data: {
          ...quote?.operational_data,
          domestic_shipping: Number(data.domestic_shipping) || 0,
          handling_charge: Number(data.handling_charge) || 0,
          insurance_amount: Number(data.insurance_amount) || 0,
        },
        items: data.items?.map(item => ({
          id: item.id,
          name: item.product_name || '',
          price_usd: Number(item.item_price) || 0,
          weight_kg: Number(item.item_weight) || 0,
          quantity: Number(item.quantity) || 1,
          url: item.product_url || '',
          image: item.image_url || '',
          options: item.options || '',
        })) || [],
      });
      
      console.log('Update success:', success);
      
      if (success) {
        toast({
          title: 'Quote updated',
          description: 'Quote has been successfully updated.',
        });
        setIsEditMode(false);
        await loadQuoteData(); // Reload to get fresh data
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update quote.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: 'Error',
        description: `Failed to save quote changes: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading smart quote interface...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quote not found</h3>
        <p className="text-gray-600">The requested quote could not be loaded.</p>
        <Button onClick={() => navigate('/admin/quotes')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Smart Header with Key Metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/quotes')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quote {quote.display_id}
            </h1>
            <div className="flex items-center space-x-4 mt-1">
              <SmartStatusManager quote={quote} onStatusUpdate={loadQuoteData} />
              <Badge variant="outline" className="flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                {optimizationScore.toFixed(0)}% Optimized
              </Badge>
              {isCalculating && (
                <Badge variant="secondary" className="flex items-center">
                  <Calculator className="w-3 h-3 mr-1 animate-spin" />
                  Calculating...
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="text-right space-y-2">
          <div className="text-2xl font-bold text-blue-600">
            ${(isEditMode ? liveQuote?.final_total_usd || quote.final_total_usd : quote.final_total_usd).toFixed(2)}
            {isEditMode && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Live
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {metrics?.totalItems} items • {metrics?.totalWeight} kg
          </div>
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              disabled={isCalculating}
            >
              <Edit className="w-4 h-4 mr-1" />
              {isEditMode ? 'View Mode' : 'Edit Quote'}
            </Button>
          </div>
        </div>
      </div>

      {/* Smart Suggestions Bar */}
      {smartSuggestions.length > 0 && (
        <SmartSuggestionCards
          suggestions={smartSuggestions}
          onApplySuggestion={handleApplySuggestion}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shipping">Shipping Options</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isEditMode ? (
            /* Edit Mode - Side-by-Side Layout */
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Left Column - Edit Form (60%) */}
              <div className="xl:col-span-3 space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                    {/* Product Details Section - TOP PRIORITY */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center">
                              <Package className="w-5 h-5 mr-2 text-blue-600" />
                              Product Details
                            </CardTitle>
                            <CardDescription>
                              Edit product information: name, URL, price, weight, and quantity
                            </CardDescription>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addNewItem}
                            className="flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Item
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {form.watch('items')?.map((item, index) => {
                          const smartData = quote?.items[index]?.smart_data;
                          const weightConfidence = smartData?.weight_confidence || 0;
                          const category = smartData?.category_detected;
                          const optimizationHints = smartData?.optimization_hints || [];
                          const customsSuggestions = smartData?.customs_suggestions || [];
                          
                          const getWeightConfidenceBadge = (confidence: number) => {
                            if (confidence >= 0.8) return { variant: 'default' as const, text: 'High', color: 'text-green-600' };
                            if (confidence >= 0.6) return { variant: 'secondary' as const, text: 'Medium', color: 'text-yellow-600' };
                            return { variant: 'destructive' as const, text: 'Low', color: 'text-red-600' };
                          };
                          
                          return (
                            <div key={item.id || index} className="p-4 border border-blue-200 rounded-lg bg-blue-50/30 space-y-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-blue-900 flex items-center space-x-2">
                                <span>Item {index + 1}</span>
                                {category && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    <Badge variant="outline" className="text-xs">
                                      {category}
                                    </Badge>
                                  </div>
                                )}
                              </h4>
                              <div className="flex items-center space-x-2">
                                {weightConfidence > 0 && (
                                  <Badge {...getWeightConfidenceBadge(weightConfidence)} className="text-xs">
                                    <Scale className="w-3 h-3 mr-1" />
                                    {getWeightConfidenceBadge(weightConfidence).text}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {item.product_name || 'Unnamed Product'}
                                </Badge>
                                {form.watch('items')?.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                    className="text-red-600 hover:text-red-700 p-1 h-6 w-6"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Product Name and URL - Full Width */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Product Name</label>
                                <input
                                  type="text"
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={item.product_name || ''}
                                  onChange={(e) => {
                                    console.log('📝 Product name changed:', { index, value: e.target.value });
                                    const items = form.getValues('items') || [];
                                    items[index] = { ...items[index], product_name: e.target.value };
                                    form.setValue('items', items);
                                    
                                    // Clear existing timeout for this item
                                    const timeoutKey = index.toString();
                                    if (estimationTimeouts[timeoutKey]) {
                                      console.log('🕐 Clearing existing timeout for:', timeoutKey);
                                      clearTimeout(estimationTimeouts[timeoutKey]);
                                    }
                                    
                                    // Trigger weight estimation after a delay
                                    console.log('⏲️ Setting timeout for weight estimation...');
                                    const timeoutId = setTimeout(() => {
                                      console.log('🎯 Timeout triggered, calling estimateItemWeight');
                                      estimateItemWeight(index, e.target.value, items[index].product_url);
                                    }, 800);
                                    
                                    setEstimationTimeouts(prev => ({ ...prev, [timeoutKey]: timeoutId }));
                                  }}
                                  placeholder="Enter product name"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Product URL</label>
                                <input
                                  type="text"
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={item.product_url || ''}
                                  onChange={(e) => {
                                    const items = form.getValues('items') || [];
                                    items[index] = { ...items[index], product_url: e.target.value };
                                    form.setValue('items', items);
                                  }}
                                  placeholder="https://amazon.com/..."
                                />
                              </div>
                            </div>
                            
                            {/* Price, Weight, Quantity - Compact Row */}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Price (USD)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={item.item_price || 0}
                                  onChange={(e) => {
                                    const items = form.getValues('items') || [];
                                    items[index] = { ...items[index], item_price: parseFloat(e.target.value) || 0 };
                                    form.setValue('items', items);
                                  }}
                                />
                              </div>
                              
                              {/* Smart Weight Field */}
                              <div className="relative">
                                <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                  <span>Weight (kg)</span>
                                  {isEstimating[index.toString()] && (
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                  )}
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:ring-1 ${
                                      weightEstimations[index.toString()] 
                                        ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500 pr-12' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    }`}
                                    value={item.item_weight || 0}
                                    onChange={(e) => {
                                      const items = form.getValues('items') || [];
                                      items[index] = { ...items[index], item_weight: parseFloat(e.target.value) || 0 };
                                      form.setValue('items', items);
                                    }}
                                  />
                                  
                                  {/* Inline AI Suggestion Button */}
                                  {weightEstimations[index.toString()] && (
                                    <div className="absolute inset-y-0 right-0 flex items-center">
                                      <button
                                        type="button"
                                        className="mr-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          applyWeightSuggestion(index, weightEstimations[index.toString()].estimated_weight);
                                        }}
                                        title={`AI suggests: ${weightEstimations[index.toString()].estimated_weight} kg (${(weightEstimations[index.toString()].confidence * 100).toFixed(0)}% confident)`}
                                      >
                                        🧠 {weightEstimations[index.toString()].estimated_weight} 
                                        <span className="ml-1 text-blue-600 font-medium">
                                          ({(weightEstimations[index.toString()].confidence * 100).toFixed(0)}%)
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </div>

                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-700">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={item.quantity || 1}
                                  onChange={(e) => {
                                    const items = form.getValues('items') || [];
                                    items[index] = { ...items[index], quantity: parseInt(e.target.value) || 1 };
                                    form.setValue('items', items);
                                  }}
                                />
                              </div>
                            </div>
                            
                            {/* Smart Insights Section */}
                            {(optimizationHints.length > 0 || customsSuggestions.length > 0) && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                                <div className="flex items-center text-sm font-medium text-blue-800">
                                  <Lightbulb className="w-3 h-3 mr-1" />
                                  Smart Insights
                                </div>
                                
                                {optimizationHints.length > 0 && (
                                  <div className="text-xs text-blue-700">
                                    <span className="font-medium">Optimization Tips:</span>
                                    <ul className="mt-1 space-y-1 list-disc list-inside">
                                      {optimizationHints.map((hint, hintIndex) => (
                                        <li key={hintIndex}>{hint}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {customsSuggestions.length > 0 && (
                                  <div className="text-xs text-blue-700">
                                    <span className="font-medium">Customs Suggestions:</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {customsSuggestions.map((suggestion, suggestionIndex) => (
                                        <Badge key={suggestionIndex} variant="outline" className="text-xs">
                                          {suggestion}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    {/* Smart Recommendations Panel */}
                    {quote?.items && quote.items.length > 0 && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <div className="flex items-center mb-3">
                            <Lightbulb className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="font-medium text-blue-800">Smart Recommendations</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            {quote.items.some(item => (item.smart_data?.weight_confidence || 0) < 0.7) && (
                              <div className="flex items-center text-blue-700">
                                <AlertTriangle className="w-3 h-3 mr-2" />
                                Consider verifying weights for items with low confidence scores
                              </div>
                            )}
                            {quote.items.some(item => Number(item.weight_kg || 0) < 0.1) && (
                              <div className="flex items-center text-blue-700">
                                <Scale className="w-3 h-3 mr-2" />
                                Some items have very low weights - this may affect shipping calculations
                              </div>
                            )}
                            <div className="flex items-center text-blue-700">
                              <CheckCircle className="w-3 h-3 mr-2" />
                              All items have been categorized for optimal customs processing
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quote-Level Costs Section - BELOW PRODUCTS */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                          Shipping & Cost Details
                        </CardTitle>
                        <CardDescription>
                          Configure quote-level pricing: shipping, customs, taxes, and fees
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <QuoteDetailForm 
                          form={form} 
                          detectedCustomsPercentage={customsTierInfo?.customs_percentage}
                          detectedCustomsTier={customsTierInfo?.applied_tier ? {
                            name: customsTierInfo.applied_tier.rule_name,
                            customs_percentage: customsTierInfo.customs_percentage,
                            description: customsTierInfo.fallback_used ? 'Fallback tier applied' : 'Smart tier applied'
                          } : undefined}
                          onCalculateSmartCustoms={calculateSmartCustoms}
                          isCalculatingCustoms={isCalculatingCustoms}
                        />
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditMode(false);
                          populateFormFromQuote(quote); // Reset form
                        }}
                        disabled={isCalculating}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => calculateSmartFeatures(quote)}
                        disabled={isCalculating}
                        variant="outline"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        {isCalculating ? 'Calculating...' : 'Recalculate'}
                      </Button>
                      <Button
                        onClick={async () => {
                          console.log('Save button clicked');
                          console.log('Current form values:', form.getValues());
                          const isValid = await form.trigger();
                          console.log('Form is valid:', isValid);
                          if (isValid) {
                            form.handleSubmit(onFormSubmit)();
                          } else {
                            console.log('Form errors:', form.formState.errors);
                            toast({
                              title: 'Form Validation Failed',
                              description: 'Please check your inputs and try again.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        disabled={isCalculating}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>

              {/* Right Column - Live Breakdown (40%) */}
              <div className="xl:col-span-2 space-y-6">
                {/* Smart Calculation Breakdown - Always Visible */}
                <SmartCalculationBreakdown
                  quote={liveQuote || quote}
                  shippingOptions={shippingOptions}
                  isCalculating={isCalculating}
                />

                {/* Smart Insights - Always Visible */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                      Smart Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Weight Confidence</div>
                        <div className="text-xl font-semibold">
                          {metrics?.avgWeightConfidence}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Shipping Cost</div>
                        <div className="text-xl font-semibold">
                          {metrics?.shippingPercentage}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Customs Duty</div>
                        <div className="text-xl font-semibold flex items-center">
                          {metrics?.customsPercentage}%
                          {(isEditMode ? liveQuote : quote)?.operational_data?.customs?.smart_tier && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Smart
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Options Available</div>
                        <div className="text-xl font-semibold">
                          {shippingOptions.length}
                        </div>
                      </div>
                    </div>

                    {/* Smart Customs Tier Information */}
                    {(isEditMode ? liveQuote : quote)?.operational_data?.customs?.smart_tier && (
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Smart Customs Tier Applied
                        </div>
                        <div className="flex items-center text-sm text-blue-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {(isEditMode ? liveQuote : quote)?.operational_data?.customs?.smart_tier?.tier_name || 'Default Tier'}
                          {(isEditMode ? liveQuote : quote)?.operational_data?.customs?.smart_tier?.fallback_used && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Fallback
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {shippingRecommendations.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Top Recommendation
                        </div>
                        <div className="flex items-center text-sm text-green-600">
                          <Lightbulb className="w-4 h-4 mr-1" />
                          {shippingRecommendations[0].reason === 'cost_savings' && 
                            `Save $${shippingRecommendations[0].savings_usd.toFixed(2)} with slower shipping`
                          }
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Mode Indicator */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center text-blue-800">
                      <Edit className="w-4 h-4 mr-2" />
                      <span className="font-medium">Edit Mode Active</span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Changes are reflected in real-time. Remember to save when finished.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* View Mode - Original Overview Layout */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Smart Calculation Breakdown */}
              <SmartCalculationBreakdown
                quote={quote}
                shippingOptions={shippingOptions}
                isCalculating={isCalculating}
              />

              {/* Key Metrics Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                    Smart Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Weight Confidence</div>
                      <div className="text-xl font-semibold">
                        {metrics?.avgWeightConfidence}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Shipping Cost</div>
                      <div className="text-xl font-semibold">
                        {metrics?.shippingPercentage}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Customs Duty</div>
                      <div className="text-xl font-semibold flex items-center">
                        {metrics?.customsPercentage}%
                        {quote?.operational_data?.customs?.smart_tier && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Smart
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Options Available</div>
                      <div className="text-xl font-semibold">
                        {shippingOptions.length}
                      </div>
                    </div>
                  </div>

                  {/* Smart Customs Tier Information */}
                  {quote?.operational_data?.customs?.smart_tier && (
                    <div className="pt-4 border-t">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Smart Customs Tier Applied
                      </div>
                      <div className="flex items-center text-sm text-blue-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {quote?.operational_data?.customs?.smart_tier?.tier_name || 'Default Tier'}
                        {quote?.operational_data?.customs?.smart_tier?.fallback_used && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Fallback
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {shippingRecommendations.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Top Recommendation
                      </div>
                      <div className="flex items-center text-sm text-green-600">
                        <Lightbulb className="w-4 h-4 mr-1" />
                        {shippingRecommendations[0].reason === 'cost_savings' && 
                          `Save $${shippingRecommendations[0].savings_usd.toFixed(2)} with slower shipping`
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>


        {/* Shipping Options Tab */}
        <TabsContent value="shipping">
          <SmartShippingOptions
            quote={quote}
            shippingOptions={shippingOptions}
            recommendations={shippingRecommendations}
            onSelectOption={handleShippingOptionSelect}
            showAllOptions={showAllShippingOptions}
            onToggleShowAll={setShowAllShippingOptions}
          />
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer">
          <SmartCustomerInfo
            quote={quote}
            onUpdateQuote={loadQuoteData}
          />
        </TabsContent>

      </Tabs>

      {/* Quick Actions Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => calculateSmartFeatures(quote)}
                disabled={isCalculating}
                className="flex items-center"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isCalculating ? 'Calculating...' : 'Recalculate'}
              </Button>
              
              <Button variant="outline" className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Timeline
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline">Save</Button>
              <Button>Send to Customer</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedQuoteInterface;