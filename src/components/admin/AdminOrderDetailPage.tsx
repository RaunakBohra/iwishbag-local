import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, MapPin, Calculator, CheckCircle, XCircle, Clock, AlertTriangle, FileText, DollarSign, ShoppingCart, Truck, Circle, User, Mail, Phone, Calendar, Package, Settings, TrendingUp, Eye, Edit3, MessageSquare, Globe, Flag, UserMinus, Plus, Printer, ExternalLink, Weight, MessageCircle, CreditCard, Hash, PackageCheck, Clipboard } from "lucide-react";
import { QuoteDetailForm } from "@/components/admin/QuoteDetailForm";
import { QuoteMessaging } from "@/components/messaging/QuoteMessaging";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAdminQuoteDetail } from "@/hooks/useAdminQuoteDetail";
import { QuoteCalculatedCosts } from "@/components/admin/QuoteCalculatedCosts";
import { ShareQuoteButton } from './ShareQuoteButton';
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
import { ShippingRouteDisplay } from "@/components/shared/ShippingRouteDisplay";
import { CustomsTierDisplay } from "./CustomsTierDisplay";
import { supabase } from '../../integrations/supabase/client';
import { useAllCountries } from '../../hooks/useAllCountries';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Icon } from '@/components/ui/icon';
import { StatusTransitionHistory } from './StatusTransitionHistory';
import { getCurrencySymbolFromCountry } from '@/lib/currencyUtils';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { QuoteExpirationTimer } from '@/components/dashboard/QuoteExpirationTimer';

// Import new admin components
import { CustomerCommHub } from './CustomerCommHub';
import { ShippingTrackingManager } from './ShippingTrackingManager';
import { AddressContactManager } from './AddressContactManager';
import { SimplePaymentInfo } from './SimplePaymentInfo';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AdminOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
    addNewQuoteItem,
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
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(false);
  const [isCustomsTiersOpen, setIsCustomsTiersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate progress based on status
  const calculateProgress = (status: string) => {
    const progressMap: { [key: string]: number } = {
      'pending': 10,
      'sent': 20,
      'approved': 30,
      'paid': 50,
      'ordered': 70,
      'shipped': 85,
      'completed': 100,
      'rejected': 0,
      'cancelled': 0
    };
    return progressMap[status] || 0;
  };

  const progress = quote ? calculateProgress(quote.status) : 0;

  // Quick actions based on status
  const getQuickActions = () => {
    if (!quote) return [];
    
    const actions = [];
    
    if (quote.status === 'paid' && quote.payment_method === 'bank_transfer') {
      actions.push({
        label: 'Confirm Payment',
        icon: CreditCard,
        onClick: () => handleStatusUpdate('ordered'),
        variant: 'default' as const
      });
    }
    
    if (quote.status === 'ordered') {
      actions.push({
        label: 'Update Shipping',
        icon: Truck,
        onClick: () => setActiveTab('payment-shipping'),
        variant: 'outline' as const
      });
    }
    
    actions.push({
      label: 'Message Customer',
      icon: MessageCircle,
      onClick: () => setActiveTab('communication'),
      variant: 'outline' as const
    });
    
    actions.push({
      label: 'Print Invoice',
      icon: Printer,
      onClick: () => window.print(),
      variant: 'outline' as const
    });
    
    return actions;
  };

  const quickActions = getQuickActions();

  // DYNAMIC: Determine if this is an order based on status configuration
  const isOrder = quote && (() => {
    const statusConfig = getStatusConfig(quote.status, 'quote') || getStatusConfig(quote.status, 'order');
    return statusConfig?.countsAsOrder ?? ['paid', 'ordered', 'shipped', 'completed'].includes(quote.status); // fallback
  })();

  const originCountry = useWatch({
    control: form.control,
    name: 'origin_country',
  });

  const destinationCountry = useWatch({
    control: form.control,
    name: 'destination_country',
  });

  const quoteItems = useWatch({
    control: form.control,
    name: 'items',
  });

  const orderStatusLink = `/admin/orders?status=${quote?.status || ''}`;

  // Extracted address from notes
  const extractedAddress = quote?.notes ? extractShippingAddressFromNotes(quote.notes) : null;

  // DYNAMIC: Check if address should be editable based on status configuration
  const isAddressEditable = quote && (() => {
    const statusConfig = getStatusConfig(quote.status, 'quote') || getStatusConfig(quote.status, 'order');
    return statusConfig?.allowAddressEdit ?? !['paid', 'ordered', 'shipped', 'completed'].includes(quote.status); // fallback
  })();

  const handleStatusUpdate = async (newStatus: string) => {
    if (!quote) return;

    // Validate status transition
    if (!isValidTransition(quote.status, newStatus)) {
      toast({
        title: "Invalid Status Change",
        description: `Cannot change status from ${quote.status} to ${newStatus}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
      
      // Reload the page to get fresh data
      window.location.reload();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStatusTransitionButtons = () => {
    if (!quote) return null;

    const currentStatusConfig = getStatusConfig(quote.status);
    if (!currentStatusConfig || !currentStatusConfig.nextStatuses || currentStatusConfig.nextStatuses.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {currentStatusConfig.nextStatuses.map((nextStatus) => {
          const nextStatusConfig = getStatusConfig(nextStatus);
          if (!nextStatusConfig) return null;

          const IconComponent = Icon[nextStatusConfig.icon as keyof typeof Icon] || Circle;

          return (
            <Button
              key={nextStatus}
              onClick={() => handleStatusUpdate(nextStatus)}
              variant={nextStatus === 'rejected' || nextStatus === 'cancelled' ? 'destructive' : 'default'}
              size="sm"
              className="gap-2"
            >
              <IconComponent className="h-4 w-4" />
              {nextStatusConfig.label}
            </Button>
          );
        })}
      </div>
    );
  };

  if (quoteLoading || statusLoading) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Order not found</h2>
          <p className="text-muted-foreground">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/admin/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header Section */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/orders')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          
          <div className="flex items-center gap-4">
            <StatusBadge status={quote.status} />
            {quote.priority && (
              <Badge variant={quote.priority === 'urgent' ? 'destructive' : 'secondary'}>
                {quote.priority}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Order Progress</span>
            <span className="text-muted-foreground">{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                className="gap-2"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Status Transition Buttons */}
        {renderStatusTransitionButtons()}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Package className="h-4 w-4" />
            Order Overview
          </TabsTrigger>
          <TabsTrigger value="payment-shipping" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment & Shipping
          </TabsTrigger>
          <TabsTrigger value="communication" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents & Details
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Products to Order - PROMINENT */}
          <Card className="border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Products to Order
              </CardTitle>
              <CardDescription>
                Items that need to be purchased from the merchant
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {quote.items?.map((item: any, index: number) => (
                  <div key={item.id || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-lg">{item.product_name}</h4>
                        {item.product_url && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-primary" />
                            <a 
                              href={item.product_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm break-all"
                            >
                              {item.product_url}
                            </a>
                          </div>
                        )}
                        {item.customer_comment && (
                          <div className="bg-muted/50 border border-muted rounded-md p-3 mt-2">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Customer Instructions:</p>
                            <p className="text-sm">{item.customer_comment}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="font-medium">${item.price} each</p>
                        <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)} total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimplePaymentInfo quote={quote} />
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {quote.shipping_address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{quote.shipping_address.name}</p>
                  <p>{quote.shipping_address.address_line_1}</p>
                  {quote.shipping_address.address_line_2 && (
                    <p>{quote.shipping_address.address_line_2}</p>
                  )}
                  <p>
                    {quote.shipping_address.city}, {quote.shipping_address.state} {quote.shipping_address.postal_code}
                  </p>
                  <p>{quote.shipping_address.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Builder & Calculator - At Bottom, Expanded by Default */}
          <Collapsible open={true} className="mt-6">
            <CollapsibleTrigger className="flex items-center gap-2 font-medium text-lg mb-4 hover:text-primary transition-colors">
              <Calculator className="h-5 w-5" />
              Quote Builder & Calculator
              <ChevronDown className="h-4 w-4 ml-auto" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <QuoteDetailForm 
                    form={form}
                    fields={fields}
                    remove={remove}
                    append={append}
                    updateQuote={updateQuote}
                    isUpdating={isUpdating}
                    isSendingEmail={isSendingEmail}
                    sendQuoteEmail={sendQuoteEmail}
                    addNewQuoteItem={addNewQuoteItem}
                    quote={quote}
                    shippingCountries={shippingCountries}
                    allCountries={allCountries}
                    isCalculating={isCalculating}
                    setIsCalculating={setIsCalculating}
                    calculationError={calculationError}
                    setCalculationError={setCalculationError}
                    lastCalculationTime={lastCalculationTime}
                    setLastCalculationTime={setLastCalculationTime}
                    routeWeightUnit={routeWeightUnit}
                    setRouteWeightUnit={setRouteWeightUnit}
                    smartWeightUnit={smartWeightUnit}
                    setSmartWeightUnit={setSmartWeightUnit}
                    isAdvancedOpen={isAdvancedOpen}
                    setIsAdvancedOpen={setIsAdvancedOpen}
                    isAddressEditable={false}
                    extractedAddress={extractedAddress}
                    isOrder={true}
                  />
                </form>
              </Form>
            </CollapsibleContent>
          </Collapsible>

          {/* Quote Cost Breakdown - At Bottom, Expanded by Default */}
          <Collapsible open={true} className="mt-6">
            <CollapsibleTrigger className="flex items-center gap-2 font-medium text-lg mb-4 hover:text-primary transition-colors">
              <DollarSign className="h-5 w-5" />
              Quote Cost Breakdown
              <ChevronDown className="h-4 w-4 ml-auto" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <QuoteCalculatedCosts 
                quote={quote}
                originCountry={originCountry}
                destinationCountry={destinationCountry}
                routeWeightUnit={routeWeightUnit}
                form={form}
              />
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* Payment & Shipping Tab */}
        <TabsContent value="payment-shipping" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <SimplePaymentInfo quote={quote} />
              </CardContent>
            </Card>
            <ShippingTrackingManager quote={quote} />
          </div>
          <AddressContactManager quote={quote} />
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <CustomerCommHub quote={quote} />
          
          {/* Order Timeline for orders */}
          {isOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline quote={quote} />
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTransitionHistory quoteId={quote.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents & Details Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentManager quoteId={quote.id} quoteStatus={quote.status} />
          
          {/* Order Actions for orders */}
          {isOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Order Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderActions quote={quote} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOrderDetailPage;