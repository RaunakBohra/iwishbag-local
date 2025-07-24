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
  Settings,
  Tag,
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
import { calculationDefaultsService } from '@/services/CalculationDefaultsService';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { hsnWeightService, type HSNWeightData } from '@/services/HSNWeightService';
import { DualWeightSuggestions } from '@/components/admin/smart-weight-field/DualWeightSuggestions';
import { normalizeShippingOptionId } from '@/utils/shippingOptionUtils';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';

// Performance optimization hooks
import { useBatchedFormUpdates } from '@/hooks/useBatchedFormUpdates';
import { useLayoutShiftPrevention } from '@/hooks/useLayoutShiftPrevention';
import { useDebouncedCalculations } from '@/hooks/useDebouncedCalculations';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';
import { useStatusTransitions } from '@/hooks/useStatusTransitions';
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
import { ShippingConfigurationPrompt } from './smart-components/ShippingConfigurationPrompt';
import { CompactPaymentManager } from './smart-components/CompactPaymentManager';
import { CompactShippingManager } from './smart-components/CompactShippingManager';
import { CompactCalculationBreakdown } from './smart-components/CompactCalculationBreakdown';
import { CompactHSNTaxBreakdown } from './smart-components/CompactHSNTaxBreakdown';
import { TaxCalculationSidebar } from './smart-components/TaxCalculationSidebar';
import { TaxMethodSelectionPanel } from './tax-method-selection/TaxMethodSelectionPanel';
import { PerItemValuationSelector } from './tax-method-selection/PerItemValuationSelector';
import { TaxHubContainer } from './tax-hub/TaxHubContainer';
import { ShippingRouteHeader } from './smart-components/ShippingRouteHeader';
import { ShareQuoteButtonV2 } from './ShareQuoteButtonV2';
import { SmartHSNSearch } from './hsn-components/SmartHSNSearch';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { QuoteDetailForm } from './QuoteDetailForm';
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

  // Get standardized currency display
  const currencyDisplay = useAdminQuoteCurrency(quote);
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
  const [productToDelete, setProductToDelete] = useState<{ index: number; name: string } | null>(
    null,
  );

  // HSN interface state
  const [editingHSNItemId, setEditingHSNItemId] = useState<string | null>(null);
  const [hsnFormData, setHsnFormData] = useState<{[key: string]: { hsn_code: string; category: string }}>({});
  const [selectedHSNData, setSelectedHSNData] = useState<{[key: string]: any}>({});

  // Tax method selection state
  const [showTaxMethodPanel, setShowTaxMethodPanel] = useState(false);
  const [showValuationSelector, setShowValuationSelector] = useState(false);
  const [currentTaxMethod, setCurrentTaxMethod] = useState<string>('auto');
  const [itemValuationMethods, setItemValuationMethods] = useState<Record<string, string>>({});

  // Form state for editing
  const form = useForm<AdminQuoteFormValues>({
    resolver: zodResolver(adminQuoteFormSchema),
    defaultValues: {
      id: '',
      customs_percentage: 0,
      sales_tax_price: 0,
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

  // Performance optimization hooks
  const { batchUpdate, batchMultipleUpdates, flushUpdates } = useBatchedFormUpdates(form, {
    debounceMs: 500,
    onBatchComplete: () => {
      console.log('[PERF] Batch form update completed');
    },
  });

  const { containerRef, batchDOMUpdate, setStableMinHeight } = useLayoutShiftPrevention({
    reserveSpace: true,
    minHeight: 600,
    transitionDuration: 200,
    debounceMs: 150,
  });

  const { scheduleCalculation, isCalculating: isDebouncedCalculating } = useDebouncedCalculations({
    debounceMs: 800,
    maxPendingCalculations: 3,
    enableLogging: true,
  });

  // Status transitions for auto-progression
  const { handleQuoteSent } = useStatusTransitions();

  // Load quote data
  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false);
      return;
    }

    loadQuoteData();
  }, [quoteId]);

  // Ensure form is populated when quote becomes available (fixes refresh issue)
  useEffect(() => {
    // Form population monitoring

    if (quote && isEditMode && !isLoading) {
      // Ensuring form population
      
      // Check if form is actually populated
      const formItems = form.watch('items');
      const hasFormItems = formItems && formItems.length > 0;
      const hasQuoteItems = quote.items && quote.items.length > 0;
      
      // Repopulate form if it's empty but quote has items (typical refresh issue)
      if (!hasFormItems && hasQuoteItems) {
        // Form empty - repopulating
        populateFormFromQuote(quote);
      } else if (hasFormItems && hasQuoteItems && formItems.length !== quote.items.length) {
        // Item count mismatch - repopulating
        populateFormFromQuote(quote);
      } else {
        // Form properly populated
      }
    }
  }, [quote, isEditMode, isLoading, form]);

  // Force form population on initial load in edit mode (additional safety)
  useEffect(() => {
    // Only run once when component is fully loaded and in edit mode
    const timeoutId = setTimeout(() => {
      if (quote && isEditMode && !isLoading) {
        const formItems = form.watch('items');
        if (!formItems || formItems.length === 0) {
          // Timeout check - force populating
          populateFormFromQuote(quote);
        }
      }
    }, 1000); // Give 1 second for everything to settle

    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array - only run once on mount

  const loadQuoteData = async (forceRefresh = false, skipNavigationOnError = false) => {
    const maxRetries = 3;
    let attempt = 0;
    let quoteData = null;
    
    while (attempt < maxRetries) {
      try {
        setIsLoading(true);
        console.log(`🔄 [LoadQuoteData] Attempt ${attempt + 1}/${maxRetries} for quote ${quoteId}`, { forceRefresh, skipNavigationOnError });
        
        // Add small delay for retry attempts and force refresh
        if (forceRefresh || attempt > 0) {
          const delay = attempt > 0 ? 200 * attempt : 100; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        
        quoteData = await unifiedDataEngine.getQuote(quoteId!, forceRefresh);
        
        if (!quoteData) {
          console.warn(`⚠️ [LoadQuoteData] Quote not found on attempt ${attempt + 1}, quote ID: ${quoteId}`);
          
          // If this is not the last attempt, continue retrying
          if (attempt < maxRetries - 1) {
            attempt++;
            continue;
          }
          
          // Last attempt failed - only navigate if not skipped (e.g., not during tax method changes)
          if (!skipNavigationOnError) {
            console.error(`❌ [LoadQuoteData] Quote not found after ${maxRetries} attempts, navigating away`);
            toast({
              title: 'Quote not found',
              description: 'The requested quote could not be found after multiple attempts.',
              variant: 'destructive',
            });
            navigate('/admin/quotes');
            return;
          } else {
            console.warn(`⚠️ [LoadQuoteData] Quote not found but navigation skipped (tax method change context)`);
            toast({
              title: 'Temporary Error',
              description: 'Quote data temporarily unavailable. Please try again.',
              variant: 'destructive',
            });
            return;
          }
        }
        
        // Success! Break out of retry loop
        console.log(`✅ [LoadQuoteData] Successfully loaded quote on attempt ${attempt + 1}`);
        break;
        
      } catch (error) {
        console.error(`❌ [LoadQuoteData] Error on attempt ${attempt + 1}:`, error);
        
        // If this is not the last attempt, continue retrying
        if (attempt < maxRetries - 1) {
          attempt++;
          continue;
        }
        
        // Last attempt failed with error
        toast({
          title: 'Loading Error',
          description: 'Failed to load quote data. Please refresh the page.',
          variant: 'destructive',
        });
        
        if (!skipNavigationOnError) {
          navigate('/admin/quotes');
        }
        return;
      } finally {
        setIsLoading(false);
      }
    }

      console.log('[DEBUG] loadQuoteData: Updating quote state with new data', {
        oldStatus: quote?.status,
        newStatus: quoteData.status,
        quoteId: quoteData.id,
      });
      setQuote(quoteData);

      // Initialize HSN state for existing items
      if (quoteData.items) {
        const initialHsnFormData: {[key: string]: { hsn_code: string; category: string }} = {};
        const initialSelectedData: {[key: string]: any} = {};
        
        quoteData.items.forEach(item => {
          if (item.hsn_code || item.category) {
            initialHsnFormData[item.id] = {
              hsn_code: item.hsn_code || '',
              category: item.category || ''
            };
            
            if (item.hsn_code && item.category) {
              initialSelectedData[item.id] = {
                hsn_code: item.hsn_code,
                category: item.category,
                description: `${item.category} item`,
                minimum_valuation_usd: undefined // Will be loaded from database if needed
              };
            }
          }
        });
        
        setHsnFormData(initialHsnFormData);
        setSelectedHSNData(initialSelectedData);
      }

      // Initialize tax method selection state from quote operational data
      setCurrentTaxMethod(quoteData.calculation_method_preference || 'auto');
      
      // Initialize per-item valuation methods from operational data
      if (quoteData.operational_data?.item_valuation_preferences) {
        setItemValuationMethods(quoteData.operational_data.item_valuation_preferences);
      }

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
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          ...quote.calculation_data?.breakdown,
          shipping: selectedOption.cost_usd, // ✅ Update breakdown shipping cost to match selected option
        },
      },
    };

    console.log('🔍 [DEBUG] Shipping Option Selected - Optimistic Update:', {
      quoteId: quote.id,
      selectedOption: {
        id: selectedOption.id,
        name: selectedOption.name,
        carrier: selectedOption.carrier,
        cost_usd: selectedOption.cost_usd,
      },
      breakdownUpdate: {
        oldShipping: quote.calculation_data?.breakdown?.shipping,
        newShipping: selectedOption.cost_usd,
        shippingChange:
          selectedOption.cost_usd - (quote.calculation_data?.breakdown?.shipping || 0),
      },
      operationalDataUpdate: {
        originalSelectedOption: quote.operational_data?.shipping?.selected_option,
        newSelectedOption: optimisticQuote.operational_data.shipping.selected_option,
      },
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
        calculation_data: optimisticQuote.calculation_data, // ✅ Also update calculation breakdown
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

        // Trigger recalculation to update handling charges and other dependent values
        console.log('🔄 [DEBUG] Triggering recalculation after shipping option change...');
        try {
          const calculationResult = smartCalculationEngine.calculateLiveSync({
            quote: optimisticQuote,
            preferences: {
              speed_priority: 'medium',
              cost_priority: 'medium',
              show_all_options: false,
            },
          });

          if (calculationResult.success) {
            console.log('✅ [DEBUG] Recalculation successful:', {
              handlingCharge:
                calculationResult.updated_quote.calculation_data.breakdown.handling_charge,
              finalTotal: calculationResult.updated_quote.final_total_usd,
            });

            // Update both quote state and live quote with recalculated values
            setQuote(calculationResult.updated_quote);
            if (isEditMode) {
              setLiveQuote(calculationResult.updated_quote);
            }

            // Update form with recalculated values
            form.setValue(
              'handling_charge',
              calculationResult.updated_quote.calculation_data.breakdown.handling_charge || 0,
            );
            form.setValue('final_total_usd', calculationResult.updated_quote.final_total_usd || 0);
          } else {
            console.warn('⚠️ [DEBUG] Recalculation failed:', calculationResult.error);
          }
        } catch (recalcError) {
          console.error('❌ [DEBUG] Recalculation error:', recalcError);
        }
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

  // Enhanced mode toggle handler with notifications - SCROLL PREVENTION REMOVED
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

    // Reset form when switching modes to ensure proper synchronization
    if (quote) {
      if (!newEditMode) {
        // Switching to view mode - populate form with latest data
        console.log('🔄 Switching to view mode - repopulating form');
        populateFormFromQuote(liveQuote || quote);
      } else {
        // Switching to edit mode - ensure form is populated for editing
        console.log('✏️ Switching to edit mode - ensuring form is populated');
        populateFormFromQuote(liveQuote || quote);
      }
    }
  };


  // Watch form values for live updates
  const formValues = useWatch({ control: form.control });

  // Track when form changes occur to prevent infinite sync loops
  useEffect(() => {
    window.lastFormChangeTime = Date.now();
  }, [formValues]);

  // Dynamic shipping calculation function with scroll protection
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

        try {
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

            // Auto-select optimal option if none selected - using batched updates
            if (!formValues.selected_shipping_option && result.shipping_options.length > 0) {
              const optimalOption = result.shipping_options[0]; // First option is usually optimal
              batchMultipleUpdates([
                { field: 'selected_shipping_option', value: optimalOption.id },
                { field: 'international_shipping', value: optimalOption.cost_usd },
              ]);
            } else if (formValues.selected_shipping_option && result.shipping_options.length > 0) {
              // ✅ SIMPLE FIX: Update international shipping cost for existing selection when route changes
              const currentlySelected = result.shipping_options.find(
                (opt) => opt.id === formValues.selected_shipping_option,
              );
              if (currentlySelected) {
                console.log(
                  '🔄 [DEBUG] Updating international shipping cost for existing selection:',
                  {
                    optionId: currentlySelected.id,
                    oldCost: formValues.international_shipping,
                    newCost: currentlySelected.cost_usd,
                  },
                );
                form.setValue('international_shipping', currentlySelected.cost_usd);
              }
            }
          } else {
            console.warn('❌ Shipping calculation failed:', result.error);
            // Clear shipping options when calculation fails
            setShippingOptions([]);
            setShippingRecommendations([]);
          }
        } catch (calculationError) {
          console.error('❌ Error during shipping calculation engine call:', calculationError);
          // Clear shipping options when engine fails
          setShippingOptions([]);
          setShippingRecommendations([]);
        }
      } else {
        console.log('⏭️ Skipping shipping recalculation - missing required data:', {
          hasItems: (formValues.items || []).length > 0,
          itemsTotal,
          totalWeight,
          hasOrigin: !!formValues.origin_country,
          hasDestination: !!formValues.destination_country,
        });
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
    batchMultipleUpdates,
  ]);

  // Optimized calculation scheduling - prevents layout shifts
  useEffect(() => {
    if (isEditMode && quote) {
      const formValues = form.getValues();
      const dependencies = [
        formValues.items,
        formValues.origin_country,
        formValues.destination_country,
        formValues.selected_shipping_option,
      ];

      scheduleCalculation('shipping-recalculation', () => recalculateShipping(), dependencies);
    }
  }, [isEditMode, scheduleCalculation, recalculateShipping, quote]);
  const [liveQuote, setLiveQuote] = useState<UnifiedQuote | null>(null);

  // Smart weight estimation state
  const [weightEstimations, setWeightEstimations] = useState<{ [key: string]: any }>({});
  const [hsnWeights, setHsnWeights] = useState<{ [key: string]: HSNWeightData | null }>({});
  const [isEstimating, setIsEstimating] = useState<{ [key: string]: boolean }>({});
  const [isLoadingHSN, setIsLoadingHSN] = useState<{ [key: string]: boolean }>({});
  const [estimationTimeouts, setEstimationTimeouts] = useState<{ [key: string]: NodeJS.Timeout }>(
    {},
  );

  // Smart customs calculation state
  const [customsTierInfo, setCustomsTierInfo] = useState<any>(null);
  const [isCalculatingCustoms, setIsCalculatingCustoms] = useState(false);

  // Optimized weight estimation using debounced calculations
  const estimateItemWeight = useCallback(
    (itemIndex: number, productName: string, productUrl?: string) => {
      console.log('🔍 estimateItemWeight called:', { itemIndex, productName, productUrl });

      if (!productName.trim()) {
        console.log('❌ Empty product name, clearing estimation');
        batchDOMUpdate(() => {
          setWeightEstimations((prev) => ({ ...prev, [itemIndex]: null }));
        });
        return;
      }

      const estimationKey = `weight-${itemIndex}`;

      scheduleCalculation(estimationKey, async () => {
        setIsEstimating((prev) => ({ ...prev, [itemIndex]: true }));
        try {
          const estimation = await smartWeightEstimator.estimateWeight(productName, productUrl);
          console.log('✅ Weight estimation result:', estimation);

          batchDOMUpdate(() => {
            setWeightEstimations((prev) => ({ ...prev, [itemIndex]: estimation }));
            setIsEstimating((prev) => ({ ...prev, [itemIndex]: false }));
          });
        } catch (error) {
          console.error('❌ Weight estimation error:', error);
          batchDOMUpdate(() => {
            setWeightEstimations((prev) => ({ ...prev, [itemIndex]: null }));
            setIsEstimating((prev) => ({ ...prev, [itemIndex]: false }));
          });
        }
      }, [productName, productUrl, itemIndex]);
    },
    [scheduleCalculation, batchDOMUpdate],
  );

  // Fetch HSN weight for an item
  const fetchHSNWeight = useCallback(
    async (itemIndex: number, hsnCode: string | undefined) => {
      if (!hsnCode) {
        setHsnWeights((prev) => ({ ...prev, [itemIndex]: null }));
        return;
      }

      setIsLoadingHSN((prev) => ({ ...prev, [itemIndex]: true }));
      try {
        const weight = await hsnWeightService.getHSNWeight(hsnCode);
        setHsnWeights((prev) => ({ ...prev, [itemIndex]: weight }));
        console.log(`📊 [Weight] HSN weight found for ${hsnCode}:`, weight);
      } catch (error) {
        console.error('Error fetching HSN weight:', error);
        setHsnWeights((prev) => ({ ...prev, [itemIndex]: null }));
      } finally {
        setIsLoadingHSN((prev) => ({ ...prev, [itemIndex]: false }));
      }
    },
    [],
  );

  // Handle weight selection from dual suggestions
  const handleWeightSelection = useCallback(
    async (itemIndex: number, weight: number, source: 'hsn' | 'ml') => {
      const items = form.getValues('items') || [];
      items[itemIndex] = {
        ...items[itemIndex],
        item_weight: weight,
      };
      form.setValue('items', items);

      // Record the selection for analytics
      const item = items[itemIndex];
      if (item.product_name) {
        await smartWeightEstimator.recordWeightSelection(
          item.product_name,
          hsnWeights[itemIndex]?.average || null,
          weightEstimations[itemIndex]?.estimated_weight || 0,
          weight,
          source,
          item.product_url,
          item.options, // category field is actually in options for this quote structure
          item.hsn_code // Use the item's specific HSN code
        );
      }

      toast({
        title: "Weight Applied",
        description: `Using ${source === 'hsn' ? 'HSN database' : 'AI estimated'} weight: ${weight} kg`,
        duration: 2000,
      });
    },
    [form, hsnWeights, weightEstimations, quote?.hsn_code, toast],
  );

  // Handle HSN assignment for items
  const handleHSNAssignment = useCallback(async (itemIndex: number, hsnData: any) => {
    try {
      const items = form.getValues('items') || [];
      if (items[itemIndex]) {
        // 1. Update form state immediately (for UI responsiveness)
        items[itemIndex] = {
          ...items[itemIndex],
          hsn_code: hsnData.hsn_code,
          category: hsnData.category || hsnData.display_name,
        };
        
        form.setValue('items', items);

        // 2. Persist to database immediately for sidebar synchronization
        if (quote?.id && items[itemIndex].id) {
          // Persisting HSN assignment to database

          const success = await unifiedDataEngine.updateItem(quote.id, items[itemIndex].id, {
            hsn_code: hsnData.hsn_code,
            category: hsnData.category || hsnData.display_name,
          });

          if (success) {
            // HSN database update successful
            
            // 3. Trigger quote data refresh to update sidebar components
            // This will cause the quote prop to be refreshed, syncing sidebar components
            await loadQuoteData();
            
            // Quote data refreshed for sidebar sync
          } else {
            console.error(`❌ [HSN] Database update failed for item ${items[itemIndex].id}`);
            throw new Error('Database update failed');
          }
        }

        // 4. Trigger quote calculation update after HSN assignment
        if (quote?.id) {
          scheduleCalculation(() => {
            // HSN assignment triggered recalculation
          });
        }

        toast({
          title: "HSN Code Assigned",
          description: `${hsnData.hsn_code} - ${hsnData.display_name}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to assign HSN code:', error);
      
      // Enhanced error logging for debugging
      console.error('🔍 [HSN Debug] Assignment failure details:', {
        itemIndex,
        hsnData: {
          hsn_code: hsnData?.hsn_code,
          category: hsnData?.category,
          display_name: hsnData?.display_name,
        },
        quoteId: quote?.id,
        itemId: items[itemIndex]?.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign HSN code. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [form, quote?.id, scheduleCalculation, toast, loadQuoteData]);

  // Optimized function to add new item with batched updates
  const addNewItem = useCallback(() => {
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
      hsn_code: '', // Include HSN code
    };

    batchDOMUpdate(() => {
      batchUpdate('items', [...currentItems, newItem]);

      toast({
        title: 'Item Added',
        description: 'New item has been added to the quote.',
        duration: 2000,
      });
    });
  }, [form, batchUpdate, batchDOMUpdate]);

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

  // Handle route editing done - save changes with optimistic updates and scroll protection
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

      if (!routeChanged) {
        // No changes, just exit editing mode
        setIsEditingRoute(false);
        return;
      }

      console.log('🗺️ [ROUTE-SAVE] Saving route changes:', {
        from: `${quote.origin_country} → ${quote.destination_country}`,
        to: `${formData.origin_country} → ${formData.destination_country}`,
      });

      // OPTIMISTIC UPDATE: Exit editing mode immediately for instant UI feedback
      setIsEditingRoute(false);

      // OPTIMISTIC UPDATE: Immediately update the quote state with new routes
      const updatedQuote = {
        ...quote,
        origin_country: formData.origin_country,
        destination_country: formData.destination_country,
      };
      setQuote(updatedQuote);

      // Show immediate success toast
      toast({
        title: 'Route Updated',
        description: `Route changed to ${formData.origin_country} → ${formData.destination_country}`,
      });

      try {
        // Save to database in background
        const success = await unifiedDataEngine.updateQuote(quote.id, {
          origin_country: formData.origin_country,
          destination_country: formData.destination_country,
        });

        if (success) {
          console.log('✅ [ROUTE-SAVE] Database update successful');

          // Intelligent delayed refresh to sync with database without overwriting optimistic updates
          setTimeout(async () => {
            try {
              // Fetch fresh data from database with force refresh
              const freshQuoteData = await unifiedDataEngine.getQuote(quote.id, true);

              if (freshQuoteData) {
                // Check if database has the updated route values that match our optimistic update
                const databaseMatchesOptimistic =
                  freshQuoteData.origin_country === formData.origin_country &&
                  freshQuoteData.destination_country === formData.destination_country;

                if (databaseMatchesOptimistic) {
                  console.log('✅ [ROUTE-SYNC] Database has updated route values, syncing UI');
                  // Database is in sync, safe to update UI with fresh data
                  setQuote(freshQuoteData);
                  populateFormFromQuote(freshQuoteData);
                  // Trigger shipping recalculation after route change
                  recalculateShipping();
                } else {
                  console.log('⏳ [ROUTE-SYNC] Database not yet updated, keeping optimistic state');
                  // Database hasn't updated yet, keep optimistic state and try again
                  setTimeout(async () => {
                    try {
                      const retryQuoteData = await unifiedDataEngine.getQuote(quote.id, true);
                      if (retryQuoteData) {
                        console.log('🔄 [ROUTE-SYNC] Retry - checking database again...');
                        const retryMatches =
                          retryQuoteData.origin_country === formData.origin_country &&
                          retryQuoteData.destination_country === formData.destination_country;

                        if (retryMatches) {
                          console.log('✅ [ROUTE-SYNC] Retry successful, syncing UI');
                          setQuote(retryQuoteData);
                          populateFormFromQuote(retryQuoteData);
                          recalculateShipping();
                        } else {
                          console.log(
                            '⚠️ [ROUTE-SYNC] Database still not updated after retry, keeping optimistic state',
                          );
                          // Keep the optimistic state - it will be corrected on next user action or refresh
                        }
                      }
                    } catch (retryError) {
                      console.error('❌ [ROUTE-SYNC] Retry fetch failed:', retryError);
                      // Keep optimistic state on error
                    }
                  }, 1000); // Retry after 1 second
                }
              }
            } catch (error) {
              console.error('❌ [ROUTE-SYNC] Error fetching fresh data:', error);
              // Keep optimistic state on error - don't break user experience
            }
          }, 500);
        } else {
          // Revert optimistic update on failure
          setQuote(quote);
          setIsEditingRoute(false);

          toast({
            title: 'Error Saving Route',
            description: 'Failed to save route changes. Changes have been reverted.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('❌ [ROUTE-SAVE] Error saving route:', error);

        // Revert optimistic update on error
        setQuote(quote);
        setIsEditingRoute(false);

        toast({
          title: 'Error Saving Route',
          description: 'Network error occurred. Changes have been reverted.',
          variant: 'destructive',
        });
      }
    } catch (initialError) {
      console.error('❌ [ROUTE-EDITING] Initial operation error:', initialError);
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
          discount: Number(formValues.discount) || 0,
          breakdown: {
            ...quote.calculation_data?.breakdown,
            shipping: Number(formValues.international_shipping) || 0, // ✅ Use form value directly
          },
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
      
      // Also fetch HSN weights for items that have HSN codes
      quote.items.forEach((item, index) => {
        if (item.hsn_code) {
          fetchHSNWeight(index, item.hsn_code);
        }
      });
    }
  }, [isEditMode, quote?.id, fetchHSNWeight]); // Only trigger when edit mode changes or quote changes

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
    // Populating form from quote data
    
    const calculationData = quoteData.calculation_data || {};
    const operationalData = quoteData.operational_data || {};

    // Use smart customs percentage if available, otherwise use manual entry
    const smartCustomsPercentage =
      operationalData.customs?.percentage || calculationData.customs_percentage || 0;

    // ✅ AUTO-APPLY: Check for handling charge defaults when no existing value
    const existingHandling = operationalData.handling_charge || 0;
    let handlingChargeValue = existingHandling;

    // Auto-apply default handling charge if no existing value and backend config available
    if (
      existingHandling === 0 &&
      calculationData.handlingDefault &&
      calculationData.handlingDefault > 0
    ) {
      handlingChargeValue = calculationData.handlingDefault;
      console.log('🎯 [DEBUG] Auto-applying default handling charge in form:', {
        quoteId: quoteData.id,
        existingHandling,
        defaultHandling: calculationData.handlingDefault,
        autoAppliedValue: handlingChargeValue,
      });
    }

    // ✅ AUTO-APPLY: Check for insurance defaults when no existing value
    const existingInsurance = operationalData.insurance_amount || 0;
    let insuranceAmountValue = existingInsurance;

    // Auto-apply default insurance if no existing value and backend config available
    if (
      existingInsurance === 0 &&
      calculationData.insuranceDefault &&
      calculationData.insuranceDefault > 0
    ) {
      insuranceAmountValue = calculationData.insuranceDefault;
      console.log('🛡️ [DEBUG] Auto-applying default insurance amount in form:', {
        quoteId: quoteData.id,
        existingInsurance,
        defaultInsurance: calculationData.insuranceDefault,
        autoAppliedValue: insuranceAmountValue,
      });
    }

    // Debug logging for form initialization with validation
    const rawItems = quoteData.items || [];
    const formItemsData = rawItems.map((item, index) => {
      // Ensure all required fields have proper defaults
      const formattedItem = {
        id: item.id || `item-${Date.now()}-${index}`, // More unique ID generation
        item_price: Number(item.price_usd) || 0,
        item_weight: Number(item.weight_kg) || 0,
        quantity: Number(item.quantity) || 1,
        product_name: String(item.name || ''),
        options: String(item.options || ''),
        product_url: String(item.url || ''),
        image_url: String(item.image || ''),
        hsn_code: item.hsn_code || '', // Include HSN code
        category: item.category || '', // Include category
      };
      
      // Validate critical fields
      if (!formattedItem.product_name) {
        console.warn(`⚠️ Item ${index} missing product name:`, item);
      }
      
      return formattedItem;
    });
    
    // Add default item if no items exist
    if (formItemsData.length === 0) {
      console.log('📦 No items found, adding default item for edit mode');
      formItemsData.push({
        id: `item-${Date.now()}-default`,
        item_price: 0,
        item_weight: 0,
        quantity: 1,
        product_name: '',
        options: '',
        product_url: '',
        image_url: '',
        hsn_code: '', // Include HSN code
        category: '', // Include category
      });
    }
    
    // Form reset called

    form.reset({
      id: quoteData.id,
      customs_percentage: smartCustomsPercentage,
      sales_tax_price: calculationData.sales_tax_price || 0,
      domestic_shipping: operationalData.domestic_shipping || 0,
      handling_charge: handlingChargeValue,
      discount: calculationData.discount || 0,
      insurance_amount: insuranceAmountValue,
      international_shipping: calculationData.breakdown?.shipping || 0,
      selected_shipping_option: operationalData.shipping?.selected_option || null,
      origin_country: quoteData.origin_country,
      destination_country: quoteData.destination_country,
      currency: quoteData.currency,
      destination_currency: quoteData.currency || 'USD',
      status: quoteData.status,
      items: formItemsData,
    });
    
    // Form reset complete
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
          data.items?.map((item) => {
            // Find existing item to preserve HSN data and other fields
            const existingItem = quote?.items?.find(existing => existing.id === item.id);
            
            return {
              id: item.id,
              name: item.product_name || '',
              price_usd: Number(item.item_price) || 0,
              weight_kg: Number(item.item_weight) || 0,
              quantity: Number(item.quantity) || 1,
              url: item.product_url || '',
              image: item.image_url || '',
              options: item.options || '',
              // 🏷️ PRESERVE HSN DATA from existing item or migration
              hsn_code: item.hsn_code || existingItem?.hsn_code || '',
              category: item.category || existingItem?.category || '',
              tax_rate: item.tax_rate || existingItem?.tax_rate || 0,
              minimum_valuation_usd: item.minimum_valuation_usd || existingItem?.minimum_valuation_usd || 0,
              description: item.description || existingItem?.description || '',
              // Preserve other smart_data and metadata
              smart_data: existingItem?.smart_data || {},
              hsn_data: existingItem?.hsn_data,
              minimum_valuation_conversion: existingItem?.minimum_valuation_conversion,
            };
          }) || [],
      });

      console.log('✅ [SAVE] Update success:', success);

      if (success) {
        setLastSaveTime(new Date());

        // 🚀 AUTO-STATUS PROGRESSION: pending → sent
        // Check if quote calculations were saved and status should auto-progress
        const currentStatus = quote?.status;
        const hasCalculationData =
          data.items &&
          data.items.length > 0 &&
          (Number(data.international_shipping) > 0 ||
            Number(data.customs_percentage) > 0 ||
            Number(data.sales_tax_price) > 0);

        console.log('🔄 [AUTO-STATUS] Checking auto-progression conditions:', {
          currentStatus,
          hasCalculationData,
          quoteId: quoteId,
          items: data.items?.length || 0,
          internationalShipping: Number(data.international_shipping) || 0,
          customsPercentage: Number(data.customs_percentage) || 0,
          salesTax: Number(data.sales_tax_price) || 0,
        });

        // Auto-progress from 'pending' to 'sent' when calculations are saved
        if (currentStatus === 'pending' && hasCalculationData && quoteId) {
          try {
            console.log('✅ [AUTO-STATUS] Triggering auto-progression: pending → sent');
            await handleQuoteSent(quoteId, currentStatus);

            toast({
              title: 'Quote updated and sent',
              description:
                'Quote has been calculated and automatically marked as sent. You can continue editing.',
            });
          } catch (statusError) {
            console.error('❌ [AUTO-STATUS] Failed to auto-progress status:', statusError);
            // Don't fail the whole operation, just show normal success message
            toast({
              title: 'Quote updated',
              description: 'Quote has been successfully updated. You can continue editing.',
            });
          }
        } else {
          // Normal update without status change
          console.log('ℹ️ [AUTO-STATUS] No auto-progression needed:', {
            reason: currentStatus !== 'pending' ? 'Status not pending' : 'No calculation data',
          });
          toast({
            title: 'Quote updated',
            description: 'Quote has been successfully updated. You can continue editing.',
          });
        }

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

  // Tax method selection handlers with optimistic updates
  const handleTaxMethodChange = async (method: string, metadata?: any) => {
    try {
      console.log(`🎯 [Tax Method] Changing method from ${quote?.calculation_method_preference || 'auto'} to ${method}`);
      
      // 1. OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      setCurrentTaxMethod(method);
      
      // Create optimistic quote update for immediate UI feedback
      if (quote) {
        const optimisticQuote = {
          ...quote,
          calculation_method_preference: method,
          operational_data: {
            ...quote.operational_data,
            tax_method_metadata: metadata
          }
        };
        setQuote(optimisticQuote);
        console.log(`✅ [Tax Method] Optimistic update applied for instant feedback`);
      }
      
      // Show immediate feedback toast
      toast({
        title: "Tax Method Updated", 
        description: `Calculation method changed to ${method}. Recalculating taxes...`,
      });
      
      // 2. BACKGROUND SYNC: Update database without blocking UI
      if (quote?.id) {
        const updateSuccess = await unifiedDataEngine.updateQuote(quote.id, {
          calculation_method_preference: method,
          operational_data: {
            ...quote.operational_data,
            tax_method_metadata: metadata
          }
        });

        if (updateSuccess) {
          console.log(`✅ [Tax Method] Database updated successfully with method: ${method}`);
          
          // 3. BACKGROUND REFRESH: Sync with database (non-blocking)
          // Skip navigation on error to prevent page refresh during tax method changes
          try {
            await loadQuoteData(true, true); // forceRefresh=true, skipNavigationOnError=true
            console.log(`🔄 [Tax Method] Quote data synced from database`);
          } catch (syncError) {
            console.warn(`⚠️ [Tax Method] Database sync failed, but UI already updated:`, syncError);
            // Don't throw error - optimistic update already applied
          }
          
          // 4. TRIGGER RECALCULATION: With current quote state
          scheduleCalculation(() => {
            console.log(`🧮 [Tax Method] Recalculation triggered with new method: ${method}`);
          });
          
        } else {
          throw new Error('Database update failed - reverting optimistic update');
        }
      }
    } catch (error) {
      console.error('Tax method update error:', error);
      
      // ROLLBACK: Revert optimistic update on error
      if (quote) {
        setCurrentTaxMethod(quote.calculation_method_preference || 'auto');
        setQuote(quote); // Revert to original quote state
        console.log(`🔄 [Tax Method] Rolled back optimistic update due to error`);
      }
      
      toast({
        title: "Update Failed",
        description: "Failed to update tax calculation method. Changes reverted.",
        variant: "destructive"
      });
    }
  };

  const handleValuationMethodChange = async (itemId: string, method: string, amount?: number) => {
    try {
      setItemValuationMethods(prev => ({ ...prev, [itemId]: method }));
      
      // Update quote's operational data with per-item valuation preferences
      if (quote?.id) {
        const updatedOperationalData = {
          ...quote.operational_data,
          item_valuation_preferences: {
            ...quote.operational_data?.item_valuation_preferences,
            [itemId]: method
          }
        };
        
        if (amount && method === 'admin_override') {
          updatedOperationalData.item_valuation_overrides = {
            ...quote.operational_data?.item_valuation_overrides,
            [itemId]: {
              amount,
              timestamp: new Date().toISOString(),
              admin_id: 'current_admin' // Would be replaced with actual admin ID
            }
          };
        }
        
        await unifiedDataEngine.updateQuote(quote.id, {
          operational_data: updatedOperationalData
        });
        
        // Trigger recalculation with new valuation method
        await calculateSmartFeatures({ ...quote, operational_data: updatedOperationalData });
      }
    } catch (error) {
      console.error('Valuation method update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update item valuation method.",
        variant: "destructive"
      });
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
      ref={containerRef}
      className={`max-w-7xl mx-auto p-6 space-y-6 rounded-lg transition-all duration-200 ${
        isEditMode
          ? 'border border-teal-200 bg-teal-50/20 shadow-sm'
          : 'border border-blue-200 bg-blue-50/20 shadow-sm'
      }`}
      style={{ minHeight: '600px' }}
    >
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/quotes">Quotes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {quote?.display_id ||
                quote?.iwish_tracking_id ||
                `Quote #${quote?.id?.substring(0, 8)}`}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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

          <div className="flex items-center justify-end space-x-3">
            <ShareQuoteButtonV2 quote={quote} variant="button" size="sm" />
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
                      batchUpdate('origin_country', value);
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
                      batchUpdate('destination_country', value);
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
                    onClick={
                      isEditingRoute ? handleRouteEditingDone : () => setIsEditingRoute(true)
                    }
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
                  {currencyDisplay.formatSingleAmount(
                    liveQuote?.final_total_usd || quote.final_total_usd,
                    'origin',
                  )}
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
                  {/* Products Section - Clean and Simple */}
                  <Card className="shadow-sm border-gray-200">
                    {/* Show "Add More" link when products exist */}
                    {form.watch('items')?.length > 0 && (
                      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/30">
                        <button
                          type="button"
                          onClick={addNewItem}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                        >
                          + Add another product
                        </button>
                      </div>
                    )}
                    <CardContent className="p-0">
                      {(() => {
                        const watchedItems = form.watch('items');
                        console.log('🔍 DEBUG - Edit Mode Rendering:', {
                          isEditMode,
                          isLoading,
                          hasQuote: !!quote,
                          watchedItemsLength: watchedItems?.length,
                          watchedItems: watchedItems,
                          quoteItemsLength: quote?.items?.length,
                          quoteItems: quote?.items,
                          formErrors: form.formState.errors
                        });
                        return null;
                      })()}
                      
                      {/* Loading state - prevent premature rendering */}
                      {isLoading && (
                        <div className="p-8 text-center text-gray-500">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                          <p className="text-sm">Loading quote data...</p>
                        </div>
                      )}
                      
                      {/* Quote not loaded yet */}
                      {!isLoading && !quote && (
                        <div className="p-8 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">Quote data not available</p>
                          <p className="text-xs mt-1">Please refresh the page</p>
                        </div>
                      )}
                      
                      {/* No items */}
                      {!isLoading && quote && form.watch('items')?.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No products added yet</p>
                          <p className="text-xs mt-1">Add your first product to get started</p>
                        </div>
                      )}
                      
                      {/* Render items only when not loading and quote is available */}
                      {!isLoading && quote && (() => {
                        try {
                          const items = form.watch('items');
                          
                          // Additional safety checks
                          if (!Array.isArray(items)) {
                            console.error('🚨 Form items is not an array:', items);
                            return (
                              <div className="p-8 text-center text-red-500">
                                <Package className="w-12 h-12 mx-auto mb-3 text-red-300" />
                                <p className="text-sm">Data structure error</p>
                                <p className="text-xs mt-1">Form items is not properly formatted</p>
                                <button 
                                  className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                  onClick={() => window.location.reload()}
                                >
                                  Reload Page
                                </button>
                              </div>
                            );
                          }
                          
                          if (items.length === 0) {
                            return null; // Handled by the "No items" section above
                          }
                          
                          return items.map((item, index) => {
                            try {
                              // Validate item structure
                              if (!item || typeof item !== 'object') {
                                console.error(`🚨 Invalid item at index ${index}:`, item);
                                return (
                                  <div key={`error-${index}`} className="p-4 border-b border-red-200 bg-red-50">
                                    <div className="text-red-600 text-sm">
                                      ⚠️ Item {index + 1} has invalid data structure
                                    </div>
                                  </div>
                                );
                              }
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
                                      {currencyDisplay.formatSingleAmount(
                                        Number(item.item_price) * Number(item.quantity),
                                        'origin',
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {currencyDisplay.formatSingleAmount(
                                        Number(item.item_price || 0),
                                        'origin',
                                      )}{' '}
                                      × {item.quantity || 1}
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
                                          // Also fetch HSN weight if item has HSN code
                                          if (items[index].hsn_code) {
                                            fetchHSNWeight(index, items[index].hsn_code);
                                          }
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
                                        {currencyDisplay.currencySymbols.origin}
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
                                      {(isEstimating[index.toString()] || isLoadingHSN[index.toString()]) && (
                                        <div className="ml-2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    </div>
                                    
                                    {/* Dual Weight Suggestions */}
                                    {(hsnWeights[index.toString()] || weightEstimations[index.toString()]) && (
                                      <div className="mt-2">
                                        <DualWeightSuggestions
                                          hsnWeight={hsnWeights[index.toString()] ? {
                                            ...hsnWeights[index.toString()]!,
                                            source: 'hsn' as const
                                          } : undefined}
                                          mlWeight={weightEstimations[index.toString()] ? {
                                            estimated: weightEstimations[index.toString()].estimated_weight,
                                            confidence: weightEstimations[index.toString()].confidence,
                                            reasoning: weightEstimations[index.toString()].reasoning,
                                            source: 'ml' as const
                                          } : undefined}
                                          currentWeight={item.item_weight || undefined}
                                          onSelectWeight={(weight, source) => handleWeightSelection(index, weight, source)}
                                          isLoading={isEstimating[index.toString()] || isLoadingHSN[index.toString()]}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* HSN Code Assignment Section */}
                                  <div className="col-span-6">
                                    <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                      <Tag className="w-3 h-3 mr-1" />
                                      HSN Classification
                                      {!item.hsn_code && (
                                        <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                          Unclassified
                                        </span>
                                      )}
                                    </label>
                                    
                                    {item.hsn_code ? (
                                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-mono font-bold text-green-700">{item.hsn_code}</span>
                                            <span className="text-sm text-green-600">{item.category || 'General'}</span>
                                          </div>
                                          <SmartHSNSearch
                                            currentHSNCode={item.hsn_code}
                                            productName={item.product_name}
                                            onHSNSelect={(hsnData) => handleHSNAssignment(index, hsnData)}
                                            placeholder="Search HSN code for this product..."
                                            size="sm"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm text-amber-700">
                                            <div className="font-medium">HSN code not assigned</div>
                                            <div className="text-xs">Tax calculations use fallback rates</div>
                                          </div>
                                          <SmartHSNSearch
                                            currentHSNCode={undefined}
                                            productName={item.product_name}
                                            onHSNSelect={(hsnData) => handleHSNAssignment(index, hsnData)}
                                            placeholder="Search HSN code for this product..."
                                            size="sm"
                                          />
                                        </div>
                                      </div>
                                    )}
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
                            } catch (error) {
                              console.error(`🚨 Error rendering item ${index}:`, error, item);
                              return (
                                <div key={`render-error-${index}`} className="p-4 border-b border-red-200 bg-red-50">
                                  <div className="text-red-600 text-sm">
                                    ⚠️ Error rendering item {index + 1}: {error instanceof Error ? error.message : 'Unknown error'}
                                  </div>
                                  <button 
                                    className="mt-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                    onClick={() => {
                                      console.log('Item causing error:', item);
                                      const items = form.getValues('items') || [];
                                      items.splice(index, 1);
                                      form.setValue('items', items);
                                    }}
                                  >
                                    Remove Item
                                  </button>
                                </div>
                              );
                            }
                          });
                        } catch (error) {
                          console.error('🚨 Critical error in item rendering:', error);
                          return (
                            <div className="p-8 text-center text-red-500">
                              <Package className="w-12 h-12 mx-auto mb-3 text-red-300" />
                              <p className="text-sm">Critical rendering error</p>
                              <p className="text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
                              <button 
                                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                onClick={() => window.location.reload()}
                              >
                                Reload Page
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </CardContent>
                  </Card>

                  {/* Add Product Button - Only show when no products exist */}
                  {(!form.watch('items') || form.watch('items')?.length === 0) && (
                    <div className="flex justify-center -my-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewItem}
                        className="rounded-full px-4 py-2 h-8 border-red-300 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 shadow-sm border-2 flex items-center space-x-2"
                        title="Add Product"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Add Product</span>
                      </Button>
                    </div>
                  )}

                  {/* Quote Detail Form - Direct Integration */}
                  {(() => {
                    // Calculate default values for handling and insurance
                    if (!liveQuote) {
                      console.log('🔧 [DEBUG] No liveQuote available');
                      return null;
                    }

                    // Wait for shipping options to be loaded
                    if (!shippingOptions || shippingOptions.length === 0) {
                      console.log(
                        '🔧 [DEBUG] Shipping options not loaded yet, showing form without defaults',
                      );
                      // Show form without defaults while waiting for shipping options
                      return (
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
                      );
                    }

                    const selectedOptionId = liveQuote.operational_data?.shipping?.selected_option;
                    const normalizedId = normalizeShippingOptionId(selectedOptionId);
                    const selectedOption = shippingOptions.find((opt) => opt.id === normalizedId);

                    console.log('🔧 [DEBUG] Shipping option matching:', {
                      originalId: selectedOptionId,
                      normalizedId,
                      foundOption: selectedOption?.id,
                      availableOptions: shippingOptions.map((opt) => opt.id),
                      shippingOptionsCount: shippingOptions.length,
                      firstOptionSample: shippingOptions[0],
                    });

                    // Additional debug for the exact matching logic
                    console.log('🔧 [DEBUG] Detailed matching attempt:', {
                      searchingFor: normalizedId,
                      matches: shippingOptions.map((opt) => ({
                        id: opt.id,
                        matches: opt.id === normalizedId,
                        hasHandling: !!opt.handling_charge,
                        hasInsurance: !!opt.insurance_options,
                      })),
                    });

                    // If no selected option found, try to create a fallback from the shipping route
                    let fallbackOption = null;
                    if (!selectedOption && normalizedId) {
                      console.log(
                        '🔧 [DEBUG] Attempting to create fallback option for:',
                        normalizedId,
                      );

                      // Try to create a basic option structure for calculation
                      fallbackOption = {
                        id: normalizedId,
                        carrier: normalizedId.includes('dhl')
                          ? 'DHL'
                          : normalizedId.includes('fedex')
                            ? 'FedEx'
                            : 'Unknown',
                        name: normalizedId.replace('_', ' ').toUpperCase(),
                        cost_usd: 0,
                        // Add handling_charge config for all shipping options (fallback if DB fails)
                        handling_charge:
                          normalizedId === 'dhl_standard'
                            ? {
                                base_fee: 5,
                                percentage_of_value: 2,
                                min_fee: 3,
                                max_fee: 50,
                              }
                            : normalizedId === 'dhl_express'
                              ? {
                                  base_fee: 8,
                                  percentage_of_value: 2.5,
                                  min_fee: 5,
                                  max_fee: 80,
                                }
                              : normalizedId === 'fedex_standard'
                                ? {
                                    base_fee: 6,
                                    percentage_of_value: 1.8,
                                    min_fee: 4,
                                    max_fee: 60,
                                  }
                                : undefined,
                        // Add insurance_options config for all shipping options (fallback if DB fails)
                        insurance_options:
                          normalizedId === 'dhl_standard'
                            ? {
                                coverage_percentage: 1.5,
                                max_coverage: 5000,
                                min_fee: 2,
                                available: true,
                                default_enabled: false,
                              }
                            : normalizedId === 'dhl_express'
                              ? {
                                  coverage_percentage: 1.5,
                                  max_coverage: 10000,
                                  min_fee: 3,
                                  available: true,
                                  default_enabled: false,
                                }
                              : normalizedId === 'fedex_standard'
                                ? {
                                    coverage_percentage: 1.2,
                                    max_coverage: 7500,
                                    min_fee: 2.5,
                                    available: true,
                                    default_enabled: false,
                                  }
                                : undefined,
                      };

                      console.log('🔧 [DEBUG] Created fallback option:', fallbackOption);
                    }

                    const optionToUse = selectedOption || fallbackOption;
                    const calculationData = calculationDefaultsService.getCalculationData(
                      liveQuote,
                      optionToUse,
                    );

                    // Debug: Check current breakdown structure
                    console.log('🔧 [DEBUG] Current breakdown structure:', {
                      quoteId: liveQuote.id,
                      breakdown: liveQuote.calculation_data?.breakdown,
                      hasHandling: !!liveQuote.calculation_data?.breakdown?.handling,
                      hasInsurance: !!liveQuote.calculation_data?.breakdown?.insurance,
                      oldFeesValue: liveQuote.calculation_data?.breakdown?.fees,
                    });

                    return (
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
                        detectedHandlingCharge={calculationData.handlingDefault}
                        detectedInsuranceAmount={calculationData.insuranceDefault}
                        handlingExplanation={calculationData.handlingExplanation}
                        insuranceExplanation={calculationData.insuranceExplanation}
                        onCalculateSmartCustoms={calculateSmartCustoms}
                        isCalculatingCustoms={isCalculatingCustoms}
                        shippingOptions={shippingOptions}
                        recommendations={shippingRecommendations}
                        onSelectShippingOption={handleShippingOptionSelect}
                        onShowShippingDetails={() => setShowShippingDetails(true)}
                        isEditingRoute={isEditingRoute}
                      />
                    );
                  })()}

                  {/* Legacy breakdown auto-updates on load, no manual intervention needed */}

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

              {/* Tax Calculation Sidebar - Comprehensive Tax Information */}
              <TaxCalculationSidebar
                quote={liveQuote || quote}
                isCalculating={isCalculating}
                editMode={isEditMode}
                onRecalculate={() => calculateSmartFeatures(liveQuote || quote)}
                onUpdateQuote={loadQuoteData}
                onMethodChange={handleTaxMethodChange}
                onValuationChange={handleValuationMethodChange}
              />

              {/* Shipping Options or Configuration Prompt */}
              {shippingOptions.length > 0 ? (
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
              ) : (
                <ShippingConfigurationPrompt
                  quote={liveQuote || quote}
                  onNavigateToSettings={() => (window.location.href = '/admin/shipping-routes')}
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

              {/* Tax Calculation Sidebar - HSN Transparency */}
              <TaxCalculationSidebar
                quote={liveQuote || quote}
                isCalculating={isCalculating}
                onRecalculate={() => calculateSmartFeatures(liveQuote || quote)}
                onUpdateQuote={loadQuoteData}
              />

              {/* Live Cost Breakdown - Essential Financial Summary */}
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
                              <span>
                                Unit Price:{' '}
                                {currencyDisplay.formatSingleAmount(
                                  Number(item.price_usd || 0),
                                  'origin',
                                )}
                              </span>
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
                            {currencyDisplay.formatSingleAmount(
                              Number(item.price_usd || 0) * item.quantity,
                              'origin',
                            )}
                          </div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tax Calculation Sidebar - HSN Transparency */}
              <TaxCalculationSidebar
                quote={liveQuote || quote}
                isCalculating={isCalculating}
                onRecalculate={() => calculateSmartFeatures(liveQuote || quote)}
                onUpdateQuote={loadQuoteData}
              />

              {/* Cost Breakdown - Professional Financial Summary */}
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
                        {currencyDisplay.formatSingleAmount(
                          liveQuote?.final_total_usd || quote.final_total_usd,
                          'origin',
                        )}
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

                  {/* View Mode: Show Selected Shipping Details */}
                  {!isEditMode && (
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      {(() => {
                        const selectedShippingOptionId =
                          quote.operational_data?.shipping?.selected_option;
                        const selectedShippingOption = shippingOptions.find(
                          (opt) => opt.id === selectedShippingOptionId,
                        );
                        const shippingCost =
                          liveQuote?.calculation_data?.breakdown?.shipping ||
                          quote.calculation_data?.breakdown?.shipping ||
                          0;

                        if (selectedShippingOption) {
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Shipping</span>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-800">
                                  {selectedShippingOption.carrier} {selectedShippingOption.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {selectedShippingOption.days} •{' '}
                                  {currencyDisplay.formatSingleAmount(shippingCost, 'origin')}
                                </div>
                              </div>
                            </div>
                          );
                        } else if (shippingCost > 0) {
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Shipping</span>
                              <span className="text-sm font-semibold text-gray-800">
                                {currencyDisplay.formatSingleAmount(shippingCost, 'origin')}
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Shipping</span>
                              <span className="text-xs text-amber-600">Not selected</span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}

                  {/* Edit Mode: Show Essential Metrics Only */}
                  {isEditMode && (
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
                      </div>
                    </div>
                  )}
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

              {/* 5. Shipping Options or Configuration Prompt */}
              {isEditMode ? (
                shippingOptions.length > 0 ? (
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
                ) : (
                  <ShippingConfigurationPrompt
                    quote={liveQuote || quote}
                    onNavigateToSettings={() => (window.location.href = '/admin/shipping-routes')}
                  />
                )
              ) : (
                // Show configuration prompt in view mode only if no shipping options exist
                shippingOptions.length === 0 && (
                  <ShippingConfigurationPrompt
                    quote={liveQuote || quote}
                    onNavigateToSettings={() => (window.location.href = '/admin/shipping-routes')}
                  />
                )
              )}

              {/* 5.5. Admin Override Controls - Handling & Insurance */}
              {isEditMode && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-sm">
                      <Settings className="w-4 h-4 text-orange-600" />
                      <span>Admin Overrides</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Handling Charge Override */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">
                        Handling Charge Override
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Auto-calculated"
                            value={form.watch('handling_charge') || ''}
                            onChange={(e) => {
                              form.setValue('handling_charge', Number(e.target.value));
                              scheduleCalculation();
                            }}
                            className="text-xs"
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Auto:{' '}
                          {currencyDisplay.formatSingleAmount(
                            liveQuote?.operational_data?.calculated_handling || 0,
                            'origin',
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Override carrier handling charge calculation
                      </p>
                    </div>

                    {/* Insurance Override */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">
                        Insurance Override
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Auto-calculated"
                            value={form.watch('insurance_amount') || ''}
                            onChange={(e) => {
                              form.setValue('insurance_amount', Number(e.target.value));
                              scheduleCalculation();
                            }}
                            className="text-xs"
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Auto:{' '}
                          {currencyDisplay.formatSingleAmount(
                            liveQuote?.operational_data?.calculated_insurance || 0,
                            'origin',
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Override customer insurance selection</p>
                    </div>

                    {/* Customer Preferences Info */}
                    <div className="pt-2 border-t border-gray-200 space-y-1">
                      <h4 className="text-xs font-medium text-gray-700">Customer Preferences:</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>
                          Insurance Opted:{' '}
                          {liveQuote?.customer_data?.preferences?.insurance_opted_in ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-red-600">No</span>
                          )}
                        </div>
                        <div>
                          Selected Carrier:{' '}
                          {liveQuote?.operational_data?.shipping?.selected_option || 'Auto'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
              <span className="font-medium">{productToDelete?.name}</span> from this quote? This
              action cannot be undone.
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
