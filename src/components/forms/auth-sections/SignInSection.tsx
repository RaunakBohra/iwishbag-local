/**
 * SignInSection Component
 * Handles email/password sign-in functionality
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

interface SignInSectionProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onToggleSignUp?: () => void;
  onShowForgotPassword?: () => void;
  loading?: boolean;
  className?: string;
}

export const SignInSection: React.FC<SignInSectionProps> = ({
  onLogin,
  onToggleSignUp,
  onShowForgotPassword,
  loading: externalLoading = false,
  className = '',
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    if (onLogin) {
      // Use custom login handler for MFA or other custom logic
      await onLogin(values.email, values.password);
    } else {
      // Default sign-in behavior
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
        });
        toast({
          title: 'Error signing in',
          description: error.message,
          variant: 'destructive',
        });
      }
      setLoading(false);
    }
  };

  const isLoading = loading || externalLoading;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to your account to continue
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSignIn)}
          className="space-y-5"
        >
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-end">
            {onShowForgotPassword && (
              <button
                type="button"
                onClick={onShowForgotPassword}
                className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Form>

      {onToggleSignUp && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onToggleSignUp}
              className="font-medium text-teal-600 hover:text-teal-800"
              disabled={isLoading}
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </div>
  );
};