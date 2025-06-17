
import { useToast } from "@/components/ui/use-toast";
import { calculateShippingQuotes, CountrySettings } from "@/lib/quote-calculator";
import { Tables } from "@/integrations/supabase/types";
import { AdminQuoteFormValues } from "@/components/admin/admin-quote-form-validation";

type CountrySetting = Tables<'country_settings'>;
type CustomsCategory = Tables<'customs_categories'>;
type Quote = Tables<'quotes'>;
type ItemToUpdate = {
    id: string;
    item_price: number;
    item_weight: number;
    quantity: number;
    product_name?: string | null;
    options?: string | null;
    item_currency: string;
    product_url?: string | null;
    image_url?: string | null;
};

export const useQuoteCalculation = () => {
    const { toast } = useToast();

    const calculateUpdatedQuote = (
        quoteDataFromForm: AdminQuoteFormValues,
        itemsToUpdate: ItemToUpdate[],
        allCountrySettings: CountrySetting[],
        customsCategories: CustomsCategory[],
    ): (Partial<Quote> & { id: string }) | null => {

        const { items, ...restOfQuoteData } = quoteDataFromForm;

        // Create a map for quick access to exchange rates
        const rateMap = new Map<string, number>();
        allCountrySettings?.forEach(c => {
            if (c.currency) rateMap.set(c.currency, c.rate_from_usd || 1);
        });
        rateMap.set('USD', 1); // Ensure USD to USD is 1

        // Calculate total item price in USD from potentially various item_currencies
        const total_item_price_in_usd = itemsToUpdate.reduce((sum, item) => {
            const itemRate = rateMap.get(item.item_currency) || 1;
            // Convert item.item_price FROM its currency TO USD
            const priceInUsd = item.item_price ? (item.item_price / itemRate) : 0;
            return sum + (priceInUsd * item.quantity);
        }, 0);

        const total_item_weight = itemsToUpdate.reduce((sum, item) => sum + (item.item_weight || 0) * item.quantity, 0);
        
        const { country_code, customs_category_name, final_currency } = quoteDataFromForm;

        if (!total_item_price_in_usd || !total_item_weight || !country_code) {
            toast({ title: "Missing required data", description: "Quote needs total item price, total weight, and country to calculate pricing. Make sure all items have a price and weight.", variant: "destructive" });
            return null;
        }

        const countrySettings = allCountrySettings.find(c => c.code === country_code);
        if (!countrySettings) {
            toast({ title: "Country settings not found", variant: "destructive" });
            return null;
        }

        const exchangeRateForCountrySettings = countrySettings.rate_from_usd || 1;

        const countrySettingsInUSD = {
            ...countrySettings,
            min_shipping: (countrySettings.min_shipping || 0) / exchangeRateForCountrySettings,
            additional_weight: (countrySettings.additional_weight || 0) / exchangeRateForCountrySettings,
            payment_gateway_fixed_fee: (countrySettings.payment_gateway_fixed_fee || 0) / exchangeRateForCountrySettings,
        };

        const customsCategory = customsCategories.find(c => c.name === customs_category_name);
        const customsPercent = customsCategory?.duty_percent || 0;

        const calculatedQuote = calculateShippingQuotes(
            total_item_weight,
            total_item_price_in_usd,
            quoteDataFromForm.sales_tax_price || 0,
            quoteDataFromForm.merchant_shipping_price || 0,
            customsPercent,
            quoteDataFromForm.domestic_shipping || 0,
            quoteDataFromForm.handling_charge || 0,
            quoteDataFromForm.discount || 0,
            quoteDataFromForm.insurance_amount || 0,
            countrySettingsInUSD as CountrySettings
        );

        const finalQuoteCurrency = final_currency || countrySettings.currency;
        const finalExchangeRate = rateMap.get(finalQuoteCurrency || 'USD') || 1;

        const updatedQuote = {
            ...restOfQuoteData,
            id: quoteDataFromForm.id,
            item_price: total_item_price_in_usd,
            item_weight: total_item_weight,
            final_total: calculatedQuote.finalTotal,
            sub_total: calculatedQuote.subTotal,
            vat: calculatedQuote.vat,
            international_shipping: calculatedQuote.interNationalShipping,
            customs_and_ecs: calculatedQuote.customsAndECS,
            payment_gateway_fee: calculatedQuote.paymentGatewayFee,
            final_currency: finalQuoteCurrency,
            final_total_local: calculatedQuote.finalTotal * finalExchangeRate,
            status: 'calculated' as const
        };
        
        return updatedQuote;
    };
    
    return { calculateUpdatedQuote };
};
