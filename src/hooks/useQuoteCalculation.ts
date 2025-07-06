import { useToast } from "@/components/ui/use-toast";
import { calculateShippingQuotes, CountrySettings } from "@/lib/quote-calculator";
import { getShippingCost } from "@/lib/unified-shipping-calculator";
import { Tables } from "@/integrations/supabase/types";
import { AdminQuoteFormValues } from "@/components/admin/admin-quote-form-validation";

type CountrySetting = Tables<'country_settings'>;
type Quote = Tables<'quotes'>;
type ItemToUpdate = {
    id: string;
    item_price: number;
    item_weight: number;
    quantity: number;
    product_name?: string | null;
    options?: string | null;
    product_url?: string | null;
    image_url?: string | null;
};

export const useQuoteCalculation = () => {
    const { toast } = useToast();

    const calculateUpdatedQuote = async (
        quoteDataFromForm: AdminQuoteFormValues,
        itemsToUpdate: ItemToUpdate[],
        allCountrySettings: CountrySetting[],
        shippingAddress?: any,
        currentStatus?: string
    ): Promise<(Partial<Quote> & { id: string }) | null> => {

        const { items, ...restOfQuoteData } = quoteDataFromForm;

        // Create a map for quick access to exchange rates
        const rateMap = new Map<string, number>();
        allCountrySettings?.forEach(c => {
            if (c.currency) rateMap.set(c.currency, c.rate_from_usd || 1);
        });
        rateMap.set('USD', 1); // Ensure USD to USD is 1

        // Calculate total item price in USD using purchase country currency
        const { currency: purchaseCurrency } = quoteDataFromForm;
        const purchaseCurrencyRate = rateMap.get(purchaseCurrency || 'USD') || 1;
        
        const total_item_price_in_usd = itemsToUpdate.reduce((sum, item) => {
            // Convert item price from purchase currency to USD
            const priceInUsd = item.item_price ? (item.item_price / purchaseCurrencyRate) : 0;
            return sum + (priceInUsd * item.quantity);
        }, 0);

        const total_item_weight = itemsToUpdate.reduce((sum, item) => sum + (item.item_weight || 0) * item.quantity, 0);
        
        const { country_code, customs_percentage } = quoteDataFromForm;

        if (!total_item_price_in_usd || !total_item_weight || !country_code) {
            toast({ title: "Missing required data", description: "Quote needs total item price, total weight, and country to calculate pricing. Make sure all items have a price and weight.", variant: "destructive" });
            return null;
        }

        // Clean and validate form data - convert null values to 0
        const cleanFormData = {
            sales_tax_price: quoteDataFromForm.sales_tax_price ?? 0,
            merchant_shipping_price: quoteDataFromForm.merchant_shipping_price ?? 0,
            domestic_shipping: quoteDataFromForm.domestic_shipping ?? 0,
            handling_charge: quoteDataFromForm.handling_charge ?? 0,
            discount: quoteDataFromForm.discount ?? 0,
            insurance_amount: quoteDataFromForm.insurance_amount ?? 0,
        };

        // Convert form values from final currency to USD for calculation
        const cleanFormDataInUSD = {
            sales_tax_price: cleanFormData.sales_tax_price / purchaseCurrencyRate,
            merchant_shipping_price: cleanFormData.merchant_shipping_price / purchaseCurrencyRate,
            domestic_shipping: cleanFormData.domestic_shipping / purchaseCurrencyRate,
            handling_charge: cleanFormData.handling_charge / purchaseCurrencyRate,
            discount: cleanFormData.discount / purchaseCurrencyRate,
            insurance_amount: cleanFormData.insurance_amount / purchaseCurrencyRate,
        };

        const countrySettings = allCountrySettings.find(c => c.code === country_code);
        if (!countrySettings) {
            toast({ title: "Country settings not found", variant: "destructive" });
            return null;
        }

        // Use purchase country as origin, shipping address country_code or countryCode as destination
        const originCountry = quoteDataFromForm.country_code;
        const destinationCountry = shippingAddress?.country_code || shippingAddress?.countryCode;

        if (!originCountry || !destinationCountry) {
            toast({ title: "Missing country information", description: "Both purchase and shipping country codes are required.", variant: "destructive" });
            return null;
        }

        try {
            // Try to get route-specific shipping cost
            const shippingCost = await getShippingCost(
                originCountry,
                destinationCountry,
                total_item_weight,
                total_item_price_in_usd
            );

            const exchangeRateForCountrySettings = countrySettings.rate_from_usd || 1;

            const countrySettingsInUSD = {
                ...countrySettings,
                min_shipping: (countrySettings.min_shipping || 0) / exchangeRateForCountrySettings,
                additional_weight: (countrySettings.additional_weight || 0) / exchangeRateForCountrySettings,
                payment_gateway_fixed_fee: (countrySettings.payment_gateway_fixed_fee || 0) / exchangeRateForCountrySettings,
            };

            // Use customs percentage from form if provided, otherwise default to 0
            const customsPercent = customs_percentage !== null && customs_percentage !== undefined 
                ? customs_percentage 
                : 0;

            // Use the new shipping cost if available, otherwise fall back to old calculation
            let internationalShippingCost: number;
            let shippingMethod: string;
            let shippingRouteId: number | null = null;

            if (shippingCost.method === 'route-specific' && shippingCost.route) {
                internationalShippingCost = shippingCost.cost;
                shippingMethod = 'route-specific';
                shippingRouteId = shippingCost.route.id ?? null;
            } else {
                // Fallback to old calculation method
                const fallbackQuote = calculateShippingQuotes(
                    total_item_weight,
                    total_item_price_in_usd,
                    cleanFormDataInUSD.sales_tax_price,
                    cleanFormDataInUSD.merchant_shipping_price,
                    customsPercent,
                    cleanFormDataInUSD.domestic_shipping,
                    cleanFormDataInUSD.handling_charge,
                    cleanFormDataInUSD.discount,
                    cleanFormDataInUSD.insurance_amount,
                    countrySettingsInUSD as CountrySettings
                );
                internationalShippingCost = fallbackQuote.interNationalShipping;
                shippingMethod = 'country_settings';
                shippingRouteId = null;
            }

            // Calculate other costs using the old method for now
            const fallbackQuote = calculateShippingQuotes(
                total_item_weight,
                total_item_price_in_usd,
                cleanFormDataInUSD.sales_tax_price,
                cleanFormDataInUSD.merchant_shipping_price,
                customsPercent,
                cleanFormDataInUSD.domestic_shipping,
                cleanFormDataInUSD.handling_charge,
                cleanFormDataInUSD.discount,
                cleanFormDataInUSD.insurance_amount,
                countrySettingsInUSD as CountrySettings
            );

            const finalQuoteCurrency = purchaseCurrency || countrySettings.currency;
            const finalExchangeRate = rateMap.get(finalQuoteCurrency || 'USD') || 1;

            // Recalculate final total with new shipping cost
            const subtotalBeforeFees = 
                total_item_price_in_usd +
                cleanFormDataInUSD.sales_tax_price +
                cleanFormDataInUSD.merchant_shipping_price +
                internationalShippingCost +
                fallbackQuote.customsAndECS +
                cleanFormDataInUSD.domestic_shipping +
                cleanFormDataInUSD.handling_charge +
                cleanFormDataInUSD.insurance_amount -
                cleanFormDataInUSD.discount;

            const paymentGatewayFee = 
                (countrySettings.payment_gateway_fixed_fee || 0) + 
                (subtotalBeforeFees * (countrySettings.payment_gateway_percent_fee || 0)) / 100;

            const subTotal = subtotalBeforeFees + paymentGatewayFee;
            const vat = Math.round(subTotal * (countrySettings.vat || 0) / 100 * 100) / 100;
            const finalTotal = Math.round((subTotal + vat) * 100) / 100;

            // Validate that the calculated values are reasonable
            if (finalTotal > 1000000) { // $1M limit
                console.error('[useQuoteCalculation] Calculated total too high:', finalTotal);
                toast({ 
                    title: "Calculation Error", 
                    description: "Calculated total is unreasonably high. Please check your input values.", 
                    variant: "destructive" 
                });
                return null;
            }

            const updatedQuote = {
                ...restOfQuoteData,
                id: quoteDataFromForm.id,
                item_price: total_item_price_in_usd,
                item_weight: total_item_weight,
                final_total: finalTotal,
                sub_total: subTotal,
                vat: vat,
                international_shipping: internationalShippingCost,
                customs_and_ecs: fallbackQuote.customsAndECS,
                payment_gateway_fee: paymentGatewayFee,
                // Add the USD-converted values for UI breakdown
                sales_tax_price: cleanFormDataInUSD.sales_tax_price,
                merchant_shipping_price: cleanFormDataInUSD.merchant_shipping_price,
                domestic_shipping: cleanFormDataInUSD.domestic_shipping,
                handling_charge: cleanFormDataInUSD.handling_charge,
                insurance_amount: cleanFormDataInUSD.insurance_amount,
                discount: cleanFormDataInUSD.discount,
                final_currency: finalQuoteCurrency,
                final_total_local: finalTotal * finalExchangeRate,
                // New fields for shipping routes
                origin_country: originCountry,
                shipping_method: shippingMethod,
                shipping_route_id: shippingRouteId ?? null,
                // Preserve current status - don't change status on calculation
                status: currentStatus as any
            };
            
            return updatedQuote;

        } catch (error) {
            console.error('Error calculating shipping cost:', error);
            
            // Fallback to old calculation method if route lookup fails
            const exchangeRateForCountrySettings = countrySettings.rate_from_usd || 1;

            const countrySettingsInUSD = {
                ...countrySettings,
                min_shipping: (countrySettings.min_shipping || 0) / exchangeRateForCountrySettings,
                additional_weight: (countrySettings.additional_weight || 0) / exchangeRateForCountrySettings,
                payment_gateway_fixed_fee: (countrySettings.payment_gateway_fixed_fee || 0) / exchangeRateForCountrySettings,
            };

            const customsPercent = customs_percentage !== null && customs_percentage !== undefined 
                ? customs_percentage 
                : 0;

            const calculatedQuote = calculateShippingQuotes(
                total_item_weight,
                total_item_price_in_usd,
                cleanFormDataInUSD.sales_tax_price,
                cleanFormDataInUSD.merchant_shipping_price,
                customsPercent,
                cleanFormDataInUSD.domestic_shipping,
                cleanFormDataInUSD.handling_charge,
                cleanFormDataInUSD.discount,
                cleanFormDataInUSD.insurance_amount,
                countrySettingsInUSD as CountrySettings
            );

            const finalQuoteCurrency = purchaseCurrency || countrySettings.currency;
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
                // Add the USD-converted values for UI breakdown
                sales_tax_price: cleanFormDataInUSD.sales_tax_price,
                merchant_shipping_price: cleanFormDataInUSD.merchant_shipping_price,
                domestic_shipping: cleanFormDataInUSD.domestic_shipping,
                handling_charge: cleanFormDataInUSD.handling_charge,
                insurance_amount: cleanFormDataInUSD.insurance_amount,
                discount: cleanFormDataInUSD.discount,
                final_currency: finalQuoteCurrency,
                final_total_local: calculatedQuote.finalTotal * finalExchangeRate,
                // Fallback fields
                origin_country: 'US',
                shipping_method: 'country_settings',
                shipping_route_id: null,
                // Preserve current status - don't change status on calculation
                status: currentStatus as any
            };
            
            return updatedQuote;
        }
    };
    
    return { calculateUpdatedQuote };
};
