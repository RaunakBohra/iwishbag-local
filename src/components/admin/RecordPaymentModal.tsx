import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, DollarSign, Plus, CreditCard, Banknote, Smartphone, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol, getCountryCurrency, getDestinationCountryFromQuote, formatAmountForDisplay } from '@/lib/currencyUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { currencyService } from '@/services/CurrencyService';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any;
  existingPayments?: any[];
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  quote,
  existingPayments = [],
}) => {
  const [notes, setNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isRecording, setIsRecording] = useState(false);
  const { formatAmount } = useQuoteDisplayCurrency({ quote });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get currency information
  const destinationCountry = quote ? getDestinationCountryFromQuote(quote) : 'US';
  const currency = getCountryCurrency(destinationCountry);
  const currencySymbol = getCurrencySymbol(currency);

  // Calculate total paid and remaining
  const totalPaid = existingPayments.reduce((sum, payment) => 
    payment.transaction_type === 'payment' ? sum + (payment.amount || 0) : sum - (payment.amount || 0), 0
  );
  const remaining = (quote.final_total || 0) - totalPaid;
  const paymentStatus = remaining <= 0 ? 'paid' : 'partial';

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && remaining > 0) {
      setAmountReceived(remaining.toFixed(2));
      setNotes('');
      setTransactionId('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, remaining]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAmountReceived(value);
    }
  };

  const handleConfirm = async () => {
    const amount = parseFloat(amountReceived);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    setIsRecording(true);
    
    try {
      // Record payment using RPC function
      const { data, error } = await supabase.rpc('record_payment_with_ledger_and_triggers', {
        p_quote_id: quote.id,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: paymentMethod,
        p_transaction_reference: transactionId || `MANUAL-${Date.now()}`,
        p_notes: notes,
        p_recorded_by: (await supabase.auth.getUser()).data.user?.id || null,
        p_payment_date: paymentDate
      });

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `Successfully recorded ${formatAmountForDisplay(amount, currency)} payment.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-ledger', quote.id] });
      queryClient.invalidateQueries({ queryKey: ['transaction-history', quote.id] });

      onClose();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer', icon: <Banknote className="w-4 h-4" /> },
    { value: 'payu', label: 'PayU', icon: <CreditCard className="w-4 h-4" /> },
    { value: 'stripe', label: 'Stripe', icon: <Globe className="w-4 h-4" /> },
    { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
    { value: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4" /> },
    { value: 'other', label: 'Other', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a new payment for order {quote.display_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="font-medium">{formatAmount(quote.final_total)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Already Paid</span>
              <span className="font-medium text-green-600">
                {formatAmountForDisplay(totalPaid, currency)}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-medium">Remaining</span>
              <span className="font-semibold text-lg">
                {formatAmountForDisplay(Math.max(0, remaining), currency)}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          {method.icon}
                          <span>{method.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
              <Input
                id="transaction-id"
                placeholder="Enter transaction reference number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount Received ({currencySymbol})
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={handleAmountChange}
                  className="pl-10"
                />
              </div>
              {parseFloat(amountReceived) > remaining && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This payment exceeds the remaining balance. The order will be marked as overpaid.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this payment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRecording}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isRecording || !amountReceived || parseFloat(amountReceived) <= 0}
          >
            {isRecording ? (
              <>Recording...</>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};