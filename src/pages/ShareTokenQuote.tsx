import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QuoteBreakdown } from "@/components/dashboard/QuoteBreakdown";
import { DeliveryTimeline } from "@/components/dashboard/DeliveryTimeline";
import { AddressEditForm } from "@/components/forms/AddressEditForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { RenewQuoteButton } from "@/components/RenewQuoteButton";
import { ArrowLeft, Edit, CheckCircle, XCircle, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingAddress } from "@/types/address";
import { useQuoteState } from "@/hooks/useQuoteState";
import { GuestApprovalDialog } from "@/components/share/GuestApprovalDialog";
import { GuestCartDialog } from "@/components/share/GuestCartDialog";
import { useToast } from "@/components/ui/use-toast";

export default function ShareTokenQuote() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [guestApprovalDialog, setGuestApprovalDialog] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject';
  }>({ isOpen: false, action: 'approve' });
  const [isGuestCartDialogOpen, setIsGuestCartDialogOpen] = useState(false);

  // Fetch quote by share token (no authentication required)
  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['share-quote', shareToken],
    queryFn: async () => {
      if (!shareToken) return null;
      
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('share_token', shareToken)
        // Remove is_anonymous filter to allow both anonymous and identified shared quotes
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shareToken,
  });

  // Use quote state for actions (will handle anonymous users)
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(quote?.id || '');

  // Custom handlers for guest approval flow
  const handleGuestApprove = () => {
    setGuestApprovalDialog({ isOpen: true, action: 'approve' });
  };

  const handleGuestReject = () => {
    setGuestApprovalDialog({ isOpen: true, action: 'reject' });
  };

  const handleGuestApprovalSuccess = () => {
    // Refresh the query instead of reloading the page
    queryClient.invalidateQueries({ queryKey: ['share-quote', shareToken] });
    
    // Show success message
    toast({
      title: "Quote Updated!",
      description: "Your response has been recorded. You can now proceed with your order.",
    });
  };

  const handleGuestAddToCart = () => {
    // Check if quote is approved and has email
    if (quote?.status !== 'approved' || !quote?.email) {
      toast({
        title: "Approval Required",
        description: "Please approve this quote first before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    setIsGuestCartDialogOpen(true);
  };

  const handleGuestCartSuccess = () => {
    // Navigate to cart page
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !quote) {
    console.log('ShareTokenQuote error or no quote:', { error, quote });
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || "Quote not found or link has expired"}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/')}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Debug: Log quote data after updates
  console.log('ShareTokenQuote quote data:', { 
    id: quote.id, 
    status: quote.status, 
    email: quote.email, 
    is_anonymous: quote.is_anonymous,
    share_token: quote.share_token 
  });

  // Check if quote has expired
  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date();
  
  // Parse shipping address from JSONB
  const shippingAddress = quote.shipping_address as unknown as ShippingAddress | null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Homepage
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Quote</h1>
            <p className="text-muted-foreground">Quote ID: {quote.display_id || quote.id.substring(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={quote.status} category="quote" />
            {isExpired && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Expired Quote Warning */}
      {isExpired && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This quote link has expired. Please contact us for a new quote.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quote Information</span>
                {!shippingAddress && !isExpired && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddressDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Add Shipping Address
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Product Details</h4>
                  {quote.quote_items && quote.quote_items.length > 0 ? (
                    <div className="space-y-2">
                      {quote.quote_items.map((item: any, index: number) => (
                        <div key={index} className="border-l-2 border-blue-200 pl-3">
                          <p className="text-sm font-medium">{item.product_name || "Product"}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </p>
                          {item.options && (() => {
                            try {
                              const options = JSON.parse(item.options);
                              return options.notes ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 my-2">
                                  <span className="font-semibold text-blue-800">Product Notes:</span>
                                  <span className="text-blue-900 ml-2 whitespace-pre-line">{options.notes}</span>
                                </div>
                              ) : null;
                            } catch {
                              return null;
                            }
                          })()}
                          {item.product_url && (
                            <a
                              href={item.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Product
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No product details available</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Shipping Address</h4>
                  {shippingAddress ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-1">
                        {shippingAddress.fullName}
                      </p>
                      <p className="text-sm text-muted-foreground mb-1">
                        {shippingAddress.streetAddress}
                      </p>
                      <p className="text-sm text-muted-foreground mb-1">
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shippingAddress.country}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">No shipping address provided</p>
                      {!isExpired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddressDialogOpen(true)}
                        >
                          Add Shipping Address
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Timeline */}
          <DeliveryTimeline quote={quote} />

          {/* Quote Breakdown */}
          <QuoteBreakdown 
            quote={quote} 
            onApprove={handleGuestApprove}
            onReject={handleGuestReject}
            onCalculate={() => {}} // Not used in customer view
            onRecalculate={() => {}} // Not used in customer view
            onSave={() => {}} // Not used in customer view
            onCancel={() => {}} // Not used in customer view
            isProcessing={isUpdating}
            onAddToCart={handleGuestAddToCart}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quote.sub_total || 0, quote.final_currency || 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(quote.inter_national_shipping || 0, quote.final_currency || 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Fees:</span>
                  <span>{formatCurrency((quote.vat || 0) + (quote.customs_and_ecs || 0), quote.final_currency || 'USD')}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(quote.final_total || 0, quote.final_currency || 'USD')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Renew Quote Button for Expired Quotes */}
          {quote.status === 'expired' && quote.renewal_count < 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <RenewQuoteButton 
                  quoteId={quote.id}
                  onRenewed={() => {
                    // Refresh the page to get updated data
                    window.location.reload();
                  }}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          {quote.customer_name && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Name:</strong> {quote.customer_name}
                </p>
                {quote.customer_phone && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Phone:</strong> {quote.customer_phone}
                  </p>
                )}
                {quote.email && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Email:</strong> {quote.email}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Address Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-2xl">
          <AddressEditForm
            currentAddress={shippingAddress}
            onSave={() => {
              setIsAddressDialogOpen(false);
              // Refresh the page to get updated data
              window.location.reload();
            }}
            onCancel={() => setIsAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Guest Approval Dialog */}
      <GuestApprovalDialog
        isOpen={guestApprovalDialog.isOpen}
        onClose={() => setGuestApprovalDialog({ isOpen: false, action: 'approve' })}
        quoteId={quote?.id || ''}
        action={guestApprovalDialog.action}
        onSuccess={handleGuestApprovalSuccess}
      />

      {/* Guest Cart Dialog */}
      <GuestCartDialog
        isOpen={isGuestCartDialogOpen}
        onClose={() => setIsGuestCartDialogOpen(false)}
        quoteId={quote?.id || ''}
        guestEmail={quote?.email || ''}
        onSuccess={handleGuestCartSuccess}
      />
    </div>
  );
} 