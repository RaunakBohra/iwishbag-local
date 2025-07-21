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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Truck,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Package,
  DollarSign,
  Edit,
  Save,
  X,
  Scale,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  User,
  Smartphone,
  MessageCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAllCountries } from '@/hooks/useAllCountries';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';
import type {
  UnifiedQuote,
  ShippingOption,
  ShippingRecommendation,
  SmartSuggestion,
} from '@/types/unified-quote';

// Smart sub-components
import { SmartSuggestionCards } from './smart-components/SmartSuggestionCards';
import { CompactCustomerInfo } from './smart-components/CompactCustomerInfo';
import { CompactStatusManager } from './smart-components/CompactStatusManager';
import { CompactShippingOptions } from './smart-components/CompactShippingOptions';
import { CompactPaymentManager } from './smart-components/CompactPaymentManager';
import { CompactShippingManager } from './smart-components/CompactShippingManager';
import { CompactCalculationBreakdown } from './smart-components/CompactCalculationBreakdown';
import { ShippingRouteHeader } from './smart-components/ShippingRouteHeader';
import { QuoteDetailForm } from './QuoteDetailForm';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminQuoteFormValues, adminQuoteFormSchema } from './admin-quote-form-validation';
import { ModeToggle } from '@/components/ui/mode-toggle';

interface UnifiedQuoteInterfaceProps {
  initialQuoteId?: string;
}

