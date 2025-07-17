import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export const useQuoteRenewal = () => {
  const [isRenewing, setIsRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renewQuote = async (quoteId: string) => {
    setIsRenewing(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/renew-quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ quoteId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to renew quote');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to renew quote');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to renew quote';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRenewing(false);
    }
  };

  return {
    renewQuote,
    isRenewing,
    error,
    clearError: () => setError(null),
  };
};
