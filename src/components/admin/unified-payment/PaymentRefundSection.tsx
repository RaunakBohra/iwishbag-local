import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw,
  AlertCircle,
  DollarSign,
  CreditCard,
  Loader2
} from 'lucide-react';
import { CurrencyService } from '@/services/CurrencyService';

interface PaymentLedgerEntry {
  id: string;
  amount: number;
  currency?: string;
  transaction_type?: string;
  payment_type?: string;
  payment_method?: string;
  gateway_code?: string;
  reference_number?: string;
  gateway_transaction_id?: string;
  transaction_id?: string;
  status?: string;
  created_at: string;
  payment_date?: string;
  gateway_response?: any;
}

interface RefundablePayment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  gateway: string;
  reference: string;
  date: Date;
  canRefund: boolean;
}

interface Quote {
  id: string;
  final_total_usd?: number;
  payment_method?: string;
}

interface PaymentSummary {
  totalPaid: number;
  isOverpaid: boolean;
  overpaidAmount: number;
}

interface PaymentRefundSectionProps {
  quote: Quote;
  paymentSummary: PaymentSummary;
  paymentLedger: PaymentLedgerEntry[] | null;
  currency: string;
  onOpenRefundModal: () => void;
}

const currencyService = CurrencyService.getInstance();

export const PaymentRefundSection: React.FC<PaymentRefundSectionProps> = ({
  quote,
  paymentSummary,
  paymentLedger,
  currency,
  onOpenRefundModal,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeRefundablePayments = (): RefundablePayment[] => {
    if (!paymentLedger || paymentLedger.length === 0) {
      return [];
    }

    return paymentLedger
      .filter((p) => {
        const type = p.transaction_type || p.payment_type;
        const isPayment =
          type === 'payment' ||
          type === 'customer_payment' ||
          type === 'manual_payment' ||
          (p.status === 'completed' && (p.amount || 0) > 0);
        return isPayment;
      })
      .map((p) => {
        // Check if this is a PayU payment
        const isPayU =
          p.gateway_code === 'payu' ||
          p.payment_method === 'payu' ||
          p.payment_method?.toLowerCase() === 'payu' ||
          (p.gateway_response &&
            typeof p.gateway_response === 'object' &&
            p.gateway_response.key?.includes('JP'));

        // Check if this is a PayPal payment
        const isPayPal =
          p.gateway_code === 'paypal' ||
          p.payment_method === 'paypal' ||
          p.payment_method?.toLowerCase() === 'paypal' ||
          (p.gateway_response &&
            typeof p.gateway_response === 'object' &&
            p.gateway_response.id &&
            p.gateway_response.status);

        const payment: RefundablePayment = {
          id: p.id,
          amount: Math.abs(p.amount || 0),
          currency: p.currency || currency,
          method: p.payment_method || '',
          gateway: p.gateway_code || p.payment_method || '',
          reference:
            p.gateway_transaction_id ||
            p.reference_number ||
            p.transaction_id ||
            p.gateway_response?.payu_id ||
            p.gateway_response?.mihpayid ||
            p.gateway_response?.gateway_transaction_id ||
            '',
          date: new Date(p.payment_date || p.created_at),
          canRefund: isPayU || isPayPal || p.payment_method === 'bank_transfer',
        };
        
        return payment;
      });
  };

  const refundablePayments = analyzeRefundablePayments();
  const totalRefundableAmount = refundablePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const refundableCount = refundablePayments.filter(p => p.canRefund).length;

  const handleAnalyzePayments = async () => {
    setIsAnalyzing(true);
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsAnalyzing(false);
  };

  const getPaymentMethodIcon = (method: string) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('payu') || lowerMethod.includes('stripe')) {
      return <CreditCard className="w-4 h-4" />;
    }
    return <DollarSign className="w-4 h-4" />;
  };

  const getRefundCapability = (payment: RefundablePayment) => {
    if (payment.canRefund) {
      if (payment.gateway === 'payu' || payment.method?.toLowerCase() === 'payu') {
        return { status: 'automatic', label: 'Auto Refund (PayU)' };
      }
      if (payment.gateway === 'paypal' || payment.method?.toLowerCase() === 'paypal') {
        return { status: 'automatic', label: 'Auto Refund (PayPal)' };
      }
      if (payment.method === 'bank_transfer') {
        return { status: 'manual', label: 'Manual Refund' };
      }
      return { status: 'automatic', label: 'Auto Refund' };
    }
    return { status: 'unsupported', label: 'Not Refundable' };
  };

  return (
    <div className="space-y-6">
      {/* Refund Overview */}
      <Card className="border-dashed border-2 border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-orange-900">Refund Management</h3>
              <p className="text-sm text-orange-700">
                {paymentSummary.totalPaid > 0 
                  ? `${refundableCount} of ${refundablePayments.length} payments can be refunded`
                  : 'No payments available to refund'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-700">Available to Refund</p>
              <p className="font-bold text-orange-900">
                {currencyService.formatAmount(totalRefundableAmount, currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Analysis */}
      {paymentSummary.totalPaid > 0 ? (
        <div className="space-y-4">
          {/* Payment Summary Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>
                  <strong>Total paid amount:</strong>{' '}
                  {currencyService.formatAmount(paymentSummary.totalPaid, currency)}
                </p>
                {paymentSummary.isOverpaid && (
                  <p className="text-teal-600">
                    <strong>Overpaid by:</strong>{' '}
                    {currencyService.formatAmount(paymentSummary.overpaidAmount, currency)}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Payment Breakdown */}
          {refundablePayments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Payment Breakdown</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAnalyzePayments}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Analyze
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {refundablePayments.map((payment) => {
                    const capability = getRefundCapability(payment);
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          {getPaymentMethodIcon(payment.method)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {currencyService.formatAmount(payment.amount, payment.currency)}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                via {payment.method?.replace('_', ' ').toUpperCase() || 'Unknown'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {payment.date.toLocaleDateString()}
                              {payment.reference && ` • Ref: ${payment.reference.substring(0, 12)}...`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            capability.status === 'automatic'
                              ? 'bg-green-100 text-green-700'
                              : capability.status === 'manual'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {capability.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Action */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <RefreshCw className="w-12 h-12 mx-auto text-blue-500 mb-3" />
                  <h3 className="font-medium">Process Refund</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the refund manager to process full or partial refunds
                  </p>
                </div>
                
                <Button onClick={onOpenRefundModal} size="lg" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Open Refund Manager
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Automatic refunds are processed instantly</p>
                  <p>• Manual refunds require additional verification</p>
                  <p>• Refunds are processed in the original payment currency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No payments to refund</p>
          <p className="text-sm mt-1">No payments have been recorded for this order yet</p>
        </div>
      )}
    </div>
  );
};