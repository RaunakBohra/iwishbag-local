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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { User, UserPlus, Loader2 } from "lucide-react";

// Reuse the existing validation schemas
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

interface AuthModalProps {
  mode: 'signin' | 'signup';
  onSuccess?: () => void;
  onBack?: () => void;
  onSwitchMode?: (mode: 'signin' | 'signup') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  mode, 
  onSuccess, 
  onBack,
  onSwitchMode 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      terms: false 
    },
  });

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      onSuccess?.();
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
      toast({ 
        title: "Error signing up", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Account created successfully!", 
        description: "You can now sign in with your email and password.",
      });
      // Switch to sign in mode after successful signup
      onSwitchMode?.('signin');
    }
    setLoading(false);
  };

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.href // Return to current page after auth
      }
    });
    if (error) {
      toast({ 
        title: "Google sign-in error", 
        description: error.message, 
        variant: "destructive" 
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
                    <Input 
                      type="password" 
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full" 
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
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleSignInWithGoogle}
                disabled={loading}
              >
                Sign in with Google
              </Button>
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
                  <Input 
                    placeholder="John Doe" 
                    {...field}
                    disabled={loading}
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
                    disabled={loading}
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signUpForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    {...field}
                    disabled={loading}
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
            <Button 
              type="submit" 
              className="w-full" 
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