import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Search,
  DollarSign,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface PaymentProof {
  id: string;
  quote_id: string;
  sender_id: string;
  attachment_url: string;
  attachment_file_name: string;
  created_at: string;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  admin_notes: string | null;
  // Quote data
  order_display_id: string;
  final_total: number;
  final_currency: string;
  customer_email: string;
  customer_name: string;
  amount_paid: number;
}

const PaymentManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { findDefaultOrderStatus } = useStatusManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationAmount, setVerificationAmount] = useState('');

  // Check URL params for pre-filtering
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, []);

  // Fetch payment proofs that need verification (simplified approach - no joins)
  const { data: paymentProofs, isLoading, refetch } = useQuery({
    queryKey: ['payment-proofs', searchQuery],
    queryFn: async () => {
      try {
        // Step 1: Get payment proof messages (no joins)
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, quote_id, sender_id, attachment_url, attachment_file_name, created_at, verification_status, admin_notes')
          .eq('message_type', 'payment_proof')
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error('Messages query error:', messagesError);
          throw messagesError;
        }

        if (!messages || messages.length === 0) {
          return [];
        }

        // Step 2: Get unique quote IDs and fetch quote details
        const quoteIds = [...new Set(messages.map(m => m.quote_id).filter(Boolean))];
        let quotesData: Record<string, any> = {};
        
        if (quoteIds.length > 0) {
          const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select('id, order_display_id, final_total, final_currency, email, amount_paid, user_id')
            .in('id', quoteIds);
          
          if (quotesError) {
            console.error('Quotes query error:', quotesError);
          } else if (quotes) {
            quotesData = Object.fromEntries(quotes.map(q => [q.id, q]));
          }
        }

        // Step 3: Get unique user IDs and fetch customer names
        const userIds = [...new Set(Object.values(quotesData).map((q: any) => q.user_id).filter(Boolean))];
        let customerNames: Record<string, string> = {};
        
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          if (profilesError) {
            console.error('Profiles query error:', profilesError);
          } else if (profiles) {
            customerNames = Object.fromEntries(
              profiles.map(p => [p.id, p.full_name || 'Unknown'])
            );
          }
        }

        // Step 4: Transform the data
        const transformedData = messages.map(message => {
          const quote = quotesData[message.quote_id] || {};
          const customerName = customerNames[quote.user_id] || 'Unknown';
          
          return {
            id: message.id,
            quote_id: message.quote_id,
            sender_id: message.sender_id,
            attachment_url: message.attachment_url,
            attachment_file_name: message.attachment_file_name,
            created_at: message.created_at,
            verification_status: message.verification_status,
            admin_notes: message.admin_notes,
            order_display_id: quote.order_display_id || `Q${message.quote_id?.substring(0, 8)}`,
            final_total: quote.final_total || 0,
            final_currency: quote.final_currency || 'USD',
            customer_email: quote.email || 'N/A',
            customer_name: customerName,
            amount_paid: quote.amount_paid || 0,
          };
        });

        // Step 5: Apply client-side search filter
        return transformedData.filter(proof => 
          !searchQuery || 
          proof.order_display_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          proof.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          proof.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } catch (error) {
        console.error('Payment proofs query failed:', error);
        throw error;
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });


  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ proofId, status, notes, amount }: {
      proofId: string;
      status: 'verified' | 'rejected';
      notes: string;
      amount?: number;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Update verification status
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          verification_status: status,
          admin_notes: notes,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', proofId);

      if (updateError) throw updateError;

      // If verified, update payment amount in quotes table
      if (status === 'verified' && amount && selectedProof) {
        console.log('Updating payment for quote:', selectedProof.quote_id, 'with amount:', amount);
        
        // SIMPLIFIED: Just use the entered amount as the total paid amount
        const newTotalPaid = amount;
        const finalTotal = selectedProof.final_total;
        
        console.log('Payment update:', { amount: newTotalPaid, finalTotal });
        
        let paymentStatus = 'unpaid';
        if (newTotalPaid >= finalTotal) {
          paymentStatus = newTotalPaid > finalTotal ? 'overpaid' : 'paid';
        } else if (newTotalPaid > 0) {
          paymentStatus = 'partial';
        }

        console.log('New payment status:', paymentStatus);

        // For bank transfers, update status from 'payment_pending' to 'ordered' when paid
        const updateData: any = {
          amount_paid: newTotalPaid,
          payment_status: paymentStatus,
          paid_at: paymentStatus === 'paid' || paymentStatus === 'overpaid' ? new Date().toISOString() : null
        };
        
        // DYNAMIC: Only update order status if payment is complete
        // This ensures we maintain separate tracking of payment status vs order status
        // Order status represents the fulfillment lifecycle (ordered → processing → shipped)
        // Payment status represents the payment state (unpaid → partial → paid)
        if (paymentStatus === 'paid' || paymentStatus === 'overpaid') {
          // Only change order status if it's still in a payment-pending state
          const currentQuote = await supabase
            .from('quotes')
            .select('status')
            .eq('id', selectedProof.quote_id)
            .single();
          
          if (currentQuote.data?.status === 'payment_pending' || currentQuote.data?.status === 'awaiting_payment') {
            const orderStatusConfig = findDefaultOrderStatus();
            updateData.status = orderStatusConfig?.name || 'ordered';
            console.log(`Payment complete - updating status from ${currentQuote.data.status} to ${updateData.status}`);
          } else {
            console.log(`Payment complete - keeping current order status: ${currentQuote.data?.status}`);
          }
        } else {
          console.log('Partial payment - keeping existing status');
        }

        // Try RPC function first, fall back to direct update if it fails
        console.log('Calling force_update_payment with:', {
          quote_id: selectedProof.quote_id,
          new_amount_paid: newTotalPaid,
          new_payment_status: paymentStatus
        });

        let updateResult = null;
        let paymentError = null;

        try {
          const rpcResult = await supabase
            .rpc('force_update_payment', {
              quote_id: selectedProof.quote_id,
              new_amount_paid: newTotalPaid,
              new_payment_status: paymentStatus
            });

          updateResult = rpcResult.data;
          paymentError = rpcResult.error;

          console.log('RPC call result:', { updateResult, paymentError });
          console.log('RPC response details:', JSON.stringify(updateResult, null, 2));

          if (paymentError) {
            console.warn('RPC function failed, trying direct update:', paymentError);
            throw new Error('RPC failed, trying fallback');
          }
          
          // Check if RPC returned a success flag
          if (updateResult && updateResult.success === false) {
            console.error('RPC function returned error:', updateResult);
            throw new Error(`RPC error: ${updateResult.error}`);
          }
        } catch (rpcError) {
          console.warn('RPC function failed, using direct update fallback:', rpcError);
          
          // Fallback: Direct update (may have RLS issues but let's try)
          const directUpdate = await supabase
            .from('quotes')
            .update({
              amount_paid: newTotalPaid,
              payment_status: paymentStatus,
              paid_at: paymentStatus === 'paid' || paymentStatus === 'overpaid' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedProof.quote_id)
            .select()
            .single();

          updateResult = directUpdate.data;
          paymentError = directUpdate.error;

          console.log('Direct update result:', { updateResult, paymentError });

          if (paymentError) {
            console.error('Direct update also failed:', paymentError);
            throw paymentError;
          }
        }
        
        console.log('Quote payment updated successfully:', updateResult);
      } else {
        console.log('Skipping payment update:', { status, amount: !!amount, selectedProof: !!selectedProof });
      }

      return { status, amount };
    },
    onSuccess: (data) => {
      toast({
        title: data.status === 'verified' ? 'Payment Verified!' : 'Payment Rejected',
        description: data.status === 'verified' 
          ? `Payment of ${selectedProof?.final_currency || ''} ${data.amount} has been recorded.`
          : 'Payment proof has been rejected.',
      });
      
      // Reset form and close modal
      setSelectedProof(null);
      setVerificationNotes('');
      setVerificationAmount('');
      
      // Comprehensive cache invalidation to ensure data sync
      console.log('Payment verification successful, invalidating caches...');
      
      // Immediate cache invalidation
      queryClient.invalidateQueries({ queryKey: ['payment-proof-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pending-payment-proofs-count'] });
      
      // Invalidate all admin orders queries with all possible filter combinations
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin-orders' 
      });
      
      // Also invalidate specific quote data
      if (selectedProof?.quote_id) {
        queryClient.invalidateQueries({ queryKey: ['quote', selectedProof.quote_id] });
        queryClient.invalidateQueries({ queryKey: ['admin-quote', selectedProof.quote_id] });
      }
      
      // Small delay then aggressive refetch to ensure DB changes are committed
      setTimeout(() => {
        console.log('Force refetching all admin orders queries...');
        queryClient.refetchQueries({ 
          predicate: (query) => query.queryKey[0] === 'admin-orders' 
        });
        refetch(); // Refetch payment proofs last
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to process payment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleVerifyPayment = () => {
    if (!selectedProof) return;
    
    const amount = parseFloat(verificationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }

    verifyPaymentMutation.mutate({
      proofId: selectedProof.id,
      status: 'verified',
      notes: verificationNotes || 'Payment verified and confirmed',
      amount: amount
    });
  };

  const handleRejectPayment = () => {
    if (!selectedProof) return;

    verifyPaymentMutation.mutate({
      proofId: selectedProof.id,
      status: 'rejected',
      notes: verificationNotes || 'Payment proof rejected - please resubmit with clearer documentation'
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Verification</h1>
          <p className="text-muted-foreground">Review and verify customer payments</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, customer, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Payment Proofs List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Proofs</CardTitle>
          <CardDescription>Review and verify customer payments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : paymentProofs && paymentProofs.length > 0 ? (
            <div className="space-y-4">
              {paymentProofs.map((proof) => (
                <div
                  key={proof.id}
                  className={`border rounded-lg p-6 hover:bg-gray-50 transition-colors ${
                    (!proof.verification_status || proof.verification_status === 'pending') 
                      ? 'border-l-4 border-l-orange-400 bg-orange-50' 
                      : proof.verification_status === 'verified'
                      ? 'border-l-4 border-l-green-400'
                      : 'border-l-4 border-l-red-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">Order #{proof.order_display_id}</h3>
                        {getStatusBadge(proof.verification_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(proof.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => window.open(proof.attachment_url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Proof
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          setSelectedProof(proof);
                          const prefillAmount = proof.amount_paid > 0 ? proof.amount_paid : proof.final_total;
                          setVerificationAmount(prefillAmount.toString());
                          if (proof.admin_notes) {
                            setVerificationNotes(proof.admin_notes);
                          }
                        }}
                        className={
                          (!proof.verification_status || proof.verification_status === 'pending')
                            ? "bg-orange-600 hover:bg-orange-700"
                            : proof.verification_status === 'verified'
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }
                      >
                        {(!proof.verification_status || proof.verification_status === 'pending') ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Process Payment
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Edit Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Customer</p>
                      <p className="font-semibold text-lg">{proof.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{proof.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
                      <p className="font-bold text-xl">{proof.final_currency} {proof.final_total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                      <p className={`font-bold text-xl ${
                        proof.amount_paid >= proof.final_total 
                          ? 'text-green-600' 
                          : proof.amount_paid > 0 
                          ? 'text-orange-600' 
                          : 'text-gray-500'
                      }`}>
                        {proof.final_currency} {proof.amount_paid.toFixed(2)}
                      </p>
                      {proof.amount_paid > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {proof.amount_paid >= proof.final_total ? 'Fully Paid' : 'Partial Payment'}
                        </p>
                      )}
                    </div>
                  </div>

                  {proof.admin_notes && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                      <p className="font-medium text-gray-700 text-sm mb-1">Admin Notes:</p>
                      <p className="text-gray-600 text-sm">{proof.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No payment proofs found</p>
              <p className="text-sm text-muted-foreground mt-2">Payment proofs will appear here when customers submit them</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-6 text-center">
              Verify Payment
            </h3>
            
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="text-center border-b pb-4">
                <p className="text-lg font-semibold">Order #{selectedProof.order_display_id}</p>
                <p className="text-sm text-muted-foreground">{selectedProof.customer_name}</p>
                <p className="text-2xl font-bold mt-2">{selectedProof.final_currency} {selectedProof.final_total.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Amount Due</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Payment Amount Received</label>
                <Input
                  type="number"
                  step="0.01"
                  value={verificationAmount}
                  onChange={(e) => setVerificationAmount(e.target.value)}
                  placeholder="Enter amount from payment proof"
                  className="text-lg p-3"
                />
                {verificationAmount && parseFloat(verificationAmount) > selectedProof.final_total * 1.2 && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Amount seems high - please double-check
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Verification Notes</label>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add any notes about the verification..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedProof(null);
                    setVerificationNotes('');
                    setVerificationAmount('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 hover:bg-red-50 text-red-600"
                  onClick={handleRejectPayment}
                  disabled={verifyPaymentMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleVerifyPayment}
                  disabled={verifyPaymentMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagementPage;