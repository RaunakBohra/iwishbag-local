import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createTempAccount, 
  transferQuoteToTempAccount, 
  getOrCreateTempAccount,
  TempAccount 
} from '@/lib/tempAccountUtils';

export const useTempAccount = () => {
  const [isCreatingTempAccount, setIsCreatingTempAccount] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const createTempAccountForCart = useCallback(async (
    email: string, 
    quoteId: string
  ): Promise<TempAccount | null> => {
    if (user && !user.user_metadata?.is_temporary) {
      // User is already authenticated with a real account
      return null;
    }

    setIsCreatingTempAccount(true);
    
    try {
      // Get or create temporary account
      const tempAccount = await getOrCreateTempAccount(email);
      
      // Transfer quote ownership to temporary account
      await transferQuoteToTempAccount(quoteId, tempAccount.id, email);
      
      toast({
        title: "Account Created!",
        description: "We've created a secure account for your cart. You can set a password during checkout.",
      });

      return tempAccount;
      
    } catch (error: any) {
      console.error('Error creating temporary account:', error);
      
      toast({
        title: "Account Creation Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
      
      return null;
      
    } finally {
      setIsCreatingTempAccount(false);
    }
  }, [user, toast]);

  const upgradeTempAccount = useCallback(async (
    password: string,
    fullName?: string
  ): Promise<boolean> => {
    if (!user?.user_metadata?.is_temporary) {
      return false;
    }

    try {
      // This would be implemented in Phase 3
      // For now, just return true as placeholder
      console.log('Upgrading temp account to full account');
      return true;
      
    } catch (error) {
      console.error('Error upgrading temporary account:', error);
      return false;
    }
  }, [user]);

  return {
    createTempAccountForCart,
    upgradeTempAccount,
    isCreatingTempAccount,
    isTempAccount: user?.user_metadata?.is_temporary === true
  };
};