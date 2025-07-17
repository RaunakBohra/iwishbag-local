import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationStatus, setConfirmationStatus] = useState<
    'pending' | 'success' | 'error' | 'expired'
  >('pending');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Enhanced session handling with SIGNED_UP event detection
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session);

      if (event === 'SIGNED_UP') {
        setConfirmationStatus('success');
        setUserEmail(session?.user?.email || null);
        setIsLoading(false);

        toast.success('Email confirmed successfully! Welcome to iWishBag!');
      } else if (event === 'SIGNED_IN' && session?.user) {
        // User is already confirmed and signed in
        setConfirmationStatus('success');
        setUserEmail(session.user.email || null);
        setIsLoading(false);
      }
    });

    // Check URL parameters for confirmation tokens (backward compatibility)
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setConfirmationStatus('error');
      setIsLoading(false);
      console.error('Email confirmation error:', error, errorDescription);
    } else if (accessToken && refreshToken && type === 'signup') {
      // Handle confirmation manually if SIGNED_UP event wasn't triggered
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ data, error }) => {
          if (error) {
            setConfirmationStatus('error');
            console.error('Session set error:', error);
          } else {
            setConfirmationStatus('success');
            setUserEmail(data.user?.email || null);
          }
          setIsLoading(false);
        });
    } else if (!accessToken && !error) {
      // No tokens present, might be a direct visit
      setTimeout(() => {
        setConfirmationStatus('expired');
        setIsLoading(false);
      }, 2000);
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Confirming Your Email</CardTitle>
            <CardDescription className="text-center">
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              This should only take a moment.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-green-800">
              Welcome to iWishBag!
            </CardTitle>
            <CardDescription className="text-center">
              Your email has been confirmed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {userEmail ? (
                  <>
                    Your account <strong>{userEmail}</strong> is now active and ready to use!
                  </>
                ) : (
                  'Your account is now active and ready to use!'
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">What's next?</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>Browse international products</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>Get instant shipping quotes</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>Track your orders in real-time</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  <span>Enjoy secure international shopping</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button className="w-full" onClick={() => navigate('/')}>
                Start Shopping
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
                Complete Your Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmationStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-red-800">Confirmation Failed</CardTitle>
            <CardDescription className="text-center">
              There was an issue confirming your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The confirmation link is invalid or has expired. Please try creating a new account
                or request a new confirmation email.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/auth')}>
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // expired status
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-slate-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a confirmation link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Please check your inbox and click the confirmation link to activate your iWishBag
              account.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Didn't receive the email?</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>The link expires in 24 hours</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
              Back to Sign Up
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
              Continue as Guest
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
