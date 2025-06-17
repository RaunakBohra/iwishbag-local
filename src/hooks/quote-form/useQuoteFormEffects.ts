
import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { QuoteFormValues } from "@/components/forms/quote-form-validation";
import { User } from "@supabase/supabase-js";

interface UseQuoteFormEffectsProps {
  form: UseFormReturn<QuoteFormValues>;
  user: User | null;
  addresses: any[] | null;
  countries: any[] | null;
}

export const useQuoteFormEffects = ({ form, user, addresses, countries }: UseQuoteFormEffectsProps) => {
  useEffect(() => {
    if (user?.email) {
      form.setValue("email", user.email);
    }
    if (addresses && countries) {
      const defaultAddress = addresses.find(addr => addr.is_default);
      if (defaultAddress && defaultAddress.country) {
        const countrySetting = countries.find(c => c.name === defaultAddress.country);
        if (countrySetting) {
          form.setValue("countryCode", countrySetting.code, { shouldValidate: true });
        }
      }
    }
  }, [user, form, addresses, countries]);
};
