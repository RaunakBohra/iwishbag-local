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
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ArrowLeft, Edit, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingAddress } from "@/types/address";
import { useAdminRole } from "@/hooks/useAdminRole";

export default function QuoteDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(id || '');
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
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
            <StatusBadge status={quote.status} category="quote" />
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
                    <strong>Price:</strong> {formatCurrency(quote.item_price || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Weight:</strong> {quote.item_weight || 0} kg
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Shipping Details</h4>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Country:</strong> {quote.country_code || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Currency:</strong> {quote.currency || "USD"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Total:</strong> {formatCurrency(quote.final_total || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <QuoteBreakdown quote={quote} />

          {/* Delivery Timeline */}
          <DeliveryTimeline quote={quote} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {isOwner && quote.status === 'sent' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => approveQuote()}
                  disabled={isUpdating}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Quote
                </Button>
                <Button
                  variant="outline"
                  onClick={() => rejectQuote()}
                  disabled={isUpdating}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Quote
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          {shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{shippingAddress.recipient_name}</p>
                  <p>{shippingAddress.address_line1}</p>
                  {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                  <p>{shippingAddress.city}, {shippingAddress.state_province_region} {shippingAddress.postal_code}</p>
                  <p>{shippingAddress.country}</p>
                  {shippingAddress.phone && <p>📞 {shippingAddress.phone}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Address Edit Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent>
          <DialogDescription>
            Update your shipping address for this quote.
          </DialogDescription>
          <AddressEditForm
            currentAddress={shippingAddress}
            onSave={() => {
              setIsAddressDialogOpen(false);
              queryClient.invalidateQueries(['quote', id]);
            }}
            onCancel={() => setIsAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
