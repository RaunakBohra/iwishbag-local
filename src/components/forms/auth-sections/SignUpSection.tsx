/**
 * SignUpSection Component
 * Handles user registration with phone validation and password strength
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { useAllCountries } from '@/hooks/useAllCountries';

const signUpSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string()
    .min(1, { message: 'Phone number is required.' })
    .regex(/^\+[1-9]\d{6,14}$/, { 
      message: 'Please enter a valid phone number with country code.' 
    }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  terms: z.literal(true, {
    errorMap: () => ({
      message: 'You must agree to the terms and conditions.',
    }),
  }),
});

interface SignUpSectionProps {
  onToggleSignIn?: () => void;
  loading?: boolean;
  className?: string;
}

export const SignUpSection: React.FC<SignUpSectionProps> = ({
  onToggleSignIn,
  loading: externalLoading = false,
  className = '',
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { data: countries = [] } = useAllCountries();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      terms: true,
    },
  });

  const watchPassword = form.watch('password');

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;

    if (strength <= 2) return { text: 'Weak', color: 'text-red-500', bg: 'bg-red-500' };
    if (strength <= 4) return { text: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { text: 'Strong', color: 'text-green-500', bg: 'bg-green-500' };
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
            phone: values.phone,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        let errorMessage = authError.message;
        if (authError.message.includes('already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (authError.message.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (authError.message.includes('Password')) {
          errorMessage = 'Password does not meet requirements. Please check and try again.';
        }

        toast({
          title: 'Error creating account',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (authData?.user && !authData.session) {
        // Email confirmation required
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please check your email and click the link to activate your account.',
          duration: 8000,
        });
      } else if (authData?.session) {
        // User is automatically signed in
        toast({
          title: 'Account created successfully!',
          description: 'Welcome to iWishBag! Your account has been created and you are now signed in.',
        });
      }

      // Reset form on success
      form.reset();
    } catch (error) {
      console.error('Unexpected error during sign up:', error);
      toast({
        title: 'Error creating account',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || externalLoading;
  const passwordStrength = getPasswordStrength(watchPassword || '');

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Join iWishBag and start shopping globally
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSignUp)}
          className="space-y-5"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Full name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Email address
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Phone number
                </FormLabel>
                <FormControl>
                  <WorldClassPhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    countries={countries}
                    placeholder="Select country and enter phone number"
                    className="h-11 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        className="h-11 px-4 pr-10 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {watchPassword && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${passwordStrength.bg}`}
                              style={{
                                width: `${Math.max(20, (passwordStrength.text === 'Weak' ? 33 : passwordStrength.text === 'Medium' ? 66 : 100))}%`
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${passwordStrength.color}`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                        
                        {/* Password Requirements */}
                        <div className="text-xs space-y-1">
                          <div className={`flex items-center gap-1 ${watchPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                            {watchPassword.length >= 8 ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            At least 8 characters
                          </div>
                          <div className={`flex items-center gap-1 ${/[A-Z]/.test(watchPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[A-Z]/.test(watchPassword) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            Uppercase letter
                          </div>
                          <div className={`flex items-center gap-1 ${/[a-z]/.test(watchPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[a-z]/.test(watchPassword) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            Lowercase letter
                          </div>
                          <div className={`flex items-center gap-1 ${/[0-9]/.test(watchPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[0-9]/.test(watchPassword) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            Number
                          </div>
                          <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(watchPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                            {/[^A-Za-z0-9]/.test(watchPassword) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            Special character
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                    className="mt-1"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">
                    I agree to the{' '}
                    <a
                      href="/terms-conditions"
                      target="_blank"
                      className="text-teal-600 hover:text-teal-800 underline"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      className="text-teal-600 hover:text-teal-800 underline"
                    >
                      Privacy Policy
                    </a>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </Form>

      {onToggleSignIn && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onToggleSignIn}
              className="font-medium text-teal-600 hover:text-teal-800"
              disabled={isLoading}
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </div>
  );
};