/**
 * PaymentAmountSection Component
 * Handles payment amount configuration and smart analysis
 * Extracted from EnhancedPaymentLinkGenerator for better maintainability
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface QuoteData {
  id?: string;
  display_id?: string;
  order_display_id?: string;
  product_name?: string;
  final_total_usd?: number;
  amount_paid?: number;
  payment_status?: string;
  approved_at?: string;
  priority?: 'high' | 'urgent' | 'normal';
}

interface PaymentAmountFormData {
  name: string;
  email: string;
  phone: string;
  description: string;
  expiryDays: number;
}

interface PaymentAmountSectionProps {
  amount: number;
  quote?: QuoteData;
  formData: PaymentAmountFormData;
  onFormDataChange: (field: keyof PaymentAmountFormData, value: any) => void;
  className?: string;
}

export const PaymentAmountSection: React.FC<PaymentAmountSectionProps> = ({
  amount,
  quote,
  formData,
  onFormDataChange,
  className = '',
}) => {
  // Smart amount analysis
  const getAmountInfo = () => {
    if (!quote) {
      return {
        isDueAmount: false,
        totalAmount: amount,
        paidAmount: 0,
        dueAmount: amount,
        paymentStatus: 'unknown',
      };
    }

    const totalAmount = quote.final_total_usd || 0;
    const paidAmount = quote.amount_paid || 0;
    const dueAmount = totalAmount - paidAmount;
    const isDueAmount = paidAmount > 0 && dueAmount > 0;

    return {
      isDueAmount,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentStatus: quote.payment_status || 'pending',
    };
  };

  const amountInfo = getAmountInfo();

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
      partial: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Partially Paid' },
      pending: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Pending' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Failed' },
      unknown: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Unknown' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
    const Icon = config.icon;

    return (
      <Badge className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    const priorityConfig = {
      high: { color: 'bg-orange-100 text-orange-800', label: 'High Priority' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
      normal: { color: 'bg-blue-100 text-blue-800', label: 'Normal' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig];
    if (!config) return null;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>

        {/* Amount Analysis */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payment Amount Analysis
            </CardTitle>
            <CardDescription>
              Smart analysis of payment amounts and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Amount to Collect</Label>
                <p className="text-2xl font-bold text-green-600">
                  ${amount.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Payment Status</Label>
                <div className="mt-1">
                  {getPaymentStatusBadge(amountInfo.paymentStatus)}
                </div>
              </div>
            </div>

            {quote && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">Total Amount</Label>
                    <p className="font-semibold">${amountInfo.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Already Paid</Label>
                    <p className="font-semibold text-blue-600">${amountInfo.paidAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Due Amount</Label>
                    <p className="font-semibold text-orange-600">${amountInfo.dueAmount.toFixed(2)}</p>
                  </div>
                </div>

                {amountInfo.isDueAmount && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This appears to be a partial payment request. Customer has already paid ${amountInfo.paidAmount.toFixed(2)} 
                      out of ${amountInfo.totalAmount.toFixed(2)} total.
                    </AlertDescription>
                  </Alert>
                )}

                {quote.priority && (
                  <div>
                    <Label className="text-gray-600">Priority</Label>
                    <div className="mt-1">
                      {getPriorityBadge(quote.priority)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Customer details for the payment link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => onFormDataChange('name', e.target.value)}
                placeholder="Enter customer name"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => onFormDataChange('email', e.target.value)}
                  placeholder="customer@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => onFormDataChange('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Description */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Payment Description</CardTitle>
            <CardDescription>
              Description that will appear on the payment page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => onFormDataChange('description', e.target.value)}
                placeholder="Payment for order #12345..."
                className="mt-1 min-h-[100px]"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">
                This description will help customers identify what they're paying for
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Link Settings</CardTitle>
            <CardDescription>
              Configure how long the payment link remains active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Expires in (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={formData.expiryDays}
                onChange={(e) => onFormDataChange('expiryDays', parseInt(e.target.value) || 7)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-2">
                Link will expire in {formData.expiryDays} day{formData.expiryDays !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};