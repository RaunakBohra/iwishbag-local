import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type Quote = Tables<'quotes'>;
type QuoteItem = Tables<'quote_items'>;
type QuoteWithItems = Quote & {
  quote_items: QuoteItem[];
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
    preferred_display_currency?: string;
  } | null;
};

export const useQuoteQueries = (id: string | undefined) => {
  const {
    data: quote,
    isLoading: quoteLoading,
    error,
  } = useQuery({
    queryKey: ['admin-quote', id],
    queryFn: async (): Promise<QuoteWithItems | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select(
          '*, quote_items(*), profiles!quotes_user_id_fkey(full_name, email, phone, preferred_display_currency)',
        )
        .eq('id', id)
        .single();
      if (error) {
        logger.error('Error fetching quote', error);
        throw error;
      }
      // Map snake_case to camelCase for UI breakdown
      if (data) {
        // 🔧 FIX: Restore proper currency conversion for display components
        // Database values are stored in USD, but some components expect proper conversion
        const exchangeRate = data.exchange_rate || 1;
        
        logger.debug('Currency conversion data', {
          exchange_rate: data.exchange_rate,
          origin_country: data.origin_country,
          raw_values: {
            sales_tax_price: data.sales_tax_price,
            merchant_shipping_price: data.merchant_shipping_price,
            domestic_shipping: data.domestic_shipping,
            handling_charge: data.handling_charge,
            insurance_amount: data.insurance_amount,
            discount: data.discount,
          }
        });

        // Database values are already stored in USD, no conversion needed
        // Just map to camelCase for UI consistency
        data.salesTaxPrice = data.sales_tax_price || 0;
        data.merchantShippingPrice = data.merchant_shipping_price || 0;
        data.domesticShipping = data.domestic_shipping || 0;
        data.handlingCharge = data.handling_charge || 0;
        data.insuranceAmount = data.insurance_amount || 0;
        data.discount = data.discount || 0;
        data.interNationalShipping = data.international_shipping || 0;
        data.customsAndECS = data.customs_and_ecs || 0;
        data.paymentGatewayFee = data.payment_gateway_fee || 0;

        logger.debug('Mapped values (USD from database)', {
          salesTaxPrice: data.salesTaxPrice,
          merchantShippingPrice: data.merchantShippingPrice,
          domesticShipping: data.domesticShipping,
          handlingCharge: data.handlingCharge,
          insuranceAmount: data.insuranceAmount,
          discount: data.discount,
          exchangeRate: exchangeRate
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
    },
  });

  const shippingCountries = countries
    ?.filter((c) => c.shipping_allowed)
    .map((c) => ({ code: c.code, name: c.name }));

  return {
    quote,
    quoteLoading,
    error,
    countries: countries || [],
    shippingCountries: shippingCountries || [],
  };
};
