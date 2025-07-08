import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle } from 'lucide-react';

interface GuestApprovalDialogProps {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  quoteId: string;
  action: 'approve' | 'reject';
  onSuccess: () => void;
}

export const GuestApprovalDialog: React.FC<GuestApprovalDialogProps> = ({
  isOpen,
  onOpenChange,
  onClose,
  quoteId,
  action,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Simple update - just change the status, no email required
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        [action === 'approve' ? 'approved_at' : 'rejected_at']: new Date().toISOString(),
      };

      
      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId)
        .select();


      if (error) {
        console.error('Database update error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No quote was updated. The quote may have expired or the link may be invalid.');
      }

      toast({
        title: action === 'approve' ? "Quote Approved!" : "Quote Rejected",
        description: action === 'approve' 
          ? `Thank you for your approval. You'll now be redirected to checkout.`
          : `Thank you for your response.`,
      });

      // Call onSuccess first to refresh the quote data
      onSuccess();
      
      // If approved, redirect to guest checkout after a short delay
      if (action === 'approve') {
        setTimeout(() => {
          // Navigate to guest checkout with just the quote ID
          window.location.href = `/guest-checkout?quote=${quoteId}`;
        }, 1000); // Give time for the success toast to show
      } else {
        if (onClose) onClose();
        if (onOpenChange) onOpenChange(false);
      }
      
    } catch (error: any) {
      console.error(`Error ${action}ing quote:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} quote. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionText = action === 'approve' ? 'Approve' : 'Reject';
  const actionColor = action === 'approve' ? 'text-green-600' : 'text-red-600';
  const ActionIcon = action === 'approve' ? CheckCircle : XCircle;

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange || handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${actionColor}`}>
            <ActionIcon className="h-5 w-5" />
            {actionText} Quote
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? 'Approve this quote to proceed to checkout where you can complete your order.'
              : 'Reject this quote if you do not wish to proceed with this order.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 ${
                action === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {actionText}ing...
                </>
              ) : (
                <>
                  <ActionIcon className="h-4 w-4 mr-2" />
                  {actionText} Quote
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <strong>What happens next?</strong>
          <ul className="mt-1 space-y-1">
            {action === 'approve' ? (
              <>
                <li>• You'll be redirected to checkout to complete your order</li>
                <li>• You can choose to checkout as a guest or create an account</li>
                <li>• We'll collect your contact details during checkout</li>
              </>
            ) : (
              <>
                <li>• This quote will be marked as rejected</li>
                <li>• You can contact us if you change your mind</li>
                <li>• No further action is required</li>
              </>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};