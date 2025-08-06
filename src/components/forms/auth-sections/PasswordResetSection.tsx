/**
 * PasswordResetSection Component
 * Handles forgot password flow with OTP verification and password reset
 * Extracted from AuthForm for better maintainability
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

const otpVerifySchema = z.object({
  otp: z.string().length(6, { message: 'Please enter a 6-digit code' }),
});

const newPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

interface PasswordResetSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordResetModeChange?: (allow: boolean) => void;
}

type ResetStep = 'email' | 'otp' | 'newPassword';

export const PasswordResetSection: React.FC<PasswordResetSectionProps> = ({
  open,
  onOpenChange,
  onPasswordResetModeChange,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<ResetStep>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');

  const emailForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<z.infer<typeof otpVerifySchema>>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { otp: '' },
    mode: 'onChange',
  });

  const passwordForm = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '' },
  });

  // Reset all forms and state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep('email');
      setResetEmail('');
      setVerifiedOtp('');
      emailForm.reset();
      otpForm.reset();
      passwordForm.reset();
      onPasswordResetModeChange?.(false);
    }
    onOpenChange(newOpen);
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setLoading(true);
    onPasswordResetModeChange?.(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Email link is invalid')) {
          errorMessage = 'Email service is not configured. Please contact support.';
        } else if (error.message.includes('Rate limit')) {
          errorMessage = 'Too many reset attempts. Please try again later.';
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        setResetEmail(values.email);
        setCurrentStep('otp');
        otpForm.reset({ otp: '' });
        passwordForm.reset({ newPassword: '' });
        
        toast({
          title: 'Password reset email sent!',
          description: 'Please check your inbox for a 6-digit code from iWishBag.',
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (values: z.infer<typeof otpVerifySchema>) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: values.otp,
        type: 'recovery',
      });

      if (error) {
        console.error('OTP verification error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          errorMessage = 'The code is invalid or has expired. Please request a new code.';
        }
        
        toast({
          title: 'Verification failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } else if (data?.session) {
        setVerifiedOtp(values.otp);
        setCurrentStep('newPassword');
        
        toast({
          title: 'Code verified!',
          description: 'Please enter your new password.',
        });
      }
    } catch (error) {
      console.error('Unexpected OTP verification error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (values: z.infer<typeof newPasswordSchema>) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        toast({
          title: 'Error updating password',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password updated successfully!',
          description: 'You can now sign in with your new password.',
        });
        handleOpenChange(false);
      }
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const goBackToStep = (step: ResetStep) => {
    setCurrentStep(step);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" />
            {currentStep === 'email' && 'Reset Password'}
            {currentStep === 'otp' && 'Check Your Email'}
            {currentStep === 'newPassword' && 'Set New Password'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'email' && 'Enter your email address and we\'ll send you a reset code.'}
            {currentStep === 'otp' && `We sent a 6-digit code to ${resetEmail}. Enter it below to continue.`}
            {currentStep === 'newPassword' && 'Your code has been verified. Please enter your new password.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentStep === 'email' && (
            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(handleForgotPassword)}
                className="space-y-4"
              >
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          autoComplete="email"
                          autoFocus
                          className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    'Send reset code'
                  )}
                </Button>
              </form>
            </Form>
          )}

          {currentStep === 'otp' && (
            <Form {...otpForm}>
              <form
                onSubmit={otpForm.handleSubmit(handleOtpVerification)}
                className="space-y-4"
              >
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          pattern="[0-9]{6}"
                          inputMode="numeric"
                          autoComplete="off"
                          autoFocus
                          className="h-14 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-2 bg-white text-gray-900 placeholder:text-gray-400 text-center text-2xl font-mono tracking-[0.5em] font-semibold"
                          disabled={loading}
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying code...
                    </>
                  ) : (
                    'Verify code'
                  )}
                </Button>
                
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => goBackToStep('email')}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                    disabled={loading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      emailForm.handleSubmit(handleForgotPassword)();
                    }}
                    className="text-teal-600 hover:text-teal-800"
                    disabled={loading}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </Form>
          )}

          {currentStep === 'newPassword' && (
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordReset)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter new password"
                            autoComplete="new-password"
                            autoFocus
                            className="h-11 px-4 pr-10 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        Must be at least 8 characters with upper/lowercase, numbers, and symbols
                      </p>
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
                
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => goBackToStep('otp')}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to code
                  </button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};