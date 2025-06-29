import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'>;
type QuoteItem = Tables<'quote_items'>;
type RejectionReason = Tables<'rejection_reasons'>;
type QuoteWithItems = Quote & { 
    quote_items: QuoteItem[];
    rejection_reasons: RejectionReason | null;
};

export const useQuoteQueries = (id: string | undefined) => {
    const { data: quote, isLoading: quoteLoading, error } = useQuery({
        queryKey: ['admin-quote', id],
        queryFn: async (): Promise<QuoteWithItems | null> => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('quotes')
                .select('*, quote_items(*), rejection_reasons(*)')
                .eq('id', id)
                .single();
            if (error) {
                console.error("Error fetching quote:", error);
                throw error;
            };
            return data;
        },
        enabled: !!id,
    });

    const { data: countries } = useQuery({
        queryKey: ['country-settings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('country_settings').select('*').order('name');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const shippingCountries = countries
        ?.filter(c => c.shipping_allowed)
        .map(c => ({ code: c.code, name: c.name }));

    return {
        quote,
        quoteLoading,
        error,
        countries: countries || [],
        shippingCountries: shippingCountries || [],
    };
};
