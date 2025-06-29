import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuoteState } from "@/hooks/useQuoteState";
import { useQuoteSteps } from "@/hooks/useQuoteSteps";
import { QuoteBreakdown } from "@/components/dashboard/QuoteBreakdown";
import { DeliveryTimeline } from "@/components/dashboard/DeliveryTimeline";
import { AddressEditForm } from "@/components/forms/AddressEditForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingAddress } from "@/types/address";

export default function QuoteDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(id || '');

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*),
          rejection_reasons (reason)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

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
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || "Quote not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isOwner = user?.id === quote.user_id;
  const isAdmin = user?.user_metadata?.role === "admin";
  
  // Parse shipping address from JSONB
  const shippingAddress = quote.shipping_address as unknown as ShippingAddress | null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quote Details</h1>
            <p className="text-muted-foreground">Quote ID: {quote.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={quote.status === 'paid' ? 'default' : 'secondary'}>
              {quote.status === 'paid' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Paid
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  {quote.status}
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quote Information</span>
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddressDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Address
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Product Details</h4>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Name:</strong> {quote.product_name || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Price:</strong> {formatCurrency(quote.item_price, quote.items_currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Weight:</strong> {quote.item_weight} kg
                  </p>
                  {quote.product_url && (
                    <a
                      href={quote.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Product
                    </a>
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
                    <p className="text-sm text-muted-foreground">No shipping address provided</p>
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
            onApprove={approveQuote}
            onReject={(reason: string) => rejectQuote('', reason)}
            onCalculate={() => {}} // Not used in customer view
            onRecalculate={() => {}} // Not used in customer view
            onSave={() => {}} // Not used in customer view
            onCancel={() => {}} // Not used in customer view
            isProcessing={isUpdating}
            onAddToCart={addToCart}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quote Status</span>
                  <Badge variant={quote.status === 'paid' ? 'default' : 'secondary'}>
                    {quote.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Approval Status</span>
                  <Badge variant={quote.approval_status === 'approved' ? 'default' : 'secondary'}>
                    {quote.approval_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Priority</span>
                  <Badge variant="outline">
                    {quote.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Cost */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(quote.final_total, quote.final_currency)}
              </div>
              <p className="text-sm text-muted-foreground">
                {quote.final_currency} currency
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Address Edit Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent>
          <AddressEditForm
            currentAddress={shippingAddress}
            onSave={(address) => {
              // Handle address save
              setIsAddressDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['quote', id] });
            }}
            onCancel={() => setIsAddressDialogOpen(false)}
            isLoading={false}
            canChangeCountry={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
