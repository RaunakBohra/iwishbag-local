import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { RefreshCcw, AlertCircle, CreditCard, Building, FileText, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface RefundManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
    id: string;
    final_total: number;
    amount_paid: number;
    currency: string;
    payment_method: string;
  };
  payments: Array<{
    id: string;
    amount: number;
    currency?: string; // Payment-specific currency
    method: string;
    gateway: string;
    reference: string;
    date: Date;
    canRefund: boolean;
  }>;
}

export const RefundManagementModal: React.FC<RefundManagementModalProps> = ({
  isOpen,
  onClose,
  quote,
  payments
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundType, setRefundType] = useState<'full' | 'partial' | 'credit_note'>('partial');
  const [refundAmount, setRefundAmount] = useState('');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [refundMethod, setRefundMethod] = useState<'original' | 'bank_transfer' | 'credit_note'>('original');
  const [reason, setReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const maxRefundable = quote.amount_paid;
  const refundablePayments = payments.length > 0 ? payments : [];
  
  console.log('RefundManagementModal - Debug Info:', {
    quote: quote,
    allPayments: payments,
    refundablePayments: refundablePayments,
    maxRefundable: maxRefundable
  });

  const handleRefundTypeChange = (value: string) => {
    setRefundType(value as any);
    if (value === 'full') {
      setRefundAmount(maxRefundable.toString());
      setSelectedPayments(refundablePayments.map(p => p.id));
    } else {
      setRefundAmount('');
      setSelectedPayments([]);
    }
  };

  const getPaymentIcon = (method: string) => {
    if (method === 'bank_transfer') return <Building className="h-4 w-4" />;
    if (method.includes('card') || method.includes('payu') || method.includes('stripe')) {
      return <CreditCard className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const calculateRefundBreakdown = () => {
    if (!refundAmount || !selectedPayments.length) return [];
    
    const amount = parseFloat(refundAmount);
    let remaining = amount;
    const breakdown = [];
    
    // Allocate refund amount across selected payments
    for (const paymentId of selectedPayments) {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) continue;
      
      const refundFromPayment = Math.min(remaining, payment.amount);
      if (refundFromPayment > 0) {
        breakdown.push({
          paymentId,
          amount: refundFromPayment,
          method: payment.method,
          gateway: payment.gateway
        });
        remaining -= refundFromPayment;
      }
      
      if (remaining <= 0) break;
    }
    
    return breakdown;
  };

  const processRefund = async () => {
    if (!refundAmount || !selectedPayments.length || !reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const amount = parseFloat(refundAmount);
      const breakdown = calculateRefundBreakdown();

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Not authenticated');
      }

      // Check if this is an automated gateway refund (PayU or PayPal)
      if (refundMethod === 'original' && breakdown.length === 1) {
        const gatewayPayment = payments.find(p => p.id === breakdown[0].paymentId);
        const gateway = breakdown[0].gateway || breakdown[0].method;
        
        console.log('Gateway payment for refund:', gatewayPayment);
        console.log('Gateway type:', gateway);
        console.log('Transaction reference:', gatewayPayment?.reference);
        
        if (!gatewayPayment?.reference) {
          console.error('Transaction ID not found!', {
            paymentId: breakdown[0].paymentId,
            payment: gatewayPayment,
            gateway: gateway
          });
          toast({
            title: "Missing Payment Reference",
            description: `Cannot find ${gateway} transaction ID. Please process this refund manually.`,
            variant: "destructive"
          });
          // Continue with manual refund process
        } else if (gateway === 'payu') {
          // Handle PayU refund
          try {
            console.log('Calling PayU refund with:', {
              paymentId: gatewayPayment.reference,
              amount: amount,
              refundType: refundType
            });
            
            // Call PayU refund Edge Function
            const { data: refundResult, error: refundError } = await supabase.functions.invoke('payu-refund', {
              body: {
                paymentId: gatewayPayment.reference, // PayU transaction ID (mihpayid)
                amount: amount,
                refundType: refundType === 'full' ? 'full' : 'partial',
                reason: reason,
                notes: internalNotes,
                quoteId: quote.id,
                notifyCustomer: true
              }
            });

            if (refundError) {
              throw refundError;
            }

            console.log('PayU refund result:', refundResult);
            
            if (refundResult?.success) {
              // PayU refund successful - Edge Function already recorded in database
              // Just refresh the UI and close modal
              
              // Invalidate queries to refresh UI
              queryClient.invalidateQueries({ queryKey: ['payment-history', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['all-payments', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['payment-transaction', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['quotes'] });

              toast({
                title: "PayU Refund Initiated",
                description: `Successfully initiated PayU refund of ${quote.currency} ${amount.toFixed(2)}. Refund ID: ${refundResult.refundId || refundResult.request_id}`,
              });

              onClose();
              setIsProcessing(false);
              return; // Exit - PayU Edge Function already handled database recording
            } else {
              throw new Error(refundResult?.error || 'PayU refund failed');
            }
          } catch (payuError: any) {
            console.error('PayU refund error:', payuError);
            toast({
              title: "PayU Refund Failed",
              description: payuError.message || "Failed to process PayU refund. Please try again or contact support.",
              variant: "destructive"
            });
            setIsProcessing(false);
            return; // Stop here - don't record the refund in database
          }
        } else if (gateway === 'paypal') {
          // Handle PayPal refund
          try {
            // For PayPal refunds, we need to pass the actual payment transaction ID, not the PayPal order ID
            // The gatewayPayment.id is the payment ledger ID, we need to find the actual payment_transaction
            
            console.log('Finding PayPal payment transaction for refund:', {
              ledgerPaymentId: gatewayPayment.id,
              reference: gatewayPayment.reference,
              amount: amount,
              currency: 'USD' // PayPal transactions are in USD
            });
            
            // Call PayPal refund Edge Function - use the payment ledger ID which will be looked up
            const { data: refundResult, error: refundError } = await supabase.functions.invoke('paypal-refund', {
              body: {
                paymentTransactionId: gatewayPayment.id, // Use payment ledger ID - function will look up the transaction
                refundAmount: amount,
                currency: gatewayPayment.currency || 'USD', // Use payment currency, default to USD for PayPal
                reason: reason,
                note: internalNotes,
                quoteId: quote.id,
                userId: userData.user.id
              }
            });

            if (refundError) {
              throw refundError;
            }

            console.log('PayPal refund result:', refundResult);
            
            if (refundResult?.success) {
              // PayPal refund successful - Edge Function already recorded in database
              // Just refresh the UI and close modal
              
              // Invalidate queries to refresh UI
              queryClient.invalidateQueries({ queryKey: ['payment-history', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['all-payments', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['payment-transaction', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['quotes'] });

              toast({
                title: "PayPal Refund Successful",
                description: `Successfully processed PayPal refund of ${quote.currency} ${amount.toFixed(2)}. Refund ID: ${refundResult.refundId}`,
              });

              onClose();
              setIsProcessing(false);
              return; // Exit - PayPal Edge Function already handled database recording
            } else {
              throw new Error(refundResult?.error || 'PayPal refund failed');
            }
          } catch (paypalError: any) {
            console.error('PayPal refund error:', paypalError);
            toast({
              title: "PayPal Refund Failed",
              description: paypalError.message || "Failed to process PayPal refund. Please try again or contact support.",
              variant: "destructive"
            });
            setIsProcessing(false);
            return; // Stop here - don't record the refund in database
          }
        }
      }

      // Create refund record in payment_ledger for manual refunds (non-gateway refunds)
      // Note: PayU refunds are recorded by the Edge Function, not here
      const refundReference = `REF-${Date.now()}`;
      
      // Try to use payment_ledger if it exists
      let ledgerRecordCreated = false;
      try {
        const { data: refundRecord, error: ledgerError } = await supabase
          .from('payment_ledger')
          .insert({
            quote_id: quote.id,
            payment_type: refundType === 'credit_note' ? 'credit_note' : 'refund',
            payment_method: refundMethod === 'original' ? breakdown[0]?.method || 'manual' : refundMethod,
            amount: -amount, // Negative for refunds
            currency: quote.currency,
            status: 'completed',
            payment_date: new Date().toISOString(),
            reference_number: refundReference,
            notes: `${reason} - ${internalNotes}`.trim(),
            created_by: userData.user.id
          })
          .select()
          .single();
        
        if (!ledgerError) {
          ledgerRecordCreated = true;
          console.log('Payment ledger entry created:', refundRecord.id);
        } else {
          console.error('Payment ledger error:', ledgerError);
        }
      } catch (err) {
        console.warn('Could not create payment_ledger entry, will track refund differently:', err);
      }

      // Skip financial transactions as table doesn't exist

      // Create entry in gateway_refunds table for tracking (if table exists)
      if (refundMethod === 'original' && breakdown.length > 0) {
        try {
          // First check if table exists
          const { error: tableCheckError } = await supabase
            .from('gateway_refunds')
            .select('id')
            .limit(1);
          
          if (!tableCheckError || tableCheckError.code !== '42P01') {
            // Table exists, create the entry
            await supabase
              .from('gateway_refunds')
              .insert({
                gateway_refund_id: refundReference,
                gateway_transaction_id: breakdown[0].reference || refundReference,
                gateway_code: breakdown[0].gateway || 'manual',
                quote_id: quote.id,
                refund_amount: amount,
                original_amount: breakdown[0].amount,
                currency: quote.currency,
                refund_type: refundType === 'full' ? 'FULL' : 'PARTIAL',
                reason_code: 'CUSTOMER_REQUEST',
                reason_description: reason,
                admin_notes: internalNotes,
                status: 'completed',
                gateway_status: 'COMPLETED',
                gateway_response: { manual: true, breakdown: breakdown },
                refund_date: new Date().toISOString(),
                processed_by: userData.user.id
              });
          }
        } catch (gwError) {
          console.warn('Could not create gateway_refunds entry:', gwError);
        }
      }

      // Update quote's amount_paid
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({
          amount_paid: quote.amount_paid - amount,
          payment_status: quote.amount_paid - amount <= 0 ? 'unpaid' : 
                         quote.amount_paid - amount < quote.final_total ? 'partial' : 'paid'
        })
        .eq('id', quote.id);

      if (quoteUpdateError) throw quoteUpdateError;

      // If credit note, create credit note record (optional)
      if (refundType === 'credit_note') {
        try {
          await supabase
            .from('credit_notes')
            .insert({
              quote_id: quote.id,
              credit_amount: amount,
              currency: quote.currency,
              reason: reason,
              notes: internalNotes,
              status: 'active',
              created_by: userData.user.id
            });
        } catch (creditError) {
          console.warn('credit_notes table not available, skipping credit note record:', creditError);
        }
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['payment-history', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['all-payments', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-transaction', quote.id] });

      toast({
        title: "Refund Processed",
        description: `Successfully processed ${refundType} refund of ${quote.currency} ${amount.toFixed(2)}`,
      });

      onClose();

    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Process Refund
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Refund Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Paid</p>
                <p className="font-semibold">{quote.currency} {quote.amount_paid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Refundable</p>
                <p className="font-semibold text-orange-600">{quote.currency} {maxRefundable.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Methods</p>
                <div className="flex gap-1 mt-1">
                  {[...new Set(payments.map(p => p.method))].map(method => (
                    <Badge key={method} variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Refund Type */}
          <div>
            <Label>Refund Type</Label>
            <RadioGroup value={refundType} onValueChange={handleRefundTypeChange}>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="cursor-pointer">Full Refund</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial" className="cursor-pointer">Partial Refund</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="credit_note" id="credit_note" />
                  <Label htmlFor="credit_note" className="cursor-pointer">Credit Note</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Refund Amount */}
          <div>
            <Label htmlFor="refund-amount">Refund Amount</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {quote.currency}
              </span>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="pl-12"
                placeholder="0.00"
                max={maxRefundable}
                disabled={refundType === 'full'}
              />
            </div>
            {parseFloat(refundAmount) > maxRefundable && (
              <p className="text-xs text-red-600 mt-1">
                Amount exceeds maximum refundable ({quote.currency} {maxRefundable.toFixed(2)})
              </p>
            )}
          </div>

          {/* Payment Selection */}
          <div>
            <Label>Select Payments to Refund From</Label>
            {payments.length === 0 ? (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No payments found to refund. Please record a payment first.
                </AlertDescription>
              </Alert>
            ) : (
            <div className="space-y-2 mt-2">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className={`p-3 border rounded-lg ${
                    !payment.canRefund ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayments([...selectedPayments, payment.id]);
                          } else {
                            setSelectedPayments(selectedPayments.filter(id => id !== payment.id));
                          }
                        }}
                        disabled={!payment.canRefund || refundType === 'full'}
                        className="cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(payment.method)}
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span>{payment.gateway} - {payment.currency || quote.currency} {payment.amount.toFixed(2)}</span>
                            {((payment.gateway === 'payu' || payment.method === 'payu' || payment.gateway === 'paypal' || payment.method === 'paypal') && payment.canRefund) && (
                              <Badge variant="success" className="text-xs">
                                Auto-refund available
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ref: {payment.reference} • {payment.date.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    {!payment.canRefund && (
                      <Badge variant="secondary" className="text-xs">
                        Non-refundable
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Refund Method */}
          {refundType !== 'credit_note' && (
            <div>
              <Label htmlFor="refund-method">Refund Method</Label>
              <Select value={refundMethod} onValueChange={(v: any) => setRefundMethod(v)}>
                <SelectTrigger id="refund-method" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original Payment Method</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_note">Store Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason for Refund</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="mt-2">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_cancelled">Order Cancelled</SelectItem>
                <SelectItem value="price_adjustment">Price Adjustment</SelectItem>
                <SelectItem value="overpayment">Overpayment</SelectItem>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="product_unavailable">Product Unavailable</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Internal Notes */}
          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add any additional notes about this refund..."
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Gateway Auto-Refund Notice */}
          {(() => {
            const breakdown = refundAmount && selectedPayments.length > 0 
              ? calculateRefundBreakdown() 
              : [];
            const gateway = breakdown.length === 1 ? breakdown[0]?.gateway : null;
            const isAutoRefund = refundMethod === 'original' && breakdown.length === 1 && 
              (gateway === 'payu' || gateway === 'paypal');
            
            if (isAutoRefund) {
              const refundTimeline = gateway === 'payu' ? '5-7 business days' : '3-5 business days';
              const gatewayName = gateway === 'payu' ? 'PayU' : 'PayPal';
              
              return (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Automatic {gatewayName} Refund Available!</strong> This refund will be automatically processed through {gatewayName}'s API. 
                    The customer will receive the refund to their original payment method within {refundTimeline}.
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          {/* Refund Breakdown Preview */}
          {refundAmount && selectedPayments.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Refund Breakdown:</p>
                <div className="space-y-1 text-sm">
                  {calculateRefundBreakdown().map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.gateway}</span>
                      <span>{quote.currency} {item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log('Refund button debug:', {
                isProcessing,
                refundAmount,
                selectedPayments,
                reason,
                maxRefundable,
                parsedAmount: parseFloat(refundAmount),
                amountExceedsMax: parseFloat(refundAmount) > maxRefundable,
                amountIsZeroOrNegative: parseFloat(refundAmount) <= 0,
                isDisabled: isProcessing ||
                  !refundAmount || 
                  !selectedPayments.length || 
                  !reason ||
                  parseFloat(refundAmount) > maxRefundable ||
                  parseFloat(refundAmount) <= 0
              });
              processRefund();
            }}
            disabled={
              isProcessing ||
              !refundAmount || 
              !selectedPayments.length || 
              !reason ||
              parseFloat(refundAmount) > maxRefundable ||
              parseFloat(refundAmount) <= 0
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Process Refund
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};