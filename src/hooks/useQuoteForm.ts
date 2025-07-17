import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useQuoteFormConfig } from './quote-form/useQuoteFormConfig';
import { useQuoteFormEffects } from './quote-form/useQuoteFormEffects';
import { useQuoteSubmission } from './quote-form/useQuoteSubmission';

export const useQuoteForm = () => {
  const { user } = useAuth();
  const { data: countries } = usePurchaseCountries();

  const { data: addresses } = useQuery({
    queryKey: ['user_addresses', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const { form, fields, append, remove } = useQuoteFormConfig();

  const countryCode = form.watch('countryCode');
  const selectedCountry = countries?.find((c) => c.code === countryCode);
  const selectedCountryCurrency = selectedCountry?.currency || 'USD';

  useQuoteFormEffects({ form, user, addresses, countries });

  const { onSubmit, loading } = useQuoteSubmission({
    form,
    selectedCountryCurrency,
  });

  return {
    form,
    fields,
    append,
    remove,
    onSubmit,
    loading,
    countryCode,
    user,
    selectedCountryCurrency,
  };
};
