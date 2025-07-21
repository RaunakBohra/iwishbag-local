import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth callback error:', error);
          toast({
            title: 'Authentication Error',
            description: error.message,
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        if (data.session?.user) {
          // Successfully authenticated
          const user = data.session.user;
          const provider = user.app_metadata?.provider;

          // Log OAuth metadata for debugging
          console.log('OAuth user metadata:', {
            provider,
            phone: user.phone,
            raw_metadata: user.user_metadata,
          });

          // Provide provider-specific welcome messages
          if (provider === 'google') {
            if (user.phone) {
              toast({
                title: 'Welcome back!',
                description: 'Signed in with Google. Phone number imported successfully.',
              });
            } else {
              toast({
                title: 'Welcome back!',
                description: 'Signed in with Google successfully.',
              });
            }
          } else if (provider === 'facebook') {
            toast({
              title: 'Welcome back!',
              description:
                'Signed in with Facebook successfully. Complete your profile when ready.',
            });
          } else {
            toast({
              title: 'Welcome back!',
              description: 'Authentication successful.',
            });
          }

          // Redirect to dashboard
          navigate('/dashboard');
        } else {
          // No session found, redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('OAuth callback processing error:', error);
        toast({
          title: 'Authentication Error',
          description: 'There was an error processing your sign-in. Please try again.',
          variant: 'destructive',
        });
        navigate('/');
      }
    };

    handleOAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Completing sign-in...</h2>
        <p className="text-sm text-gray-600">
          Please wait while we finish setting up your account.
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
