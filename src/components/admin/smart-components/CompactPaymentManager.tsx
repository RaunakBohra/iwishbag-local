// ============================================================================
// COMPACT PAYMENT MANAGER - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Payment status, gateway info, transaction tracking, quick actions
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Receipt,
  ChevronDown,
  ChevronUp,
  Copy,
  Building,
  Smartphone,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

interface PaymentInfo {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  gateway: 'payu' | 'stripe' | 'bank_transfer' | 'esewa' | 'khalti' | 'fonepay';
  amount: number;
  currency: string;
  transaction_id?: string;
  gateway_reference?: string;
  paid_at?: string;
  due_date?: string;
  payment_link?: string;
}

interface CompactPaymentManagerProps {
  quote: UnifiedQuote;
  paymentInfo?: PaymentInfo;
  onPaymentUpdate: () => void;
  compact?: boolean;
}

export const CompactPaymentManager: React.FC<CompactPaymentManagerProps> = ({
  quote,
  paymentInfo,
  onPaymentUpdate,
  compact = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  // Get standardized currency display
  const currencyDisplay = useAdminQuoteCurrency(quote);

  // Default payment info if not provided
  const payment: PaymentInfo = paymentInfo || {
    status: quote.status === 'paid' ? 'completed' : 'pending',
    gateway: 'payu', // Default gateway
    amount: quote.final_total_usd,
    currency: quote.currency || 'USD',
  };

  const getStatusConfig = (status: PaymentInfo['status']) => {
    const configs = {
      pending: {
        label: 'Payment Pending',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="w-3 h-3" />,
        description: 'Awaiting customer payment',
      },
      processing: {
        label: 'Processing',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        description: 'Payment being processed',
      },
      completed: {
        label: 'Paid',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="w-3 h-3" />,
        description: 'Payment completed successfully',
      },
      failed: {
        label: 'Payment Failed',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertTriangle className="w-3 h-3" />,
        description: 'Payment failed or declined',
      },
      refunded: {
        label: 'Refunded',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <RefreshCw className="w-3 h-3" />,
        description: 'Payment has been refunded',
      },
    };

    return configs[status];
  };

  const getGatewayConfig = (gateway: PaymentInfo['gateway']) => {
    const configs = {
      payu: { name: 'PayU', icon: <CreditCard className="w-3 h-3" />, color: 'text-green-600' },
      stripe: { name: 'Stripe', icon: <CreditCard className="w-3 h-3" />, color: 'text-blue-600' },
      bank_transfer: {
        name: 'Bank Transfer',
        icon: <Building className="w-3 h-3" />,
        color: 'text-gray-600',
      },
      esewa: { name: 'eSewa', icon: <Smartphone className="w-3 h-3" />, color: 'text-green-600' },
      khalti: {
        name: 'Khalti',
        icon: <Smartphone className="w-3 h-3" />,
        color: 'text-purple-600',
      },
      fonepay: {
        name: 'FonePay',
        icon: <Smartphone className="w-3 h-3" />,
        color: 'text-blue-600',
      },
    };

    return configs[gateway];
  };

  const statusConfig = getStatusConfig(payment.status);
  const gatewayConfig = getGatewayConfig(payment.gateway);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Compact header view
  const CompactHeader = () => (
    <div className="p-4">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900 text-sm">Payment</span>
          <Badge className={`text-xs border ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.label}</span>
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-900">
            {currencyDisplay.formatDualAmount(payment.amount).short}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {gatewayConfig.icon}
            <span>{gatewayConfig.name}</span>
          </div>
          <span className="font-medium">{payment.currency}</span>
        </div>

        {payment.transaction_id && (
          <div className="flex items-center justify-between">
            <span>Transaction ID:</span>
            <div className="flex items-center space-x-1">
              <span className="font-mono">{payment.transaction_id.slice(-8)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(payment.transaction_id || '')}
                className="h-4 w-4 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {payment.status === 'pending' && (
        <div className="mt-3 flex space-x-2">
          <Button size="sm" className="h-7 text-xs flex-1">
            Send Payment Link
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Mark Paid
          </Button>
        </div>
      )}
    </div>
  );

  // Expandable detail tabs
  const ExpandedDetails = () => (
    <div className="border-t border-gray-100">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
          <TabsTrigger value="status" className="text-xs">
            Status
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            Details
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="p-4 pt-3 space-y-3">
          {/* Payment Status Details */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {statusConfig.icon}
                <span className="font-medium text-sm">{statusConfig.label}</span>
              </div>
              <span className="text-xs text-gray-500">
                {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Not paid'}
              </span>
            </div>
            <p className="text-xs text-gray-600">{statusConfig.description}</p>
          </div>

          {/* Payment Timeline */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Payment Timeline</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Quote sent:</span>
                <span>2 days ago</span>
              </div>
              {payment.due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment due:</span>
                  <span
                    className={payment.status === 'pending' ? 'text-orange-600' : 'text-gray-900'}
                  >
                    {new Date(payment.due_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {payment.paid_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Paid on:</span>
                  <span className="text-green-600">
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="p-4 pt-3 space-y-3">
          {/* Payment Gateway Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-500 mb-1">Gateway</div>
                <div className="flex items-center space-x-1">
                  {gatewayConfig.icon}
                  <span className="font-medium">{gatewayConfig.name}</span>
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Amount</div>
                <div className="font-medium">
                  {currencyDisplay.formatDualAmount(payment.amount).short}
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            {payment.transaction_id && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-gray-700">Transaction Details</div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono">{payment.transaction_id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(payment.transaction_id || '')}
                        className="h-4 w-4 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {payment.gateway_reference && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Gateway Reference:</span>
                      <span className="font-mono">{payment.gateway_reference}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="actions" className="p-4 pt-3">
          <div className="space-y-3">
            {/* Primary Actions */}
            <div className="space-y-2">
              {payment.status === 'pending' && (
                <>
                  <Button size="sm" className="w-full h-8 text-xs justify-start">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Send Payment Link
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Mark as Paid
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">
                    <Receipt className="w-3 h-3 mr-2" />
                    Upload Payment Proof
                  </Button>
                </>
              )}

              {payment.status === 'completed' && (
                <>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">
                    <Receipt className="w-3 h-3 mr-2" />
                    Download Receipt
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Process Refund
                  </Button>
                </>
              )}

              {payment.status === 'failed' && (
                <>
                  <Button size="sm" className="w-full h-8 text-xs justify-start">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Retry Payment
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Contact Customer
                  </Button>
                </>
              )}
            </div>

            {/* Gateway Actions */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-2">Gateway Actions</div>
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs justify-start">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  View in {gatewayConfig.name}
                </Button>
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs justify-start">
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Sync Payment Status
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden">
      <CompactHeader />
      {isExpanded && <ExpandedDetails />}
    </Card>
  );
};

export default CompactPaymentManager;
