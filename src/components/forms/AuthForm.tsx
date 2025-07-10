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
import { Loader2, Mail } from "lucide-react";
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
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
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
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name, phone: values.phone },
        emailRedirectTo: `${window.location.origin}/`,
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
    } else {
      toast({ 
        title: "Account created successfully!", 
        description: "You can now sign in with your email and password.",
        variant: "default"
      });
      setShowSignUp(false);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setForgotLoading(true);
    setResetEmailSent(false);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, { 
        redirectTo: `https://whyteclub.com/auth/reset` 
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
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Sign Up</DialogTitle>
            <DialogDescription>
              Create a new account to start using our services.
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
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
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {resetEmailSent ? "Email Sent!" : "Forgot Password"}
            </DialogTitle>
            <DialogDescription>
              {resetEmailSent 
                ? "We've sent a password reset link to your email address." 
                : "Enter your email address and we'll send you a password reset link."}
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
