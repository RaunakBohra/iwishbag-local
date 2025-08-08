import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History,
  DollarSign,
  RefreshCw,
  FileText,
  Calendar,
  User,
  Hash,
  Download,
  Receipt,
  Loader2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencyUtils';
import { useToast } from '@/hooks/use-toast';
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
  notes?: string;
  status?: string;
  balance_after?: number;
  created_at: string;
  payment_date?: string;
  created_by?: {
    full_name?: string;
    email?: string;
  };
  gateway_response?: any;
}

interface PaymentLink {
  id: string;
  amount: number;
  currency: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  description?: string;
  payment_url?: string;
  api_version?: string;
  created_at: string;
  expires_at?: string;
}

interface Quote {
  id: string;
  display_id?: string;
  final_total_origincurrency?: number;
  created_at?: string;
}

interface PaymentSummary {
  totalPayments: number;
  totalRefunds: number;
  totalPaid: number;
}

interface PaymentHistorySectionProps {
  paymentLedger: PaymentLedgerEntry[] | null;
  paymentLinks: PaymentLink[] | null;
  quote: Quote;
  currency: string;
  currencySymbol: string;
  paymentSummary: PaymentSummary;
  formatAmount: (amount: number) => string;
  ledgerLoading: boolean;
  linksLoading: boolean;
  onRefresh: () => void;
  onExportHistory: () => void;
  isDueProcessing?: boolean;
}

const currencyService = CurrencyService.getInstance();

export const PaymentHistorySection: React.FC<PaymentHistorySectionProps> = ({
  paymentLedger,
  paymentLinks,
  quote,
  currency,
  currencySymbol,
  paymentSummary,
  formatAmount,
  ledgerLoading,
  linksLoading,
  onRefresh,
  onExportHistory,
  isDueProcessing = false,
}) => {
  const { toast } = useToast();

  const copyPaymentLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied!',
      description: 'Payment link has been copied to clipboard',
    });
  };

  const openPaymentLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Payment Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment Timeline
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isDueProcessing}
              >
                {isDueProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportHistory}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {ledgerLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !paymentLedger || paymentLedger.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No payment history found</p>
              <p className="text-xs mt-2">Quote ID: {quote.id}</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-border" />

              {/* Timeline Items */}
              <div className="space-y-6">
                {paymentLedger.map((entry, index) => {
                  const type = entry.transaction_type || entry.payment_type;
                  const isPayment =
                    type === 'payment' ||
                    type === 'customer_payment' ||
                    (entry.status === 'completed' && !type);
                  const isRefund = type === 'refund' || type === 'partial_refund';
                  const entryAmount = parseFloat(entry.amount.toString()) || 0;

                  return (
                    <div key={entry.id} className="relative flex items-start gap-4">
                      {/* Timeline Dot */}
                      <div
                        className={cn(
                          'relative z-10 flex h-10 w-10 items-center justify-center rounded-full',
                          isPayment
                            ? 'bg-green-100 text-green-600'
                            : isRefund
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-600',
                        )}
                      >
                        {isPayment ? (
                          <DollarSign className="h-5 w-5" />
                        ) : isRefund ? (
                          <RefreshCw className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="rounded-lg border bg-background p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">
                                {isPayment
                                  ? 'Payment Received'
                                  : isRefund
                                    ? 'Refund Processed'
                                    : 'Transaction'}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {entry.payment_method
                                  ?.replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                                {entry.gateway_code &&
                                  ` via ${entry.gateway_code.toUpperCase()}`}
                                {entry.currency && entry.currency !== currency && (
                                  <Badge variant="outline" className="ml-2 text-xs py-0">
                                    {entry.currency} Payment
                                  </Badge>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={cn(
                                  'font-semibold',
                                  isPayment
                                    ? 'text-green-600'
                                    : isRefund
                                      ? 'text-red-600'
                                      : 'text-gray-600',
                                )}
                              >
                                {isPayment ? '+' : isRefund ? '-' : ''}
                                {getCurrencySymbol(entry.currency || currency)}
                                {Math.abs(entryAmount).toFixed(2)}
                                {entry.currency && entry.currency !== currency && (
                                  <span className="text-xs text-orange-600 ml-1">
                                    ({entry.currency})
                                  </span>
                                )}
                              </p>
                              {entry.balance_after !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Balance: {currencySymbol}
                                  {(parseFloat(entry.balance_after.toString()) || 0).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Additional Details */}
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            {entry.reference_number && (
                              <div className="flex items-center gap-2">
                                <Hash className="h-3 w-3" />
                                <span>Ref: {entry.reference_number}</span>
                              </div>
                            )}
                            {entry.notes && (
                              <div className="flex items-start gap-2">
                                <FileText className="h-3 w-3 mt-0.5" />
                                <span className="line-clamp-2">{entry.notes}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            {entry.created_by && (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>
                                  by{' '}
                                  {entry.created_by.full_name ||
                                    entry.created_by.email ||
                                    'System'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Order Created Marker */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="rounded-lg border bg-background p-4 shadow-sm">
                      <h4 className="font-medium">Order Created</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Quote #{quote.display_id} - Total:{' '}
                        {formatAmount(quote.final_total_origincurrency || 0)}
                      </p>
                      {quote.created_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(quote.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {paymentLedger && paymentLedger.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-lg font-semibold text-green-600">
                    {currencyService.formatAmount(paymentSummary.totalPayments, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Refunds</p>
                  <p className="text-lg font-semibold text-red-600">
                    {currencyService.formatAmount(paymentSummary.totalRefunds, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-lg font-semibold">{paymentLedger.length}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Links Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payment Links
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {paymentLinks?.length || 0} Links
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {linksLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : paymentLinks && paymentLinks.length > 0 ? (
            <div className="space-y-3">
              {paymentLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        link.status === 'active'
                          ? 'bg-green-500'
                          : link.status === 'completed'
                            ? 'bg-teal-500'
                            : link.status === 'expired'
                              ? 'bg-orange-500'
                              : 'bg-gray-400',
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {currencyService.formatAmount(link.amount, link.currency)}
                        </p>
                        {link.api_version === 'v2_rest' && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700"
                          >
                            Enhanced
                          </Badge>
                        )}
                        {link.api_version === 'v1_legacy' && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-teal-50 text-teal-700"
                          >
                            Legacy
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {link.description || 'Payment Link'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(link.created_at), 'MMM dd, yyyy HH:mm')}
                        {link.expires_at && (
                          <span>
                            {' '}
                            • Expires {format(new Date(link.expires_at), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        link.status === 'active'
                          ? 'default'
                          : link.status === 'completed'
                            ? 'outline'
                            : link.status === 'expired'
                              ? 'secondary'
                              : 'secondary'
                      }
                      className="text-xs"
                    >
                      {link.status}
                    </Badge>

                    {link.payment_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyPaymentLink(link.payment_url!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}

                    {link.payment_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPaymentLink(link.payment_url!)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No payment links generated yet</p>
              <p className="text-xs">Payment links will appear here when created</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};