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
                // Convert original input values (in purchase currency) to USD for breakdown display
                const exchangeRate = data.exchange_rate || 1;
                
                console.log('[useQuoteQueries Debug] Exchange rate:', exchangeRate);
                console.log('[useQuoteQueries Debug] Original values:', {
                    sales_tax_price: data.sales_tax_price,
                    merchant_shipping_price: data.merchant_shipping_price,
                    domestic_shipping: data.domestic_shipping,
                    handling_charge: data.handling_charge,
                    insurance_amount: data.insurance_amount
                });
                
                data.salesTaxPrice = data.sales_tax_price ? data.sales_tax_price / exchangeRate : 0;
                data.merchantShippingPrice = data.merchant_shipping_price ? data.merchant_shipping_price / exchangeRate : 0;
                data.interNationalShipping = data.international_shipping;
                data.customsAndECS = data.customs_and_ecs;
                data.domesticShipping = data.domestic_shipping ? data.domestic_shipping / exchangeRate : 0;
                data.handlingCharge = data.handling_charge ? data.handling_charge / exchangeRate : 0;
                data.insuranceAmount = data.insurance_amount ? data.insurance_amount / exchangeRate : 0;
                data.paymentGatewayFee = data.payment_gateway_fee;
                // Fix: Convert discount to USD for breakdown
                data.discount = data.discount ? data.discount / exchangeRate : 0;
                // Debug: Log discount and VAT
                console.log('[useQuoteQueries Debug] Discount conversion:', { discount: data.discount, original: data.discount ? data.discount * exchangeRate : 0 });
                console.log('[useQuoteQueries Debug] VAT value:', data.vat);
                
                console.log('[useQuoteQueries Debug] Converted USD values:', {
                    salesTaxPrice: data.salesTaxPrice,
                    merchantShippingPrice: data.merchantShippingPrice,
                    domesticShipping: data.domesticShipping,
                    handlingCharge: data.handlingCharge,
                    insuranceAmount: data.insuranceAmount
                });
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
