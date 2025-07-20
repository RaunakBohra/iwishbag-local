import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Mail, ArrowLeft, User } from 'lucide-react';
import { AuthModal } from '@/components/forms/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { TurnstileProtectedForm } from '@/components/security/TurnstileProtectedForm';

interface QuoteRequestContactFormProps {
  onSubmit: (emailData: { email: string; name?: string; useAuth?: boolean; turnstileToken?: string }) => void;
  isSubmitting: boolean;
  submitError?: string;
  clearError?: () => void;
}

export const QuoteRequestContactForm: React.FC<QuoteRequestContactFormProps> = ({
  onSubmit,
  isSubmitting,
  submitError,
  clearError,
}) => {
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const [currentView, setCurrentView] = useState<'options' | 'signin' | 'signup'>('options');
  const { toast } = useToast();
  const { user } = useAuth();

  // Handle successful authentication
  const handleAuthSuccess = () => {
    // Submit with authenticated user
    onSubmit({ email: user?.email || '', useAuth: true });
  };

  // Handle social login
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
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
    }
  };

  const handleGuestSubmit = async (turnstileToken?: string) => {
    // Clear previous errors
    if (clearError) clearError();
    
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

    if (!guestName.trim()) {
      setNameError('Name is required');
      hasErrors = true;
    } else {
      setNameError('');
    }

    if (hasErrors) return;

    // Submit with guest data
    await onSubmit({ 
      email: guestEmail, 
      name: guestName.trim(),
      useAuth: false,
      turnstileToken
    });
  };

  return (
    <div className="space-y-6">
      {/* Contact Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="guestEmail" className="text-sm font-medium text-gray-700 mb-2 block">
              Email address
            </Label>
            <Input
              id="guestEmail"
              type="email"
              placeholder="your@email.com"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setEmailError('');
                if (clearError) clearError();
              }}
              className={`h-12 text-base ${emailError ? 'border-red-500' : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500'} transition-colors`}
              autoFocus
            />
            {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
          </div>
          
          <div>
            <Label htmlFor="guestName" className="text-sm font-medium text-gray-700 mb-2 block">
              Full name
            </Label>
            <Input
              id="guestName"
              type="text"
              placeholder="John Doe"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setNameError('');
                if (clearError) clearError();
              }}
              className={`h-12 text-base ${nameError ? 'border-red-500' : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500'} transition-colors`}
            />
            {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <TurnstileProtectedForm
        onSubmit={handleGuestSubmit}
        isSubmitting={isSubmitting}
        submitButtonText="Submit Quote Request"
        submitButtonClassName="w-full h-14 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium text-lg rounded-lg transition-all duration-200 shadow-sm"
        disabled={!guestEmail || !guestName}
        action="guest_quote_request"
        errorMessage={submitError}
        id="quote-contact-form"
      >
        {/* This content will be rendered inside the form */}
      </TurnstileProtectedForm>

      {/* Optional Account Creation */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">
            Want to track your quotes? <button
              onClick={() => handleSocialLogin('google')}
              disabled={isSubmitting}
              className="text-teal-600 hover:text-teal-700 underline font-medium"
            >
              Sign up with Google
            </button>
          </p>
        </div>
      </div>

      <div className="text-xs text-center text-gray-500">
        By submitting, you agree to our{' '}
        <a href="/terms-conditions" className="text-teal-600 hover:text-teal-700 underline" target="_blank" rel="noopener noreferrer">
          terms & conditions
        </a>
      </div>
    </div>
  );
};