export const UnifiedQuoteInterface: React.FC<UnifiedQuoteInterfaceProps> = ({ initialQuoteId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: allCountries } = useAllCountries();

  // Core state
  const quoteId = initialQuoteId || paramId;
  const [quote, setQuote] = useState<UnifiedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // Smart features state
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingRecommendations, setShippingRecommendations] = useState<ShippingRecommendation[]>(
    [],
  );
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllShippingOptions, setShowAllShippingOptions] = useState(false);
  const [showShippingDetails, setShowShippingDetails] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ index: number; name: string } | null>(null);

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

  const loadQuoteData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);

      // Add small delay if forcing refresh to allow database update to propagate
      if (forceRefresh) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const quoteData = await unifiedDataEngine.getQuote(quoteId!, forceRefresh);

      if (!quoteData) {
        toast({
          title: 'Quote not found',
          description: 'The requested quote could not be found.',
          variant: 'destructive',
        });
        navigate('/admin/quotes');
        return;
      }

      console.log('[DEBUG] loadQuoteData: Updating quote state with new data', {
        oldStatus: quote?.status,
        newStatus: quoteData.status,
        quoteId: quoteData.id,
      });
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
    console.log('[DEBUG] handleShippingOptionSelect called with:', {
      optionId,
      quoteId: quote?.id,
      currentSelectedOption: quote?.operational_data?.shipping?.selected_option,
      availableOptions: shippingOptions.map((opt) => ({
        id: opt.id,
        carrier: opt.carrier,
        cost: opt.cost_usd,
      })),
    });

    if (!quote) {
      console.error('❌ [DEBUG] No quote available');
      return;
    }

    // Find the selected shipping option
    const selectedOption = shippingOptions.find((opt) => opt.id === optionId);

    if (!selectedOption) {
      console.warn('⚠️ [DEBUG] Selected shipping option not found:', optionId);
      return;
    }

    console.log('✅ [DEBUG] Found selected option:', {
      id: selectedOption.id,
      carrier: selectedOption.carrier,
      name: selectedOption.name,
      cost: selectedOption.cost_usd,
    });

    // Optimistic update: Update form values immediately for instant UI feedback
    console.log('[DEBUG] Updating form values...');
    form.setValue('selected_shipping_option', optionId);
    form.setValue('international_shipping', selectedOption.cost_usd);

    console.log('[DEBUG] Form values after update:', {
      selected_shipping_option: form.getValues('selected_shipping_option'),
      international_shipping: form.getValues('international_shipping'),
    });

    // Optimistic update: Update local quote state immediately
    const optimisticQuote = {
      ...quote,
      operational_data: {
        ...quote.operational_data,
        shipping: {
          ...quote.operational_data?.shipping,
          selected_option: optionId,
        },
      },
    };

    console.log('[DEBUG] Setting optimistic quote state:', {
      originalShippingOption: quote.operational_data?.shipping?.selected_option,
      newShippingOption: optimisticQuote.operational_data.shipping.selected_option,
      fullOperationalData: optimisticQuote.operational_data,
    });

    // Set optimistic state immediately (no page refresh)
    setQuote(optimisticQuote);

    // Show immediate feedback
    toast({
      title: 'Shipping updated',
      description: `Selected ${selectedOption.carrier} ${selectedOption.name}`,
      duration: 2000,
    });

    console.log('💾 [DEBUG] Starting database update...');
    try {
      // Update database in background
      const updatePayload = {
        operational_data: optimisticQuote.operational_data,
      };

      console.log('💾 [DEBUG] Update payload:', updatePayload);

      const success = await unifiedDataEngine.updateQuote(quote.id, updatePayload);

      console.log('💾 [DEBUG] Database update result:', success);

      if (!success) {
        console.error('❌ [DEBUG] Database update failed, rolling back...');
        // Rollback on failure
        setQuote(quote);
        form.setValue(
          'selected_shipping_option',
          quote.operational_data?.shipping?.selected_option || '',
        );
        form.setValue('international_shipping', quote.calculation_data?.breakdown?.shipping || 0);

        toast({
          title: 'Update failed',
          description: 'Failed to save shipping option. Please try again.',
          variant: 'destructive',
        });
      } else {
        console.log('✅ [DEBUG] Database update successful!');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error updating shipping option:', error);

      // Rollback on error
      setQuote(quote);
      form.setValue(
        'selected_shipping_option',
        quote.operational_data?.shipping?.selected_option || '',
      );
      form.setValue('international_shipping', quote.calculation_data?.breakdown?.shipping || 0);

      toast({
        title: 'Update failed',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleApplySuggestion = async (suggestion: SmartSuggestion) => {
    if (!quote) return;

    // Handle different suggestion types
    if (suggestion.type === 'shipping' && suggestion.action === 'switch_shipping') {
      // Extract option ID from suggestion
      const recommendedOption = shippingRecommendations.find((rec) =>
        suggestion.message.includes(rec.reason),
      );
      if (recommendedOption) {
        await handleShippingOptionSelect(recommendedOption.option_id);
      }
    }

    // Remove applied suggestion
    const updatedSuggestions = smartSuggestions.filter((s) => s.id !== suggestion.id);
    setSmartSuggestions(updatedSuggestions);
  };

  // Enhanced mode toggle handler with notifications
  const handleModeToggle = (newEditMode: boolean) => {
    setIsEditMode(newEditMode);

    // Toast notification for mode changes
    toast({
      title: `${newEditMode ? 'Edit' : 'View'} Mode Activated`,
      description: newEditMode
        ? 'You can now modify quote details and calculations.'
        : 'Switched to view mode for review and analysis.',
      duration: 2000,
    });

    // Reset form when switching to view mode
    if (!newEditMode && quote) {
      populateFormFromQuote(liveQuote || quote);
    }
  };

  // Watch form values for live updates
  const formValues = useWatch({ control: form.control });

  // Track when form changes occur to prevent infinite sync loops
  useEffect(() => {
    window.lastFormChangeTime = Date.now();
  }, [formValues]);

  // Dynamic shipping calculation function
  const recalculateShipping = useCallback(async () => {
    if (!quote || !formValues.items || formValues.items.length === 0) return;

    try {
      const itemsTotal = (formValues.items || []).reduce(
        (sum, item) => sum + (Number(item.item_price) || 0) * (Number(item.quantity) || 1),
        0,
      );

      const totalWeight = (formValues.items || []).reduce(
        (sum, item) => sum + (Number(item.item_weight) || 0) * (Number(item.quantity) || 1),
        0,
      );

      if (
        itemsTotal > 0 &&
        totalWeight > 0 &&
        formValues.origin_country &&
        formValues.destination_country
      ) {
        console.log('Recalculating shipping options...', {
          itemsTotal,
          totalWeight,
          origin: formValues.origin_country,
          destination: formValues.destination_country,
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
  }, [
    quote,
    formValues.items,
    formValues.origin_country,
    formValues.destination_country,
    formValues.selected_shipping_option,
    form,
  ]);

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
  const [weightEstimations, setWeightEstimations] = useState<{ [key: string]: any }>({});
  const [isEstimating, setIsEstimating] = useState<{ [key: string]: boolean }>({});
  const [estimationTimeouts, setEstimationTimeouts] = useState<{ [key: string]: NodeJS.Timeout }>(
    {},
  );

  // Smart customs calculation state
  const [customsTierInfo, setCustomsTierInfo] = useState<any>(null);
  const [isCalculatingCustoms, setIsCalculatingCustoms] = useState(false);

  // Function to estimate weight for an item
  const estimateItemWeight = async (
    itemIndex: number,
    productName: string,
    productUrl?: string,
  ) => {
    console.log('🔍 estimateItemWeight called:', { itemIndex, productName, productUrl });

    if (!productName.trim()) {
      console.log('❌ Empty product name, clearing estimation');
      setWeightEstimations((prev) => ({ ...prev, [itemIndex]: null }));
      return;
    }

    const estimationKey = itemIndex.toString();
    console.log('⏳ Starting estimation for key:', estimationKey);
    setIsEstimating((prev) => ({ ...prev, [estimationKey]: true }));

    try {
      console.log('Calling smartWeightEstimator.estimateWeight...');
      const estimation = await smartWeightEstimator.estimateWeight(productName, productUrl);
      console.log('✅ Weight estimation result:', estimation);
      setWeightEstimations((prev) => ({ ...prev, [estimationKey]: estimation }));
    } catch (error) {
      console.error('❌ Weight estimation error:', error);
      setWeightEstimations((prev) => ({ ...prev, [estimationKey]: null }));
    } finally {
      setIsEstimating((prev) => ({ ...prev, [estimationKey]: false }));
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
      title: 'Item Added',
      description: 'New item has been added to the quote.',
      duration: 2000,
    });
  };

  // Function to remove item with confirmation
  const handleRemoveItemConfirm = (itemIndex: number) => {
    const currentItems = form.getValues('items') || [];
    const itemName = currentItems[itemIndex]?.product_name || `Product ${itemIndex + 1}`;
    setProductToDelete({ index: itemIndex, name: itemName });
  };

  // Handle confirmed product deletion
  const handleConfirmRemoveItem = () => {
    if (productToDelete) {
      removeItem(productToDelete.index);
      setProductToDelete(null);
    }
  };

  // Handle route editing done - save changes
  const handleRouteEditingDone = async () => {
    if (!quote?.id || !isEditingRoute) {
      setIsEditingRoute(false);
      return;
    }

    try {
      const formData = form.getValues();
      
      // Only save if routes have actually changed
      const routeChanged = 
        formData.origin_country !== quote.origin_country ||
        formData.destination_country !== quote.destination_country;

      if (routeChanged) {
        console.log('🗺️ [ROUTE-SAVE] Saving route changes:', {
          from: `${quote.origin_country} → ${quote.destination_country}`,
          to: `${formData.origin_country} → ${formData.destination_country}`
        });

        const success = await unifiedDataEngine.updateQuote(quote.id, {
          origin_country: formData.origin_country,
          destination_country: formData.destination_country,
        });

        if (success) {
          // Exit editing mode FIRST to avoid UI sync issues
          setIsEditingRoute(false);
          
          toast({
            title: 'Route Updated',
            description: `Route changed to ${formData.origin_country} → ${formData.destination_country}`,
          });
          
          // Reload the quote data to reflect changes
          await loadQuoteData();
          
          // Explicitly set form values to ensure sync with fresh database data
          form.setValue('origin_country', formData.origin_country);
          form.setValue('destination_country', formData.destination_country);
          
          // Force all form watchers to re-evaluate with new values
          form.trigger();
          
          console.log('🗺️ [ROUTE-SAVE] Form values after update:', {
            origin: form.getValues('origin_country'),
            destination: form.getValues('destination_country'),
            formValues: formValues
          });
          
          // Trigger shipping recalculation after route change
          await recalculateShipping();
        } else {
          toast({
            title: 'Error Saving Route',
            description: 'Failed to save route changes',
            variant: 'destructive',
          });
          setIsEditingRoute(false);
        }
      } else {
        // No changes, just exit editing mode
        setIsEditingRoute(false);
      }
    } catch (error) {
      console.error('❌ [ROUTE-SAVE] Error saving route:', error);
      toast({
        title: 'Error Saving Route',
        description: 'An error occurred while saving route changes',
        variant: 'destructive',
      });
      setIsEditingRoute(false);
    }
  };

  // Function to actually remove item after confirmation
  const removeItem = (itemIndex: number) => {
    const currentItems = form.getValues('items') || [];

    if (currentItems.length <= 1) {
      toast({
        title: 'Cannot Remove Item',
        description: 'Quote must have at least one item.',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    const updatedItems = currentItems.filter((_, index) => index !== itemIndex);
    form.setValue('items', updatedItems);

    // Clear weight estimations for removed item
    setWeightEstimations((prev) => {
      const updated = { ...prev };
      delete updated[itemIndex.toString()];
      // Reindex remaining estimations
      const reindexed: { [key: string]: any } = {};
      Object.keys(updated).forEach((key) => {
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
      title: 'Item Removed',
      description: 'Item has been removed from the quote.',
      duration: 2000,
    });
  };

  // Function to calculate smart customs tier
  const calculateSmartCustoms = async () => {
    if (!quote || !formValues) return;

    setIsCalculatingCustoms(true);

    try {
      // Calculate totals from current form values
      const itemsTotal = (formValues.items || []).reduce(
        (sum, item) => sum + (Number(item.item_price) || 0) * (Number(item.quantity) || 1),
        0,
      );

      const totalWeight = (formValues.items || []).reduce(
        (sum, item) => sum + (Number(item.item_weight) || 0) * (Number(item.quantity) || 1),
        0,
      );

      console.log('🧮 Calculating smart customs for:', {
        origin: quote.origin_country,
        destination: quote.destination_country,
        itemsTotal,
        totalWeight,
      });

      const tierResult = await calculateCustomsTier(
        quote.origin_country,
        quote.destination_country,
        itemsTotal,
        totalWeight,
      );

      console.log('✅ Smart customs result:', tierResult);

      setCustomsTierInfo(tierResult);

      // Auto-apply the calculated percentage
      form.setValue('customs_percentage', tierResult.customs_percentage);

      toast({
        title: 'Smart Customs Applied',
        description: `Applied ${tierResult.applied_tier?.rule_name || 'default'} tier: ${tierResult.customs_percentage}%`,
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ Smart customs calculation error:', error);
      toast({
        title: 'Customs Calculation Failed',
        description: 'Unable to calculate smart customs tier. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsCalculatingCustoms(false);
    }
  };

  // Function to apply weight suggestion
  const applyWeightSuggestion = (itemIndex: number, suggestedWeight: number) => {
    console.log('Applying weight suggestion:', { itemIndex, suggestedWeight });

    try {
      const items = form.getValues('items') || [];
      items[itemIndex] = { ...items[itemIndex], item_weight: suggestedWeight };

      // Use setValue with shouldValidate: false to prevent triggering validation/submission
      form.setValue('items', items, { shouldValidate: false, shouldDirty: true });

      console.log('✅ Weight suggestion applied successfully');

      // Optional: Show a brief success indicator
      toast({
        title: 'Weight Updated',
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
            percentage:
              Number(formValues.customs_percentage) ||
              quote.operational_data?.customs?.percentage ||
              0,
          },
          shipping: {
            ...quote.operational_data?.shipping,
            selected_option:
              formValues.selected_shipping_option ||
              quote.operational_data?.shipping?.selected_option,
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
          console.log('Live calculation (SmartCalculationEngine sync):', {
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
    console.log('[DEBUG] liveQuote useEffect triggered:', {
      isEditMode,
      hasCreateLiveQuote: !!createLiveQuote,
      hasQuote: !!quote,
      quoteId: quote?.id,
      selectedShippingOption: quote?.operational_data?.shipping?.selected_option,
    });

    if (isEditMode && createLiveQuote) {
      console.log('[DEBUG] Setting liveQuote from createLiveQuote (edit mode)');
      // Edit mode: Use real-time calculated quote
      setLiveQuote(createLiveQuote);
    } else if (quote) {
      console.log('[DEBUG] Recalculating liveQuote (view mode)');
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
          console.log('✅ [DEBUG] LiveQuote calculation successful');
          setLiveQuote(calculationResult.updated_quote);
        } else {
          console.log('⚠️ [DEBUG] LiveQuote calculation failed, using original quote');
          setLiveQuote(quote); // Fallback to original
        }
      } catch (error) {
        console.warn('❌ [DEBUG] View mode recalculation failed:', error);
        setLiveQuote(quote); // Fallback to original
      }
    } else {
      console.log('[DEBUG] Setting liveQuote to quote (no calculations)');
      setLiveQuote(quote);
    }
  }, [isEditMode, createLiveQuote, quote]);

  // Debug logging for status changes
  useEffect(() => {
    console.log('[DEBUG] Quote or liveQuote status changed:', {
      quoteStatus: quote?.status,
      liveQuoteStatus: liveQuote?.status,
      usingLiveQuote: !!liveQuote,
    });
  }, [quote?.status, liveQuote?.status]);

  // Sync calculated values back to form fields (fixes handling charge & insurance display)
  useEffect(() => {
    if (liveQuote && isEditMode) {
      const operationalData = liveQuote.operational_data || {};

      // DISABLED: Automatic form syncing to prevent infinite loop
      // The form should be the source of truth for user input
      // Calculated values are used for display purposes only in breakdown components

      console.log(
        '[DEBUG] Form sync disabled - form values take precedence over calculated values:',
        {
          formHandling: form.getValues('handling_charge'),
          calculatedHandling: operationalData.handling_charge,
          formInsurance: form.getValues('insurance_amount'),
          calculatedInsurance: operationalData.insurance_amount,
        },
      );
    }
  }, [liveQuote, isEditMode, form]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(estimationTimeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [estimationTimeouts]);

  // Trigger weight estimation for existing items when edit mode is activated
  useEffect(() => {
    if (isEditMode && quote?.items) {
      console.log('Edit mode activated, triggering weight estimation for existing items');
      quote.items.forEach((item, index) => {
        if (item.name && item.name.trim()) {
          console.log(`Triggering estimation for item ${index}: ${item.name}`);
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
    const totalWeight =
      activeQuote.items?.reduce(
        (sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 0),
        0,
      ) || 0;
    const avgWeightConfidence =
      activeQuote.items?.length > 0
        ? activeQuote.items.reduce(
            (sum, item) => sum + (item.smart_data?.weight_confidence || 0),
            0,
          ) / activeQuote.items.length
        : 0;

    return {
      totalItems,
      totalWeight: totalWeight.toFixed(2),
      avgWeightConfidence: (avgWeightConfidence * 100).toFixed(0),
      shippingPercentage:
        breakdown.shipping && activeQuote.final_total_usd
          ? ((Number(breakdown.shipping) / activeQuote.final_total_usd) * 100).toFixed(1)
          : '0',
      customsPercentage:
        breakdown.customs && activeQuote.final_total_usd
          ? ((Number(breakdown.customs) / activeQuote.final_total_usd) * 100).toFixed(1)
          : '0',
    };
  }, [quote, liveQuote]);

  // Form population function
  const populateFormFromQuote = (quoteData: UnifiedQuote) => {
    const calculationData = quoteData.calculation_data || {};
    const operationalData = quoteData.operational_data || {};

    // Use smart customs percentage if available, otherwise use manual entry
    const smartCustomsPercentage =
      operationalData.customs?.percentage || calculationData.customs_percentage || 0;

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
      console.log('💾 [SAVE] Form data being submitted:', data);

      // Validate form data before submission
      const formErrors = form.formState.errors;
      if (Object.keys(formErrors).length > 0) {
        console.error('❌ [SAVE] Form validation errors:', formErrors);

        // Generate detailed error message
        const errorMessages = [];
        if (formErrors.items) {
          errorMessages.push('Product information has errors');
        }
        if (formErrors.customs_percentage) {
          errorMessages.push('Customs percentage is invalid');
        }
        if (formErrors.origin_country || formErrors.destination_country) {
          errorMessages.push('Origin or destination country is required');
        }

        const errorDescription =
          errorMessages.length > 0
            ? errorMessages.join(', ')
            : 'Please check your inputs and try again.';

        toast({
          title: 'Form Validation Failed',
          description: errorDescription,
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      // Update quote with form data - CONVERT ALL VALUES TO NUMBERS!
      const success = await unifiedDataEngine.updateQuote(quoteId!, {
        customs_percentage: Number(data.customs_percentage) || 0,
        origin_country: data.origin_country || quote?.origin_country,
        destination_country: data.destination_country || quote?.destination_country,
        calculation_data: {
          ...quote?.calculation_data,
          sales_tax_price: Number(data.sales_tax_price) || 0,
          merchant_shipping_price: Number(data.merchant_shipping_price) || 0,
          discount: Number(data.discount) || 0,
          customs_percentage: Number(data.customs_percentage) || 0,
          breakdown: {
            ...quote?.calculation_data?.breakdown,
            shipping:
              Number(data.international_shipping) ||
              quote?.calculation_data?.breakdown?.shipping ||
              0,
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
        items:
          data.items?.map((item) => ({
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

      console.log('✅ [SAVE] Update success:', success);

      if (success) {
        setLastSaveTime(new Date());
        toast({
          title: 'Quote updated',
          description: 'Quote has been successfully updated. You can continue editing.',
        });
        // Removed setIsEditMode(false) - keep user in edit mode for continued editing
        await loadQuoteData(); // Reload to get fresh data
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update quote.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ [SAVE] Error saving quote:', error);
      toast({
        title: 'Error',
        description: `Failed to save quote changes: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Save handler for view mode - saves current live quote state
  const handleViewModeSave = async () => {
    if (!liveQuote) {
      console.error('❌ [VIEW-SAVE] No live quote available');
      toast({
        title: 'Error',
        description: 'No quote data available to save.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCalculating(true);
      console.log('💾 [VIEW-SAVE] Saving view mode changes...', {
        quoteId: liveQuote.id,
        finalTotal: liveQuote.final_total_usd,
        status: liveQuote.status,
      });

      // Save the current live quote state to database
      const success = await unifiedDataEngine.updateQuote(quoteId!, {
        origin_country: liveQuote.origin_country,
        destination_country: liveQuote.destination_country,
        calculation_data: liveQuote.calculation_data,
        operational_data: liveQuote.operational_data,
        final_total_usd: liveQuote.final_total_usd,
        items: liveQuote.items,
      });

      console.log('✅ [VIEW-SAVE] Update success:', success);

      if (success) {
        setLastSaveTime(new Date());
        toast({
          title: 'Quote saved',
          description: 'All changes have been saved successfully.',
          duration: 3000,
        });
        await loadQuoteData(); // Reload to get fresh data
      } else {
        toast({
          title: 'Save failed',
          description: 'Failed to save quote changes. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ [VIEW-SAVE] Error saving quote:', error);
      toast({
        title: 'Save Error',
        description: `Failed to save quote: ${error.message}`,
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
    <div
      className={`max-w-7xl mx-auto p-6 space-y-6 rounded-lg ${
        isEditMode
          ? 'border border-teal-200 bg-teal-50/20 shadow-sm'
          : 'border border-blue-200 bg-blue-50/20 shadow-sm'
      }`}
    >
      {/* Smart Header with Key Metrics - Enterprise Layout */}
      <div className="space-y-4">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/admin/quotes')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote {quote.display_id}</h1>
              <div className="flex items-center space-x-4 mt-1">
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

          <div className="flex items-center justify-end">
            <ModeToggle
              isEditMode={isEditMode}
              onToggle={handleModeToggle}
              disabled={isCalculating}
              showBadge={true}
              size="default"
            />
          </div>
        </div>

        {/* Key Metrics Banner - Enterprise Standard */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            {/* Shipping Route - Professional Display with Inline Editing */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {/* Origin Country - Inline Editable */}
                {isEditingRoute ? (
                  <Select
                    onValueChange={(value) => {
                      form.setValue('origin_country', value);
                      // Trigger recalculation if needed
                      if (isEditMode) {
                        // The form watching will trigger recalculation automatically
                      }
                    }}
                    value={form.watch('origin_country') || quote.origin_country || ''}
                  >
                    <SelectTrigger className="h-8 min-w-[140px] text-sm font-medium">
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCountries?.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{country.flag}</span>
                            <span>{country.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm font-medium text-slate-700">
                    {(() => {
                      const originCountry = allCountries?.find(
                        (c) => c.code === quote.origin_country,
                      );
                      return originCountry?.name || quote.origin_country || 'Origin';
                    })()}
                  </div>
                )}
                
                <ArrowRight className="w-4 h-4 text-slate-400" />
                
                {/* Destination Country - Inline Editable */}
                {isEditingRoute ? (
                  <Select
                    onValueChange={(value) => {
                      form.setValue('destination_country', value);
                      // Trigger recalculation if needed
                      if (isEditMode) {
                        // The form watching will trigger recalculation automatically
                      }
                    }}
                    value={form.watch('destination_country') || quote.destination_country || ''}
                  >
                    <SelectTrigger className="h-8 min-w-[140px] text-sm font-medium">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCountries?.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{country.flag}</span>
                            <span>{country.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm font-medium text-slate-700">
                    {(() => {
                      const destinationCountry = allCountries?.find(
                        (c) => c.code === quote.destination_country,
                      );
                      return destinationCountry?.name || quote.destination_country || 'Destination';
                    })()}
                  </div>
                )}
                
                {/* Edit Route Button - Only show in edit mode */}
                {isEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={isEditingRoute ? handleRouteEditingDone : () => setIsEditingRoute(true)}
                    className="h-6 px-2 ml-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    {isEditingRoute ? 'Done' : 'Edit'}
                  </Button>
                )}
              </div>
            </div>

            {/* Key Metrics - At-a-Glance Data */}
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${(liveQuote?.final_total_usd || quote.final_total_usd).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 font-medium">Total Quote Value</div>
                {lastSaveTime && (
                  <div className="text-xs text-green-600 mt-1">
                    Saved {lastSaveTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">
                  {metrics?.totalWeight || 0} kg
                </div>
                <div className="text-xs text-gray-600 font-medium">Total Weight</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-700">{metrics?.totalItems || 0}</div>
                <div className="text-xs text-gray-600 font-medium">Items</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Suggestions Bar - Collapsible */}
      {smartSuggestions.length > 0 && (
        <Card className="shadow-sm border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  AI Suggestions ({smartSuggestions.length})
                </span>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Available
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSmartSuggestions(!showSmartSuggestions)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                {showSmartSuggestions ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            {showSmartSuggestions && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <SmartSuggestionCards
                  suggestions={smartSuggestions}
                  onApplySuggestion={handleApplySuggestion}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Professional E-commerce Admin Layout */}
      {isEditMode ? (
        /* Edit Mode: Professional single-page layout inspired by Shopify Admin */
        <div className="space-y-4">
          {/* Main Content Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Column - Primary Edit Form (2/3 width) */}
            <div className="md:col-span-2 space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                  {/* Products Section - World Class Design */}
                  <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              Products ({form.watch('items')?.length || 0})
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600">
                              Manage product details, pricing, and quantities
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addNewItem}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {form.watch('items')?.map((item, index) => {
                        const smartData = quote?.items[index]?.smart_data;
                        const weightConfidence = smartData?.weight_confidence || 0;
                        const category = smartData?.category_detected;
                        const optimizationHints = smartData?.optimization_hints || [];
                        const customsSuggestions = smartData?.customs_suggestions || [];

                        const getWeightConfidenceBadge = (confidence: number) => {
                          if (confidence >= 0.8)
                            return {
                              variant: 'default' as const,
                              text: 'High',
                              color: 'text-green-600',
                            };
                          if (confidence >= 0.6)
                            return {
                              variant: 'secondary' as const,
                              text: 'Medium',
                              color: 'text-yellow-600',
                            };
                          return {
                            variant: 'destructive' as const,
                            text: 'Low',
                            color: 'text-red-600',
                          };
                        };

                        return (
                          <div
                            key={item.id || index}
                            className={`border-b border-gray-200 ${index === 0 ? 'border-t' : ''} hover:bg-gray-50/50 transition-colors`}
                          >
                            <div className="p-4 space-y-3">
                              {/* Compact Product Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                                      Product {index + 1}
                                      {category && (
                                        <Badge
                                          variant="outline"
                                          className="ml-2 text-xs text-blue-600 border-blue-300 bg-blue-50"
                                        >
                                          {category}
                                        </Badge>
                                      )}
                                    </h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                      {weightConfidence > 0 && (
                                        <Badge
                                          {...getWeightConfidenceBadge(weightConfidence)}
                                          className="text-xs h-4"
                                        >
                                          AI: {getWeightConfidenceBadge(weightConfidence).text}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                      $
                                      {(Number(item.item_price) * Number(item.quantity)).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ${Number(item.item_price || 0).toFixed(2)} ×{' '}
                                      {item.quantity || 1}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    {form.watch('items')?.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveItemConfirm(index)}
                                        className="text-gray-400 hover:text-red-600 p-1 h-7 w-7"
                                        title="Remove product"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Compact Product Form - World Class 2-Row Layout */}
                              <div className="space-y-3">
                                {/* Row 1: Name & URL */}
                                <div className="grid grid-cols-12 gap-3">
                                  <div className="col-span-7">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                      Name *
                                      <span className="ml-1 w-1 h-1 bg-red-500 rounded-full"></span>
                                    </label>
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                      value={item.product_name || ''}
                                      onChange={(e) => {
                                        console.log('Product name changed:', {
                                          index,
                                          value: e.target.value,
                                        });
                                        const items = form.getValues('items') || [];
                                        items[index] = {
                                          ...items[index],
                                          product_name: e.target.value,
                                        };
                                        form.setValue('items', items);

                                        // Clear existing timeout for this item
                                        const timeoutKey = index.toString();
                                        if (estimationTimeouts[timeoutKey]) {
                                          console.log(
                                            '🕐 Clearing existing timeout for:',
                                            timeoutKey,
                                          );
                                          clearTimeout(estimationTimeouts[timeoutKey]);
                                        }

                                        // Trigger weight estimation after a delay
                                        console.log('⏲️ Setting timeout for weight estimation...');
                                        const timeoutId = setTimeout(() => {
                                          console.log(
                                            'Timeout triggered, calling estimateItemWeight',
                                          );
                                          estimateItemWeight(
                                            index,
                                            e.target.value,
                                            items[index].product_url,
                                          );
                                        }, 800);

                                        setEstimationTimeouts((prev) => ({
                                          ...prev,
                                          [timeoutKey]: timeoutId,
                                        }));
                                      }}
                                      placeholder="iPhone 16 Pro Max"
                                    />
                                  </div>
                                  <div className="col-span-5">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      URL
                                    </label>
                                    <input
                                      type="url"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                      value={item.product_url || ''}
                                      onChange={(e) => {
                                        const items = form.getValues('items') || [];
                                        items[index] = {
                                          ...items[index],
                                          product_url: e.target.value,
                                        };
                                        form.setValue('items', items);
                                      }}
                                      placeholder="amazon.com/..."
                                    />
                                  </div>
                                </div>

                                {/* Row 2: Pricing & Specifications - Compact Grid */}
                                <div className="grid grid-cols-10 gap-3">
                                  <div className="col-span-4">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                      Price *
                                      <span className="ml-1 w-1 h-1 bg-red-500 rounded-full"></span>
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                                        $
                                      </span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                                        value={item.item_price || ''}
                                        onChange={(e) => {
                                          const items = form.getValues('items') || [];
                                          items[index] = {
                                            ...items[index],
                                            item_price: parseFloat(e.target.value) || 0,
                                          };
                                          form.setValue('items', items);
                                        }}
                                        placeholder="1,000.00"
                                      />
                                    </div>
                                  </div>

                                  <div className="col-span-4">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                      Weight
                                      {isEstimating[index.toString()] && (
                                        <div className="ml-2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                                          weightEstimations[index.toString()]
                                            ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 pr-14'
                                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                        value={item.item_weight || ''}
                                        onChange={(e) => {
                                          const items = form.getValues('items') || [];
                                          items[index] = {
                                            ...items[index],
                                            item_weight: parseFloat(e.target.value) || 0,
                                          };
                                          form.setValue('items', items);
                                        }}
                                        placeholder="0.2"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                        kg
                                      </span>

                                      {/* AI Suggestion Button */}
                                      {weightEstimations[index.toString()] && (
                                        <button
                                          type="button"
                                          className="absolute right-8 top-1/2 -translate-y-1/2 px-1 py-0.5 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200 focus:outline-none"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            applyWeightSuggestion(
                                              index,
                                              weightEstimations[index.toString()].estimated_weight,
                                            );
                                          }}
                                          title={`Apply AI suggestion: ${weightEstimations[index.toString()].estimated_weight} kg`}
                                        >
                                          Apply [
                                          {weightEstimations[index.toString()].estimated_weight}]
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center">
                                      Qty *
                                      <span className="ml-1 w-1 h-1 bg-red-500 rounded-full"></span>
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                      value={item.quantity || 1}
                                      onChange={(e) => {
                                        const items = form.getValues('items') || [];
                                        items[index] = {
                                          ...items[index],
                                          quantity: parseInt(e.target.value) || 1,
                                        };
                                        form.setValue('items', items);
                                      }}
                                      placeholder="1"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Customer Notes - Professional Inline Style */}
                              {item.options && item.options.trim() && (
                                <div className="mt-2 px-3 py-2 bg-gray-50 border-l-4 border-gray-300 rounded-r-md">
                                  <div className="flex items-start space-x-2">
                                    <MessageCircle className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium text-gray-700">
                                        Customer Note:
                                      </span>
                                      <span className="ml-1">{item.options}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* AI Insights */}
                              {(optimizationHints.length > 0 || customsSuggestions.length > 0) && (
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                  <div className="flex items-center text-sm font-medium text-gray-800 mb-3">
                                    <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                                    AI Insights
                                  </div>

                                  {optimizationHints.length > 0 && (
                                    <div className="mb-3">
                                      <span className="text-sm font-medium text-gray-700">
                                        Optimization Tips:
                                      </span>
                                      <ul className="mt-1 space-y-1 text-sm text-gray-600">
                                        {optimizationHints.map((hint, hintIndex) => (
                                          <li key={hintIndex} className="flex items-start">
                                            <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                            {hint}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {customsSuggestions.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">
                                        Customs Suggestions:
                                      </span>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {customsSuggestions.map((suggestion, suggestionIndex) => (
                                          <span
                                            key={suggestionIndex}
                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                          >
                                            {suggestion}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Quote Detail Form - Direct Integration */}
                  <QuoteDetailForm
                    form={form}
                    detectedCustomsPercentage={customsTierInfo?.customs_percentage}
                    detectedCustomsTier={
                      customsTierInfo?.applied_tier
                        ? {
                            name: customsTierInfo.applied_tier.rule_name,
                            customs_percentage: customsTierInfo.customs_percentage,
                            description: customsTierInfo.fallback_used
                              ? 'Fallback tier applied'
                              : 'Smart tier applied',
                          }
                        : undefined
                    }
                    onCalculateSmartCustoms={calculateSmartCustoms}
                    isCalculatingCustoms={isCalculatingCustoms}
                    shippingOptions={shippingOptions}
                    recommendations={shippingRecommendations}
                    onSelectShippingOption={handleShippingOptionSelect}
                    onShowShippingDetails={() => setShowShippingDetails(true)}
                    isEditingRoute={isEditingRoute}
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleModeToggle(false)}
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
                        console.log('💾 [EDIT-SAVE] Save button clicked');
                        console.log('💾 [EDIT-SAVE] Current form values:', form.getValues());

                        // Trigger validation
                        const isValid = await form.trigger();
                        console.log('💾 [EDIT-SAVE] Form is valid:', isValid);

                        if (isValid) {
                          // Direct function call instead of form.handleSubmit()
                          await onFormSubmit(form.getValues());
                        } else {
                          console.log('❌ [EDIT-SAVE] Form errors:', form.formState.errors);
                          toast({
                            title: 'Form Validation Failed',
                            description: 'Please check your inputs and try again.',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={isCalculating}
                      title="Save changes and continue editing"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {isCalculating ? 'Saving...' : 'Save Progress'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Right Sidebar - Edit Mode Components (1/3 width) */}
            <div className="space-y-3">
              {/* Customer Information */}
              <CompactCustomerInfo
                quote={liveQuote || quote}
                onUpdateQuote={loadQuoteData}
                compact={true}
                editMode={isEditMode}
              />

              {/* Status Management - Outside form to prevent submission conflicts */}
              <CompactStatusManager
                quote={liveQuote || quote}
                onStatusUpdate={loadQuoteData}
                compact={true}
              />

              {/* Shipping Options */}
              {shippingOptions.length > 0 && (
                <CompactShippingOptions
                  quote={liveQuote || quote}
                  shippingOptions={shippingOptions}
                  recommendations={shippingRecommendations}
                  onSelectOption={handleShippingOptionSelect}
                  showAllOptions={false}
                  onToggleShowAll={setShowAllShippingOptions}
                  compact={true}
                  editMode={isEditMode}
                  onSaveShippingOption={handleShippingOptionSelect}
                  isSaving={isCalculating}
                />
              )}

              {/* Payment Management */}
              {[
                'sent',
                'approved',
                'paid',
                'payment_pending',
                'ordered',
                'shipped',
                'completed',
              ].includes(quote.status) && (
                <CompactPaymentManager
                  quote={liveQuote || quote}
                  onPaymentUpdate={loadQuoteData}
                  compact={true}
                />
              )}

              {/* Live Cost Breakdown */}
              <CompactCalculationBreakdown
                quote={liveQuote || quote}
                shippingOptions={shippingOptions}
                isCalculating={isCalculating}
              />

              {/* AI Insights - Compact Version */}
              <Card className="shadow-sm border-blue-200 bg-blue-50/20">
                <CardContent className="p-3">
                  <div className="flex items-center text-sm font-medium text-blue-800 mb-3">
                    <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                    AI Insights
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {metrics?.avgWeightConfidence}%
                      </div>
                      <div className="text-gray-500">Weight AI</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 flex items-center justify-center">
                        {metrics?.customsPercentage}%
                        {(liveQuote || quote)?.operational_data?.customs?.smart_tier && (
                          <Badge variant="outline" className="ml-1 text-xs h-4 px-1">
                            AI
                          </Badge>
                        )}
                      </div>
                      <div className="text-gray-500">Customs</div>
                    </div>
                  </div>

                  {/* Smart Recommendations Compact */}
                  {(liveQuote || quote)?.operational_data?.customs?.smart_tier && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        <span>
                          Smart tier:{' '}
                          {(liveQuote || quote)?.operational_data?.customs?.smart_tier?.tier_name ||
                            'Default'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode: Professional e-commerce admin layout */
        <div className="space-y-4">
          {/* Main Content Area - Professional 2-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Column - Primary Information (2/3 width) */}
            <div className="md:col-span-2 space-y-4">
              {/* Quote Items - Professional Table Style */}
              <Card>
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          Order Items
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {metrics?.totalItems} items • {metrics?.totalWeight} kg total weight
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-hidden">
                    {(liveQuote || quote).items?.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-25"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-gray-900 text-sm hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                title="View product page"
                              >
                                {item.name || `Product ${index + 1}`}
                              </a>
                            ) : (
                              <h4 className="font-medium text-gray-900 text-sm">
                                {item.name || `Product ${index + 1}`}
                              </h4>
                            )}
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span>Qty: {item.quantity}</span>
                              <span>•</span>
                              <span>Weight: {item.weight_kg} kg each</span>
                              <span>•</span>
                              <span>Unit Price: ${Number(item.price_usd || 0).toFixed(2)}</span>
                            </div>
                            {/* Customer Notes - Professional Inline Style */}
                            {item.options && item.options.trim() && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-700">Customer Note:</span>{' '}
                                  {item.options}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ${(Number(item.price_usd || 0) * item.quantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown - Clean Professional Style */}
              <CompactCalculationBreakdown
                quote={liveQuote || quote}
                shippingOptions={shippingOptions}
                isCalculating={isCalculating}
              />
            </div>

            {/* Right Sidebar - Optimized Priority Order (1/3 width) */}
            <div className="space-y-3">
              {/* 1. Customer Information - First Priority (customer context) */}
              <CompactCustomerInfo
                quote={liveQuote || quote}
                onUpdateQuote={loadQuoteData}
                compact={true}
                editMode={isEditMode}
              />

              {/* 2. Quote Summary - Second Priority (order overview) */}
              <Card className="shadow-sm border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-blue-800 mb-4">Quote Summary</div>

                  {/* Primary Metrics - Most Important */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Value</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${(liveQuote?.final_total_usd || quote.final_total_usd).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Route</span>
                      <span className="text-sm font-medium text-gray-800">
                        {(() => {
                          const originCountry = allCountries?.find(
                            (c) => c.code === quote.origin_country,
                          );
                          const destinationCountry = allCountries?.find(
                            (c) => c.code === quote.destination_country,
                          );
                          return `${originCountry?.name || quote.origin_country} → ${destinationCountry?.name || quote.destination_country}`;
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Weight</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {metrics?.totalWeight || 0} kg
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metrics Grid */}
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items</span>
                        <span className="font-medium">{metrics?.totalItems || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium capitalize">{quote.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Optimized</span>
                        <span className="font-medium">{optimizationScore.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">AI Confidence</span>
                        <span className="font-medium">{metrics?.avgWeightConfidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Status Management - Third Priority (actionable) */}
              <CompactStatusManager
                quote={liveQuote || quote}
                onStatusUpdate={loadQuoteData}
                compact={true}
              />

              {/* 4. iwishBag Tracking Management - Fourth Priority (tracking) */}
              <CompactShippingManager
                quote={liveQuote || quote}
                onUpdateQuote={loadQuoteData}
                compact={true}
              />

              {/* 5. Shipping Options - Fifth Priority (operational) */}
              {shippingOptions.length > 0 && (
                <CompactShippingOptions
                  quote={liveQuote || quote}
                  shippingOptions={shippingOptions}
                  recommendations={shippingRecommendations}
                  onSelectOption={handleShippingOptionSelect}
                  showAllOptions={false}
                  onToggleShowAll={setShowAllShippingOptions}
                  compact={true}
                  editMode={isEditMode}
                  onSaveShippingOption={handleShippingOptionSelect}
                  isSaving={isCalculating}
                />
              )}

              {/* 6. Payment Management - Sixth Priority (conditional) */}
              {[
                'sent',
                'approved',
                'paid',
                'payment_pending',
                'ordered',
                'shipped',
                'completed',
              ].includes(quote.status) && (
                <CompactPaymentManager
                  quote={liveQuote || quote}
                  onPaymentUpdate={loadQuoteData}
                  compact={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">{productToDelete?.name}</span> from this quote?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default UnifiedQuoteInterface;
