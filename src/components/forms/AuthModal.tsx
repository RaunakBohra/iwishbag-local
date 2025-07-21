import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { User, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';

// Reuse the existing validation schemas
const signInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(8, {
    message: 'Please enter a valid phone number (minimum 8 digits).',
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

interface AuthModalProps {
  mode: 'signin' | 'signup';
  onSuccess?: () => void;
  onBack?: () => void;
  onSwitchMode?: (mode: 'signin' | 'signup') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode, onSuccess, onBack, onSwitchMode }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      terms: false,
    },
  });

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

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast({
        title: 'Error signing in',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      onSuccess?.();
    }
    setLoading(false);
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name, phone: values.phone },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        toast({
          title: 'Error signing up',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Supabase will handle email confirmation automatically
      toast({
        title: 'Welcome to iWishBag!',
        description:
          "Please check your email to confirm your account. You'll be able to sign in after email verification.",
        duration: 8000,
      });

      // Switch to sign in mode after successful signup
      onSwitchMode?.('signin');
    } catch (err) {
      console.error('Unexpected signup error:', err);
      toast({
        title: 'Error signing up',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes:
          provider === 'google'
            ? 'openid profile email https://www.googleapis.com/auth/user.addresses.read'
            : 'email',
        redirectTo: window.location.href, // Return to current page after auth
      },
    });
    if (error) {
      toast({
        title: `${provider === 'google' ? 'Google' : 'Facebook'} sign-in error`,
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (mode === 'signin') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Sign In</h3>
        </div>

        <Form {...signInForm}>
          <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
            <FormField
              control={signInForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={signInForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  className="flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={loading}
                  className="flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode?.('signup')}
                className="text-primary hover:underline"
              >
                Need an account? Sign up
              </button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  // Sign Up Form
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Create Account</h3>
      </div>

      <Form {...signUpForm}>
        <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
          <FormField
            control={signUpForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signUpForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signUpForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signUpForm.control}
            name="password"
            render={({ field }) => {
              const password = field.value || '';
              const passwordStrength = getPasswordStrength(password);
              return (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <span>Password strength:</span>
                        <span className={passwordStrength.color}>{passwordStrength.text}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 ml-2">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.bg}`}
                            style={{
                              width: `${Math.min(passwordStrength.text === 'Weak' ? 33 : passwordStrength.text === 'Medium' ? 66 : 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={signUpForm.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={loading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    I agree to the terms and conditions
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-500">Or sign up with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={loading}
                className="flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode?.('signin')}
              className="text-primary hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
};
