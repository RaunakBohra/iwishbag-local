import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus,
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrencySymbol } from '@/lib/currencyUtils';

type PaymentMethodType = 'bank_transfer' | 'stripe' | 'paypal' | 'wire_transfer' | 'cash' | 'other';

interface PaymentRecordSectionProps {
  quoteId: string;
  currency: string;
  currencySymbol: string;
  remainingAmount: number;
  formatAmount: (amount: number) => string;
  onPaymentRecorded: () => void;
}

export const PaymentRecordSection: React.FC<PaymentRecordSectionProps> = ({
  quoteId,
  currency,
  currencySymbol,
  remainingAmount,
  formatAmount,
  onPaymentRecorded,
}) => {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('bank_transfer');
  const [paymentCurrency, setPaymentCurrency] = useState<string>(currency);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const { toast } = useToast();

  const getPaymentMethodIcon = (method: PaymentMethodType) => {
    switch (method) {
      case 'bank_transfer':
        return <CreditCard className="w-4 h-4" />;
      case 'stripe':
        return <CreditCard className="w-4 h-4" />;
      case 'paypal':
        return <DollarSign className="w-4 h-4" />;
      case 'wire_transfer':
        return <Banknote className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethodType) => {
    switch (method) {
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'stripe':
        return 'Stripe';
      case 'paypal':
        return 'PayPal';
      case 'wire_transfer':
        return 'Wire Transfer';
      case 'cash':
        return 'Cash';
      default:
        return 'Other';
    }
  };

  const paymentMethods: PaymentMethodType[] = [
    'bank_transfer',
    'stripe',
    'paypal',
    'wire_transfer',
    'cash',
    'other'
  ];

  const currencyOptions = ['USD', 'INR', 'NPR', 'EUR', 'GBP'];

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    if (!transactionId.trim()) {
      toast({
        title: 'Transaction ID Required',
        description: 'Please enter a transaction ID for this payment',
        variant: 'destructive',
      });
      return;
    }

    setIsRecording(true);
    
    try {
      const { data: _data, error } = await supabase.rpc('record_payment_with_ledger_and_triggers', {
        p_quote_id: quoteId,
        p_amount: amount,
        p_currency: paymentCurrency,
        p_payment_method: paymentMethod,
        p_transaction_id: transactionId.trim(),
        p_notes: paymentNotes.trim() || null,
        p_payment_date: paymentDate,
      });

      if (error) {
        console.error('Payment recording error:', error);
        toast({
          title: 'Payment Recording Failed',
          description: error.message || 'Failed to record payment. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Clear form
      setPaymentAmount('');
      setTransactionId('');
      setPaymentNotes('');
      setPaymentDate(new Date().toISOString().split('T')[0]);

      toast({
        title: 'Payment Recorded',
        description: `Successfully recorded payment of ${getCurrencySymbol(paymentCurrency)}${amount.toFixed(2)}`,
      });

      // Notify parent component to refresh data
      onPaymentRecorded();
      
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Unexpected Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRecording(false);
    }
  };

  const fillRemainingAmount = () => {
    if (remainingAmount > 0) {
      setPaymentAmount(remainingAmount.toString());
    }
  };

  const validateAmount = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount)) return null;
    if (amount <= 0) return 'Amount must be greater than zero';
    if (amount > remainingAmount * 2) return 'Amount seems unusually high for this order';
    return null;
  };

  const amountError = validateAmount();

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="border-dashed border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Record New Payment</h3>
              <p className="text-sm text-blue-700">
                Outstanding balance: {formatAmount(remainingAmount)}
              </p>
            </div>
            {remainingAmount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={fillRemainingAmount}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Fill Remaining
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount and Currency Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount *</Label>
              <div className="relative">
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className={amountError ? 'border-red-500' : ''}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-500 text-sm">{currencySymbol}</span>
                </div>
              </div>
              {amountError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {amountError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-currency">Currency</Label>
              <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                <SelectTrigger id="payment-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {getCurrencySymbol(curr)} {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method and Transaction ID Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethodType) => setPaymentMethod(value)}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(method)}
                        {getPaymentMethodLabel(method)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID *</Label>
              <Input
                id="transaction-id"
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="TXN123456789"
                className="font-mono"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="payment-date">Payment Date</Label>
            <div className="relative">
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="payment-notes">Payment Notes (Optional)</Label>
            <Textarea
              id="payment-notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Add any additional notes about this payment..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {paymentAmount && !amountError && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Payment Summary:</strong> Recording {getCurrencySymbol(paymentCurrency)}{parseFloat(paymentAmount || '0').toFixed(2)} 
                via {getPaymentMethodLabel(paymentMethod)} on {new Date(paymentDate).toLocaleDateString()}
                {transactionId && ` (ID: ${transactionId})`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleRecordPayment}
          disabled={isRecording || !paymentAmount || !transactionId || !!amountError}
          className="min-w-[140px]"
        >
          {isRecording ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
};