import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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
  DollarSign
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
  verified_amount?: number;
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
      setPaymentAmount(orderDetails.final_total.toString());
    }
  }, [orderDetails]);

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
      // First update the verification status
      const user = (await supabase.auth.getUser()).data.user;
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          verification_status: verification.status,
          admin_notes: verification.admin_notes,
          verified_amount: verification.verified_amount,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (updateError) throw updateError;

      // Send automatic message to customer based on verification status
      let messageContent = '';
      if (verification.status === 'verified') {
        messageContent = `Good news! Your payment proof has been verified successfully. We have confirmed receipt of your payment and will proceed with processing your order.\n\nAmount Verified: ${verification.verified_amount || 'As submitted'}\n${verification.admin_notes ? `\nAdmin Notes: ${verification.admin_notes}` : ''}\n\nThank you for your payment!`;
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

  const handleVerify = () => {
    updateVerificationMutation.mutate({
      status: verificationStatus,
      admin_notes: adminNotes.trim() || undefined,
      verified_amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
    });
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
      // First, verify the payment proof
      const { error: verifyError } = await supabase
        .from('messages')
        .update({
          verification_status: 'verified',
          admin_notes: adminNotes.trim() || `Payment verified: ${orderDetails.final_currency} ${amountReceived.toFixed(2)} received`,
          verified_amount: amountReceived,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (verifyError) throw verifyError;

      // Then, confirm the payment
      const { error: paymentError } = await supabase
        .from('quotes')
        .update({
          payment_status: paymentStatus,
          paid_at: new Date().toISOString(),
          amount_paid: totalPaid
        })
        .eq('id', orderId);

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
      queryClient.invalidateQueries({ queryKey: ['quotes', orderId] });
      // Invalidate all admin-orders queries (regardless of filters)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin-orders' 
      });
      queryClient.invalidateQueries({ queryKey: ['admin-quote', orderId] });

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
      verified_amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Payment Proof Verification
          </DialogTitle>
          <DialogDescription>
            Review and verify the payment proof submitted for Order #{orderId}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment Proof</h3>
              <Button variant="outline" size="sm" onClick={openInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Size
              </Button>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px] flex items-center justify-center">
              {message.attachment_url && message.attachment_file_name && isImage(message.attachment_file_name) ? (
                <div className="w-full">
                  {isImageLoading && (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <AlertCircle className="h-12 w-12 mb-2" />
                      <p>Failed to load image</p>
                      <p className="text-sm mt-1">Click "View Full Size" above to open</p>
                    </div>
                  ) : (
                    <img
                      src={message.attachment_url}
                      alt="Payment Proof"
                      className={`max-w-full max-h-96 object-contain mx-auto rounded ${isImageLoading ? 'hidden' : 'block'}`}
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => {
                        setIsImageLoading(false);
                        setImageError(true);
                      }}
                    />
                  )}
                </div>
              ) : isPDF(message.attachment_file_name || '') ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium mb-2">PDF Document</p>
                  <p className="text-sm text-gray-500">{message.attachment_file_name}</p>
                  <p className="text-xs text-gray-400 mt-2">Click "View Full Size" above to open</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium mb-2">Document</p>
                  <p className="text-sm text-gray-500">{message.attachment_file_name}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={downloadFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Message Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge className={getStatusColor(message.verification_status || 'pending')}>
                  {(message.verification_status || 'pending').charAt(0).toUpperCase() + 
                   (message.verification_status || 'pending').slice(1)}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="font-medium">Submitted:</span> {new Date(message.created_at).toLocaleString()}
              </div>
              <div className="text-sm">
                <span className="font-medium">File:</span> {message.attachment_file_name}
              </div>
            </div>
          </div>

          {/* Verification Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Verification Details</h3>

            {/* Show current status if already processed */}
            {message.verification_status && message.verification_status !== 'pending' && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Status:</span>
                  <Badge className={getStatusColor(message.verification_status)}>
                    {message.verification_status.charAt(0).toUpperCase() + message.verification_status.slice(1)}
                  </Badge>
                </div>
                {message.admin_notes && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {message.admin_notes}
                  </div>
                )}
                {message.verified_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Processed on {new Date(message.verified_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Detailed Verification Form */}
            <div className="space-y-4">

              {/* Payment Amount Section */}
              {orderDetails && (
                <div className="bg-blue-50 p-2 rounded-lg space-y-2">
                  <Label className="text-blue-900 font-semibold text-xs">
                    Payment Confirmation Details
                  </Label>
                  
                  {/* Order Total */}
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-gray-600">Order Total</Label>
                    <div className="bg-white px-2 py-1 rounded border border-gray-300">
                      <span className="font-semibold text-xs">{orderDetails.final_currency} {orderDetails.final_total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Previously Paid (if any) */}
                  {(orderDetails.amount_paid || 0) > 0 && (
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-gray-600">Previously Paid</Label>
                      <div className="bg-gray-100 px-2 py-1 rounded border border-gray-300">
                        <span className="font-medium text-xs">- {orderDetails.final_currency} {(orderDetails.amount_paid || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Amount Being Paid Now */}
                  <div className="space-y-0.5">
                    <Label htmlFor="payment-amount" className="text-[10px] text-gray-600">
                      Amount Being Paid Now <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-xs"
                      placeholder="Enter amount received"
                      required
                    />
                  </div>

                  {/* Due Amount Calculation */}
                  {paymentAmount && (
                    <div className="space-y-0.5 pt-1.5 border-t border-blue-200">
                      <Label className="text-[10px] text-gray-600">Remaining Due After This Payment</Label>
                      <div className={`px-2 py-1 rounded border ${
                        orderDetails.final_total - (orderDetails.amount_paid || 0) - parseFloat(paymentAmount) <= 0
                          ? 'bg-green-100 border-green-300'
                          : 'bg-orange-100 border-orange-300'
                      }`}>
                        <span className={`font-semibold text-xs ${
                          orderDetails.final_total - (orderDetails.amount_paid || 0) - parseFloat(paymentAmount) <= 0
                            ? 'text-green-700'
                            : 'text-orange-700'
                        }`}>
                          {orderDetails.final_currency} {Math.max(0, orderDetails.final_total - (orderDetails.amount_paid || 0) - parseFloat(paymentAmount)).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Payment Status Indicator */}
                      <div className="text-[10px] mt-1">
                        {parseFloat(paymentAmount) > orderDetails.final_total - (orderDetails.amount_paid || 0) ? (
                          <p className="text-blue-600 flex items-center gap-1">
                            <span className="text-[10px]">ℹ️</span>
                            <span>Overpayment of {orderDetails.final_currency} {(parseFloat(paymentAmount) - (orderDetails.final_total - (orderDetails.amount_paid || 0))).toFixed(2)}</span>
                          </p>
                        ) : parseFloat(paymentAmount) === orderDetails.final_total - (orderDetails.amount_paid || 0) ? (
                          <p className="text-green-600 flex items-center gap-1">
                            <span className="text-[10px]">✓</span>
                            <span>Full payment - Order will be completely paid</span>
                          </p>
                        ) : (
                          <p className="text-orange-600 flex items-center gap-1">
                            <span className="text-[10px]">⚠️</span>
                            <span>Partial payment - Customer needs to pay remaining balance</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Admin Notes */}
              <div>
                <Label htmlFor="admin-notes">Admin Notes {(!message.verification_status || message.verification_status === 'pending') ? '(Optional)' : ''}</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={message.verification_status && message.verification_status !== 'pending' ? "Add additional notes..." : "Add verification notes..."}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              {(!message.verification_status || message.verification_status === 'pending') ? (
                <div className="space-y-3">
                  {/* Primary Action - Verify & Confirm Payment */}
                  {orderDetails && (
                    <Button 
                      onClick={handleVerifyAndConfirmPayment}
                      disabled={updateVerificationMutation.isPending || isConfirmingPayment || !paymentAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="default"
                    >
                      {isConfirmingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Confirm Payment
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Secondary Action - Reject */}
                  <Button 
                    onClick={() => {
                      setVerificationStatus('rejected');
                      handleVerify();
                    }}
                    disabled={updateVerificationMutation.isPending}
                    variant="outline"
                    className="w-full border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject with Notes
                  </Button>
                </div>
              ) : (
                /* For already processed proofs - allow re-verification */
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This payment proof has already been {message.verification_status}. 
                    {message.verification_status === 'rejected' && 'The customer can submit a new proof.'}
                  </p>
                  
                  {message.verification_status === 'verified' && orderDetails && (
                    <Button 
                      onClick={handleVerifyAndConfirmPayment}
                      disabled={isConfirmingPayment || !paymentAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Confirm Payment
                    </Button>
                  )}
                  
                  {/* Allow changing status */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                      Change verification status
                    </summary>
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                      <Select value={verificationStatus} onValueChange={(value: PaymentProofStatus) => setVerificationStatus(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending Review</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleVerify}
                        disabled={updateVerificationMutation.isPending}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        Update Status
                      </Button>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};