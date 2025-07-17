import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password', '');

  useEffect(() => {
    // Enhanced session handling with PASSWORD_RECOVERY event detection
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);

      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setTokenError(null);
      } else if (event === 'SIGNED_OUT') {
        setIsValidSession(false);
      }
    });

    // Fallback: Check URL parameters for tokens (backward compatibility)
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');

    if (accessToken && type === 'recovery') {
      // Set the session manually if PASSWORD_RECOVERY event wasn't triggered
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: searchParams.get('refresh_token') || '',
        })
        .then(({ error }) => {
          if (!error) {
            setIsValidSession(true);
            setTokenError(null);
          } else {
            setTokenError(
              'Invalid or expired reset token. Please request a new password reset link.',
            );
          }
        });
    } else if (!accessToken || type !== 'recovery') {
      setTokenError('Invalid or missing reset token. Please request a new password reset link.');
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;

    if (strength <= 2) return { text: 'Weak', color: 'text-red-500' };
    if (strength <= 4) return { text: 'Medium', color: 'text-yellow-500' };
    return { text: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!isValidSession) {
      toast.error('Invalid session. Please request a new password reset link.');
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password (session is already established)
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
      toast.success('Password reset successfully!');

      // Clear the session to log the user out
      await supabase.auth.signOut();

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth', {
          state: {
            message: 'Password reset successfully. Please login with your new password.',
          },
        });
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenError || (!isValidSession && !isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center gap-2 justify-center">
              <Lock className="h-6 w-6" />
              iWishBag - Invalid Reset Link
            </CardTitle>
            <CardDescription className="text-center">
              Your password reset session has expired or is invalid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {tokenError ||
                  'Invalid or expired reset token. Please request a new password reset link.'}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/auth')}>
                Back to Login
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth', { state: { showForgot: true } })}
              >
                Request New Reset Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-green-800">
              Password Reset Successful!
            </CardTitle>
            <CardDescription className="text-center">
              Welcome back to iWishBag - Your password has been updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your password has been reset successfully. You can now login with your new password.
              </AlertDescription>
            </Alert>
            <div className="text-center text-sm text-muted-foreground">
              Redirecting to login in 2 seconds...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Create a new secure password for your iWishBag account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              {password && (
                <div className="flex items-center space-x-2 text-sm">
                  <span>Password strength:</span>
                  <span className={passwordStrength.color}>{passwordStrength.text}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Password Requirements:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li className="flex items-center space-x-1">
                  <span className={password.length >= 8 ? 'text-green-600' : ''}>
                    • At least 8 characters
                  </span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className={password.match(/[A-Z]/) ? 'text-green-600' : ''}>
                    • One uppercase letter
                  </span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className={password.match(/[a-z]/) ? 'text-green-600' : ''}>
                    • One lowercase letter
                  </span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className={password.match(/[0-9]/) ? 'text-green-600' : ''}>
                    • One number
                  </span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className={password.match(/[^A-Za-z0-9]/) ? 'text-green-600' : ''}>
                    • One special character
                  </span>
                </li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/auth')}
                className="text-sm"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
