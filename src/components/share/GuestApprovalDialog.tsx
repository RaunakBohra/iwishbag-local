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
import { CheckCircle, XCircle, User, UserPlus, Mail, ArrowLeft, Zap, Star, Shield } from 'lucide-react';
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
  const [guestName, setGuestName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [currentView, setCurrentView] = useState<'options' | 'signin' | 'signup'>('options');
  const { toast } = useToast();
  const { user } = useAuth();

  // Store pending action when auth modal is shown
  useEffect(() => {
    if (currentView === 'signin' || currentView === 'signup') {
      const currentPath = window.location.pathname;
      sessionStorage.setItem(
        'pendingQuoteAction',
        JSON.stringify({
          action: 'approve',
          quoteId,
          shareToken: currentPath.split('/').pop(),
        }),
      );
    }
  }, [currentView, quoteId]);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    // The pending action will be processed by QuoteDetailUnified component
    // Just close this dialog
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  // Handle social login
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href,
        },
      });
      
      if (error) {
        toast({
          title: 'Login Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Social login error:', error);
      toast({
        title: 'Login Error', 
        description: 'Failed to login. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestCheckout = async () => {
    // Validate email and name
    let hasErrors = false;
    
    if (!guestEmail) {
      setEmailError('Email is required');
      hasErrors = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        setEmailError('Please enter a valid email');
        hasErrors = true;
      } else {
        setEmailError('');
      }
    }

    if (!guestName) {
      setNameError('Full name is required');
      hasErrors = true;
    } else {
      setNameError('');
    }

    if (hasErrors) return;
    setIsSubmitting(true);

    try {
      // Update quote with email, name and approve
      const { error } = await supabase
        .from('quotes')
        .update({
          email: guestEmail,
          customer_name: guestName,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Quote Approved!',
        description: 'Redirecting to checkout...',
      });

      // Redirect to guest checkout
      setTimeout(() => {
        window.location.href = `/guest-checkout?quote=${quoteId}`;
      }, 1000);
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve quote. Please try again.',
        variant: 'destructive',
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
        throw new Error(
          'No quote was updated. The quote may have expired or the link may be invalid.',
        );
      }

      toast({
        title: 'Quote Rejected',
        description: 'Thank you for your response.',
      });

      // Call onSuccess to refresh the quote data
      onSuccess();

      if (onClose) onClose();
      if (onOpenChange) onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error rejecting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject quote. Please try again.',
        variant: 'destructive',
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
    setGuestName('');
    setEmailError('');
    setNameError('');
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
                ? 'Enter your email to approve this quote and continue to checkout.'
                : currentView === 'signin'
                  ? 'Sign in to your account to continue with this quote.'
                  : 'Create an account to continue with this quote.'
              : 'Reject this quote if you do not wish to proceed with this order.'}
          </DialogDescription>
        </DialogHeader>

        {action === 'approve' ? (
          currentView === 'options' ? (
            <div className="space-y-4">
              {/* Simple Email and Name Entry */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="guestEmail" className="text-sm font-medium text-gray-900">Email address</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setEmailError('');
                    }}
                    className={`mt-2 h-12 ${emailError ? 'border-red-500' : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'}`}
                    autoFocus
                  />
                  {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
                </div>
                
                <div>
                  <Label htmlFor="guestName" className="text-sm font-medium text-gray-900">Full name</Label>
                  <Input
                    id="guestName"
                    type="text"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setNameError('');
                    }}
                    className={`mt-2 h-12 ${nameError ? 'border-red-500' : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'}`}
                  />
                  {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
                </div>
                
                <Button
                  onClick={handleGuestCheckout}
                  disabled={isSubmitting || !guestEmail || !guestName}
                  className="w-full h-12 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium text-base transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Approving Quote...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve Quote & Continue
                    </>
                  )}
                </Button>
              </div>

              {/* Optional Account Sign In */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">Have an account?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isSubmitting}
                      className="h-10 text-sm border-gray-200 hover:bg-gray-50"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentView('signin')}
                      disabled={isSubmitting}
                      className="h-10 text-sm border-gray-200 hover:bg-gray-50"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-center text-gray-500">
                By approving, you agree to our{' '}
                <a href="/terms-conditions" className="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">
                  terms & conditions
                </a>
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
