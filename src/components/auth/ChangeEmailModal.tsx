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

  // Listen for email change completion
  useEffect(() => {
    if (currentStep === 'confirmation-sent' && user && newEmailAddress) {
      // Check if the user's email has been updated
      if (user.email === newEmailAddress) {
        setCurrentStep('success');
        toast({
          title: 'Email Changed Successfully',
          description: `Your email has been updated to ${newEmailAddress}.`,
        });
      }
    }
  }, [user, currentStep, newEmailAddress]);


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
      
      // Step 2: Initiate email change (sends confirmation links to both emails)
      await initiateEmailChange(values.newEmail);
      
      // Move to confirmation sent step
      setCurrentStep('confirmation-sent');

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
      
      // This will send confirmation links to both current and new email addresses
      const { data, error } = await supabase.auth.updateUser({
        email: emailToChange,
      });

      console.log('Email change response:', { data, error });

      if (error) {
        throw error;
      }

      toast({
        title: 'Confirmation Emails Sent',
        description: `We've sent confirmation emails to verify this change.`,
      });

    } catch (error: any) {
      console.error('Email change initiation error:', error);
      throw error;
    }
  };


  // Reset all state when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setCurrentStep('email-input');
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
            {currentStep === 'confirmation-sent' ? 'Check Your Email' : 'Change Email Address'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {currentStep === 'confirmation-sent' ? (
              `We've sent confirmation emails to verify your email change`
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
        ) : currentStep === 'confirmation-sent' ? (
          <div className="space-y-4 py-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-lg">Confirmation Emails Sent!</h3>
              <p className="text-gray-600">
                We've sent confirmation emails to both addresses:
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-gray-700">{currentEmail}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-gray-700">{newEmailAddress}</span>
                </div>
              </div>
              
              <Alert className="border-blue-200 bg-blue-50 text-left">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <p className="font-medium mb-1">Complete Your Email Change</p>
                  <ol className="text-sm space-y-1 ml-4 list-decimal">
                    <li>Check both email inboxes</li>
                    <li>Click the confirmation link in <strong>both</strong> emails</li>
                    <li>Your email will be updated after both confirmations</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="text-sm text-gray-600">
                <p>Didn't receive the emails? Check your spam folder.</p>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Close
              </Button>
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
                      <li>We'll send confirmation links to both email addresses</li>
                      <li>Click the link in both emails to verify the change</li>
                      <li>Your email will be updated after both confirmations</li>
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