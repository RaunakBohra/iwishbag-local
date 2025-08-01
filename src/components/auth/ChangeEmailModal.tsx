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

type ModalStep = 'email-input' | 'dual-otp' | 'success';

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isPhoneOnlyUser, setIsPhoneOnlyUser] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<ModalStep>('email-input');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [verifiedPassword, setVerifiedPassword] = useState('');
  
  // Separate OTP states for current and new email
  const [currentEmailOtp, setCurrentEmailOtp] = useState<string[]>(new Array(6).fill(''));
  const [newEmailOtp, setNewEmailOtp] = useState<string[]>(new Array(6).fill(''));
  const [currentEmailOtpError, setCurrentEmailOtpError] = useState('');
  const [newEmailOtpError, setNewEmailOtpError] = useState('');

  // Check if user is OAuth or phone-only user
  useEffect(() => {
    if (user) {
      const provider = user.app_metadata?.provider;
      setIsOAuthUser(provider && provider !== 'email');
      // Check if user signed up via phone (has temp email)
      const isPhoneAuth = user.email?.includes('@phone.iwishbag.com') || 
                         (user.user_metadata?.signed_up_via === 'phone');
      setIsPhoneOnlyUser(isPhoneAuth);
      // Don't show temp email to phone-only users
      setCurrentEmail(isPhoneAuth ? '' : (user.email || ''));
    }
  }, [user]);



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
  const emailChangeSchema = (isOAuthUser || isPhoneOnlyUser) ? emailChangeSchemaOAuth : emailChangeSchemaWithPassword;
  
  const form = useForm<any>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: (isOAuthUser || isPhoneOnlyUser)
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
      // Step 1: Verify current password (only for email/password users)
      if (!isOAuthUser && !isPhoneOnlyUser) {
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
      
      // Move to dual OTP verification step
      setCurrentStep('dual-otp');

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
        description: `We've sent 6-digit codes to both ${currentEmail} and ${emailToChange}.`,
      });

    } catch (error: any) {
      console.error('Email change initiation error:', error);
      throw error;
    }
  };

  // Handle OTP input changes
  const handleOTPChange = (type: 'current' | 'new', index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const otpArray = type === 'current' ? currentEmailOtp : newEmailOtp;
    const setOtpArray = type === 'current' ? setCurrentEmailOtp : setNewEmailOtp;
    const setError = type === 'current' ? setCurrentEmailOtpError : setNewEmailOtpError;

    const newOtpValues = [...otpArray];
    newOtpValues[index] = value;
    setOtpArray(newOtpValues);
    setError(''); // Clear error when user types

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`${type}-otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 5) {
      const fullOtp = newOtpValues.join('');
      if (fullOtp.length === 6) {
        // Check if both OTPs are complete
        const otherOtp = type === 'current' ? newEmailOtp.join('') : currentEmailOtp.join('');
        if (otherOtp.length === 6) {
          handleBothOTPSubmit(
            type === 'current' ? fullOtp : otherOtp,
            type === 'current' ? otherOtp : fullOtp
          );
        }
      }
    }
  };

  const handleOTPKeyDown = (type: 'current' | 'new', index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const otpArray = type === 'current' ? currentEmailOtp : newEmailOtp;
      if (!otpArray[index] && index > 0) {
        const prevInput = document.getElementById(`${type}-otp-input-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  const handleOTPPaste = (type: 'current' | 'new', e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const setOtpArray = type === 'current' ? setCurrentEmailOtp : setNewEmailOtp;
      const newOtpValues = pastedData.split('').concat(new Array(6 - pastedData.length).fill(''));
      setOtpArray(newOtpValues);
      
      // Focus last filled input or last input if all filled
      const lastIndex = Math.min(pastedData.length - 1, 5);
      const lastInput = document.getElementById(`${type}-otp-input-${lastIndex}`);
      lastInput?.focus();
    }
  };

  const handleBothOTPSubmit = async (currentOtp: string, newOtp: string) => {
    if (!user || !newEmailAddress) return;

    setIsLoading(true);
    setCurrentEmailOtpError('');
    setNewEmailOtpError('');

    try {
      // Verify OTP for current email first
      const { error: currentError } = await supabase.auth.verifyOtp({
        token: currentOtp,
        type: 'email_change',
        email: currentEmail
      });

      if (currentError) {
        setCurrentEmailOtpError(currentError.message || 'Invalid code for current email');
        return;
      }

      // Verify OTP for new email
      const { error: newError } = await supabase.auth.verifyOtp({
        token: newOtp,
        type: 'email_change',
        email: newEmailAddress
      });

      if (newError) {
        setNewEmailOtpError(newError.message || 'Invalid code for new email');
        return;
      }

      // Both emails verified! Email change complete
      setCurrentStep('success');
      
      toast({
        title: 'Email Changed Successfully',
        description: `Your email has been updated to ${newEmailAddress}.`,
      });

    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify codes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyBothOTPs = () => {
    const currentOtp = currentEmailOtp.join('');
    const newOtp = newEmailOtp.join('');

    if (currentOtp.length !== 6) {
      setCurrentEmailOtpError('Please enter the complete code for your current email');
      return;
    }

    if (newOtp.length !== 6) {
      setNewEmailOtpError('Please enter the complete code for your new email');
      return;
    }

    handleBothOTPSubmit(currentOtp, newOtp);
  };

  // Reset all state when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setCurrentStep('email-input');
      setNewEmailAddress('');
      setVerifiedPassword('');
      setShowPassword(false);
      setCurrentEmailOtp(new Array(6).fill(''));
      setNewEmailOtp(new Array(6).fill(''));
      setCurrentEmailOtpError('');
      setNewEmailOtpError('');
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Mail className="h-6 w-6 text-teal-600" />
            {currentStep === 'dual-otp' ? 'Verify Both Emails' : 'Change Email Address'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {currentStep === 'dual-otp' ? (
              `Enter the 6-digit codes sent to both email addresses`
            ) : isOAuthUser ? (
              "Add an email address for password-based login alongside your social login."
            ) : isPhoneOnlyUser ? (
              "Add an email address to enable email login alongside your phone login."
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
        ) : currentStep === 'dual-otp' ? (
          <div className="space-y-6 py-4">
            <Alert className="border-teal-200 bg-teal-50">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <AlertDescription className="text-teal-800">
                <p className="font-medium">Verify Both Email Addresses</p>
                <p className="text-sm">Enter the 6-digit codes sent to both your current and new email addresses.</p>
              </AlertDescription>
            </Alert>

            {/* Current Email OTP */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-teal-500 rounded-full" />
                <label className="text-sm font-medium text-gray-700">
                  Current Email: {currentEmail}
                </label>
              </div>
              <div className="flex justify-center gap-2">
                {currentEmailOtp.map((value, index) => (
                  <input
                    key={index}
                    id={`current-otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOTPChange('current', index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown('current', index, e)}
                    onPaste={index === 0 ? (e) => handleOTPPaste('current', e) : undefined}
                    className={`w-10 h-10 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      currentEmailOtpError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              {currentEmailOtpError && (
                <p className="text-sm text-red-500 text-center">{currentEmailOtpError}</p>
              )}
            </div>

            {/* New Email OTP */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <label className="text-sm font-medium text-gray-700">
                  New Email: {newEmailAddress}
                </label>
              </div>
              <div className="flex justify-center gap-2">
                {newEmailOtp.map((value, index) => (
                  <input
                    key={index}
                    id={`new-otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOTPChange('new', index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown('new', index, e)}
                    onPaste={index === 0 ? (e) => handleOTPPaste('new', e) : undefined}
                    className={`w-10 h-10 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      newEmailOtpError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                ))}
              </div>
              {newEmailOtpError && (
                <p className="text-sm text-red-500 text-center">{newEmailOtpError}</p>
              )}
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleVerifyBothOTPs}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify & Change Email
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('email-input');
                    setCurrentEmailOtp(new Array(6).fill(''));
                    setNewEmailOtp(new Array(6).fill(''));
                    setCurrentEmailOtpError('');
                    setNewEmailOtpError('');
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
        ) : (
          <>
            {(isOAuthUser || isPhoneOnlyUser) && (
              <Alert className="mb-4 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium mb-1">
                    {isPhoneOnlyUser ? 'Phone Login Account' : 'Social Login Account'}
                  </p>
                  <p className="text-sm">
                    {isPhoneOnlyUser 
                      ? "You signed up with phone number. Adding an email will give you another way to login."
                      : `You signed up with ${user?.app_metadata?.provider === 'google' ? 'Google' : 'Facebook'}. Your social login email (${currentEmail}) will continue to work for ${user?.app_metadata?.provider} sign-in.`
                    }
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

                {!isOAuthUser && !isPhoneOnlyUser && (
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
                      <li>We'll send 6-digit codes to both email addresses</li>
                      <li>Enter both codes on the verification screen</li>
                      <li>Your email will be updated after both codes are verified</li>
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