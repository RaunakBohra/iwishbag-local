import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle,
  X,
  Receipt,
  DollarSign,
  FileText,
  Loader2,
  Info,
  AlertCircle,
  Hash,
  Eye,
  Download,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencyUtils';

interface PaymentProof {
  id: string;
  sender_id: string;
  quote_id: string;
  subject: string;
  content: string;
  proof_images?: string[];
  amount_claimed?: number;
  created_at: string;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  sender?: {
    full_name?: string;
    email?: string;
  };
}

interface PaymentBalance {
  orderTotal: number;
  currentPaid: number;
  newAmount: number;
  newTotal: number;
  newStatus: string;
  overpayment: number;
}

interface PaymentVerificationSectionProps {
  paymentProofs: PaymentProof[];
  currency: string;
  currencySymbol: string;
  orderTotal: number;
  currentPaidAmount: number;
  onProofVerified: () => void;
  onProofRejected: () => void;
}

export const PaymentVerificationSection: React.FC<PaymentVerificationSectionProps> = ({
  paymentProofs,
  currency,
  currencySymbol,
  orderTotal,
  currentPaidAmount,
  onProofVerified,
  onProofRejected,
}) => {
  const [verifyProofId, setVerifyProofId] = useState<string | null>(null);
  const [verifyAmount, setVerifyAmount] = useState<string>('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [viewingProofId, setViewingProofId] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Filter unverified proofs
  const unverifiedProofs = paymentProofs.filter(p => !p.verified_at);

  const calculatePaymentBalance = (newAmount: number): PaymentBalance => {
    const newTotal = currentPaidAmount + newAmount;
    let newStatus = 'partial';
    
    if (newTotal >= orderTotal) {
      newStatus = newTotal === orderTotal ? 'paid' : 'overpaid';
    }
    
    return {
      orderTotal,
      currentPaid: currentPaidAmount,
      newAmount,
      newTotal,
      newStatus,
      overpayment: Math.max(0, newTotal - orderTotal),
    };
  };

  const balance = calculatePaymentBalance(parseFloat(verifyAmount) || 0);

  const handleVerifyProof = async () => {
    if (!verifyProofId || !verifyAmount) return;

    const amount = parseFloat(verifyAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid verification amount',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // Use the RPC function to verify and record payment
      const { error } = await supabase.rpc('confirm_payment_from_proof', {
        p_proof_id: verifyProofId,
        p_verified_amount: amount,
        p_notes: verifyNotes.trim() || null,
      });

      if (error) {
        console.error('Payment verification error:', error);
        toast({
          title: 'Verification Failed',
          description: error.message || 'Failed to verify payment proof',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Proof Verified',
        description: `Payment of ${currencySymbol}${amount.toFixed(2)} verified and recorded`,
      });

      // Clear form
      setVerifyProofId(null);
      setVerifyAmount('');
      setVerifyNotes('');

      // Notify parent component
      onProofVerified();
      
    } catch (error) {
      console.error('Error verifying proof:', error);
      toast({
        title: 'Unexpected Error',
        description: 'An unexpected error occurred during verification',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectProof = async () => {
    if (!verifyProofId || !rejectionReason) return;

    setIsRejecting(true);
    
    try {
      // Update proof as rejected
      const { error } = await supabase
        .from('messages')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason,
          verification_notes: verifyNotes.trim() || null,
          verified_at: new Date().toISOString(),
        })
        .eq('id', verifyProofId);

      if (error) throw error;

      // Send rejection notification to customer
      const proofMessage = paymentProofs?.find((p) => p.id === verifyProofId);
      if (proofMessage) {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase.from('messages').insert({
            sender_id: user.user.id,
            recipient_id: proofMessage.sender_id,
            quote_id: proofMessage.quote_id,
            subject: 'Payment Proof Rejected',
            content: `Your payment proof has been rejected. Reason: ${rejectionReason}\n\nPlease submit a new payment proof or contact support for assistance.`,
            message_type: 'payment_verification_result',
          });
        }
      }

      toast({
        title: 'Proof Rejected',
        description: 'Payment proof has been rejected and customer notified.',
      });

      // Clear form
      setVerifyProofId(null);
      setRejectionReason('');
      setVerifyNotes('');

      // Notify parent component
      onProofRejected();
      
    } catch (error) {
      console.error('Error rejecting proof:', error);
      toast({
        title: 'Rejection Failed',
        description: 'Failed to reject payment proof',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const fillClaimedAmount = (proof: PaymentProof) => {
    if (proof.amount_claimed && proof.amount_claimed > 0) {
      setVerifyAmount(proof.amount_claimed.toString());
    }
  };

  const openProofImages = (proof: PaymentProof) => {
    if (proof.proof_images && proof.proof_images.length > 0) {
      // Open first image in new tab
      window.open(proof.proof_images[0], '_blank');
    }
  };

  const downloadProofImages = async (proof: PaymentProof) => {
    if (!proof.proof_images || proof.proof_images.length === 0) return;

    try {
      for (let i = 0; i < proof.proof_images.length; i++) {
        const imageUrl = proof.proof_images[i];
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `payment_proof_${proof.id}_${i + 1}.jpg`;
        link.click();
      }
      
      toast({
        title: 'Download Started',
        description: 'Payment proof images are being downloaded',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download proof images',
        variant: 'destructive',
      });
    }
  };

  // Keyboard shortcuts for verification
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when a proof is selected
      if (!verifyProofId) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (verifyAmount && parseFloat(verifyAmount) > 0 && !isVerifying) {
            handleVerifyProof();
          }
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          if (rejectionReason && !isRejecting) {
            handleRejectProof();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [verifyProofId, verifyAmount, rejectionReason, isVerifying, isRejecting]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-dashed border-2 border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-amber-900">Payment Proof Verification</h3>
              <p className="text-sm text-amber-700">
                {unverifiedProofs.length} unverified proof{unverifiedProofs.length !== 1 ? 's' : ''} pending review
              </p>
            </div>
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              {unverifiedProofs.length} Pending
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Unverified Proofs */}
      {unverifiedProofs.length > 0 ? (
        <div className="space-y-4">
          {unverifiedProofs.map((proof) => (
            <Card key={proof.id} className={cn(
              "border-2 transition-colors",
              verifyProofId === proof.id ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{proof.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      From: {proof.sender?.full_name || proof.sender?.email || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {proof.amount_claimed && (
                      <Badge variant="secondary" className="text-sm">
                        Claimed: {currencySymbol}{proof.amount_claimed.toFixed(2)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {new Date(proof.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Proof Content */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm">{proof.content}</p>
                    </div>
                  </div>
                </div>

                {/* Proof Images */}
                {proof.proof_images && proof.proof_images.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">
                        Proof Images ({proof.proof_images.length})
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openProofImages(proof)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadProofImages(proof)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto">
                      {proof.proof_images.slice(0, 3).map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Proof ${index + 1}`}
                          className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-75"
                          onClick={() => openProofImages(proof)}
                        />
                      ))}
                      {proof.proof_images.length > 3 && (
                        <div className="h-20 w-20 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                          +{proof.proof_images.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={verifyProofId === proof.id ? "default" : "outline"}
                    onClick={() => {
                      if (verifyProofId === proof.id) {
                        setVerifyProofId(null);
                        setVerifyAmount('');
                        setVerifyNotes('');
                        setRejectionReason('');
                      } else {
                        setVerifyProofId(proof.id);
                        setVerifyAmount('');
                        setVerifyNotes('');
                        setRejectionReason('');
                      }
                    }}
                  >
                    {verifyProofId === proof.id ? 'Cancel' : 'Select for Verification'}
                  </Button>
                  {proof.amount_claimed && proof.amount_claimed > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setVerifyProofId(proof.id);
                        fillClaimedAmount(proof);
                      }}
                    >
                      Use Claimed Amount
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Verification Form */}
          {verifyProofId && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Verify Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Balance Calculation */}
                {verifyAmount && parseFloat(verifyAmount) > 0 && (
                  <Alert className="border-teal-200 bg-teal-50">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Order Total:</span>
                          <span className="font-medium">
                            {currencySymbol}{balance.orderTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Already Paid:</span>
                          <span className="font-medium">
                            {currencySymbol}{balance.currentPaid.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>New Amount:</span>
                          <span className="font-medium">
                            {currencySymbol}{balance.newAmount.toFixed(2)}
                          </span>
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>Total After:</span>
                          <span className={cn(
                            balance.newTotal > balance.orderTotal
                              ? 'text-orange-600'
                              : balance.newTotal === balance.orderTotal
                                ? 'text-green-600'
                                : 'text-orange-600',
                          )}>
                            {currencySymbol}{balance.newTotal.toFixed(2)} ({balance.newStatus})
                          </span>
                        </div>
                        {balance.overpayment > 0 && (
                          <div className="text-orange-600 text-xs">
                            Overpayment: {currencySymbol}{balance.overpayment.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="verify-amount">
                      Verified Amount ({currencySymbol})
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="verify-amount"
                        type="text"
                        placeholder="0.00"
                        value={verifyAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d*$/.test(value) || value === '') {
                            setVerifyAmount(value);
                          }
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Rejection Reason</Label>
                    <Select value={rejectionReason} onValueChange={setRejectionReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select if rejecting..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invalid_amount">Amount doesn't match</SelectItem>
                        <SelectItem value="unclear_proof">Proof unclear/unreadable</SelectItem>
                        <SelectItem value="wrong_account">Wrong bank account</SelectItem>
                        <SelectItem value="duplicate">Duplicate submission</SelectItem>
                        <SelectItem value="insufficient_details">Missing transaction details</SelectItem>
                        <SelectItem value="other">Other reason</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-notes">Admin Notes</Label>
                  <Textarea
                    id="verify-notes"
                    placeholder="Add verification notes or detailed rejection reason..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Keyboard shortcuts reminder */}
                <Alert className="border-gray-200">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <kbd className="font-mono bg-gray-100 px-1 rounded mr-2">Ctrl+Enter</kbd>
                    to approve •
                    <kbd className="font-mono bg-gray-100 px-1 rounded mx-2">Ctrl+R</kbd>
                    to reject
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    onClick={handleVerifyProof}
                    disabled={isVerifying || !verifyAmount || parseFloat(verifyAmount) <= 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify & Record Payment
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleRejectProof}
                    disabled={isRejecting || !rejectionReason}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Reject Proof
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No unverified payment proofs</p>
          <p className="text-sm mt-1">All payment proofs have been processed</p>
        </div>
      )}
    </div>
  );
};