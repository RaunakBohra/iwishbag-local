import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Calendar,
  User,
  Info
} from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { DueAmountNotification } from '../../payment/DueAmountNotification';
import { EnhancedPaymentLinkGenerator } from '../../payment/EnhancedPaymentLinkGenerator';
import { DueAmountInfo } from '@/lib/paymentUtils';

interface Quote {
  id: string;
  display_id?: string;
  final_total_usd?: number;
  amount_paid?: number;
  currency?: string;
  payment_method?: string;
  shipping_address?: {
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
  customer_name?: string;
  customer_phone?: string;
  email?: string;
  user_id?: string;
  destination_country?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface PaymentSummary {
  totalPaid: number;
  totalRefunds: number;
  remaining: number;
  currencyBreakdown: Record<string, number>;
  hasMultipleCurrencies: boolean;
  recentPayments: number;
  paymentCount: number;
}

interface PaymentOverviewSectionProps {
  quote: Quote;
  paymentSummary: PaymentSummary;
  currency: string;
  currencySymbol: string;
  formatAmount: (amount: number) => string;
  dueAmountInfo: DueAmountInfo | null;
  onDueAmountChange: (newAmount: number) => Promise<void>;
  isDueProcessing: boolean;
}

export const PaymentOverviewSection: React.FC<PaymentOverviewSectionProps> = ({
  quote,
  paymentSummary,
  currency,
  currencySymbol,
  formatAmount,
  dueAmountInfo,
  onDueAmountChange,
  isDueProcessing,
}) => {
  const customerData = customerDisplayUtils.getCustomerDisplayData(quote, quote.profiles);
  
  const getPaymentStatus = () => {
    const remaining = paymentSummary.remaining;
    if (remaining <= 0) {
      return { status: 'paid', color: 'text-green-600 bg-green-100', label: 'Fully Paid' };
    } else if (paymentSummary.totalPaid > 0) {
      return { status: 'partial', color: 'text-yellow-600 bg-yellow-100', label: 'Partially Paid' };
    } else {
      return { status: 'pending', color: 'text-red-600 bg-red-100', label: 'Payment Pending' };
    }
  };

  const getPaymentMethodIcon = (method: string | null | undefined) => {
    if (!method) return <DollarSign className="w-5 h-5" />;
    switch (method.toLowerCase()) {
      case 'bank_transfer':
        return <CreditCard className="w-5 h-5" />;
      case 'stripe':
        return <CreditCard className="w-5 h-5" />;
      case 'paypal':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const paymentStatus = getPaymentStatus();

  return (
    <div className="space-y-6">
      {/* Payment Status Alert */}
      <Alert className={cn(
        'border-l-4',
        paymentStatus.status === 'paid' && 'border-l-green-500 bg-green-50',
        paymentStatus.status === 'partial' && 'border-l-yellow-500 bg-yellow-50',
        paymentStatus.status === 'pending' && 'border-l-red-500 bg-red-50'
      )}>
        <div className="flex items-center gap-2">
          {paymentStatus.status === 'paid' && <CheckCircle className="h-5 w-5 text-green-600" />}
          {paymentStatus.status === 'partial' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
          {paymentStatus.status === 'pending' && <AlertCircle className="h-5 w-5 text-red-600" />}
        </div>
        <AlertDescription className="ml-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{paymentStatus.label}</p>
              <p className="text-sm text-muted-foreground">
                {paymentStatus.status === 'paid' && 'All payments have been received for this order.'}
                {paymentStatus.status === 'partial' && `${formatAmount(Math.abs(paymentSummary.remaining))} remaining to be paid.`}
                {paymentStatus.status === 'pending' && 'No payments have been recorded for this order.'}
              </p>
            </div>
            <Badge variant="secondary" className={paymentStatus.color}>
              {paymentStatus.label}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Customer Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer Name</p>
              <p className="font-medium">{customerData.name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customerData.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customerData.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono text-sm">{quote.display_id || quote.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="text-2xl font-bold">
                  {formatAmount(parseFloat(quote.final_total_usd?.toString() || '0'))}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {currencySymbol}{paymentSummary.totalPaid.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={cn(
                  "text-2xl font-bold",
                  paymentSummary.remaining <= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {currencySymbol}{Math.abs(paymentSummary.remaining).toFixed(2)}
                </p>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                paymentSummary.remaining <= 0 ? "bg-green-100" : "bg-red-100"
              )}>
                <DollarSign className={cn(
                  "h-6 w-6",
                  paymentSummary.remaining <= 0 ? "text-green-600" : "text-red-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getPaymentMethodIcon(quote.payment_method)}
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method:</span>
                <Badge variant="outline" className="capitalize">
                  {quote.payment_method?.replace('_', ' ') || 'Not specified'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Currency:</span>
                <span className="font-medium">{currency}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payments:</span>
                <span className="font-medium">{paymentSummary.paymentCount} total</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Refunds:</span>
                <span className="font-medium">
                  {currencySymbol}{paymentSummary.totalRefunds.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Currency Breakdown */}
      {paymentSummary.hasMultipleCurrencies && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="w-5 h-5" />
              Multi-Currency Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(paymentSummary.currencyBreakdown).map(([curr, netAmount]) => (
                <div key={curr} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">{curr}:</span>
                  <span className={cn(
                    'font-medium',
                    netAmount > 0 ? 'text-green-700' : netAmount < 0 ? 'text-red-700' : 'text-gray-700',
                  )}>
                    {getCurrencySymbol(curr)}{Math.abs(netAmount).toFixed(2)}
                    {netAmount < 0 && ' (refunded)'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Amount Management */}
      {dueAmountInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="w-5 h-5" />
              Due Amount Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DueAmountNotification
              dueAmountInfo={dueAmountInfo}
              onAmountChange={onDueAmountChange}
              isProcessing={isDueProcessing}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment Link Generation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5" />
            Payment Link Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedPaymentLinkGenerator
            quoteId={quote.id}
            customerEmail={customerData.email}
            amount={Math.abs(paymentSummary.remaining)}
            currency={currency}
          />
        </CardContent>
      </Card>
    </div>
  );
};