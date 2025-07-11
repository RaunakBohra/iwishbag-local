import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Message } from '@/components/messaging/types';

interface PaymentProofPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message & { message_type: 'payment_proof' };
  orderId?: string;
  onStatusUpdate?: () => void;
}

type PaymentProofStatus = 'pending' | 'verified' | 'rejected' | 'confirmed';

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
  const [verifiedAmount, setVerifiedAmount] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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
      const { error } = await supabase
        .from('messages')
        .update({
          verification_status: verification.status,
          admin_notes: verification.admin_notes,
          verified_amount: verification.verified_amount,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', message.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Verification Updated',
        description: `Payment proof has been ${verificationStatus}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['quote-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
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
      verified_amount: verifiedAmount ? parseFloat(verifiedAmount) : undefined,
    });
  };

  const handleQuickAction = (status: PaymentProofStatus, notes: string) => {
    setVerificationStatus(status);
    setAdminNotes(notes);
    updateVerificationMutation.mutate({
      status,
      admin_notes: notes,
      verified_amount: verifiedAmount ? parseFloat(verifiedAmount) : undefined,
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
      case 'verified': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300';
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
              <h3 className="text-lg font-semibold">Attachment Preview</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadFile}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={openInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>
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
                      <Button variant="outline" size="sm" onClick={openInNewTab} className="mt-2">
                        Open in new tab
                      </Button>
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
                  <p className="text-sm text-gray-500 mb-4">{message.attachment_file_name}</p>
                  <Button onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open PDF
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium mb-2">Document</p>
                  <p className="text-sm text-gray-500 mb-4">{message.attachment_file_name}</p>
                  <Button onClick={downloadFile}>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
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
            <h3 className="text-lg font-semibold">Verification Actions</h3>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="border-green-300 hover:bg-green-50"
                onClick={() => handleQuickAction('verified', 'Payment proof verified and approved')}
                disabled={updateVerificationMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Quick Approve
              </Button>
              <Button
                variant="outline"
                className="border-red-300 hover:bg-red-50"
                onClick={() => handleQuickAction('rejected', 'Payment proof rejected - insufficient or unclear documentation')}
                disabled={updateVerificationMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Quick Reject
              </Button>
            </div>

            {/* Detailed Verification Form */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label htmlFor="verification-status">Verification Status</Label>
                <Select value={verificationStatus} onValueChange={(value: PaymentProofStatus) => setVerificationStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="verified-amount">Verified Amount (Optional)</Label>
                <input
                  id="verified-amount"
                  type="number"
                  step="0.01"
                  value={verifiedAmount}
                  onChange={(e) => setVerifiedAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter verified amount"
                />
              </div>

              <div>
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add verification notes..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleVerify}
                disabled={updateVerificationMutation.isPending}
                className="w-full"
              >
                {updateVerificationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Verification'
                )}
              </Button>
            </div>

            {/* Existing Admin Notes */}
            {message.admin_notes && (
              <div className="border-t pt-4">
                <Label>Previous Admin Notes</Label>
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  {message.admin_notes}
                </div>
                {message.verified_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Last updated: {new Date(message.verified_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};