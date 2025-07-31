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
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

// Different schemas for OAuth users (no current password) vs regular users
const changePasswordSchemaWithCurrent = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const setPasswordSchemaOAuth = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchemaWithCurrent>;
type SetPasswordFormValues = z.infer<typeof setPasswordSchemaOAuth>;

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  // Check if user is OAuth user (no password set)
  useEffect(() => {
    if (user) {
      const provider = user.app_metadata?.provider;
      // OAuth users have provider like 'google' or 'facebook', regular users have 'email'
      setIsOAuthUser(provider && provider !== 'email');
    }
  }, [user]);

  // Use different schema based on user type
  const currentSchema = isOAuthUser ? setPasswordSchemaOAuth : changePasswordSchemaWithCurrent;
  
  const form = useForm<ChangePasswordFormValues | SetPasswordFormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: isOAuthUser 
      ? {
          newPassword: '',
          confirmPassword: '',
        }
      : {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
  });

  const getPasswordStrength = (password: string) => {
    if (!password) return { text: '', color: '' };
    
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    if (score <= 2) return { text: 'Weak', color: 'text-red-500' };
    if (score <= 4) return { text: 'Medium', color: 'text-yellow-500' };
    return { text: 'Strong', color: 'text-green-500' };
  };

  const handleSubmit = async (values: any) => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (!isOAuthUser) {
        // For regular users, verify current password first
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
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) {
        toast({
          title: 'Error',
          description: updateError.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: isOAuthUser ? 'Password set successfully' : 'Password changed successfully',
        description: isOAuthUser 
          ? 'You can now sign in with your email and password.' 
          : 'Your password has been updated.',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'Failed to change password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>{isOAuthUser ? 'Set Password' : 'Change Password'}</DialogTitle>
              <DialogDescription>
                {isOAuthUser 
                  ? 'Set a password to enable email/password login for your account.'
                  : 'Enter your current password and choose a new one.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {isOAuthUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <p className="font-medium mb-1">OAuth Account Detected</p>
                    <p className="text-xs">
                      You signed up with {user?.app_metadata?.provider === 'google' ? 'Google' : user?.app_metadata?.provider === 'facebook' ? 'Facebook' : 'a social provider'}.
                      Setting a password will allow you to also sign in with your email address.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
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
                          type={showCurrentPassword ? 'text' : 'password'}
                          {...field}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showCurrentPassword ? (
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
              name="newPassword"
              render={({ field }) => {
                const password = field.value || '';
                const passwordStrength = getPasswordStrength(password);
                return (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          {...field}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    {password && (
                      <div className="mt-2">
                        <div className="flex space-x-1 mb-2">
                          <div
                            className={`h-1 rounded-full flex-1 transition-colors duration-200 ${
                              passwordStrength.text === 'Weak'
                                ? 'bg-red-300'
                                : passwordStrength.text === 'Medium'
                                  ? 'bg-yellow-300'
                                  : 'bg-green-400'
                            }`}
                          />
                          <div
                            className={`h-1 rounded-full flex-1 transition-colors duration-200 ${
                              passwordStrength.text === 'Medium'
                                ? 'bg-yellow-300'
                                : passwordStrength.text === 'Strong'
                                  ? 'bg-green-400'
                                  : 'bg-gray-200'
                            }`}
                          />
                          <div
                            className={`h-1 rounded-full flex-1 transition-colors duration-200 ${
                              passwordStrength.text === 'Strong' ? 'bg-green-400' : 'bg-gray-200'
                            }`}
                          />
                        </div>
                        <p className={`text-xs ${passwordStrength.color}`}>
                          Password strength: {passwordStrength.text}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...field}
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? (
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-blue-800">
                  <p className="font-medium mb-1">Password Requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>At least 8 characters long</li>
                    <li>Include uppercase and lowercase letters</li>
                    <li>Include at least one number</li>
                    <li>Include at least one special character (@$!%*?&)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
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
                    {isOAuthUser ? 'Setting...' : 'Changing...'}
                  </>
                ) : (
                  isOAuthUser ? 'Set Password' : 'Change Password'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};