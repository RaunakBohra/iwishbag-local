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
import { CheckCircle, XCircle, Mail } from 'lucide-react';

interface GuestApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  action: 'approve' | 'reject';
  onSuccess: () => void;
}

export const GuestApprovalDialog: React.FC<GuestApprovalDialogProps> = ({
  isOpen,
  onClose,
  quoteId,
  action,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to continue.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Update quote with guest email and approval status
      const updateData = {
        email: email, // Use existing email field instead of guest_email
        status: action === 'approve' ? 'approved' : 'rejected',
        [action === 'approve' ? 'approved_at' : 'rejected_at']: new Date().toISOString(),
      };

      console.log('Updating quote with data:', updateData, 'for quoteId:', quoteId);

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No quote was updated. Quote may not exist or you may not have permission to update it.');
      }

      toast({
        title: action === 'approve' ? "Quote Approved!" : "Quote Rejected",
        description: `Thank you for your response. You'll receive updates at ${email}`,
      });

      onSuccess();
      onClose();
      setEmail('');
      
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${actionColor}`}>
            <ActionIcon className="h-5 w-5" />
            {actionText} Quote
          </DialogTitle>
          <DialogDescription>
            Please provide your email address to {action === 'approve' ? 'approve' : 'reject'} this quote.
            We'll send you updates and allow you to proceed with your order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
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
        </form>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <strong>What happens next?</strong>
          <ul className="mt-1 space-y-1">
            {action === 'approve' ? (
              <>
                <li>• You'll be able to add this quote to your cart</li>
                <li>• We'll create a secure account for you during checkout</li>
                <li>• You'll receive order updates at this email</li>
              </>
            ) : (
              <>
                <li>• This quote will be marked as rejected</li>
                <li>• You'll receive a confirmation email</li>
                <li>• You can contact us if you change your mind</li>
              </>
            )}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};