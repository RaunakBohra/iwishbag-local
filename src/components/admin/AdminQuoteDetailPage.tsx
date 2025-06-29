import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, MapPin, Calculator, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { QuoteDetailForm } from "@/components/admin/QuoteDetailForm";
import { QuoteMessaging } from "@/components/messaging/QuoteMessaging";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAdminQuoteDetail } from "@/hooks/useAdminQuoteDetail";
import { QuoteCalculatedCosts } from "@/components/admin/QuoteCalculatedCosts";
import { QuoteCurrencySummary } from "./QuoteCurrencySummary";
import { Form } from "@/components/ui/form";
import { EditableAdminQuoteItemCard } from "./EditableAdminQuoteItemCard";
import { OrderActions } from "./OrderActions";
import { ShippingInfoForm } from "./ShippingInfoForm";
import { OrderTimeline } from "@/components/dashboard/OrderTimeline";
import { Badge } from "@/components/ui/badge";
import { extractShippingAddressFromNotes } from "@/lib/addressUpdates";
import { ShippingAddressDisplay } from "./ShippingAddressDisplay";
import { useWatch } from "react-hook-form";
import { getShippingRouteById } from '@/hooks/useShippingRoutes';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { WeightDisplay } from './WeightDisplay';
import { getDisplayWeight, getAppropriateWeightUnit } from '@/lib/weightUtils';
import { DeliveryOptionsManager } from "./DeliveryOptionsManager";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

// Status workflow configuration
const STATUS_WORKFLOW = {
  pending: { next: ['calculated', 'cancelled'], label: 'Pending', color: 'secondary' },
  calculated: { next: ['sent', 'cancelled'], label: 'Calculated', color: 'default' },
  sent: { next: ['accepted', 'cancelled'], label: 'Sent', color: 'outline' },
  accepted: { next: ['paid', 'cancelled'], label: 'Accepted', color: 'default' },
  paid: { next: ['ordered', 'cancelled'], label: 'Paid', color: 'default' },
  ordered: { next: ['shipped', 'cancelled'], label: 'Ordered', color: 'default' },
  shipped: { next: ['completed', 'cancelled'], label: 'Shipped', color: 'default' },
  completed: { next: [], label: 'Completed', color: 'default' },
  cancelled: { next: [], label: 'Cancelled', color: 'destructive' }
};

