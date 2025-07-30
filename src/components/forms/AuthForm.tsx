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
// Removed unused Tabs import
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
// Removed unused cn import
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';
// import { TurnstileProtectedForm } from '@/components/security/TurnstileProtectedForm'; // Component removed
// Removed unused useEmailNotifications import

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

interface AuthFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
}

const AuthForm = ({ onLogin }: AuthFormProps = {}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState('');

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
      terms: true,
    },
  });

  const forgotForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<z.infer<typeof otpVerifySchema>>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { otp: '' },
  });

  const passwordForm = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '' },
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

  const handleSignIn = async (values: z.infer<typeof signInSchema>, turnstileToken?: string) => {
    if (onLogin) {
      // Use custom login handler for MFA
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

  const handleSignInWithGoogle = async () => {
    console.log('🔐 [AuthForm] Starting Google OAuth sign-in...');
    setLoading(true);
    
    // Clear any existing anonymous session first
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session?.user?.is_anonymous) {
      console.log('🔐 [AuthForm] Clearing anonymous session before OAuth...');
      await supabase.auth.signOut();
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'openid profile email https://www.googleapis.com/auth/user.addresses.read',
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    console.log('🔐 [AuthForm] OAuth response:', { data, error });
    
    if (error) {
      console.error('🔐 [AuthForm] Google sign-in error:', error);
      toast({
        title: 'Google sign-in error',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSignInWithFacebook = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'email',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast({
        title: 'Facebook sign-in error',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>, turnstileToken?: string) => {
    setLoading(true);

    try {
      // Sign up user with Supabase (email confirmation disabled)
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        phone: values.phone, // Save phone directly to auth.users.phone
        options: {
          data: { name: values.name },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        console.error('Sign up error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
        });
        toast({
          title: 'Error signing up',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // In local development, send welcome email manually (since confirmations are disabled)
      // In production, Supabase handles this automatically
      const isLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (isLocal && data.user) {
        console.log('🔵 Sending welcome email for local development...');

        try {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: values.email,
              subject: 'Welcome to iWishBag!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to iWishBag!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Shop The World, Delivered To You</p>
                  </div>
                  
                  <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin-bottom: 20px;">Hi ${values.name}! 🎉</h2>
                    
                    <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                      Thank you for joining iWishBag! Your account has been created and you can start shopping immediately.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${window.location.origin}/dashboard" 
                         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: 600;">
                        Start Shopping
                      </a>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
                      <h3 style="margin-top: 0; color: #333;">🌟 What you can do with iWishBag:</h3>
                      <ul style="color: #666; padding-left: 20px;">
                        <li>Shop from Amazon, eBay, Flipkart, Alibaba and more</li>
                        <li>Get instant shipping quotes to India & Nepal</li>
                        <li>Track your orders in real-time</li>
                        <li>Secure international payment processing</li>
                      </ul>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
                      Welcome to iWishBag - Happy Shopping!
                    </p>
                  </div>
                </div>
              `,
              from: 'iWishBag <noreply@whyteclub.com>',
            },
          });

          if (emailError) {
            console.error('Welcome email sending error:', emailError);
          } else {
            console.log('✅ Welcome email sent successfully');
          }
        } catch (err) {
          console.error('Welcome email error:', err);
        }

        toast({
          title: 'Welcome to iWishBag!',
          description:
            'Your account has been created successfully! Check your email for a welcome message.',
          variant: 'default',
          duration: 8000,
        });
      } else {
        toast({
          title: 'Welcome to iWishBag!',
          description:
            "Please check your email to confirm your account. You'll be able to sign in after email verification.",
          variant: 'default',
          duration: 8000,
        });
      }

      setShowSignUp(false);
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

  const handleOtpVerification = async (values: z.infer<typeof otpVerifySchema>) => {
    setForgotLoading(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: values.otp,
        type: 'recovery',
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast({
          title: 'Invalid code',
          description: 'Please check the code and try again.',
          variant: 'destructive',
        });
      } else {
        // OTP is valid, proceed to password step
        setVerifiedOtp(values.otp);
        setOtpVerified(true);
        toast({
          title: 'Code verified!',
          description: 'Now create your new password.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePasswordReset = async (values: z.infer<typeof newPasswordSchema>) => {
    setForgotLoading(true);
    
    try {
      // Update the password (session already established from OTP verification)
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        toast({
          title: 'Error',
          description: updateError.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password reset successful!',
          description: 'You can now login with your new password.',
          duration: 6000,
        });
        
        // Reset all forms and close modal
        setShowForgot(false);
        setResetEmailSent(false);
        setShowOtpForm(false);
        setOtpVerified(false);
        forgotForm.reset();
        otpForm.reset();
        passwordForm.reset();
        setResetEmail('');
        setVerifiedOtp('');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>, turnstileToken?: string) => {
    setForgotLoading(true);
    setResetEmailSent(false);

    try {
      // Use a more specific redirect URL to avoid issues
      const redirectUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8082/auth/reset'
        : `${window.location.origin}/auth/reset`;
        
      console.log('[Password Reset] Attempting reset for:', values.email);
      console.log('[Password Reset] Redirect URL:', redirectUrl);
      console.log('[Password Reset] Supabase URL:', supabase.auth.getSession());
      
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('[Password Reset] Error:', error);
        
        // Provide more helpful error messages
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
        setResetEmailSent(true);
        setResetEmail(values.email);
        // Reset forms before showing
        otpForm.reset({ otp: '' });
        passwordForm.reset({ newPassword: '' });
        setOtpVerified(false);
        setShowOtpForm(true);
        toast({
          title: 'Password reset email sent!',
          description:
            'Please check your inbox for a 6-digit code from iWishBag.',
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
      setForgotLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Form {...signInForm}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = signInForm.getValues();
            handleSignIn(values);
          }}
          className="space-y-5 pt-4"
          id="sign-in-form"
        >
          <FormField
            control={signInForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs sm:text-sm lg:text-base">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    className="h-10 sm:h-11 lg:h-12 px-3 sm:px-4 text-sm sm:text-base rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
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
                <FormLabel className="text-xs sm:text-sm lg:text-base">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    {...field}
                    className="h-10 sm:h-11 lg:h-12 px-3 sm:px-4 text-sm sm:text-base rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-xs sm:text-sm text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:h-11 lg:h-12 text-sm sm:text-base border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors duration-200"
              onClick={handleSignInWithGoogle}
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
              className="h-10 sm:h-11 lg:h-12 text-sm sm:text-base border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors duration-200"
              onClick={handleSignInWithFacebook}
            >
              <svg className="w-4 h-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors duration-200"
              onClick={() => setShowForgot(true)}
            >
              Forgot Password?
            </button>
            <button
              type="button"
              className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors duration-200"
              onClick={() => setShowSignUp(true)}
            >
              Sign Up
            </button>
          </div>
        </form>
      </Form>

      {/* Sign Up Modal */}
      <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
        <DialogContent className="bg-white border-gray-200 shadow-2xl max-w-md rounded-xl overflow-hidden">
          {/* Brand header - bright and friendly */}
          <div className="bg-teal-500 px-6 pt-6 pb-4 -mx-6 -mt-6 mb-6 shadow-sm">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-white text-2xl font-semibold text-center">
                Create your account
              </DialogTitle>
              <DialogDescription className="text-white/90 text-center">
                Start shopping internationally with iWishBag
              </DialogDescription>
            </DialogHeader>
          </div>
          <Form {...signUpForm}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const values = signUpForm.getValues();
                handleSignUp(values);
              }}
              className="space-y-5"
              id="sign-up-form"
            >
              <FormField
                control={signUpForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                      />
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
                      <Input
                        type="email"
                        {...field}
                        className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                      />
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
                      <Input
                        type="tel"
                        {...field}
                        className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                      />
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
                            className="h-11 px-4 pr-10 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
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
                          <p className="text-xs text-gray-500">
                            Use 8+ characters with a mix of letters, numbers & symbols
                          </p>
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
                  <FormItem>
                    <div className="flex items-start space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="translate-y-[2px] border-gray-200 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm text-gray-700 font-normal cursor-pointer">
                          I agree to the{' '}
                          <a
                            href="/terms-conditions"
                            className="text-teal-600 hover:text-teal-700 underline font-medium"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            terms and conditions
                          </a>
                        </FormLabel>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Sign Up Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog
        open={showForgot}
        onOpenChange={(open) => {
          setShowForgot(open);
          if (!open) {
            setResetEmailSent(false);
            setShowOtpForm(false);
            setOtpVerified(false);
            setResetEmail('');
            setVerifiedOtp('');
            forgotForm.reset();
            otpForm.reset();
            passwordForm.reset();
          }
        }}
      >
        <DialogContent className="bg-white border-gray-200 shadow-2xl max-w-md rounded-lg">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-gray-900 text-xl font-semibold text-center">
              {otpVerified ? 'Create new password' : showOtpForm ? 'Enter verification code' : resetEmailSent ? 'Check your email' : 'Reset your password'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-center text-sm">
              {otpVerified
                ? 'Choose a strong password for your account'
                : showOtpForm
                ? `We sent a 6-digit code to ${resetEmail}`
                : resetEmailSent
                ? 'We sent a password reset link to your email address.'
                : "Enter your email address and we'll send you a reset link."}
            </DialogDescription>
          </DialogHeader>

          {showOtpForm ? (
            otpVerified ? (
              // Password Reset Form
              <Form {...passwordForm}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const values = passwordForm.getValues();
                    handlePasswordReset(values);
                  }}
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
                              type={showPassword ? 'text' : 'password'}
                              {...field}
                              placeholder="Enter new password"
                              autoFocus
                              className="h-11 px-4 pr-10 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                              disabled={forgotLoading}
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
                    disabled={forgotLoading}
                    className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? (
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
                      onClick={() => {
                        setOtpVerified(false);
                        passwordForm.reset();
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to code
                    </button>
                  </div>
                </form>
              </Form>
            ) : (
              // OTP Verification Form
              <Form {...otpForm}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const values = otpForm.getValues();
                    handleOtpVerification(values);
                  }}
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
                            key="otp-input"
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            pattern="[0-9]{6}"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            className="h-14 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-2 bg-white text-gray-900 placeholder:text-gray-400 text-center text-2xl font-mono tracking-[0.5em] font-semibold"
                            disabled={forgotLoading}
                            onChange={(e) => {
                              // Only allow numbers
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpForm(false);
                      setResetEmailSent(false);
                      otpForm.reset();
                      toast({
                        title: 'Request a new code',
                        description: 'Please enter your email again to receive a new verification code.',
                      });
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Didn't receive code? Request new one
                  </button>
                </div>
                
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpForm(false);
                      setResetEmailSent(false);
                      otpForm.reset();
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← Back to email
                  </button>
                </div>
              </form>
            </Form>
            )
          ) : resetEmailSent ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Please check your inbox for the password reset link. It may take a few minutes to
                  arrive.
                </p>
                <div className="text-xs text-gray-500">
                  <p className="mb-2">Didn't receive the email?</p>
                  <p>Check your spam folder or try again.</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-11 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                onClick={() => {
                  setShowForgot(false);
                  setResetEmailSent(false);
                  forgotForm.reset();
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <Form {...forgotForm}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = forgotForm.getValues();
                  handleForgotPassword(values);
                }}
                className="space-y-4"
                id="forgot-password-form"
              >
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                          disabled={forgotLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Forgot Password Button */}
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-11 text-base bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthForm;
