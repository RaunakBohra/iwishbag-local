import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, MapPin, Calculator, CheckCircle, XCircle, Clock, AlertTriangle, FileText, DollarSign, ShoppingCart, Truck, Circle, User, Mail, Phone, Calendar, Package, Settings, TrendingUp, Eye, Edit3, MessageSquare, Globe, Flag, UserMinus, Plus } from "lucide-react";
import { QuoteDetailForm } from "@/components/admin/QuoteDetailForm";
import { QuoteMessaging } from "@/components/messaging/QuoteMessaging";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAdminQuoteDetail } from "@/hooks/useAdminQuoteDetail";
import { QuoteCalculatedCosts } from "@/components/admin/QuoteCalculatedCosts";
import { QuoteCurrencySummary } from "./QuoteCurrencySummary";
import { Form, FormField, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditableAdminQuoteItemCard } from "./EditableAdminQuoteItemCard";
import { OrderActions } from "./OrderActions";
import { ShippingInfoForm } from "./ShippingInfoForm";
import { OrderTimeline } from "@/components/dashboard/OrderTimeline";
import { Badge } from "@/components/ui/badge";
import { extractShippingAddressFromNotes } from "@/lib/addressUpdates";

import { useWatch } from "react-hook-form";
import { getShippingRouteById } from '@/hooks/useShippingRoutes';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { WeightDisplay } from './WeightDisplay';
import { getDisplayWeight, getAppropriateWeightUnit } from '@/lib/weightUtils';
import { DeliveryOptionsManager } from "./DeliveryOptionsManager";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { CustomsTierDisplay } from "./CustomsTierDisplay";
import { supabase } from '../../integrations/supabase/client';
import { useAllCountries } from '../../hooks/useAllCountries';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Icon } from '@/components/ui/icon';
import { StatusTransitionHistory } from './StatusTransitionHistory';
import { StatusTransitionTest } from './StatusTransitionTest';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { QuoteExpirationTimer } from '@/components/dashboard/QuoteExpirationTimer';



const AdminQuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    quote,
    quoteLoading,
    error,
    countries,
    shippingCountries,
    allCountries,
    sendQuoteEmail,
    isSendingEmail,
    isUpdating,
    form,
    fields,
    remove,
    append,
    onSubmit,
    updateQuote,
  } = useAdminQuoteDetail(id);

  // Use the new status management hook
  const { 
    getStatusConfig, 
    isValidTransition,
    isLoading: statusLoading,
    statuses,
  } = useStatusManagement();

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [lastCalculationTime, setLastCalculationTime] = useState<Date | null>(null);
  const [routeWeightUnit, setRouteWeightUnit] = useState<string | null>(null);
  const [smartWeightUnit, setSmartWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Fetch customer profile data
  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile', quote?.user_id],
    queryFn: async () => {
      if (!quote?.user_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', quote.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!quote?.user_id,
  });
  


  // Extract shipping address from shipping_address column, fallback to internal_notes for legacy quotes
  const shippingAddress = quote?.shipping_address 
    ? (typeof quote.shipping_address === 'string' ? JSON.parse(quote.shipping_address) : quote.shipping_address)
    : (quote ? extractShippingAddressFromNotes(quote.internal_notes) : null);
  const hasAddress = !!shippingAddress;

  const purchaseCountry = useWatch({ 
    control: form?.control || {} as any, 
    name: "country_code" 
  });

  const isOrder = quote && ['paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(quote.status);
  const canRecalculate = quote && !['shipped', 'completed', 'cancelled'].includes(quote.status);

  // Get country currency for item cards
  const countryCurrency = useMemo(() => {
    if (!purchaseCountry || !allCountries) return 'USD';
    const country = allCountries.find(c => c.code === purchaseCountry);
    return country?.currency || 'USD';
  }, [purchaseCountry, allCountries]);

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

  // Manual calculation function
  const triggerCalculation = useCallback(async () => {
    if (!quote || !canRecalculate || isCalculating) return;

    setIsCalculating(true);
    setCalculationError(null);

    try {
      // Get current form values and call onSubmit with them
      const formValues = form.getValues();
      
      // Validate form values before submission
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        throw new Error(`Form validation failed: ${JSON.stringify(errors)}`);
      }
      
      await onSubmit(formValues);
      setLastCalculationTime(new Date());
      // No toast for calculation
    } catch (error: any) {
      setCalculationError(error.message || "Calculation failed");
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate quote",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [quote, canRecalculate, isCalculating, onSubmit, toast, form]);

  // Update function with validation and status logic
  const handleUpdate = useCallback(async (formValues: any) => {
    if (!quote || !canRecalculate) return;

    if (!quote.final_total || quote.final_total === 0) {
      toast({
        title: "Calculation Required",
        description: "Please calculate the quote costs first",
        variant: "destructive"
      });
      return;
    }

    try {
      const currentStatus = quote.status;
      let newStatus = formValues.status; // Use the status selected in the form

      // Only auto-advance from pending → sent if the form's status is still pending
      if (currentStatus === 'pending' && formValues.status === 'pending') {
        if (isValidTransition('pending', 'sent', 'quote')) {
          newStatus = 'sent';
        }
      }

      const { items, ...quoteFields } = formValues;
      await updateQuote({ ...quoteFields, status: newStatus });

      if (newStatus !== currentStatus) {
        toast({
          title: "Quote Status Changed",
          description: `Quote status changed to ${newStatus}`,
        });
      } else {
        toast({
          title: "Quote Updated",
          description: "Quote has been updated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update quote",
        variant: "destructive",
      });
    }
  }, [quote, canRecalculate, updateQuote, toast, isValidTransition]);

  // Watch items for customs tier calculation
  const items = useWatch({
    control: form.control,
    name: 'items'
  });

  // Compute real-time price and weight from form items
  const formPrice = useMemo(() => {
    return (items || []).reduce((sum: number, item: any) => sum + (Number(item?.item_price) || 0), 0);
  }, [items]);
  const formWeight = useMemo(() => {
    return (items || []).reduce((sum: number, item: any) => sum + (Number(item?.item_weight) || 0), 0);
  }, [items]);

  // Status management functions
  const updateQuoteStatus = async (newStatus: string) => {
    if (!quote) return;

    const currentStatus = quote.status;
    const category = isOrder ? 'order' : 'quote';
    
    if (!isValidTransition(currentStatus, newStatus, category)) {
      const statusConfig = statuses?.find(s => s.name === currentStatus);
      const allowedTransitions = statusConfig?.allowedTransitions || [];
      toast({
        title: "Invalid Status Transition",
        description: `Cannot change status from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateQuote({ id: quote.id, status: newStatus as any });
      const statusConfig = getStatusConfig(newStatus, category);
      toast({
        title: "Status Updated",
        description: `Quote status changed to "${statusConfig?.label || newStatus}"`,
      });
    } catch (error: any) {
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update quote status",
        variant: "destructive",
      });
    }
  };

  const handleSendQuote = async () => {
    if (!quote) return;

    try {
      sendQuoteEmail(quote);
      // Status will be automatically updated to 'sent' by the sendQuoteEmail function
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send quote",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    async function fetchRouteWeightUnit() {
      if (quote?.shipping_method === 'route-specific' && quote?.shipping_route_id) {
        try {
          const route = await getShippingRouteById(quote.shipping_route_id);
          setRouteWeightUnit(route?.weight_unit || null);
        } catch (err) {
          console.error('[AdminQuoteDetailPage] Error fetching route weight unit:', err);
          setRouteWeightUnit(null);
        }
      } else {
        setRouteWeightUnit(null);
      }
    }
    
    if (quote) {
      fetchRouteWeightUnit();
    }
  }, [quote?.shipping_method, quote?.shipping_route_id]);

  // Determine smart weight unit based on countries and route
  useEffect(() => {
    if (quote) {
      const originCountry = quote.origin_country || purchaseCountry;
      const destCountry = shippingAddress?.country || quote.country_code;
      
      const appropriateUnit = getAppropriateWeightUnit(
        originCountry,
        destCountry,
        routeWeightUnit
      );
      
      setSmartWeightUnit(appropriateUnit);
    }
  }, [quote, routeWeightUnit, purchaseCountry, shippingAddress?.country]);

  // Customs Tier Detection Logic
  const [customsTiers, setCustomsTiers] = useState<any[]>([]);
  const [appliedTier, setAppliedTier] = useState<any | null>(null);
  const [customsLoading, setCustomsLoading] = useState(true);
  const [customsError, setCustomsError] = useState<string | null>(null);

  // Get origin/destination codes from form state (not just quote)
  const originCountry = quote?.origin_country || purchaseCountry || 'US';
  let destinationCountry = shippingAddress?.country || purchaseCountry || quote?.country_code;
  if (destinationCountry && destinationCountry.length > 2) {
    const found = allCountries?.find(c => c.name === destinationCountry);
    if (found) destinationCountry = found.code;
  }

  // Fetch customs tiers and determine applied tier (always run on form change)
  useEffect(() => {
    const fetchCustomsTiers = async () => {
      if (!originCountry || !destinationCountry) {
        setCustomsLoading(false);
        return;
      }
      try {
        setCustomsLoading(true);
        const { data, error } = await supabase
          .from('route_customs_tiers')
          .select('*')
          .eq('origin_country', originCountry)
          .eq('destination_country', destinationCountry)
          .eq('is_active', true)
          .order('priority_order', { ascending: true });
        if (error) throw error;
        setCustomsTiers(data || []);
        // Determine which tier should be applied (use formPrice/formWeight only)
        const applied = determineAppliedTier(data || [], formPrice, formWeight);
        setAppliedTier(applied);
      } catch (err: any) {
        setCustomsError(err.message);
      } finally {
        setCustomsLoading(false);
      }
    };
    fetchCustomsTiers();
  }, [originCountry, destinationCountry, formPrice, formWeight, allCountries, items, purchaseCountry, shippingAddress]);

  // Function to determine which tier should be applied based on price/weight/logic only
  const determineAppliedTier = (
    tiers: any[],
    price: number,
    weight: number
  ): any | null => {
    for (const tier of tiers) {
      const priceMatch = (!tier.price_min || price >= tier.price_min) && (!tier.price_max || price <= tier.price_max);
      const weightMatch = (!tier.weight_min || weight >= tier.weight_min) && (!tier.weight_max || weight <= tier.weight_max);
      let shouldApply = false;
      if (tier.logic_type === 'AND') {
        shouldApply = priceMatch && weightMatch;
      } else {
        shouldApply = priceMatch || weightMatch;
      }
      if (shouldApply) return tier;
    }
    return null;
  };

  // Fetch rejection reason if id is present
  const { data: rejectionReason } = useQuery({
    queryKey: ['rejection-reason', quote?.rejection_reason_id || 'none'],
    queryFn: async () => {
      if (!quote?.rejection_reason_id) return null;
      const { data, error } = await supabase
        .from('rejection_reasons')
        .select('reason')
        .eq('id', quote.rejection_reason_id)
        .maybeSingle();
      if (error) return null;
      return typeof data?.reason === 'string' ? data.reason : null;
    },
    enabled: !!quote?.rejection_reason_id,
  });

  // Early return if still loading
  if (quoteLoading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Show loading state while statuses are being loaded
  if (statusLoading) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading status configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    console.log('[AdminQuoteDetailPage] Error or no quote:', { error, quote });
    return (
      <div className="container py-8">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Error Loading Quote</h2>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : String(error || 'Quote not found')}</p>
          <Button onClick={() => navigate('/admin/quotes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  // Additional error check for form
  if (!form || !form.control) {
    console.error('[AdminQuoteDetailPage] Form not properly initialized');
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Form Error</h1>
        <p className="text-muted-foreground">The form could not be initialized properly.</p>
        <Button variant="destructive" onClick={() => navigate('/admin/quotes')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
        </Button>
      </div>
    );
  }

  // Only compute isAutoPriority if quote is defined
  const isAutoPriority = (String(form.watch('priority')) === 'auto') || (!form.watch('priority') && (typeof quote.priority_auto === 'boolean' ? quote.priority_auto : true));

  const currentStatus = quote?.status || 'pending';
  const statusConfig = statuses?.find(s => s.name === currentStatus);
  const allowedNextStatuses = statusConfig?.allowedTransitions || [];
  
  // Status transition buttons
  const renderStatusButtons = () => {
    const currentStatus = quote?.status || 'pending';
    
    // Get allowed transitions from status management
    const statusConfig = statuses?.find(s => s.name === currentStatus);
    const allowedTransitions = statusConfig?.allowedTransitions || [];

    if (!statuses || statuses.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          Loading status configurations...
        </div>
      );
    }

    if (allowedTransitions.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          No status transitions available
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {allowedTransitions.map((nextStatus) => {
          const nextStatusConfig = statuses?.find(s => s.name === nextStatus);
          if (!nextStatusConfig) return null;

          return (
            <Button
              key={nextStatus}
              variant="outline"
              size="sm"
              onClick={() => updateQuoteStatus(nextStatus)}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <StatusBadge status={nextStatus} category={isOrder ? 'order' : 'quote'} showIcon className="text-xs" />
              Change to {nextStatusConfig.label}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <Form {...form}>
      <div className="container py-6 space-y-6">
        {/* Header with Navigation and Quick Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(isOrder ? '/admin/orders' : '/admin/quotes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isOrder ? 'Orders' : 'Quotes'}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isOrder ? 'Order' : 'Quote'} #{quote.display_id || quote.id}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusBadge status={quote.status} showIcon className="text-sm" category={isOrder ? 'order' : 'quote'} />
          </div>
        </div>

        {/* Rejection Reason Banner (if cancelled/rejected) */}
        {(quote.status === 'cancelled' || quote.status === 'rejected') && (
          <div className="flex items-center gap-3 p-4 mb-2 border border-red-200 bg-red-50 rounded-lg text-sm text-red-900">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-800">Quote was {quote.status === 'cancelled' ? 'Cancelled' : 'Rejected'} by Customer</div>
              {quote.rejection_reason_id && (
                <div><span className="font-medium">Reason:</span> {rejectionReason || 'Unknown reason'}</div>
              )}
              {quote.rejection_details && (
                <div><span className="font-medium">Details:</span> {quote.rejection_details}</div>
              )}
              {!quote.rejection_reason_id && !quote.rejection_details && (
                <div>No reason provided.</div>
              )}
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column - Customer & Products */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Customer Information Card - Organized */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2">
                  {/* Inline Row: Name left, Website & Priority right */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Name left */}
                    <span className="flex items-center gap-2 text-base font-bold">
                      <User className="h-4 w-4" />
                      {customerProfile?.full_name || quote.customer_name || quote.email || 'Customer'}
                    </span>
                    {/* Website & Priority right */}
                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                      {quote.quote_source && (
                        <span className="flex items-center gap-1 text-base text-green-800">
                          <Globe className="h-4 w-4 text-green-600" />
                          <span className="truncate">{quote.quote_source}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-2 text-base">
                        <Flag className="h-4 w-4 text-orange-600" />
                        <Select
                          value={form.watch('priority') || quote.priority || 'normal'}
                          onValueChange={val => {
                            if (["low", "normal", "urgent", "high"].includes(val)) {
                              form.setValue('priority', val as 'low' | 'normal' | 'urgent' | 'high');
                            }
                          }}
                        >
                          <SelectTrigger className="w-24 h-7 text-base px-2 py-1 bg-transparent border-none shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  {/* Left Column */}
                  <div className="flex flex-col gap-2 min-w-0">
                    {/* Email */}
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{quote.email || 'No email'}</span>
                    </div>
                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span className="truncate">{new Date(quote.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="flex flex-col gap-2 min-w-0 md:items-end">
                    {/* Full Address - single line, comma separated */}
                    {shippingAddress && (
                      <div className="flex items-center gap-2 text-sm min-w-0">
                        <MapPin className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-800 truncate">
                          {[
                            shippingAddress.recipient_name || shippingAddress.fullName,
                            shippingAddress.streetAddress,
                            shippingAddress.addressLine2,
                            shippingAddress.city,
                            shippingAddress.state,
                            shippingAddress.postalCode,
                            shippingAddress.country
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {/* Phone */}
                    {quote.customer_phone && (
                      <div className="flex items-center gap-2 text-sm min-w-0">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{quote.customer_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unified Quote Builder - Side by Side Layout */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    Quote Builder
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Country:</span>
                      <FormField
                        control={form.control}
                        name="country_code"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-40 h-8">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allCountries?.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <div className="flex items-center gap-2">
                                    <span>{country.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Currency:</span>
                      <Badge variant="outline" className="text-sm">
                        {getCurrencySymbol(countryCurrency)} {countryCurrency}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  
                  {/* Left Column - Products Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground">Products</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({})}
                        className="h-8"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Product
                      </Button>
                    </div>
                    
                    {fields && fields.length > 0 ? (
                      <div className="space-y-3">
                        {fields.map((item, index) => (
                          <EditableAdminQuoteItemCard 
                            key={item.id} 
                            index={index}
                            control={form.control}
                            allCountries={allCountries}
                            onDelete={() => remove(index)}
                            routeWeightUnit={routeWeightUnit}
                            smartWeightUnit={smartWeightUnit}
                            countryCurrency={countryCurrency}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No products added yet</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({})}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add First Product
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Settings Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Calculation Settings</h3>
                    
                    <div className="space-y-4">
                      <QuoteDetailForm 
                        form={form}
                        shippingAddress={shippingAddress}
                        detectedCustomsPercentage={appliedTier?.customs_percentage}
                        detectedCustomsTier={appliedTier}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Section - Update Button and Status */}
                <div className="border-t bg-muted/30 p-6 space-y-4">
                  {/* Calculate and Update Buttons */}
                  <div className="flex gap-3">
                    {/* Calculate Button */}
                    <Button
                      variant="outline"
                      onClick={triggerCalculation}
                      disabled={isCalculating || !canRecalculate}
                      className="flex-1 h-12 text-lg"
                    >
                      {isCalculating ? (
                        <>
                          <Clock className="h-5 w-5 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-5 w-5 mr-2" />
                          Calculate Now
                        </>
                      )}
                    </Button>

                    {/* Update Button */}
                    <Button 
                      type="submit"
                      disabled={isUpdating || !canRecalculate}
                      className="flex-1 h-12 text-lg"
                      onClick={form.handleSubmit(handleUpdate)}
                    >
                      {isUpdating ? (
                        <>
                          <Clock className="h-5 w-5 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Update Quote
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Calculation Status */}
                  {canRecalculate && (
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 text-sm">
                        {isCalculating ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin" />
                            <span>Calculating...</span>
                          </>
                        ) : calculationError ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">Calculation failed: {calculationError}</span>
                          </>
                        ) : lastCalculationTime ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Last calculated: {lastCalculationTime.toLocaleTimeString()}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Use 'Calculate Now' to update costs
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Customer Messages - Only the chat UI, no card or header */}
            <div className="mt-4">
              <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
            </div>
          </div>

          {/* Right Column - Results & Actions */}
          <div className="space-y-6">
            
            {/* Cost Breakdown - Always Visible */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Cost Breakdown
                </CardTitle>
                <CardDescription>
                  Final calculated costs and pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteCalculatedCosts quote={quote} />
              </CardContent>
            </Card>

            {/* Customs Tiers - Collapsible */}
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Customs Tiers
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </CardTitle>
                    <CardDescription>
                      Tiered customs rules and logic for this quote
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <CustomsTierDisplay 
                      quote={quote} 
                      shippingAddress={shippingAddress} 
                      customsTiers={customsTiers}
                      appliedTier={appliedTier}
                      loading={customsLoading}
                      error={customsError}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Delivery Options - Collapsible */}
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Delivery Options
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </CardTitle>
                    <CardDescription>
                      Shipping route, cost, and delivery options
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Shipping Route Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Shipping Route Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Origin:</span>
                          <div className="font-medium">
                            {purchaseCountry
                              ? allCountries?.find(c => c.code === purchaseCountry)?.name || purchaseCountry
                              : quote.origin_country || 'Not selected'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Destination:</span>
                          <div className="font-medium">
                            {destinationCountry || quote.country_code || 'Not specified'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Method:</span>
                        <Badge variant={quote?.shipping_method === 'route-specific' ? 'default' : 'secondary'}>
                          {quote?.shipping_method === 'route-specific' ? 'Route-Specific' : 'Country Settings'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shipping Cost:</span>
                        <span className="font-medium">
                          ${quote.international_shipping?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                    {/* Weight Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Weight Information</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Weight:</span>
                        <WeightDisplay 
                          weight={quote.item_weight}
                          routeWeightUnit={smartWeightUnit}
                          showOriginal={true}
                        />
                      </div>
                    </div>
                    {/* Delivery Options */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Delivery Options</h4>
                      <DeliveryOptionsManager 
                        quote={quote}
                        className="border-0 shadow-none p-0"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Status History - Collapsible */}
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Status History
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </CardTitle>
                    <CardDescription>
                      All status transitions for this quote
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Expiration Timer */}
                    {(quote.status === 'sent' || quote.status === 'approved') && quote.expires_at && (
                      <div className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                        <QuoteExpirationTimer 
                          expiresAt={quote.expires_at}
                          compact={true}
                          className="text-center"
                        />
                      </div>
                    )}
                    <StatusTransitionHistory quoteId={quote.id} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>

        {/* Order Timeline for Orders */}
        {isOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline currentStatus={quote.status} />
            </CardContent>
          </Card>
        )}

        {/* Quote Details */}
        <div className="space-y-6">
          {/* Quote Header */}
          <Card className="animate-in slide-in-from-left duration-700 hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            {/* Quote Header Content */}
          </Card>
        </div>
      </div>
    </Form>
  );
};

export default AdminQuoteDetailPage;
