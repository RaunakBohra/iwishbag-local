/**
 * Unified Payment Modal (Refactored)
 * Clean, focused orchestrating component using decomposed services
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { logger } from '@/utils/logger';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
  DollarSign,
  Plus,
  CheckCircle,
  AlertCircle,
  History,
  TrendingUp,
  RefreshCw,
  Eye,
  X,
  Loader2,
  Download,
  Info,
  Copy,
  ExternalLink,
} from 'lucide-react';

// Services
import {
  usePaymentLedger,
  usePaymentProofs,
  usePaymentLinks,
  usePaymentDataService,
  Quote,
  PaymentSummaryData,
} from '@/services/payment-modal/PaymentDataService';

import PaymentValidationService, {
  PaymentMethodType,
  PaymentRecordData,
  PaymentVerificationData,
} from '@/services/payment-modal/PaymentValidationService';

import PaymentActionsService from '@/services/payment-modal/PaymentActionsService';

import {
  paymentUIService,
  usePaymentUIService,
  TabValue,
} from '@/services/payment-modal/PaymentUIService';

// Hooks and utilities
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { getCurrencySymbol, getDestinationCountryFromQuote } from '@/lib/currencyUtils';
import { currencyService } from '@/services/CurrencyService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Existing components (reused)
import { RefundManagementModal } from './RefundManagementModal';
import { PaymentProofButton } from '../payment/PaymentProofButton';
import { EnhancedPaymentLinkGenerator } from '../payment/EnhancedPaymentLinkGenerator';
import { DueAmountNotification } from '../payment/DueAmountNotification';
import { useDueAmountManager } from '@/hooks/useDueAmountManager';
import { usePaymentStatusSync } from '@/hooks/usePaymentStatusSync';
import { DueAmountInfo } from '@/lib/paymentUtils';

interface UnifiedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

export const UnifiedPaymentModal: React.FC<UnifiedPaymentModalProps> = ({
  isOpen,
  onClose,
  quote,
}) => {
  // Initialize services
  const validationService = useMemo(() => new PaymentValidationService(), []);
  const actionsService = useMemo(() => new PaymentActionsService(), []);
  
  // Hooks
  const { formatAmount } = useQuoteCurrency(quote);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { paymentDataService, invalidatePaymentData, checkPaymentStatus } = usePaymentDataService();
  const {
    formatPaymentMethod,
    formatDate,
    copyToClipboard,
    createDownloadLink,
  } = usePaymentUIService();

  // Currency setup
  const destinationCountry = quote ? getDestinationCountryFromQuote(quote) : 'US';
  const currency = currencyService.getCurrencyForCountrySync(destinationCountry);
  const currencySymbol = getCurrencySymbol(currency);

  // State management
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [dueAmountInfo, setDueAmountInfo] = useState<DueAmountInfo | null>(null);

  // Form states
  const [formState, setFormState] = useState(() => 
    paymentUIService.getInitialFormState(currency)
  );
  const [uiState, setUIState] = useState(() => 
    paymentUIService.getInitialUIState()
  );

  // Data fetching
  const { data: paymentLedger, isLoading: ledgerLoading } = usePaymentLedger(quote.id, isOpen);
  const { data: paymentProofs, isLoading: proofsLoading } = usePaymentProofs(
    quote.id, 
    isOpen, 
    quote.payment_method
  );
  const { data: paymentLinks, isLoading: linksLoading } = usePaymentLinks(quote.id, isOpen);

  // Calculate payment summary
  const paymentSummary: PaymentSummaryData = useMemo(() => {
    if (!paymentLedger) {
      return {
        finalTotal: parseFloat(quote.final_total_usd?.toString() || '0'),
        totalPaid: 0,
        totalPayments: 0,
        totalRefunds: 0,
        remaining: parseFloat(quote.final_total_usd?.toString() || '0'),
        overpaidAmount: 0,
        status: 'unpaid',
        isOverpaid: false,
        hasRefunds: false,
        hasMultipleCurrencies: false,
        currencyBreakdown: {},
        percentagePaid: 0,
      };
    }

    return paymentDataService.calculatePaymentSummary(
      paymentLedger,
      parseFloat(quote.final_total_usd?.toString() || '0'),
      currency
    );
  }, [paymentLedger, quote.final_total_usd, currency, paymentDataService]);

  // Available tabs based on payment state
  const availableTabs = useMemo(() => {
    return paymentUIService.getAvailableTabs(
      paymentSummary,
      quote.payment_method,
      paymentProofs?.some((p) => !p.verified_at)
    );
  }, [paymentSummary, quote.payment_method, paymentProofs]);

  // Due amount management
  const { handleOrderValueChange, isProcessing: isDueProcessing } = useDueAmountManager({
    quoteId: quote.id,
    currency,
    autoGenerateLinks: false,
    onDueAmountDetected: setDueAmountInfo,
    onPaymentLinkCreated: () => {
      toast({
        title: 'Payment Link Created',
        description: 'Payment link has been generated and sent to customer.',
      });
    },
  });

  // Real-time payment status synchronization
  const { isMonitoring } = usePaymentStatusSync({
    quoteId: quote.id,
    enabled: isOpen,
    onPaymentConfirmed: (transaction) => {
      toast({
        title: 'Payment Confirmed',
        description: `Payment confirmed for ${currencyService.formatAmount(transaction.amount, currency)}`,
      });
      setActiveTab('history');
    },
    onPaymentFailed: () => {
      toast({
        title: 'Payment Failed',
        description: 'Payment attempt failed. Customer may need to try again.',
        variant: 'destructive',
      });
    },
  });

  // Effects
  useEffect(() => {
    if (quote?.final_total_usd) {
      handleOrderValueChange(parseFloat(quote.final_total_usd.toString()), quote);
    }
  }, [quote?.final_total_usd, handleOrderValueChange]);

  useEffect(() => {
    if (isOpen && paymentSummary.remaining > 0) {
      setFormState(prev => ({ 
        ...prev, 
        amount: paymentSummary.remaining.toFixed(2),
        currency 
      }));
    }
  }, [isOpen, paymentSummary.remaining, currency]);

  // Action handlers
  const handleRecordPayment = useCallback(async () => {
    const data: PaymentRecordData = {
      amount: formState.amount,
      method: formState.method,
      currency: formState.currency,
      transactionId: formState.transactionId,
      date: formState.date,
      notes: formState.notes,
    };

    const validation = validationService.validatePaymentRecord(data, paymentSummary, currency);
    if (!validation.isValid) {
      toast({
        title: 'Validation Failed',
        description: validation.errors[0]?.message || 'Please check your input',
        variant: 'destructive',
      });
      return;
    }

    setFormState(prev => ({ ...prev, isRecording: true }));

    try {
      const result = await actionsService.recordPayment({
        quoteId: quote.id,
        amount: parseFloat(data.amount),
        currency: data.currency,
        method: data.method,
        transactionId: data.transactionId,
        date: data.date,
        notes: data.notes,
      });

      if (result.success) {
        toast({
          title: 'Payment Recorded',
          description: `Successfully recorded ${currencyService.formatAmount(parseFloat(data.amount), data.currency)} payment.`,
        });

        // Reset form and refresh data
        setFormState(paymentUIService.getInitialFormState(currency));
        invalidatePaymentData(quote.id);
        setActiveTab('history');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Payment recording failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setFormState(prev => ({ ...prev, isRecording: false }));
    }
  }, [formState, validationService, paymentSummary, currency, actionsService, quote.id, invalidatePaymentData, toast]);

  const handleVerifyProof = useCallback(async () => {
    if (!formState.verifyProofId || !formState.verifyAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please select a proof and enter the amount.',
        variant: 'destructive',
      });
      return;
    }

    const data: PaymentVerificationData = {
      proofId: formState.verifyProofId,
      amount: formState.verifyAmount,
      notes: formState.verifyNotes,
    };

    const validation = validationService.validatePaymentVerification(data, paymentSummary, currency);
    if (!validation.isValid) {
      toast({
        title: 'Validation Failed',
        description: validation.errors[0]?.message || 'Please check your input',
        variant: 'destructive',
      });
      return;
    }

    setFormState(prev => ({ ...prev, isVerifying: true }));

    try {
      const result = await actionsService.verifyPaymentProof({
        quoteId: quote.id,
        proofId: data.proofId,
        amount: parseFloat(data.amount),
        currency,
        notes: data.notes,
      });

      if (result.success) {
        toast({
          title: 'Payment Verified',
          description: `Successfully verified payment of ${currencyService.formatAmount(parseFloat(data.amount), currency)}.`,
        });

        // Reset form and refresh data
        setFormState(prev => ({
          ...prev,
          verifyProofId: null,
          verifyAmount: '',
          verifyNotes: '',
        }));
        invalidatePaymentData(quote.id);
        setActiveTab('history');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Payment verification failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify payment',
        variant: 'destructive',
      });
    } finally {
      setFormState(prev => ({ ...prev, isVerifying: false }));
    }
  }, [formState, validationService, paymentSummary, currency, actionsService, quote.id, invalidatePaymentData, toast]);

  const handleExportHistory = useCallback(async () => {
    if (!paymentLedger || paymentLedger.length === 0) {
      toast({
        title: 'No Data',
        description: 'No payment history to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await actionsService.exportPaymentHistory(
        quote.id,
        quote.display_id || quote.id,
        paymentLedger,
        { format: 'csv', includeRefunds: true }
      );

      if (result.success && result.data) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.data.url;
        link.download = result.data.filename;
        link.click();

        toast({
          title: 'Export Successful',
          description: 'Payment history exported to CSV.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export payment history.',
        variant: 'destructive',
      });
    }
  }, [paymentLedger, quote.id, quote.display_id, actionsService, toast]);

  if (uiState.isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Payment Management - {quote.display_id}</DialogTitle>
            <DialogDescription>
              Manage all payment activities for this order in one place
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <TabsList
              className="grid w-full"
              style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}
            >
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab === 'overview' && <><TrendingUp className="w-4 h-4 mr-2" />Overview</>}
                  {tab === 'record' && <><Plus className="w-4 h-4 mr-2" />Record</>}
                  {tab === 'verify' && <><CheckCircle className="w-4 h-4 mr-2" />Verify</>}
                  {tab === 'history' && <><History className="w-4 h-4 mr-2" />History</>}
                  {tab === 'refund' && <><RefreshCw className="w-4 h-4 mr-2" />Refund</>}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Due Amount Notification */}
                {dueAmountInfo?.hasDueAmount && (
                  <DueAmountNotification
                    dueInfo={dueAmountInfo}
                    currency={currency}
                    currencySymbol={currencySymbol}
                    quote={quote}
                    onPaymentLinkCreated={() => {
                      toast({
                        title: 'Payment Link Created',
                        description: 'Payment link generated and copied to clipboard.',
                      });
                      invalidatePaymentData(quote.id);
                    }}
                    showActions={true}
                  />
                )}

                {/* Payment Summary */}
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Payment Progress</span>
                      <span>{Math.min(100, Math.round(paymentSummary.percentagePaid))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all',
                          paymentUIService.getProgressBarConfig(paymentSummary).colorClass
                        )}
                        style={{ width: `${Math.min(100, paymentSummary.percentagePaid)}%` }}
                      />
                    </div>
                  </div>

                  {/* Amount Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="text-lg font-bold">{formatAmount(paymentSummary.finalTotal)}</p>
                    </div>

                    {paymentSummary.totalPayments > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Net Paid</p>
                        <p className="text-xl font-bold">
                          {currencyService.formatAmount(paymentSummary.totalPaid, currency)}
                        </p>
                      </div>
                    )}

                    {paymentSummary.remaining > 0 && (
                      <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-orange-800">Balance Due</p>
                        <p className="text-xl font-bold text-orange-600">
                          {currencyService.formatAmount(paymentSummary.remaining, currency)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn('text-sm px-3 py-1', paymentUIService.getStatusColor(paymentSummary.status))}>
                      {paymentUIService.getStatusDisplayText(paymentSummary.status, paymentSummary, currency)}
                    </Badge>

                    <div className="flex gap-2">
                      {paymentSummary.status !== 'paid' && (
                        <Button size="sm" onClick={() => setActiveTab('record')}>
                          <Plus className="w-4 h-4 mr-1" />
                          Record Payment
                        </Button>
                      )}
                      {paymentSummary.remaining > 0 && (
                        <EnhancedPaymentLinkGenerator
                          quoteId={quote.id}
                          amount={paymentSummary.remaining}
                          currency="USD"
                          quote={quote}
                          customerInfo={(() => {
                            const customerData = customerDisplayUtils.getCustomerDisplayData(quote, quote.profiles);
                            return {
                              name: customerData.name,
                              email: customerData.email || '',
                              phone: customerData.phone || quote.customer_phone || '',
                            };
                          })()}
                          onLinkCreated={() => {
                            toast({
                              title: 'Enhanced Payment Link Created',
                              description: 'Payment link has been created and sent to customer.',
                            });
                            invalidatePaymentData(quote.id);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Record Payment Tab */}
              <TabsContent value="record" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Record New Payment</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select
                          value={formState.method}
                          onValueChange={(value) => 
                            setFormState(prev => ({ ...prev, method: value as PaymentMethodType }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="payu">PayU (Manual)</SelectItem>
                            <SelectItem value="stripe">Stripe (Manual)</SelectItem>
                            <SelectItem value="esewa">eSewa</SelectItem>
                            <SelectItem value="credit_note">Credit Note</SelectItem>
                            <SelectItem value="check">Check/Cheque</SelectItem>
                            <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Amount ({getCurrencySymbol(formState.currency)})</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder={`0.00 ${formState.currency}`}
                            value={formState.amount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value) || value === '') {
                                setFormState(prev => ({ ...prev, amount: value }));
                              }
                            }}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="Add any notes about this payment..."
                        value={formState.notes}
                        onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleRecordPayment}
                      disabled={formState.isRecording || !formState.amount || parseFloat(formState.amount) <= 0}
                      className="w-full"
                    >
                      {formState.isRecording ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Record Payment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Payment Timeline</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkPaymentStatus(quote.id)}
                        disabled={isDueProcessing}
                      >
                        {isDueProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportHistory}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {ledgerLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : !paymentLedger || paymentLedger.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No payment history found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentLedger.map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {paymentUIService.getPaymentMethodIcon(entry.payment_method)}
                            <div>
                              <p className="font-medium">
                                {formatPaymentMethod(entry.payment_method || 'Payment')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(entry.created_at, 'long')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {currencyService.formatAmount(Math.abs(parseFloat(entry.amount.toString())), entry.currency || currency)}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Refund Tab */}
              <TabsContent value="refund" className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
                  
                  {paymentSummary.totalPaid > 0 ? (
                    <Button onClick={() => setShowRefundModal(true)} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Open Refund Manager
                    </Button>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No payments to refund</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      {showRefundModal && (
        <RefundManagementModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          quote={{
            id: quote.id,
            final_total_usd: quote.final_total_usd || 0,
            amount_paid: paymentSummary.totalPaid,
            currency: currency,
            payment_method: quote.payment_method || '',
          }}
          payments={
            paymentLedger
              ?.filter((p) => parseFloat(p.amount.toString()) > 0)
              ?.map((p) => ({
                id: p.id,
                amount: Math.abs(parseFloat(p.amount.toString())),
                currency: p.currency || currency,
                method: p.payment_method || '',
                gateway: p.gateway_code || p.payment_method || '',
                reference: p.reference_number || p.gateway_transaction_id || '',
                date: new Date(p.payment_date || p.created_at),
                canRefund: ['payu', 'paypal', 'bank_transfer'].includes(p.payment_method?.toLowerCase() || ''),
              })) || []
          }
        />
      )}
    </>
  );
};