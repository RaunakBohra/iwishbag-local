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

const AuthForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
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
      terms: true,
    },
  });

  const forgotForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
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
  };

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
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

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
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

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setForgotLoading(true);
    setResetEmailSent(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: 'Password reset email sent!',
          description:
            'Please check your inbox for a secure reset link from iWishBag. The link will expire in 24 hours.',
          duration: 6000,
        });

        // Keep the modal open to show success message
        setTimeout(() => {
          setShowForgot(false);
          setResetEmailSent(false);
          forgotForm.reset();
        }, 5000);
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
        <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-5 pt-4">
          <FormField
            control={signInForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs sm:text-sm lg:text-base">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
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
          <Button
            type="submit"
            className="w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg"
            disabled={loading}
          >
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
          {/* Brand gradient header */}
          <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 px-6 pt-6 pb-4 -mx-6 -mt-6 mb-6">
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
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-5">
              <FormField
                control={signUpForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Name"
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
                        placeholder="you@example.com"
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
                        placeholder="+1 234 567 8901"
                        {...field}
                        className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">Required for account verification</p>
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
                            placeholder="••••••••"
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
                  <FormItem className="flex items-start space-x-3 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5 border-gray-200 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                      />
                    </FormControl>
                    <FormLabel className="text-sm text-gray-700 leading-relaxed">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-md transition-all duration-200 mt-6 shadow-lg"
                disabled={loading}
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
            forgotForm.reset();
          }
        }}
      >
        <DialogContent className="bg-white border-gray-200 shadow-2xl max-w-md rounded-lg">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-gray-900 text-xl font-semibold text-center">
              {resetEmailSent ? 'Check your email' : 'Reset your password'}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-center text-sm">
              {resetEmailSent
                ? 'We sent a password reset link to your email address.'
                : "Enter your email address and we'll send you a reset link."}
            </DialogDescription>
          </DialogHeader>

          {resetEmailSent ? (
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
              <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                          className="h-11 px-4 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 bg-white text-gray-900 placeholder:text-gray-500"
                          disabled={forgotLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
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
