import React, { useState, useEffect } from 'react';
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
import { CheckCircle, XCircle, User, UserPlus, Mail, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AuthModal } from '@/components/forms/AuthModal';
import { useAuth } from '@/contexts/AuthContext';

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
  const [guestEmail, setGuestEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [currentView, setCurrentView] = useState<'options' | 'signin' | 'signup'>('options');
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Store pending action when auth modal is shown
  useEffect(() => {
    if (currentView === 'signin' || currentView === 'signup') {
      const currentPath = window.location.pathname;
      sessionStorage.setItem('pendingQuoteAction', JSON.stringify({
        action: 'approve',
        quoteId,
        shareToken: currentPath.split('/').pop()
      }));
    }
  }, [currentView, quoteId]);
  
  // Handle successful authentication
  const handleAuthSuccess = () => {
    // The pending action will be processed by QuoteDetailUnified component
    // Just close this dialog
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };


  const handleGuestCheckout = async () => {
    // Validate email
    if (!guestEmail) {
      setEmailError('Email is required');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      setEmailError('Please enter a valid email');
      return;
    }
    
    setEmailError('');
    setIsSubmitting(true);
    
    try {
      // Update quote with email and approve
      const { error } = await supabase
        .from('quotes')
        .update({
          email: guestEmail,
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Quote Approved!",
        description: "Redirecting to checkout...",
      });

      // Redirect to guest checkout
      setTimeout(() => {
        window.location.href = `/guest-checkout?quote=${quoteId}`;
      }, 1000);
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve quote. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    
    try {
      const updateData = {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
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
        title: "Quote Rejected",
        description: "Thank you for your response.",
      });

      // Call onSuccess to refresh the quote data
      onSuccess();
      
      if (onClose) onClose();
      if (onOpenChange) onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error rejecting quote:', error);
      toast({
        title: "Error",
        description: "Failed to reject quote. Please try again.",
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
    setCurrentView('options'); // Reset view when closing
    setGuestEmail('');
    setEmailError('');
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange || handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${actionColor}`}>
            {currentView !== 'options' && action === 'approve' ? (
              <>
                <button
                  onClick={() => setCurrentView('options')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {currentView === 'signin' ? 'Sign In' : 'Create Account'}
              </>
            ) : (
              <>
                <ActionIcon className="h-5 w-5" />
                {actionText} Quote
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' 
              ? currentView === 'options' 
                ? 'Choose how you would like to proceed with this quote.'
                : currentView === 'signin'
                  ? 'Sign in to your account to continue with this quote.'
                  : 'Create an account to continue with this quote.'
              : 'Reject this quote if you do not wish to proceed with this order.'}
          </DialogDescription>
        </DialogHeader>

        {action === 'approve' ? (
          currentView === 'options' ? (
            <div className="space-y-6">
              {/* Account Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Have an account?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('signin')}
                    disabled={isSubmitting}
                    className="h-auto py-4 flex flex-col gap-2"
                  >
                    <User className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-medium">Sign In</div>
                      <div className="text-xs text-muted-foreground">Use existing account</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('signup')}
                    disabled={isSubmitting}
                    className="h-auto py-4 flex flex-col gap-2"
                  >
                    <UserPlus className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-medium">Sign Up</div>
                      <div className="text-xs text-muted-foreground">Create new account</div>
                    </div>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Guest Checkout Option */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Continue as guest</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="guestEmail">Email Address</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={guestEmail}
                      onChange={(e) => {
                        setGuestEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={emailError ? 'border-red-500' : ''}
                    />
                    {emailError && (
                      <p className="text-sm text-red-500 mt-1">{emailError}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleGuestCheckout}
                    disabled={isSubmitting || !guestEmail}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Continue as Guest
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                By proceeding, you agree to our terms and conditions.
              </div>
            </div>
          ) : (
            <AuthModal 
              mode={currentView as 'signin' | 'signup'}
              onSuccess={handleAuthSuccess}
              onBack={() => setCurrentView('options')}
              onSwitchMode={(mode) => setCurrentView(mode)}
            />
          )
        ) : (
          /* Reject Confirmation */
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to reject this quote? This action cannot be undone.
            </p>
            <div className="flex gap-3">
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
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};