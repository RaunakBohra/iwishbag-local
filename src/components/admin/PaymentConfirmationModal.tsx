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
import { AlertCircle, CheckCircle, DollarSign, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol, getCountryCurrency, getDestinationCountryFromQuote } from '@/lib/currencyUtils';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, notes: string) => void;
  quote: any;
  isConfirming: boolean;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quote,
  isConfirming,
}) => {
  const [notes, setNotes] = useState('');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const { formatAmount } = useQuoteDisplayCurrency({ quote });
  
  // Get currency information
  const destinationCountry = quote ? getDestinationCountryFromQuote(quote) : 'US';
  const currency = getCountryCurrency(destinationCountry);
  const currencySymbol = getCurrencySymbol(currency);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountReceived(quote.final_total?.toString() || '');
      setNotes('');
    }
  }, [isOpen, quote.final_total]);

  const handleConfirm = () => {
    const amount = parseFloat(amountReceived) || 0;
    onConfirm(amount, notes);
  };

  const amount = parseFloat(amountReceived) || 0;
  const expectedAmount = quote.final_total || 0;
  const isPartialPayment = amount < expectedAmount;
  const isOverpayment = amount > expectedAmount;
  const paymentDifference = Math.abs(amount - expectedAmount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Confirm Payment Received</DialogTitle>
          <DialogDescription>
            Enter the actual amount received and confirm the payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Order ID:</strong> {quote.display_id || quote.id}</p>
                <p><strong>Customer:</strong> {quote.customer_name || quote.email}</p>
                <p><strong>Payment Method:</strong> {quote.payment_method === 'bank_transfer' ? 'Bank Transfer' : quote.payment_method?.toUpperCase()}</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount Expected</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="text-muted-foreground font-medium">{currencySymbol}</span>
                <span className="font-semibold">{formatAmount(expectedAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Received ({currency})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {currencySymbol}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="pl-12"
                />
              </div>
            </div>
          </div>

          {/* Payment Status Alert */}
          {amount > 0 && (
            <>
              {isPartialPayment && (
                <Alert variant="warning" className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Partial Payment:</strong> {currencySymbol}{amount.toFixed(2)} of {currencySymbol}{expectedAmount.toFixed(2)} 
                    <span className="ml-2 text-orange-700">({currencySymbol}{paymentDifference.toFixed(2)} remaining)</span>
                  </AlertDescription>
                </Alert>
              )}

              {isOverpayment && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Overpayment:</strong> {currencySymbol}{paymentDifference.toFixed(2)} extra received
                    <span className="ml-2 text-blue-700">(Total: {currencySymbol}{amount.toFixed(2)})</span>
                  </AlertDescription>
                </Alert>
              )}

              {!isPartialPayment && !isOverpayment && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Full Payment:</strong> Amount matches expected total
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment (e.g., transaction reference, bank details, partial payment reason, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-800">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Payment will be recorded and:</span>
            </div>
            <ul className="space-y-1 text-gray-700 ml-6">
              {isPartialPayment ? (
                <>
                  <li>• Order status will change to "Partial Payment"</li>
                  <li>• Customer can be notified about remaining balance</li>
                  <li>• You can record additional payments later</li>
                </>
              ) : isOverpayment ? (
                <>
                  <li>• Order status will change to "Overpaid"</li>
                  <li>• Overpayment amount will be tracked</li>
                  <li>• Consider refunding the excess amount</li>
                </>
              ) : (
                <>
                  <li>• Order status will change to "Paid"</li>
                  <li>• Customer will be notified via email</li>
                  <li>• Order will proceed to processing</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isConfirming || amount <= 0}
            className={isPartialPayment ? 'bg-orange-600 hover:bg-orange-700' : isOverpayment ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {isConfirming ? 'Confirming...' : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};