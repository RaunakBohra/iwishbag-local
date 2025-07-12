import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Receipt,
  Banknote,
  Smartphone,
  ExternalLink,
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PaymentManagementWidgetProps {
  quote: Tables<'quotes'>;
}

export const PaymentManagementWidget: React.FC<PaymentManagementWidgetProps> = ({ quote }) => {
  const { toast } = useToast();
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Fetch payment transaction details
  const { data: paymentTransaction } = useQuery({
    queryKey: ['payment-transaction', quote.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!quote.payment_transaction_id || quote.payment_status === 'paid'
  });

  // Fetch payment proofs for bank transfers
  const { data: paymentProofs } = useQuery({
    queryKey: ['payment-proofs', quote.id],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_id', quote.id)
        .eq('message_type', 'payment_proof')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return messages;
    },
    enabled: quote.payment_method === 'bank_transfer'
  });

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'bank_transfer':
        return <Banknote className="h-4 w-4" />;
      case 'payu':
        return <Smartphone className="h-4 w-4" />;
      case 'stripe':
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'unpaid':
        return 'destructive';
      case 'overpaid':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleViewProof = (proofUrl: string) => {
    window.open(proofUrl, '_blank');
  };

  // Extract payment details from different sources
  const paymentDetails = quote.payment_details as any || {};
  const transactionData = paymentTransaction?.gateway_response as any || {};
  
  // Determine actual amount paid
  const amountPaid = quote.amount_paid || paymentTransaction?.amount || 0;
  const paymentCurrency = paymentTransaction?.currency || quote.final_currency || 'USD';
  const outstandingAmount = (quote.final_total || 0) - amountPaid;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Information
            </span>
            {quote.payment_status && (
              <Badge variant={getPaymentStatusColor(quote.payment_status)}>
                {quote.payment_status === 'partial' 
                  ? `Partial (${paymentCurrency} ${amountPaid.toFixed(2)} of ${quote.final_total?.toFixed(2)})`
                  : quote.payment_status.charAt(0).toUpperCase() + quote.payment_status.slice(1)
                }
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="font-semibold">
                {quote.final_currency} {quote.final_total?.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className={cn(
                "font-semibold",
                amountPaid > 0 ? "text-green-600" : "text-gray-500"
              )}>
                {paymentCurrency} {amountPaid.toFixed(2)}
              </span>
            </div>

            {outstandingAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <span className="font-semibold text-orange-600">
                  {quote.final_currency} {outstandingAmount.toFixed(2)}
                </span>
              </div>
            )}

            <Separator />

            {/* Payment Method Details */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <div className="flex items-center gap-2">
                {getPaymentMethodIcon(quote.payment_method || '')}
                <span className="font-medium">
                  {quote.payment_method?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Transaction Details for Online Payments */}
            {(paymentTransaction || quote.payment_transaction_id) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transaction ID</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 font-mono text-xs"
                    onClick={() => setShowTransactionDetails(true)}
                  >
                    {quote.payment_transaction_id || paymentTransaction?.id || 'View Details'}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>

                {quote.paid_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Date</span>
                    <span className="text-sm">
                      {format(new Date(quote.paid_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Bank Transfer Proof Status */}
            {quote.payment_method === 'bank_transfer' && paymentProofs && paymentProofs.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Payment Proofs</span>
                  <Badge variant="outline">{paymentProofs.length} submitted</Badge>
                </div>
                {paymentProofs.slice(0, 3).map((proof, index) => (
                  <div key={proof.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {proof.attachment_file_name || `Proof ${index + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proof.verification_status && (
                        <Badge variant={
                          proof.verification_status === 'verified' ? 'success' :
                          proof.verification_status === 'rejected' ? 'destructive' :
                          'secondary'
                        } className="text-xs">
                          {proof.verification_status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProof(proof.attachment_url)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {quote.payment_method === 'bank_transfer' && quote.payment_status !== 'paid' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/admin/payment-proofs?quote=${quote.id}`, '_blank')}
              >
                <Receipt className="mr-2 h-4 w-4" />
                View Proofs
              </Button>
            )}
            
            {(paymentTransaction || quote.payment_transaction_id) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransactionDetails(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Transaction Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Transaction Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-sm">{quote.payment_transaction_id || paymentTransaction?.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gateway</p>
                <p className="font-medium">{quote.payment_method?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">{paymentCurrency} {amountPaid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={paymentTransaction?.status === 'completed' ? 'success' : 'secondary'}>
                  {paymentTransaction?.status || 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Customer Information */}
            {(paymentDetails.customer_name || transactionData.customer_info) && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  {(paymentDetails.customer_name || transactionData.customer_info?.name) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm">{paymentDetails.customer_name || transactionData.customer_info?.name}</p>
                    </div>
                  )}
                  {(paymentDetails.customer_email || transactionData.customer_info?.email) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{paymentDetails.customer_email || transactionData.customer_info?.email}</p>
                    </div>
                  )}
                  {(paymentDetails.customer_phone || transactionData.customer_info?.phone) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm">{paymentDetails.customer_phone || transactionData.customer_info?.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gateway Specific Details */}
            {quote.payment_method === 'payu' && paymentDetails.payu_id && (
              <div className="space-y-2">
                <h4 className="font-medium">PayU Details</h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">PayU ID</p>
                    <p className="font-mono text-sm">{paymentDetails.payu_id}</p>
                  </div>
                  {paymentDetails.payment_mode && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Mode</p>
                      <p className="text-sm">{paymentDetails.payment_mode}</p>
                    </div>
                  )}
                  {paymentDetails.bank_ref_num && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Reference</p>
                      <p className="font-mono text-sm">{paymentDetails.bank_ref_num}</p>
                    </div>
                  )}
                  {paymentDetails.card_mask && (
                    <div>
                      <p className="text-sm text-muted-foreground">Card</p>
                      <p className="text-sm">**** {paymentDetails.card_mask}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw Transaction Data (for debugging) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Raw Transaction Data (Dev Only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify({ paymentDetails, paymentTransaction }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};