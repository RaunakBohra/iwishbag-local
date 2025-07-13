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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Payment statistics
  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('verification_status')
        .eq('message_type', 'payment_proof');

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter(p => !p.verification_status || p.verification_status === 'pending').length || 0;
      const verified = data?.filter(p => p.verification_status === 'verified').length || 0;
      const rejected = data?.filter(p => p.verification_status === 'rejected').length || 0;

      return { total, pending, verified, rejected };
    },
    refetchInterval: 30000,
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
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
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

  const pendingProofs = paymentProofs?.filter(p => !p.verification_status || p.verification_status === 'pending') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Review and verify payment proofs</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert for pending items */}
      {pendingProofs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">Action Required</p>
            <p className="text-sm text-yellow-700">{pendingProofs.length} payment proof(s) waiting for verification</p>
          </div>
        </div>
      )}

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
          <CardDescription>Review submitted payment proofs and verify payments</CardDescription>
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
                  className={`border rounded-lg p-4 hover:bg-gray-50 ${
                    (!proof.verification_status || proof.verification_status === 'pending') 
                      ? 'border-l-4 border-l-yellow-400' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold">Order #{proof.order_display_id}</h3>
                        {getStatusBadge(proof.verification_status)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(proof.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-medium">{proof.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{proof.customer_email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Order Total</p>
                          <p className="font-medium">{proof.final_currency} {proof.final_total.toFixed(2)}</p>
                          <div className="mt-1 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Paid: {proof.final_currency} {proof.amount_paid.toFixed(2)}
                            </p>
                            {proof.amount_paid > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={cn(
                                      "h-1.5 rounded-full transition-all",
                                      proof.amount_paid >= proof.final_total ? "bg-green-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${Math.min(100, (proof.amount_paid / proof.final_total) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium">
                                  {((proof.amount_paid / proof.final_total) * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">File</p>
                          <p className="font-medium">{proof.attachment_file_name}</p>
                          {/* Payment Status Badge */}
                          <div className="mt-1">
                            {proof.amount_paid >= proof.final_total ? (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Payment Complete
                              </Badge>
                            ) : proof.amount_paid > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Partial Payment
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Awaiting Payment
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(proof.attachment_url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            console.log('Opening verification modal for proof:', proof);
                            setSelectedProof(proof);
                            // Pre-fill with current amount paid if already verified, otherwise use full order total
                            const prefillAmount = proof.amount_paid > 0 ? proof.amount_paid : proof.final_total;
                            console.log('Pre-filling with amount:', prefillAmount);
                            setVerificationAmount(prefillAmount.toString());
                            // Pre-fill admin notes if they exist
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
                              <Clock className="h-4 w-4 mr-1" />
                              Process
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Edit
                            </>
                          )}
                        </Button>
                      </div>
                      <p className={`text-xs font-medium ${
                        (!proof.verification_status || proof.verification_status === 'pending')
                          ? "text-orange-600"
                          : proof.verification_status === 'verified'
                          ? "text-blue-600"
                          : "text-gray-600"
                      }`}>
                        {(!proof.verification_status || proof.verification_status === 'pending')
                          ? "Action Required"
                          : proof.verification_status === 'verified'
                          ? "Can Edit"
                          : "Can Edit"
                        }
                      </p>
                    </div>
                  </div>
                  {proof.admin_notes && (
                    <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                      <p className="font-medium text-gray-700">Admin Notes:</p>
                      <p className="text-gray-600">{proof.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment proofs found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Verify Payment - Order #{selectedProof.order_display_id}
            </h3>
            
            <div className="space-y-4">
              {/* Payment Summary Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-blue-900">Order Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Order Total:</span>
                    <span className="font-semibold">{selectedProof.final_currency} {selectedProof.final_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Current Payment Status:</span>
                    <span className="font-semibold">
                      {selectedProof.amount_paid === 0 ? 'Unpaid' : 
                       selectedProof.amount_paid >= selectedProof.final_total ? 'Paid' : 
                       'Partial Payment'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Payment Amount Received</label>
                <Input
                  type="number"
                  step="0.01"
                  value={verificationAmount}
                  onChange={(e) => setVerificationAmount(e.target.value)}
                  placeholder="Enter amount shown in proof"
                  className={cn(
                    verificationAmount && parseFloat(verificationAmount) > selectedProof.final_total * 1.5
                      ? "border-orange-500 focus:ring-orange-500"
                      : ""
                  )}
                />
                {verificationAmount && parseFloat(verificationAmount) > selectedProof.final_total * 1.5 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ This amount is significantly higher than the order total. Please double-check.
                  </p>
                )}
              </div>
              
              {/* Real-time Calculation Display */}
              {verificationAmount && parseFloat(verificationAmount) > 0 && (
                <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Payment Verification:</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between font-semibold">
                      <span>Payment Amount:</span>
                      <span className="text-green-700">
                        {selectedProof.final_currency} {parseFloat(verificationAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className={cn(
                    "text-sm font-medium p-2 rounded text-center mt-2",
                    parseFloat(verificationAmount) >= selectedProof.final_total
                      ? "bg-green-100 text-green-800"
                      : "bg-orange-100 text-orange-800"
                  )}>
                    {parseFloat(verificationAmount) >= selectedProof.final_total
                      ? parseFloat(verificationAmount) > selectedProof.final_total
                        ? `⚠️ Overpayment of ${selectedProof.final_currency} ${(parseFloat(verificationAmount) - selectedProof.final_total).toFixed(2)}`
                        : "✅ Full Payment Received"
                      : `📊 Partial Payment - ${selectedProof.final_currency} ${(selectedProof.final_total - parseFloat(verificationAmount)).toFixed(2)} will remain outstanding`
                    }
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full transition-all",
                          (parseFloat(verificationAmount) / selectedProof.final_total) >= 1
                            ? "bg-green-600"
                            : "bg-blue-600"
                        )}
                        style={{ 
                          width: `${Math.min(100, (parseFloat(verificationAmount) / selectedProof.final_total) * 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 text-right mt-1">
                      {((parseFloat(verificationAmount) / selectedProof.final_total) * 100).toFixed(0)}% of order total
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add verification notes..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
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
                  className="border-red-300 hover:bg-red-50"
                  onClick={handleRejectPayment}
                  disabled={verifyPaymentMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleVerifyPayment}
                  disabled={verifyPaymentMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verify & Confirm Payment
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