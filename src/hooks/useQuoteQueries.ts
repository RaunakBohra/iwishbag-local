import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'>;
type QuoteItem = Tables<'quote_items'>;
type QuoteWithItems = Quote & { 
    quote_items: QuoteItem[];
    profiles?: { preferred_display_currency?: string } | null;
};

export const useQuoteQueries = (id: string | undefined) => {
    const { data: quote, isLoading: quoteLoading, error } = useQuery({
        queryKey: ['admin-quote', id],
        queryFn: async (): Promise<QuoteWithItems | null> => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('quotes')
                .select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')
                .eq('id', id)
                .single();
            if (error) {
                console.error("Error fetching quote:", error);
                throw error;
            };
            // Map snake_case to camelCase for UI breakdown
            if (data) {
                data.salesTaxPrice = data.sales_tax_price;
                data.merchantShippingPrice = data.merchant_shipping_price;
                data.interNationalShipping = data.international_shipping;
                data.customsAndECS = data.customs_and_ecs;
                data.domesticShipping = data.domestic_shipping;
                data.handlingCharge = data.handling_charge;
                data.insuranceAmount = data.insurance_amount;
                data.paymentGatewayFee = data.payment_gateway_fee;
            }
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
