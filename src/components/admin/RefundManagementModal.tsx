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
  const refundablePayments = payments.filter(p => p.canRefund);

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

      // Check if this is a PayU refund and handle it automatically
      if (refundMethod === 'original' && breakdown.length === 1 && breakdown[0].gateway === 'payu') {
        const payuPayment = payments.find(p => p.id === breakdown[0].paymentId);
        if (payuPayment?.reference) {
          try {
            // Call PayU refund Edge Function
            const { data: refundResult, error: refundError } = await supabase.functions.invoke('payu-refund', {
              body: {
                paymentId: payuPayment.reference, // PayU transaction ID (mihpayid)
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

            if (refundResult?.success) {
              // Invalidate queries to refresh UI
              queryClient.invalidateQueries({ queryKey: ['payment-history', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['all-payments', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['payment-transaction', quote.id] });
              queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });

              toast({
                title: "PayU Refund Initiated",
                description: `Successfully initiated PayU refund of ${quote.currency} ${amount.toFixed(2)}. Refund ID: ${refundResult.refundId}`,
              });

              onClose();
              return;
            } else {
              throw new Error(refundResult?.error || 'PayU refund failed');
            }
          } catch (payuError: any) {
            console.error('PayU refund error:', payuError);
            // Fall back to manual refund processing
            toast({
              title: "PayU Refund Failed",
              description: "Falling back to manual refund processing. " + (payuError.message || ''),
              variant: "destructive"
            });
          }
        }
      }

      // Create refund record in payment_ledger
      let refundRecord: any = null;
      const { data: ledgerData, error: refundError } = await supabase
        .from('payment_ledger')
        .insert({
          quote_id: quote.id,
          payment_type: refundType === 'credit_note' ? 'credit_applied' : 'refund',
          payment_method: refundMethod === 'original' ? 'original_method' : refundMethod,
          gateway_code: refundMethod === 'original' ? 'original' : 'manual',
          amount: -amount, // Negative for refunds
          currency: quote.currency,
          base_amount: -amount, // Assuming same currency for now
          status: 'completed',
          payment_date: new Date().toISOString(),
          reference_number: `REF-${Date.now()}`,
          notes: `${reason} - ${internalNotes}`.trim(),
          balance_before: quote.amount_paid,
          balance_after: quote.amount_paid - amount,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (refundError) {
        // Fallback to payment_records if payment_ledger doesn't exist
        console.warn('payment_ledger table not available, using payment_records fallback');
        const { data: recordData, error: recordError } = await supabase
          .from('payment_records')
          .insert({
            quote_id: quote.id,
            payment_method: refundMethod === 'original' ? 'original_method' : refundMethod,
            amount: -amount, // Negative for refunds
            reference_number: `REF-${Date.now()}`,
            notes: `REFUND: ${reason} - ${internalNotes}`.trim(),
            recorded_by: userData.user.id
          })
          .select()
          .single();
        
        if (recordError) throw recordError;
        refundRecord = recordData;
      } else {
        refundRecord = ledgerData;
      }

      // Create financial transaction records for double-entry bookkeeping (optional)
      try {
        for (const item of breakdown) {
          await supabase
            .from('financial_transactions')
            .insert({
              quote_id: quote.id,
              transaction_type: refundType === 'credit_note' ? 'credit_note' : 'refund',
              debit_account: 'accounts_receivable',
              credit_account: refundMethod === 'bank_transfer' ? 'bank_account' : 'payment_gateway',
              amount: item.amount,
              currency: quote.currency,
              base_amount: item.amount, // Assuming same currency for now
              transaction_date: new Date().toISOString(),
              reference_number: refundRecord.reference_number,
              description: `${reason} - Refund via ${item.gateway}`,
              created_by: userData.user.id
            });
        }
      } catch (financialError) {
        console.warn('financial_transactions table not available, skipping double-entry records:', financialError);
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
                          <p className="text-sm font-medium">
                            {payment.gateway} - {quote.currency} {payment.amount.toFixed(2)}
                            {payment.gateway === 'payu' && payment.canRefund && (
                              <Badge variant="success" className="ml-2 text-xs">
                                Auto-refund available
                              </Badge>
                            )}
                          </p>
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

          {/* PayU Auto-Refund Notice */}
          {(() => {
            const breakdown = refundAmount && selectedPayments.length > 0 
              ? calculateRefundBreakdown() 
              : [];
            const isPayUAutoRefund = refundMethod === 'original' && 
              breakdown.length === 1 && 
              breakdown[0]?.gateway === 'payu';
            
            if (isPayUAutoRefund) {
              return (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Automatic PayU Refund Available!</strong> This refund will be automatically processed through PayU's API. 
                    The customer will receive the refund to their original payment method within 5-7 business days.
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
            onClick={processRefund}
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