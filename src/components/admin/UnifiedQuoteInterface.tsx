// ============================================================================
// UNIFIED QUOTE INTERFACE - Smart 400-line replacement for 1,457-line monster
// Features: Multiple shipping options, smart suggestions, real-time optimization
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Trash2,
  ChevronUp,
  ChevronDown,
  User
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
  const [showShippingDetails, setShowShippingDetails] = useState(false);
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
      international_shipping: 0,
      selected_shipping_option: null,
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

    // Find the selected shipping option
    const selectedOption = shippingOptions.find(opt => opt.id === optionId);
    
    // Update form values to reflect the selection
    if (selectedOption) {
      form.setValue('selected_shipping_option', optionId);
      form.setValue('international_shipping', selectedOption.cost_usd);
    }

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

  // Dynamic shipping calculation function
  const recalculateShipping = useCallback(async () => {
    if (!quote || !formValues.items || formValues.items.length === 0) return;

    try {
      const itemsTotal = (formValues.items || []).reduce((sum, item) => 
        sum + (Number(item.item_price) || 0) * (Number(item.quantity) || 1), 0
      );
      
      const totalWeight = (formValues.items || []).reduce((sum, item) => 
        sum + (Number(item.item_weight) || 0) * (Number(item.quantity) || 1), 0
      );

      if (itemsTotal > 0 && totalWeight > 0 && formValues.origin_country && formValues.destination_country) {
        console.log('🚢 Recalculating shipping options...', {
          itemsTotal,
          totalWeight,
          origin: formValues.origin_country,
          destination: formValues.destination_country
        });

        const tempQuote = {
          ...quote,
          origin_country: formValues.origin_country,
          destination_country: formValues.destination_country,
          items: (formValues.items || []).map((item, index) => ({
            ...quote.items[index],
            price_usd: Number(item.item_price) || 0,
            weight_kg: Number(item.item_weight) || 0,
            quantity: Number(item.quantity) || 1,
          })),
        };

        const result = await smartCalculationEngine.calculateWithShippingOptions({
          quote: tempQuote,
          preferences: {
            speed_priority: 'medium',
            cost_priority: 'medium',
            show_all_options: true,
          },
        });

        if (result.success) {
          setShippingOptions(result.shipping_options);
          setShippingRecommendations(result.smart_recommendations);
          
          // Auto-select optimal option if none selected
          if (!formValues.selected_shipping_option && result.shipping_options.length > 0) {
            const optimalOption = result.shipping_options[0]; // First option is usually optimal
            form.setValue('selected_shipping_option', optimalOption.id);
            form.setValue('international_shipping', optimalOption.cost_usd);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error recalculating shipping:', error);
    }
  }, [quote, formValues.items, formValues.origin_country, formValues.destination_country, formValues.selected_shipping_option, form]);

  // Watch for changes that should trigger shipping recalculation
  useEffect(() => {
    if (isEditMode) {
      const debounceTimer = setTimeout(() => {
        recalculateShipping();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(debounceTimer);
    }
  }, [isEditMode, recalculateShipping]);
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

  // Single calculator for ALL calculations - SmartCalculationEngine (fast sync mode for live editing)
  const createLiveQuote = useMemo(() => {
    if (!quote || !formValues) return quote;
    
    try {
      // Build updated quote from form values
      const updatedQuote = {
        ...quote,
        items: (formValues.items || []).map((item, index) => ({
          ...quote.items[index],
          name: item.product_name || '',
          price_usd: Number(item.item_price) || 0,
          weight_kg: Number(item.item_weight) || 0,
          quantity: Number(item.quantity) || 1,
          url: item.product_url || '',
        })),
        operational_data: {
          ...quote.operational_data,
          customs: {
            ...quote.operational_data?.customs,
            percentage: Number(formValues.customs_percentage) || quote.operational_data?.customs?.percentage || 0,
          },
          shipping: {
            ...quote.operational_data?.shipping,
            selected_option: formValues.selected_shipping_option || quote.operational_data?.shipping?.selected_option,
          },
          domestic_shipping: Number(formValues.domestic_shipping) || 0,
          handling_charge: Number(formValues.handling_charge) || 0,
          insurance_amount: Number(formValues.insurance_amount) || 0,
        },
        calculation_data: {
          ...quote.calculation_data,
          sales_tax_price: Number(formValues.sales_tax_price) || 0,
          merchant_shipping_price: Number(formValues.merchant_shipping_price) || 0,
          discount: Number(formValues.discount) || 0,
        },
      };

      // Use SmartCalculationEngine sync mode for instant live updates
      const calculationResult = smartCalculationEngine.calculateLiveSync({
        quote: updatedQuote,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: false, // Simplified for live editing
        },
      });

      if (calculationResult.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚡ Live calculation (SmartCalculationEngine sync):', {
            finalTotal: calculationResult.updated_quote.final_total_usd,
            breakdown: calculationResult.updated_quote.calculation_data.breakdown,
          });
        }
        return calculationResult.updated_quote;
      } else {
        console.warn('⚠️ SmartCalculationEngine sync failed:', calculationResult.error);
        return quote;
      }
    } catch (error) {
      console.error('❌ Live calculation error:', error);
      return quote;
    }
  }, [quote, formValues]);

  // Always use SmartCalculationEngine for consistent calculations in both modes
  useEffect(() => {
    if (isEditMode && createLiveQuote) {
      // Edit mode: Use real-time calculated quote
      setLiveQuote(createLiveQuote);
    } else if (quote) {
      // View mode: Recalculate using SmartCalculationEngine for consistency
      try {
        const calculationResult = smartCalculationEngine.calculateLiveSync({
          quote,
          preferences: {
            speed_priority: 'medium',
            cost_priority: 'medium',
            show_all_options: false,
          },
        });
        
        if (calculationResult.success) {
          setLiveQuote(calculationResult.updated_quote);
        } else {
          setLiveQuote(quote); // Fallback to original
        }
      } catch (error) {
        console.warn('View mode recalculation failed:', error);
        setLiveQuote(quote); // Fallback to original
      }
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

  // Smart metrics calculation (always uses live quote for consistency)
  const metrics = useMemo(() => {
    const activeQuote = liveQuote || quote;
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
  }, [quote, liveQuote]);

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
      international_shipping: calculationData.breakdown?.shipping || 0,
      selected_shipping_option: operationalData.shipping?.selected_option || null,
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
          breakdown: {
            ...quote?.calculation_data?.breakdown,
            shipping: Number(data.international_shipping) || quote?.calculation_data?.breakdown?.shipping || 0,
          },
        },
        operational_data: {
          ...quote?.operational_data,
          domestic_shipping: Number(data.domestic_shipping) || 0,
          handling_charge: Number(data.handling_charge) || 0,
          insurance_amount: Number(data.insurance_amount) || 0,
          shipping: {
            ...quote?.operational_data?.shipping,
            selected_option: data.selected_shipping_option || null,
          },
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
              <SmartStatusManager quote={liveQuote || quote} onStatusUpdate={loadQuoteData} />
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
            ${(liveQuote?.final_total_usd || quote.final_total_usd).toFixed(2)}
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

      {/* Smart Adaptive Layout */}
      {isEditMode ? (
        /* Edit Mode: Keep tabs for organization */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Left Column - Edit Form (60%) */}
              <div className="space-y-6 xl:col-span-3">
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
                          shippingOptions={shippingOptions}
                          onSelectShippingOption={handleShippingOptionSelect}
                          onShowShippingDetails={() => setShowShippingDetails(true)}
                        />
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditMode(false);
                          populateFormFromQuote(liveQuote || quote); // Reset form
                        }}
                        disabled={isCalculating}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => calculateSmartFeatures(liveQuote || quote)}
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
                          {(liveQuote || quote)?.operational_data?.customs?.smart_tier && (
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
                    {(liveQuote || quote)?.operational_data?.customs?.smart_tier && (
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Smart Customs Tier Applied
                        </div>
                        <div className="flex items-center text-sm text-blue-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {(liveQuote || quote)?.operational_data?.customs?.smart_tier?.tier_name || 'Default Tier'}
                          {(liveQuote || quote)?.operational_data?.customs?.smart_tier?.fallback_used && (
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

                {/* Collapsible Shipping Options */}
                {shippingOptions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base">
                          <Truck className="w-4 h-4 mr-2 text-blue-600" />
                          Shipping Options
                          <Badge variant="outline" className="ml-2 text-xs">
                            {shippingOptions.length} available
                          </Badge>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowShippingDetails(!showShippingDetails)}
                          className="h-8 w-8 p-0"
                        >
                          {showShippingDetails ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {!showShippingDetails && (
                        <div className="text-sm text-gray-600">
                          Current: {shippingOptions.find(opt => 
                            opt.id === (liveQuote || quote)?.operational_data?.shipping?.selected_option
                          )?.carrier} {shippingOptions.find(opt => 
                            opt.id === (liveQuote || quote)?.operational_data?.shipping?.selected_option
                          )?.name || 'None selected'}
                        </div>
                      )}
                    </CardHeader>
                    {showShippingDetails && (
                      <CardContent className="pt-0">
                        <SmartShippingOptions
                          quote={liveQuote || quote}
                          shippingOptions={shippingOptions}
                          recommendations={shippingRecommendations}
                          onSelectOption={handleShippingOptionSelect}
                          showAllOptions={showAllShippingOptions}
                          onToggleShowAll={setShowAllShippingOptions}
                        />
                      </CardContent>
                    )}
                  </Card>
                )}

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
        </TabsContent>

          {/* Customer Tab */}
          <TabsContent value="customer">
            <SmartCustomerInfo
              quote={liveQuote || quote}
              onUpdateQuote={loadQuoteData}
            />
          </TabsContent>

        </Tabs>
      ) : (
        /* View Mode: Seamless integrated layout with customer info */
        <div className="space-y-6">
          {/* Quote Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quote Items Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Items Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(liveQuote || quote).items?.map((item, index) => (
                    <div key={item.id || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name || `Item ${index + 1}`}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity}x • {item.weight_kg}kg each
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        ${(item.price_usd * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Items</span>
                      <span>{metrics?.totalItems} items • {metrics?.totalWeight} kg</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-green-600" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SmartCustomerInfo
                  quote={liveQuote || quote}
                  onUpdateQuote={loadQuoteData}
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Quote Status & Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                  Status & Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <SmartStatusManager quote={liveQuote || quote} onStatusUpdate={loadQuoteData} compact={true} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Weight Confidence</div>
                    <div className="font-semibold">{metrics?.avgWeightConfidence}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Optimization</div>
                    <div className="font-semibold">{optimizationScore.toFixed(0)}%</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-lg font-bold text-blue-600">
                    ${(liveQuote?.final_total_usd || quote.final_total_usd).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Final Total</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cost Breakdown - Full Width on Mobile, 2 columns on Desktop */}
            <div className="lg:col-span-2">
              <SmartCalculationBreakdown
                quote={liveQuote || quote}
                shippingOptions={shippingOptions}
                isCalculating={isCalculating}
              />
            </div>

            {/* Smart Insights & Actions */}
            <div className="space-y-6">
              {/* Smart Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                    Smart Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping Cost</span>
                      <span className="font-semibold">{metrics?.shippingPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customs Duty</span>
                      <div className="flex items-center">
                        <span className="font-semibold">{metrics?.customsPercentage}%</span>
                        {(liveQuote || quote)?.operational_data?.customs?.smart_tier && (
                          <Badge variant="outline" className="ml-2 text-xs">Smart</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Options Available</span>
                      <span className="font-semibold">{shippingOptions.length}</span>
                    </div>
                  </div>

                  {/* Smart Customs Tier Information */}
                  {(liveQuote || quote)?.operational_data?.customs?.smart_tier && (
                    <div className="pt-3 border-t">
                      <div className="text-sm font-medium text-gray-900 mb-2">Smart Customs Tier</div>
                      <div className="flex items-center text-sm text-blue-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {(liveQuote || quote)?.operational_data?.customs?.smart_tier?.tier_name || 'Default Tier'}
                        {(liveQuote || quote)?.operational_data?.customs?.smart_tier?.fallback_used && (
                          <Badge variant="secondary" className="ml-2 text-xs">Fallback</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Options */}
              {shippingOptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-blue-600" />
                      Shipping Options
                      <Badge variant="outline" className="ml-2 text-xs">
                        {shippingOptions.length} available
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SmartShippingOptions
                      quote={liveQuote || quote}
                      shippingOptions={shippingOptions}
                      recommendations={shippingRecommendations}
                      onSelectOption={handleShippingOptionSelect}
                      showAllOptions={showAllShippingOptions}
                      onToggleShowAll={setShowAllShippingOptions}
                      compact={true}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => calculateSmartFeatures(liveQuote || quote)}
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