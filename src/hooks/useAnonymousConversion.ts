import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ConversionOptions {
  redirectTo?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useAnonymousConversion = (options: ConversionOptions = {}) => {
  const { user, convertAnonymousToRegistered } = useAuth();
  const { toast } = useToast();
  const [isConverting, setIsConverting] = useState(false);

  const convertUser = useCallback(async (email: string, password: string, fullName?: string) => {
    if (!user?.is_anonymous) {
      throw new Error('User is not anonymous');
    }

    setIsConverting(true);
    
    try {
      const result = await convertAnonymousToRegistered(email, password);
      
      if (result.success) {
        toast({
          title: "Account Created Successfully!",
          description: "Your session has been converted to a permanent account.",
          duration: 5000,
        });
        
        // Handle success
        if (options.onSuccess) {
          options.onSuccess();
        } else if (options.redirectTo) {
          window.location.href = options.redirectTo;
        }
        
        return { success: true };
      } else {
        const errorMessage = result.error || "Failed to convert your account. Please try again.";
        
        toast({
          title: "Conversion Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        if (options.onError) {
          options.onError(errorMessage);
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      
      console.error('Error converting anonymous user:', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setIsConverting(false);
    }
  }, [user, convertAnonymousToRegistered, toast, options]);

  const shouldShowConversion = Boolean(user?.is_anonymous);

  return {
    convertUser,
    isConverting,
    shouldShowConversion,
    isAnonymous: user?.is_anonymous || false,
  };
};

export default useAnonymousConversion;