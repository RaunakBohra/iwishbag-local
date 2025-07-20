import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { useStatusManagement } from '@/hooks/useStatusManagement';

export const StatusConfigFixer: React.FC = () => {
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const { quoteStatuses, orderStatuses, refreshData } = useStatusManagement();

  // Check for payment_pending quotes
  const { data: paymentPendingQuotes } = useQuery({
    queryKey: ['payment-pending-debug'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, display_id, status, product_name')
        .eq('status', 'payment_pending');

      if (error) {
        console.error('Error fetching payment_pending quotes:', error);
        return [];
      }
      return data || [];
    },
  });

  // Check current configuration
  const paymentPendingInQuotes = quoteStatuses.find((s) => s.name === 'payment_pending');
  const paymentPendingInOrders = orderStatuses.find((s) => s.name === 'payment_pending');

  const fixStatusConfiguration = async () => {
    setIsFixing(true);
    try {
      // Ensure payment_pending is in order statuses with correct configuration
      const correctOrderStatuses = [
        ...orderStatuses.filter((s) => s.name !== 'payment_pending'),
        {
          id: 'payment_pending',
          name: 'payment_pending',
          label: 'Awaiting Payment',
          description: 'Order placed, awaiting payment verification',
          color: 'outline' as const,
          icon: 'Clock',
          isActive: true,
          order: 1,
          allowedTransitions: ['paid', 'ordered', 'cancelled'],
          isTerminal: false,
          category: 'order' as const,
          triggersEmail: true,
          emailTemplate: 'payment_instructions',
          requiresAction: false,
          showsInQuotesList: false, // KEY FIX: Should NOT show in quotes
          showsInOrdersList: true, // KEY FIX: Should show in orders
          canBePaid: false,
          allowEdit: false,
          allowApproval: false,
          allowRejection: false,
          allowCartActions: false,
          allowCancellation: true,
          allowRenewal: false,
          allowShipping: false,
          allowAddressEdit: true,
          showInCustomerView: true,
          showInAdminView: true,
          showExpiration: false,
          isSuccessful: false,
          countsAsOrder: true,
          progressPercentage: 70,
          customerMessage: 'Order placed - Please complete payment',
          customerActionText: 'Pay Now',
          cssClass: 'status-payment-pending',
          badgeVariant: 'outline',
        },
      ];

      // Remove payment_pending from quote statuses if it exists there
      const correctQuoteStatuses = quoteStatuses.filter((s) => s.name !== 'payment_pending');

      // Save the corrected configurations
      const { error: quoteError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'quote_statuses',
          setting_value: JSON.stringify(correctQuoteStatuses),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (quoteError) throw quoteError;

      const { error: orderError } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'order_statuses',
          setting_value: JSON.stringify(correctOrderStatuses),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_key',
        },
      );

      if (orderError) throw orderError;

      // Refresh the status configurations
      await refreshData();

      toast({
        title: 'Status Configuration Fixed',
        description: 'payment_pending status now correctly shows in orders list only',
      });
    } catch (error: unknown) {
      console.error('Error fixing status configuration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Fix Failed',
        description: errorMessage || 'Failed to fix status configuration',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Configuration Debug & Fix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Configuration Status */}
        <div className="space-y-2">
          <h4 className="font-medium">Current Configuration:</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">payment_pending in quote statuses:</span>
              <Badge variant={paymentPendingInQuotes ? 'destructive' : 'outline'}>
                {paymentPendingInQuotes ? 'YES (WRONG)' : 'NO (CORRECT)'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">payment_pending in order statuses:</span>
              <Badge variant={paymentPendingInOrders ? 'default' : 'destructive'}>
                {paymentPendingInOrders ? 'YES (CORRECT)' : 'NO (WRONG)'}
              </Badge>
            </div>
            {paymentPendingInOrders && (
              <div className="text-xs text-muted-foreground ml-4">
                showsInQuotesList: {String(paymentPendingInOrders.showsInQuotesList)} |
                showsInOrdersList: {String(paymentPendingInOrders.showsInOrdersList)}
              </div>
            )}
          </div>
        </div>

        {/* Quotes with payment_pending status */}
        {paymentPendingQuotes && paymentPendingQuotes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">
              Quotes with payment_pending status ({paymentPendingQuotes.length}
              ):
            </h4>
            <div className="text-sm space-y-1">
              {paymentPendingQuotes.slice(0, 5).map((quote) => (
                <div key={quote.id} className="text-xs">
                  {quote.display_id} - Items: {Array.isArray(quote.items) ? quote.items.length : 0}
                </div>
              ))}
              {paymentPendingQuotes.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  +{paymentPendingQuotes.length - 5} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fix Button */}
        <div className="pt-2">
          <Button
            onClick={fixStatusConfiguration}
            disabled={isFixing}
            variant={
              paymentPendingInQuotes ||
              !paymentPendingInOrders ||
              paymentPendingInOrders?.showsInQuotesList
                ? 'default'
                : 'outline'
            }
          >
            {isFixing ? 'Fixing...' : 'Fix Status Configuration'}
          </Button>
        </div>

        {/* Status Summary */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          <strong>Expected behavior:</strong> Quotes with "payment_pending" status should appear in
          the Orders list only, not in the Quotes list.
        </div>
      </CardContent>
    </Card>
  );
};
