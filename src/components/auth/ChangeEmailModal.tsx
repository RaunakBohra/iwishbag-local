import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle,
  Info,
  ArrowLeft
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalStep = 'email-input' | 'confirmation-sent' | 'success';

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<ModalStep>('email-input');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [verifiedPassword, setVerifiedPassword] = useState('');

  // Check if user is OAuth user
  useEffect(() => {
    if (user) {
      const provider = user.app_metadata?.provider;
      setIsOAuthUser(provider && provider !== 'email');
      setCurrentEmail(user.email || '');
    }
  }, [user]);

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Create dynamic schema based on user type
  const emailChangeSchemaWithPassword = z.object({
    currentPassword: z.string().min(1, 'Password is required'),
    newEmail: z.string().email('Invalid email address'),
    confirmEmail: z.string().email('Invalid email address'),
  }).refine((data) => data.newEmail === data.confirmEmail, {
    message: "Email addresses don't match",
    path: ['confirmEmail'],
  }).refine((data) => data.newEmail.toLowerCase() !== currentEmail.toLowerCase(), {
    message: "New email must be different from current email",
    path: ['newEmail'],
  });

  const emailChangeSchemaOAuth = z.object({
    newEmail: z.string().email('Invalid email address'),
    confirmEmail: z.string().email('Invalid email address'),
  }).refine((data) => data.newEmail === data.confirmEmail, {
    message: "Email addresses don't match",
    path: ['confirmEmail'],
  }).refine((data) => data.newEmail.toLowerCase() !== currentEmail.toLowerCase(), {
    message: "New email must be different from current email",
    path: ['newEmail'],
  });

  // Use appropriate schema based on user type
  const emailChangeSchema = isOAuthUser ? emailChangeSchemaOAuth : emailChangeSchemaWithPassword;
  
  const form = useForm<any>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: isOAuthUser 
      ? {
          newEmail: '',
          confirmEmail: '',
        }
      : {
          currentPassword: '',
          newEmail: '',
          confirmEmail: '',
        },
  });

  const handleEmailSubmit = async (values: any) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Step 1: Verify current password (only for non-OAuth users)
      if (!isOAuthUser) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: values.currentPassword,
        });

        if (signInError) {
          toast({
            title: 'Error',
            description: 'Current password is incorrect',
            variant: 'destructive',
          });
          return;
        }
        setVerifiedPassword(values.currentPassword);
      }

      // Store new email for later
      setNewEmailAddress(values.newEmail);
      
      // Step 2: Initiate email change (sends OTPs to both emails)
      await initiateEmailChange(values.newEmail);
      
      // Move to current email OTP verification step
      setCurrentStep('current-email-otp');
      setResendCooldown(60);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate email change',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initiateEmailChange = async (newEmail?: string) => {
    if (!user) return;
    
    const emailToChange = newEmail || newEmailAddress;
    if (!emailToChange) {
      throw new Error('No email address provided');
    }

    try {
      console.log('Initiating email change:', {
        currentEmail,
        newEmail: emailToChange,
        user: user.email
      });
      
      // This will send OTPs to both current and new email addresses
      const { data, error } = await supabase.auth.updateUser({
        email: emailToChange,
      });

      console.log('Email change response:', { data, error });

      if (error) {
        throw error;
      }

      toast({
        title: 'Verification Codes Sent',
        description: `We've sent verification codes to both ${currentEmail} and ${emailToChange}.`,
      });

    } catch (error: any) {
      console.error('Email change initiation error:', error);
      throw error;
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);
    setOtpError(''); // Clear error when user types

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5) {
      const fullOtp = newOtpValues.join('');
      if (fullOtp.length === 6) {
        if (currentStep === 'current-email-otp') {
          handleCurrentEmailOTPSubmit(fullOtp);
        } else if (currentStep === 'new-email-otp') {
          handleNewEmailOTPSubmit(fullOtp);
        }
      }
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtpValues = pastedData.split('').concat(new Array(6 - pastedData.length).fill(''));
      setOtpValues(newOtpValues);
      
      // Focus last filled input or last input if all filled
      const lastIndex = Math.min(pastedData.length - 1, 5);
      const lastInput = document.getElementById(`otp-input-${lastIndex}`);
      lastInput?.focus();
      
      // Auto-submit if 6 digits
      if (pastedData.length === 6) {
        if (currentStep === 'current-email-otp') {
          handleCurrentEmailOTPSubmit(pastedData);
        } else if (currentStep === 'new-email-otp') {
          handleNewEmailOTPSubmit(pastedData);
        }
      }
    }
  };

  const handleCurrentEmailOTPSubmit = async (otp: string) => {
    if (!user || !newEmailAddress) return;

    setIsLoading(true);
    setOtpError('');

    try {
      // Verify OTP for current email
      const { error } = await supabase.auth.verifyOtp({
        token: otp,
        type: 'email_change',
        email: currentEmail
      });

      if (error) {
        setOtpError(error.message || 'Invalid verification code. Please try again.');
        return;
      }

      // Current email verified! Move to new email verification
      setCurrentStep('new-email-otp');
      setOtpValues(new Array(6).fill('')); // Reset OTP values
      setOtpError('');
      
      toast({
        title: 'Current Email Verified',
        description: `Now enter the code sent to ${newEmailAddress}.`,
      });

    } catch (error: any) {
      console.error('Current email OTP verification error:', error);
      setOtpError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewEmailOTPSubmit = async (otp: string) => {
    if (!user || !newEmailAddress) return;

    setIsLoading(true);
    setOtpError('');

    try {
      // Verify OTP for new email
      const { error } = await supabase.auth.verifyOtp({
        token: otp,
        type: 'email_change',
        email: newEmailAddress
      });

      if (error) {
        setOtpError(error.message || 'Invalid verification code. Please try again.');
        return;
      }

      // Both emails verified! Email change complete
      setCurrentStep('success');
      
      toast({
        title: 'Email Changed Successfully',
        description: `Your email has been updated to ${newEmailAddress}.`,
      });

    } catch (error: any) {
      console.error('New email OTP verification error:', error);
      setOtpError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!user || !newEmailAddress || resendCooldown > 0) return;

    setIsLoading(true);
    try {
      await initiateEmailChange();
      setResendCooldown(60);
      toast({
        title: 'Verification Codes Resent',
        description: 'New codes have been sent to both email addresses.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification codes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all state when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setCurrentStep('email-input');
      setOtpValues(new Array(6).fill(''));
      setOtpError('');
      setResendCooldown(0);
      setNewEmailAddress('');
      setVerifiedPassword('');
      setShowPassword(false);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Mail className="h-6 w-6 text-teal-600" />
            {currentStep === 'current-email-otp' ? 'Verify Current Email' : 
             currentStep === 'new-email-otp' ? 'Verify New Email' :
             'Change Email Address'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {currentStep === 'current-email-otp' ? (
              `Enter the 6-digit code we sent to ${currentEmail}`
            ) : currentStep === 'new-email-otp' ? (
              `Enter the 6-digit code we sent to ${newEmailAddress}`
            ) : isOAuthUser ? (
              "Add an email address for password-based login alongside your social login."
            ) : (
              "Update your email address with secure two-step verification."
            )}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'success' ? (
          <div className="space-y-4 py-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Email Changed Successfully!</h3>
              <p className="text-gray-600">
                Your email has been updated to:
              </p>
              <p className="font-medium text-teal-600">{newEmailAddress}</p>
            </div>
            <div className="pt-4">
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        ) : currentStep === 'current-email-otp' || currentStep === 'new-email-otp' ? (
          <div className="space-y-6 py-4">
            <Alert className="border-teal-200 bg-teal-50">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                <p className="font-medium">{currentStep === 'current-email-otp' ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
                <p className="text-sm">
                  {currentStep === 'current-email-otp' 
                    ? 'Verify access to your current email address' 
                    : 'Verify access to your new email address'}
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    onPaste={index === 0 ? handleOTPPaste : undefined}
                    className={`w-12 h-12 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      otpError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              
              {otpError && (
                <p className="text-sm text-red-500 text-center">{otpError}</p>
              )}
              
              <div className="text-center space-y-3">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm text-teal-600 hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    'Resend verification codes'
                  )}
                </button>
                
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep('email-input');
                      setOtpValues(new Array(6).fill(''));
                      setOtpError('');
                    }}
                    disabled={isLoading}
                    className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to email change
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isOAuthUser && (
              <Alert className="mb-4 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium mb-1">Social Login Account</p>
                  <p className="text-sm">
                    You signed up with {user?.app_metadata?.provider === 'google' ? 'Google' : 'Facebook'}.
                    Your social login email ({currentEmail}) will continue to work for {user?.app_metadata?.provider} sign-in.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Current Email</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{currentEmail}</span>
                    {isOAuthUser && (
                      <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded">
                        {user?.app_metadata?.provider}
                      </span>
                    )}
                  </div>
                </div>

                {!isOAuthUser && (
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter your current password"
                              className="pr-10"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="Enter your new email"
                            className="pl-10"
                            disabled={isLoading}
                            {...field}
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="Confirm your new email"
                            className="pl-10"
                            disabled={isLoading}
                            {...field}
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-sm">
                    <p className="font-medium mb-1">Two-Step Verification Process</p>
                    <ol className="text-sm space-y-1 ml-4 list-decimal">
                      <li>We'll send verification codes to both email addresses</li>
                      <li>Enter the code from your current email first</li>
                      <li>Then enter the code from your new email to complete the change</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Continue
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};