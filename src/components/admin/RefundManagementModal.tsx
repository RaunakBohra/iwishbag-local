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
import { RefreshCcw, AlertCircle, CreditCard, Building, FileText } from 'lucide-react';

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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Process refund
              console.log({
                refundType,
                refundAmount,
                selectedPayments,
                refundMethod,
                reason,
                internalNotes,
                breakdown: calculateRefundBreakdown()
              });
              onClose();
            }}
            disabled={
              !refundAmount || 
              !selectedPayments.length || 
              !reason ||
              parseFloat(refundAmount) > maxRefundable
            }
          >
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};