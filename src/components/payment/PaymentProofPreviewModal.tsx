import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  AlertCircle,
  Loader2,
  ExternalLink,
  DollarSign,
  Info
} from 'lucide-react';
import { Message } from '@/components/messaging/types';

interface PaymentProofPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message & { message_type: 'payment_proof' };
  orderId?: string;
  onStatusUpdate?: () => void;
}

type PaymentProofStatus = 'pending' | 'verified' | 'rejected';

interface PaymentProofVerification {
  status: PaymentProofStatus;
  admin_notes?: string;
  verified_by?: string;
  verified_at?: string;
}

export const PaymentProofPreviewModal: React.FC<PaymentProofPreviewModalProps> = ({
  isOpen,
  onClose,
  message,
  orderId,
  onStatusUpdate
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verificationStatus, setVerificationStatus] = useState<PaymentProofStatus>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Fetch order details to get the amount
  const { data: orderDetails } = useQuery({
    queryKey: ['order-details-for-payment', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select('final_total, final_currency, order_display_id, amount_paid')
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });

  // Pre-fill payment amount when order details load
  useEffect(() => {
    if (orderDetails && !paymentAmount) {
      // Calculate remaining balance
      const remainingBalance = orderDetails.final_total - (orderDetails.amount_paid || 0);
      setPaymentAmount(remainingBalance.toString());
    }
  }, [orderDetails]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen || message.verification_status !== 'pending') return;
      
      // Ctrl/Cmd + Enter to approve
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleVerifyAndConfirmPayment();
      }
      // Ctrl/Cmd + R to reject
      else if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        setVerificationStatus('rejected');
        handleVerify();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, message.verification_status, paymentAmount, orderDetails]);

  // Get file extension to determine if it's an image
  const getFileExtension = (filename: string) => {
    return filename.toLowerCase().split('.').pop() || '';
  };

  const isImage = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    return imageExtensions.includes(getFileExtension(filename));
  };

  const isPDF = (filename: string) => {
    return getFileExtension(filename) === 'pdf';
  };

  // Update payment proof verification status
  const updateVerificationMutation = useMutation({
    mutationFn: async (verification: PaymentProofVerification) => {
      // First update the verification status (without verified_amount since it was removed)
      const user = (await supabase.auth.getUser()).data.user;
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          verification_status: verification.status,
          admin_notes: verification.admin_notes,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (updateError) throw updateError;

      // Send automatic message to customer based on verification status
      let messageContent = '';
      if (verification.status === 'verified') {
        messageContent = `Good news! Your payment proof has been verified successfully. We have confirmed receipt of your payment and will proceed with processing your order.\n\n${verification.admin_notes ? `Admin Notes: ${verification.admin_notes}\n\n` : ''}Thank you for your payment!`;
      } else if (verification.status === 'rejected') {
        messageContent = `We've reviewed your payment proof but unfortunately could not verify it.\n\n${verification.admin_notes ? `Reason: ${verification.admin_notes}\n\n` : ''}Please submit a new payment proof with the following:\n- Clear image showing the full transaction\n- Transaction ID/Reference number visible\n- Amount and date clearly shown\n\nYou can upload a new payment proof using the button below.`;
      }

      if (messageContent && orderId) {
        // Send message from admin to customer
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            recipient_id: message.sender_id, // Send to the original sender (customer)
            quote_id: orderId,
            subject: `Payment Proof ${verification.status === 'verified' ? 'Verified' : 'Rejected'}`,
            content: messageContent,
            message_type: 'payment_verification_result'
          });

        if (messageError) {
          console.error('Failed to send verification message:', messageError);
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Verification Updated',
        description: `Payment proof has been ${verificationStatus}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['quote-messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      // Invalidate all admin-orders queries (regardless of filters)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin-orders' 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-quote', orderId] });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-message'] });
      onStatusUpdate?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update verification: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const handleVerify = async () => {
    // For verification without payment confirmation (e.g., reject)
    if (verificationStatus === 'rejected') {
      updateVerificationMutation.mutate({
        status: verificationStatus,
        admin_notes: adminNotes.trim() || undefined,
      });
    } else {
      // For verify, also confirm payment automatically
      await handleVerifyAndConfirmPayment();
    }
  };

  // Handle verify and confirm payment in one action
  const handleVerifyAndConfirmPayment = async () => {
    if (!orderDetails || !orderId || !paymentAmount) return;

    const amountReceived = parseFloat(paymentAmount);
    const orderTotal = orderDetails.final_total;
    const existingPaid = orderDetails.amount_paid || 0;
    const totalPaid = existingPaid + amountReceived;
    
    // Determine payment status based on amount
    let paymentStatus = 'unpaid';
    if (totalPaid >= orderTotal) {
      paymentStatus = totalPaid > orderTotal ? 'overpaid' : 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    setIsConfirmingPayment(true);
    try {
      // First, verify the payment proof (without verified_amount)
      const { error: verifyError } = await supabase
        .from('messages')
        .update({
          verification_status: 'verified',
          admin_notes: adminNotes.trim() || `Payment verified: ${orderDetails.final_currency} ${amountReceived.toFixed(2)} received`,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (verifyError) throw verifyError;

      // Then, confirm the payment using our RPC function
      const { error: paymentError } = await supabase.rpc('force_update_payment', {
        quote_id: orderId,
        new_amount_paid: totalPaid,
        new_payment_status: paymentStatus
      });

      if (paymentError) throw paymentError;

      // Send confirmation message to customer
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        let messageContent = '';
        let subject = '';
        
        if (paymentStatus === 'paid') {
          messageContent = `Great news! Your payment has been verified and confirmed! 🎉\n\nOrder: #${orderDetails.order_display_id}\nAmount Received: ${orderDetails.final_currency} ${amountReceived.toFixed(2)}\nTotal Paid: ${orderDetails.final_currency} ${totalPaid.toFixed(2)}\nPayment Status: Fully Paid\n\nWe're now processing your order and will update you with tracking information soon.`;
          subject = `Payment Confirmed - Order #${orderDetails.order_display_id}`;
        } else if (paymentStatus === 'partial') {
          const remaining = orderTotal - totalPaid;
          messageContent = `Your payment has been verified! \n\nOrder: #${orderDetails.order_display_id}\nAmount Received: ${orderDetails.final_currency} ${amountReceived.toFixed(2)}\nTotal Paid: ${orderDetails.final_currency} ${totalPaid.toFixed(2)}\nRemaining Balance: ${orderDetails.final_currency} ${remaining.toFixed(2)}\nPayment Status: Partial Payment\n\nPlease pay the remaining balance to process your order.`;
          subject = `Partial Payment Received - Order #${orderDetails.order_display_id}`;
        } else if (paymentStatus === 'overpaid') {
          const overpayment = totalPaid - orderTotal;
          messageContent = `Your payment has been verified! \n\nOrder: #${orderDetails.order_display_id}\nAmount Received: ${orderDetails.final_currency} ${amountReceived.toFixed(2)}\nTotal Paid: ${orderDetails.final_currency} ${totalPaid.toFixed(2)}\nOverpayment: ${orderDetails.final_currency} ${overpayment.toFixed(2)}\nPayment Status: Overpaid\n\nWe'll contact you regarding the overpayment refund. Your order is being processed.`;
          subject = `Payment Confirmed (Overpayment) - Order #${orderDetails.order_display_id}`;
        }
        
        await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: message.sender_id,
          quote_id: orderId,
          subject,
          content: messageContent,
          message_type: 'payment_verification',
          is_read: false
        });
      }

      toast({
        title: 'Success!',
        description: 'Payment verified and confirmed successfully',
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-message'] });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-message', orderId] });
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      // Invalidate all admin-orders queries (regardless of filters)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin-orders' 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-quote', orderId] });
      queryClient.invalidateQueries({ queryKey: ['quote-messages-count', orderId] });
      queryClient.invalidateQueries({ queryKey: ['payment-proofs'] });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-stats'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders-with-payment-proofs'] });

      onStatusUpdate?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify and confirm payment',
        variant: 'destructive',
      });
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleQuickAction = (status: PaymentProofStatus, notes: string) => {
    setVerificationStatus(status);
    setAdminNotes(notes);
    updateVerificationMutation.mutate({
      status,
      admin_notes: notes,
    });
  };

  const downloadFile = () => {
    if (message.attachment_url) {
      const link = document.createElement('a');
      link.href = message.attachment_url;
      link.download = message.attachment_file_name || 'payment-proof';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (message.attachment_url) {
      window.open(message.attachment_url, '_blank');
    }
  };

  const getStatusColor = (status: PaymentProofStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'verified': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Payment Verification - Order #{orderDetails?.order_display_id || orderId?.slice(0, 8)}
            </DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  <p><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+Enter</kbd> to approve</p>
                  <p><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+R</kbd> to reject</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Proof Preview */}
          <div className="bg-gray-50 rounded-lg p-4 relative">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openInNewTab}
              className="absolute top-2 right-2 z-10"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <div className="min-h-[200px] max-h-[300px] flex items-center justify-center">
              {message.attachment_url && message.attachment_file_name && isImage(message.attachment_file_name) ? (
                <div className="w-full">
                  {isImageLoading && <Loader2 className="h-8 w-8 animate-spin text-gray-400" />}
                  {imageError ? (
                    <div className="text-center text-gray-500">
                      <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-sm">Unable to load preview</p>
                    </div>
                  ) : (
                    <img
                      src={message.attachment_url}
                      alt="Payment Proof"
                      className={`max-w-full max-h-[250px] object-contain mx-auto rounded ${isImageLoading ? 'hidden' : 'block'}`}
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => {
                        setIsImageLoading(false);
                        setImageError(true);
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm font-medium">{message.attachment_file_name}</p>
                  <p className="text-xs mt-1">Click icon above to view</p>
                </div>
              )}
            </div>
          </div>

          {/* Show current status if already processed */}
          {message.verification_status && message.verification_status !== 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm">
                  This payment was <span className="font-medium">{message.verification_status}</span> on{' '}
                  {message.verified_at && new Date(message.verified_at).toLocaleDateString()}
                </p>
              </div>
              {message.admin_notes && (
                <p className="text-sm text-gray-600 mt-2">Note: {message.admin_notes}</p>
              )}
            </div>
          )}

          {/* Payment Details */}
          {orderDetails && (
            <div className="bg-white border rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Order Total</p>
                  <p className="font-semibold text-lg">{orderDetails.final_currency} {orderDetails.final_total.toFixed(2)}</p>
                </div>
                {(orderDetails.amount_paid || 0) > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Already Paid</p>
                    <p className="font-semibold text-lg text-green-600">- {orderDetails.final_currency} {(orderDetails.amount_paid || 0).toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 mb-1">Balance Due</p>
                  <p className="font-semibold text-lg text-orange-600">
                    {orderDetails.final_currency} {(orderDetails.final_total - (orderDetails.amount_paid || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="payment-amount" className="text-sm font-medium mb-2 block">
                  Amount Received
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {orderDetails.final_currency}
                  </span>
                  <input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                    placeholder="0.00"
                    autoFocus
                    required
                  />
                </div>
                
                {/* Simple status indicator */}
                {paymentAmount && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    {parseFloat(paymentAmount) >= orderDetails.final_total - (orderDetails.amount_paid || 0) ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-green-600">Payment complete</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span className="text-orange-600">
                          Partial payment - {orderDetails.final_currency} {(orderDetails.final_total - (orderDetails.amount_paid || 0) - parseFloat(paymentAmount)).toFixed(2)} remaining
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Admin Notes */}
          <div>
            <Label htmlFor="admin-notes" className="text-sm font-medium mb-2 block">
              Notes (Optional)
            </Label>
            <Textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          {(!message.verification_status || message.verification_status === 'pending') ? (
            <div className="flex gap-3">
              {orderDetails && (
                <Button 
                  onClick={handleVerifyAndConfirmPayment}
                  disabled={updateVerificationMutation.isPending || isConfirmingPayment || !paymentAmount}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-12"
                  size="lg"
                >
                  {isConfirmingPayment ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve Payment
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={() => {
                  setVerificationStatus('rejected');
                  handleVerify();
                }}
                disabled={updateVerificationMutation.isPending}
                variant="outline"
                className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 h-12"
                size="lg"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Reject
              </Button>
            </div>
          ) : (
            /* For already processed proofs */
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  setVerificationStatus('pending');
                  updateVerificationMutation.mutate({
                    status: 'pending',
                    admin_notes: 'Status reset for re-verification',
                  });
                }}
                variant="outline"
                className="text-sm"
              >
                Reset for Re-verification
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};