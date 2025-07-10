import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";

const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signUpSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(8, { message: "Please enter a valid phone number (minimum 8 digits)." }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  terms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms and conditions." }) }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
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
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { 
      name: "", 
      email: "", 
      phone: "", 
      password: "", 
      terms: true 
    },
  });

  const forgotForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
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
        stack: error.stack
      });
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      toast({ title: "Google sign-in error", description: error.message, variant: "destructive" });
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
        options: {
          data: { name: values.name, phone: values.phone },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        console.error('Sign up error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        toast({ title: "Error signing up", description: error.message, variant: "destructive" });
        return;
      }

      // In local development, send welcome email manually (since confirmations are disabled)
      // In production, Supabase handles this automatically
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocal && data.user) {
        console.log("🔵 Sending welcome email for local development...");
        
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
              from: 'iWishBag <noreply@whyteclub.com>'
            }
          });

          if (emailError) {
            console.error('Welcome email sending error:', emailError);
          } else {
            console.log("✅ Welcome email sent successfully");
          }
        } catch (err) {
          console.error('Welcome email error:', err);
        }
        
        toast({ 
          title: "Welcome to iWishBag!", 
          description: "Your account has been created successfully! Check your email for a welcome message.",
          variant: "default",
          duration: 8000
        });
      } else {
        toast({ 
          title: "Welcome to iWishBag!", 
          description: "Please check your email to confirm your account. You'll be able to sign in after email verification.",
          variant: "default",
          duration: 8000
        });
      }
      
      setShowSignUp(false);
      
    } catch (err) {
      console.error('Unexpected signup error:', err);
      toast({ 
        title: "Error signing up", 
        description: "An unexpected error occurred. Please try again.", 
        variant: "destructive" 
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
        redirectTo: `${window.location.origin}/auth/reset` 
      });
      
      if (error) {
        toast({ 
          title: "Error", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        setResetEmailSent(true);
        toast({ 
          title: "Password reset email sent!", 
          description: "Please check your inbox for a secure reset link from iWishBag. The link will expire in 24 hours.",
          duration: 6000
        });
        
        // Keep the modal open to show success message
        setTimeout(() => {
          setShowForgot(false);
          setResetEmailSent(false);
          forgotForm.reset();
        }, 5000);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Form {...signInForm}>
        <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-6 pt-4">
          <FormField
            control={signInForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    {...field}
                    className="border-border focus:border-foreground"
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
                <FormLabel className="text-foreground">Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    {...field}
                    className="border-border focus:border-foreground"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>
         <Button type="button" variant="outline" className="w-full border-border hover:bg-muted" onClick={handleSignInWithGoogle}>
            Sign in with Google
           </Button>
          <div className="flex justify-between items-center mt-2">
            <button type="button" className="text-sm text-foreground underline hover:text-foreground/80" onClick={() => setShowForgot(true)}>
              Forgot Password?
            </button>
            <button type="button" className="text-sm text-foreground underline hover:text-foreground/80" onClick={() => setShowSignUp(true)}>
              Sign Up
            </button>
          </div>
        </form>
      </Form>

      {/* Sign Up Modal */}
      <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
        <DialogContent className="bg-gradient-to-br from-blue-50 to-indigo-50 border-border shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-semibold">Join iWishBag</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create your account to start shopping internationally
            </DialogDescription>
          </DialogHeader>
          <Form {...signUpForm}>
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <FormField
                control={signUpForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your Name" 
                        {...field}
                        className="border-border focus:border-foreground"
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
                    <FormLabel className="text-foreground">Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        {...field}
                        className="border-border focus:border-foreground"
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
                    <FormLabel className="text-foreground">Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="+1 234 567 8901" 
                        {...field}
                        className="border-border focus:border-foreground"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required for account verification. You can update this later in your profile settings.
                    </p>
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
                      <FormLabel className="text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••" 
                            {...field}
                            className="border-border focus:border-foreground pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {password && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <span>Password strength:</span>
                            <span className={passwordStrength.color}>{passwordStrength.text}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.bg}`}
                                style={{ width: `${Math.min((passwordStrength.text === 'Weak' ? 33 : passwordStrength.text === 'Medium' ? 66 : 100), 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-md border">
                            <p className="text-sm text-blue-800 font-medium mb-2">Password Requirements:</p>
                            <div className="space-y-1 text-xs text-blue-700">
                              <div className={`flex items-center space-x-1 ${password.length >= 8 ? 'text-green-600' : ''}`}>
                                <span>• At least 8 characters</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${password.match(/[A-Z]/) ? 'text-green-600' : ''}`}>
                                <span>• One uppercase letter</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${password.match(/[a-z]/) ? 'text-green-600' : ''}`}>
                                <span>• One lowercase letter</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${password.match(/[0-9]/) ? 'text-green-600' : ''}`}>
                                <span>• One number</span>
                              </div>
                              <div className={`flex items-center space-x-1 ${password.match(/[^A-Za-z0-9]/) ? 'text-green-600' : ''}`}>
                                <span>• One special character</span>
                              </div>
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
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-foreground">I agree to the <a href="/terms" className="underline text-foreground hover:text-foreground/80" target="_blank" rel="noopener noreferrer">terms and conditions</a></FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
                {loading ? "Signing Up..." : "Sign Up"}
              </Button>
              <Button type="button" variant="outline" className="w-full border-border hover:bg-muted" onClick={handleSignInWithGoogle}>
                Sign up with Google
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog open={showForgot} onOpenChange={(open) => {
        setShowForgot(open);
        if (!open) {
          setResetEmailSent(false);
          forgotForm.reset();
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-slate-50 to-gray-50 border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2 text-xl font-semibold">
              <Mail className="h-5 w-5" />
              {resetEmailSent ? "Email Sent!" : "Reset Password"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {resetEmailSent 
                ? "We've sent a secure password reset link to your email address from iWishBag." 
                : "Enter your email address and we'll send you a secure reset link."}
            </DialogDescription>
          </DialogHeader>
          
          {resetEmailSent ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Please check your inbox for the password reset link. It may take a few minutes to arrive.
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Didn't receive the email?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
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
                      <FormLabel className="text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@example.com" 
                          {...field} 
                          className="border-border focus:border-foreground" 
                          disabled={forgotLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-foreground text-background hover:bg-foreground/90" 
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
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