// Helper function to create a stable hash for comparison
const createStableHash = (obj: any): string => {
  const normalizeValue = (value: any): any => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Math.round(value * 100) / 100; // Round to 2 decimal places
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (typeof value === 'object') {
      const sortedKeys = Object.keys(value).sort();
      return sortedKeys.reduce((acc, key) => {
        acc[key] = normalizeValue(value[key]);
        return acc;
      }, {} as any);
    }
    return value;
  };
  
  const normalized = normalizeValue(obj);
  return JSON.stringify(normalized);
};

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
    onSubmit,
    updateQuote,
  } = useAdminQuoteDetail(id);

  const [isAutoCalculating, setIsAutoCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [lastCalculationTime, setLastCalculationTime] = useState<Date | null>(null);
  const [routeWeightUnit, setRouteWeightUnit] = useState<string | null>(null);
  const [smartWeightUnit, setSmartWeightUnit] = useState<'kg' | 'lb'>('kg');
  
  // Use refs to store previous values for comparison
  const previousValuesRef = useRef<string>('');
  const calculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract shipping address from shipping_address column, fallback to internal_notes for legacy quotes
  const shippingAddress = quote && quote.shipping_address
    ? quote.shipping_address as any
    : (quote ? extractShippingAddressFromNotes(quote.internal_notes) : null);
  const hasAddress = !!shippingAddress;

  const purchaseCountry = form?.control ? useWatch({ control: form.control, name: "country_code" }) : undefined;
  const destinationCountry = shippingAddress?.country || '';

  const isOrder = quote && ['cod_pending', 'bank_transfer_pending', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(quote.status);
  const canRecalculate = quote && !['shipped', 'completed', 'cancelled'].includes(quote.status);

  // Get country currency for item cards
  const countryCurrency = useMemo(() => {
    if (!purchaseCountry || !allCountries) return 'USD';
    const country = allCountries.find(c => c.code === purchaseCountry);
    return country?.currency || 'USD';
  }, [purchaseCountry, allCountries]);

  // Auto-calculation with proper debouncing
  const triggerAutoCalculation = useCallback(async () => {
    if (!quote || !canRecalculate || isAutoCalculating) return;

    setIsAutoCalculating(true);
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
      toast({
        title: "Quote Auto-Calculated",
        description: "Quote has been automatically recalculated with the latest changes.",
      });
    } catch (error: any) {
      setCalculationError(error.message || "Auto-calculation failed");
      toast({
        title: "Auto-Calculation Failed",
        description: error.message || "Failed to auto-calculate quote",
        variant: "destructive",
      });
    } finally {
      setIsAutoCalculating(false);
    }
  }, [quote, canRecalculate, isAutoCalculating, onSubmit, toast, form]);

  // Watch all form fields that affect calculation individually
  const insurance_amount = useWatch({ control: form.control, name: 'insurance_amount' });
  const customs_percentage = useWatch({ control: form.control, name: 'customs_percentage' });
  const sales_tax_price = useWatch({ control: form.control, name: 'sales_tax_price' });
  const merchant_shipping_price = useWatch({ control: form.control, name: 'merchant_shipping_price' });
  const domestic_shipping = useWatch({ control: form.control, name: 'domestic_shipping' });
  const handling_charge = useWatch({ control: form.control, name: 'handling_charge' });
  const discount = useWatch({ control: form.control, name: 'discount' });
  const currency = useWatch({ control: form.control, name: 'currency' });
  const country_code = useWatch({ control: form.control, name: 'country_code' });

  
  // Also watch individual item fields for better reactivity
  const items = useWatch({
    control: form.control,
    name: 'items'
  });

  // Create a stable hash of the watched values for comparison
  const valuesHash = useMemo(() => {
    const relevantValues = {
      insurance_amount,
      customs_percentage,
      sales_tax_price,
      merchant_shipping_price,
      domestic_shipping,
      handling_charge,
      discount,
      currency,
      country_code,
      items: items?.map(item => ({
        item_price: item?.item_price,
        item_weight: item?.item_weight,
        quantity: item?.quantity,
        product_name: item?.product_name,
      })) || []
    };
    return createStableHash(relevantValues);
  }, [insurance_amount, customs_percentage, sales_tax_price, merchant_shipping_price, domestic_shipping, handling_charge, discount, currency, country_code, items]);

  // Auto-calculation effect with proper debouncing and change detection
  useEffect(() => {
    if (!quote || !canRecalculate) return;

    // Only trigger if values have actually changed
    if (valuesHash === previousValuesRef.current) {
      return;
    }

    console.log('[AdminQuoteDetailPage] Values changed, triggering auto-calculation in 2 seconds:', {
      insurance_amount,
      customs_percentage,
      sales_tax_price,
      merchant_shipping_price,
      domestic_shipping,
      handling_charge,
      discount,
      currency,
      country_code,
      itemsCount: items?.length
    });

    // Clear existing timeout
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    // Set new timeout
    calculationTimeoutRef.current = setTimeout(() => {
      console.log('[AdminQuoteDetailPage] Executing auto-calculation...');
      triggerAutoCalculation();
      previousValuesRef.current = valuesHash;
    }, 2000);

    // Cleanup function
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [valuesHash, triggerAutoCalculation, quote, canRecalculate, insurance_amount, customs_percentage, sales_tax_price, merchant_shipping_price, domestic_shipping, handling_charge, discount, currency, country_code, items]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, []);

  // Status management functions
  const updateQuoteStatus = async (newStatus: string) => {
    if (!quote) return;

    const currentStatus = quote.status;
    const allowedTransitions = STATUS_WORKFLOW[currentStatus as keyof typeof STATUS_WORKFLOW]?.next || [];

    if (!allowedTransitions.includes(newStatus)) {
      toast({
        title: "Invalid Status Transition",
        description: `Cannot change status from \"${currentStatus}\" to \"${newStatus}\". Allowed transitions: ${allowedTransitions.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateQuote({ id: quote.id, status: newStatus as any });
      toast({
        title: "Status Updated",
        description: `Quote status changed to \"${STATUS_WORKFLOW[newStatus as keyof typeof STATUS_WORKFLOW]?.label}\"`,
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
      const destCountry = destinationCountry || quote.country_code;
      
      const appropriateUnit = getAppropriateWeightUnit(
        originCountry,
        destCountry,
        routeWeightUnit
      );
      
      setSmartWeightUnit(appropriateUnit);
    }
  }, [quote, routeWeightUnit, purchaseCountry, destinationCountry]);

  // Early return if still loading
  if (quoteLoading) return (
    <div className="container py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );

  if (error || !quote) {
    console.log('[AdminQuoteDetailPage] Error or no quote:', { error, quote });
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Quote Not Found</h1>
        <p className="text-muted-foreground">{error?.message || "The quote could not be found."}</p>
        <Button variant="destructive" onClick={() => navigate('/admin/quotes')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
        </Button>
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

  const currentStatus = quote.status;
  const statusConfig = STATUS_WORKFLOW[currentStatus as keyof typeof STATUS_WORKFLOW];
  const allowedNextStatuses = statusConfig?.next || [];
  
  return (
    <Form {...form}>
      <div className="container py-8 space-y-6">
          <div>
              <Button variant="destructive" size="sm" onClick={() => navigate(isOrder ? '/admin/orders' : '/admin/quotes')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {isOrder ? 'Back to All Orders' : 'Back to All Quotes'}
              </Button>
          </div>

        {/* Status Management Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Status Management
              <Badge variant={statusConfig?.color as any}>
                {statusConfig?.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage quote status and workflow transitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {/* Quick Status Action Buttons */}
              {allowedNextStatuses.map((nextStatus) => {
                const nextConfig = STATUS_WORKFLOW[nextStatus as keyof typeof STATUS_WORKFLOW];
                const isDestructive = nextStatus === 'cancelled';
                
                return (
                  <AlertDialog key={nextStatus}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant={isDestructive ? "destructive" : "default"}
                        size="sm"
                        disabled={isUpdating}
                      >
                        {isDestructive ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        {nextConfig?.label}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isDestructive ? 'Cancel Quote' : `Mark as ${nextConfig?.label}`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isDestructive 
                            ? 'Are you sure you want to cancel this quote? This action cannot be undone.'
                            : `This will change the quote status to "${nextConfig?.label}". Continue?`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => updateQuoteStatus(nextStatus)}
                          className={isDestructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                          {isDestructive ? 'Cancel Quote' : `Mark as ${nextConfig?.label}`}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                );
              })}

              {/* Send Quote Button (special case) */}
              {(currentStatus === 'calculated' || currentStatus === 'sent') && (
                <Button 
                  onClick={handleSendQuote}
                  disabled={isSendingEmail || isUpdating}
                  variant="outline"
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {currentStatus === 'sent' ? 'Resend to Customer' : 'Send to Customer'}
                </Button>
              )}

              {/* Manual Recalculate Button */}
              {canRecalculate && (
                <Button 
                  onClick={triggerAutoCalculation}
                  disabled={isAutoCalculating || isUpdating}
                  variant="outline"
                  size="sm"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {isAutoCalculating ? 'Calculating...' : 'Force Recalculate'}
                </Button>
              )}
            </div>

            {/* Auto-Calculation Status */}
            {canRecalculate && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  {isAutoCalculating ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Auto-calculating...</span>
                    </>
                  ) : calculationError ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">Auto-calculation failed: {calculationError}</span>
                    </>
                  ) : lastCalculationTime ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Last auto-calculated: {lastCalculationTime.toLocaleTimeString()}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Auto-calculation will trigger when you make changes</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle>{isOrder ? 'Order Details' : 'Quote Details'}</CardTitle>
                      <CardDescription>
                          {isOrder && quote.order_display_id 
                              ? `Order ID: ${quote.order_display_id}` 
                              : `Quote ID: ${quote.display_id || quote.id}`}
                      </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>Status: <span className="font-semibold">{quote.status}</span></div>
                    {hasAddress && (
                      <Badge variant="default">
                        <MapPin className="h-3 w-3 mr-1" />
                        Address Provided
                      </Badge>
                    )}
                  </div>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
               <p><strong>Customer Email:</strong> {quote.email}</p>
               {quote.status === 'cancelled' && quote.rejection_reasons && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      <h4 className="font-semibold mb-1">Rejection Information</h4>
                      <p><strong>Reason:</strong> {quote.rejection_reasons.reason}</p>
                      {quote.rejection_details && <p className="mt-1"><strong>Details:</strong> {quote.rejection_details}</p>}
                  </div>
               )}
          </CardContent>
        </Card>

        {isOrder && <OrderTimeline currentStatus={quote.status} />}

        <div className="grid md:grid-cols-2 gap-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Card>
                  <CardHeader><CardTitle>Products</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      {fields && fields.length > 0 ? (
                          fields.map((item, index) => (
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
                          ))
                      ) : (
                          <p>No items in this quote.</p>
                      )}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader><CardTitle>Costs and Settings</CardTitle></CardHeader>
                  <CardContent>
                      <QuoteDetailForm 
                        form={form}
                        shippingAddress={shippingAddress}
                      />
                  </CardContent>
              </Card>
              <Button 
                  type="submit"
                  disabled={isUpdating || !canRecalculate}
                  className="w-full"
              >
                  {isUpdating ? 'Updating...' : 'Update & Recalculate'}
              </Button>
            </form>
            <div className="space-y-4">
              <QuoteCurrencySummary quote={quote} countries={countries} />
              <QuoteCalculatedCosts quote={quote} />
              {/* Shipping Route Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping Route Information</CardTitle>
                  <CardDescription>
                    Details about the shipping method used for this quote
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Origin Country:</span>
                      <div className="font-semibold">
                        {purchaseCountry
                          ? `🌍 ${allCountries?.find(c => c.code === purchaseCountry)?.name || purchaseCountry}`
                          : (quote.origin_country ? `🌍 ${quote.origin_country}` : 'Not selected')}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Destination Country:</span>
                      <div className="font-semibold">
                        {destinationCountry
                          ? `🌍 ${destinationCountry}`
                          : (quote.country_code ? `🌍 ${quote.country_code}` : 'Not specified')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-muted-foreground">Shipping Method:</span>
                      <Badge variant={quote?.shipping_method === 'route-specific' ? 'default' : 'secondary'}>
                        {quote?.shipping_method === 'route-specific' ? 'Route-Specific' : 'Country Settings'}
                      </Badge>
                    </div>
                    
                    {quote?.shipping_method === 'route-specific' && quote?.shipping_route_id && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Route ID:</strong> {quote.shipping_route_id}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          This quote used a specific shipping route for more accurate pricing
                        </div>
                      </div>
                    )}
                    
                    {quote?.shipping_method === 'country_settings' && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-sm text-gray-800">
                          <strong>Fallback Method:</strong> Country-based shipping calculation
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          No specific route found, using default country settings
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-muted-foreground">International Shipping Cost:</span>
                      <span className="font-semibold">
                        ${quote.international_shipping?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {routeWeightUnit && (
                      <div className="mt-2 text-xs text-blue-700">
                        <strong>Weight Unit:</strong> {routeWeightUnit}
                      </div>
                    )}
                  </div>
                  
                  {/* Weight Display Section */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-muted-foreground">Quote Weight:</span>
                      <div className="text-right">
                        <WeightDisplay 
                          weight={quote.item_weight}
                          routeWeightUnit={smartWeightUnit}
                          showOriginal={true}
                        />
                      </div>
                    </div>
                    
                    {/* Individual Item Weights */}
                    {quote.quote_items && quote.quote_items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Item Weights:</div>
                        <div className="space-y-1">
                          {quote.quote_items.map((item, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {item.product_name || `Item ${index + 1}`}:
                              </span>
                              <WeightDisplay 
                                weight={item.item_weight}
                                routeWeightUnit={smartWeightUnit}
                                showOriginal={false}
                                compact={true}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Options Management Section */}
                  <div className="pt-4 border-t">
                    <DeliveryOptionsManager 
                      quote={quote}
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Shipping Address Management Section */}
              <ShippingAddressDisplay 
                address={shippingAddress}
                title="Shipping Address Management"
                variant="detailed"
              />
              
              {isOrder && (
                <>
                  <OrderActions quote={quote} />
                  <ShippingInfoForm quote={quote} />
                </>
              )}
              <div className="overflow-y-auto max-h-[70vh] border rounded-lg">
                <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
              </div>
            </div>
        </div>
      </div>
    </Form>
  );
};

export default AdminQuoteDetailPage;
