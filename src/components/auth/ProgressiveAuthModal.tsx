import { useState, useEffect } from 'react';
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
import { Loader2, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';

// Step 1: Email collection
const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

// Step 2a: Sign in (existing user)
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, { message: 'Password is required.' }),
});

// Step 2b: Sign up (new user)
const signUpSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, { message: 'Name is required.' }),
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

interface ProgressiveAuthModalProps {
  onSuccess?: () => void;
  onBack?: () => void;
  prefilledEmail?: string;
}

type AuthStep = 'email' | 'choice' | 'signin' | 'signup' | 'forgot';

export const ProgressiveAuthModal: React.FC<ProgressiveAuthModalProps> = ({ 
  onSuccess, 
  onBack,
  prefilledEmail 
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('email');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Forms
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      password: '',
      terms: false,
    },
  });

  // Handle prefilled email after forms are initialized
  useEffect(() => {
    if (prefilledEmail) {
      setUserEmail(prefilledEmail);
      emailForm.setValue('email', prefilledEmail);
      signInForm.setValue('email', prefilledEmail);
      signUpForm.setValue('email', prefilledEmail);
      // Skip email step if we have a prefilled email
      setStep('choice');
    }
  }, [prefilledEmail, emailForm, signInForm, signUpForm]);

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

  // Improved user detection without sending emails
  const checkUserExists = async (email: string): Promise<boolean | null> => {
    try {
      // Attempt sign in with invalid password to check if user exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: '__invalid_password_check__'
      });
      
      if (!error) {
        // Shouldn't happen with invalid password, but user exists
        return true;
      }
      
      // Check error message to determine if user exists
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('Invalid email or password')) {
        // User exists but password is wrong (expected)
        return true;
      } else if (error.message.includes('User not found') || 
                 error.message.includes('not registered')) {
        // User doesn't exist
        return false;
      }
      
      // For any other error, return null (uncertain)
      return null;
    } catch {
      // If check fails, return null (uncertain)
      return null;
    }
  };

  const handleEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    setLoading(true);
    setUserEmail(values.email);
    
    // Always go to choice step to give user control
    // We'll do smart detection in the background for hints
    setStep('choice');
    setLoading(false);
  };

  const handleUserChoice = async (choice: 'signin' | 'signup') => {
    if (choice === 'signin') {
      signInForm.setValue('email', userEmail);
      setStep('signin');
    } else {
      signUpForm.setValue('email', userEmail);
      setStep('signup');
    }
  };

  const handleContinueAsGuest = () => {
    // Close the modal and let the user continue with their email stored
    if (onBack) {
      onBack();
    }
    toast({
      title: "Continuing as guest",
      description: `We'll send updates to ${userEmail}`,
      duration: 3000,
    });
  };

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Better error handling with helpful suggestions
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('Invalid email or password')) {
        toast({
          title: 'Sign in failed',
          description: 'Incorrect email or password. Check your credentials or try creating an account.',
          variant: 'destructive',
        });
      } else if (error.message.includes('Email not confirmed')) {
        toast({
          title: 'Email not verified',
          description: 'Please check your email and click the verification link.',
          variant: 'destructive',
        });
      } else if (error.message.includes('Too many requests')) {
        toast({
          title: 'Too many attempts',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sign in error',
          description: error.message,
          variant: 'destructive',
        });
      }
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
        // Better error handling for signup
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Account exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'default',
          });
          signInForm.setValue('email', values.email);
          setStep('signin');
          return;
        } else if (error.message.includes('Password should be at least')) {
          toast({
            title: 'Weak password',
            description: 'Please create a stronger password with the requirements shown.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Invalid email')) {
          toast({
            title: 'Invalid email',
            description: 'Please enter a valid email address.',
            variant: 'destructive',
          });
        } else if (error.message.includes('signup is disabled')) {
          toast({
            title: 'Registration disabled',
            description: 'New registrations are temporarily disabled. Please try again later.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Registration error',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      toast({
        title: 'Welcome to iWishBag!',
        description: 'Your account has been created successfully!',
        duration: 8000,
      });

      onSuccess?.();
    } catch (err) {
      console.error('Unexpected signup error:', err);
      toast({
        title: 'Registration failed',
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
        redirectTo: window.location.href,
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

  const resetToEmail = () => {
    setStep('email');
    setUserEmail('');
    emailForm.reset();
    signInForm.reset();
    signUpForm.reset();
  };

  const handleForgotPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password reset email sent!',
          description: 'Please check your inbox for a secure reset link.',
          duration: 6000,
        });
        setStep('choice'); // Go back to choice step
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Email Collection
  if (step === 'email') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-teal-50 p-3 rounded-full">
              <Mail className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to iWishBag</h3>
          <p className="text-sm text-gray-600">Enter your email to get started</p>
        </div>

        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      disabled={loading}
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </Form>

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
            className="h-12 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
            className="h-12 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </Button>
        </div>

        {onBack && (
          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    );
  }

  // Step 1.5: User Choice (New Step)
  if (step === 'choice') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-teal-50 p-3 rounded-full">
              <Mail className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h3>
          <p className="text-sm text-gray-600">
            How would you like to continue with <span className="font-medium bg-teal-50 px-2 py-1 rounded">{userEmail}</span>?
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleUserChoice('signin')}
            className="w-full h-12 text-base"
            disabled={loading}
          >
            Sign In to Existing Account
          </Button>

          <Button
            onClick={() => handleUserChoice('signup')}
            variant="outline"
            className="w-full h-12 text-base"
            disabled={loading}
          >
            Create New Account
          </Button>

          <Button
            onClick={handleContinueAsGuest}
            variant="ghost"
            className="w-full h-12 text-base text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            Continue as Guest
          </Button>
        </div>

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
            className="h-12 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin('facebook')}
            disabled={loading}
            className="h-12 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={resetToEmail}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Use different email
          </button>
        </div>
      </div>
    );
  }

  // Step 2a: Sign In (Existing User)
  if (step === 'signin') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome back!</h3>
          <p className="text-sm text-gray-600">
            Sign in to <span className="font-medium bg-green-50 px-2 py-1 rounded">{userEmail}</span>
          </p>
        </div>

        <Form {...signInForm}>
          <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
            <FormField
              control={signInForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...field}
                        disabled={loading}
                        className="h-12 pr-10 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={() => setStep('forgot')}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Forgot your password?
          </button>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <button
              type="button"
              onClick={() => setStep('choice')}
              className="flex items-center hover:text-gray-700"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setStep('signup')}
              className="hover:text-gray-700"
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2b: Sign Up (New User)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Create your account</h3>
        <p className="text-sm text-gray-600">
          For <span className="font-medium bg-blue-50 px-2 py-1 rounded">{userEmail}</span>
        </p>
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
                  <Input 
                    placeholder="John Doe" 
                    {...field} 
                    disabled={loading} 
                    className="h-12 text-base"
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
                    placeholder="+1234567890" 
                    {...field} 
                    disabled={loading} 
                    className="h-12 text-base"
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
                        placeholder="Create a password"
                        {...field}
                        disabled={loading}
                        className="h-12 pr-10 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    I agree to the{' '}
                    <a
                      href="/terms-conditions"
                      className="text-teal-600 hover:text-teal-700 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      terms and conditions
                    </a>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
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

      <div className="text-center space-y-3">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => setStep('choice')}
            className="flex items-center hover:text-gray-700"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setStep('signin')}
            className="hover:text-gray-700"
          >
            Sign in instead
          </button>
        </div>
      </div>
    </div>
  );

  // Step 3: Forgot Password
  if (step === 'forgot') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-teal-50 p-3 rounded-full">
              <Mail className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Reset Your Password</h3>
          <p className="text-sm text-gray-600">
            We'll send a reset link to <span className="font-medium bg-orange-50 px-2 py-1 rounded">{userEmail}</span>
          </p>
        </div>

        <Button
          onClick={() => handleForgotPassword(userEmail)}
          className="w-full h-12 text-base"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <button
              type="button"
              onClick={() => setStep('signin')}
              className="flex items-center hover:text-gray-700"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to sign in
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setStep('signup')}
              className="hover:text-gray-700"
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
};