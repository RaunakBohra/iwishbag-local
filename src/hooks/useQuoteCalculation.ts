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

        // Calculate total item price in purchase currency (no USD conversion needed)
        const { currency: purchaseCurrency } = quoteDataFromForm;
        
        const total_item_price_in_purchase_currency = itemsToUpdate.reduce((sum, item) => {
            // Item prices are already in purchase currency, no conversion needed
            const priceInPurchaseCurrency = item.item_price || 0;
            return sum + (priceInPurchaseCurrency * item.quantity);
        }, 0);

        const total_item_weight = itemsToUpdate.reduce((sum, item) => sum + (item.item_weight || 0) * item.quantity, 0);
        
        const { country_code, customs_percentage } = quoteDataFromForm;

        if (!total_item_price_in_purchase_currency || !total_item_weight || !country_code) {
            toast({ title: "Missing required data", description: "Quote needs total item price, total weight, and country to calculate pricing. Make sure all items have a price and weight.", variant: "destructive" });
            return null;
        }

        // Clean and validate form data - all values are already in purchase currency
        const cleanFormData = {
            sales_tax_price: quoteDataFromForm.sales_tax_price ?? 0,
            merchant_shipping_price: quoteDataFromForm.merchant_shipping_price ?? 0,
            domestic_shipping: quoteDataFromForm.domestic_shipping ?? 0,
            handling_charge: quoteDataFromForm.handling_charge ?? 0,
            discount: quoteDataFromForm.discount ?? 0,
            insurance_amount: quoteDataFromForm.insurance_amount ?? 0,
        };

        const countrySettings = allCountrySettings.find(c => c.code === country_code);
        if (!countrySettings) {
            toast({ title: "Country settings not found", variant: "destructive" });
            return null;
        }

        // Use purchase country as origin, shipping address country_code or countryCode as destination
        const originCountry = quoteDataFromForm.country_code;
        let destinationCountry = shippingAddress?.country_code || shippingAddress?.countryCode;

        // Convert country name to country code if needed (similar to route-specific-customs.ts)
        if (destinationCountry && destinationCountry.length > 2) {
          const countryByName = allCountrySettings.find(c => c.name === destinationCountry);
          if (countryByName) {
            destinationCountry = countryByName.code;
          }
        }

        if (!originCountry || !destinationCountry) {
            toast({ title: "Missing country information", description: "Both purchase and shipping country codes are required.", variant: "destructive" });
            return null;
        }

        try {
            // Get shipping cost - this should return cost in purchase currency
            const shippingCost = await getShippingCost(
                originCountry,
                destinationCountry,
                total_item_weight,
                total_item_price_in_purchase_currency // Pass in purchase currency, not USD
            );

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
                // Fallback to old calculation method - convert to USD for legacy calculation
                const purchaseCurrencyRate = countrySettings.rate_from_usd || 1;
                const total_item_price_in_usd = total_item_price_in_purchase_currency / purchaseCurrencyRate;
                
                const cleanFormDataInUSD = {
                    sales_tax_price: cleanFormData.sales_tax_price / purchaseCurrencyRate,
                    merchant_shipping_price: cleanFormData.merchant_shipping_price / purchaseCurrencyRate,
                    domestic_shipping: cleanFormData.domestic_shipping / purchaseCurrencyRate,
                    handling_charge: cleanFormData.handling_charge / purchaseCurrencyRate,
                    discount: cleanFormData.discount / purchaseCurrencyRate,
                    insurance_amount: cleanFormData.insurance_amount / purchaseCurrencyRate,
                };

                const countrySettingsInUSD = {
                    ...countrySettings,
                    min_shipping: (countrySettings.min_shipping || 0) / purchaseCurrencyRate,
                    additional_weight: (countrySettings.additional_weight || 0) / purchaseCurrencyRate,
                    payment_gateway_fixed_fee: (countrySettings.payment_gateway_fixed_fee || 0) / purchaseCurrencyRate,
                };

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
                
                // Convert back to purchase currency
                internationalShippingCost = fallbackQuote.interNationalShipping * purchaseCurrencyRate;
                shippingMethod = 'country_settings';
                shippingRouteId = null;
            }

            // Calculate other costs using the old method for now (with USD conversion)
            const purchaseCurrencyRate = countrySettings.rate_from_usd || 1;
            const total_item_price_in_usd = total_item_price_in_purchase_currency / purchaseCurrencyRate;
            
            const cleanFormDataInUSD = {
                sales_tax_price: cleanFormData.sales_tax_price / purchaseCurrencyRate,
                merchant_shipping_price: cleanFormData.merchant_shipping_price / purchaseCurrencyRate,
                domestic_shipping: cleanFormData.domestic_shipping / purchaseCurrencyRate,
                handling_charge: cleanFormData.handling_charge / purchaseCurrencyRate,
                discount: cleanFormData.discount / purchaseCurrencyRate,
                insurance_amount: cleanFormData.insurance_amount / purchaseCurrencyRate,
            };

            const countrySettingsInUSD = {
                ...countrySettings,
                min_shipping: (countrySettings.min_shipping || 0) / purchaseCurrencyRate,
                additional_weight: (countrySettings.additional_weight || 0) / purchaseCurrencyRate,
                payment_gateway_fixed_fee: (countrySettings.payment_gateway_fixed_fee || 0) / purchaseCurrencyRate,
            };

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

            // Convert all USD values back to purchase currency
            const customsAndECS = fallbackQuote.customsAndECS * purchaseCurrencyRate;
            const paymentGatewayFeeUSD = (countrySettings.payment_gateway_fixed_fee || 0) + 
                (fallbackQuote.subTotal * (countrySettings.payment_gateway_percent_fee || 0)) / 100;
            const paymentGatewayFee = paymentGatewayFeeUSD * purchaseCurrencyRate;

            // Calculate all totals in purchase currency
            const subtotalBeforeFees = 
                total_item_price_in_purchase_currency +
                cleanFormData.sales_tax_price +
                cleanFormData.merchant_shipping_price +
                internationalShippingCost +
                customsAndECS +
                cleanFormData.domestic_shipping +
                cleanFormData.handling_charge +
                cleanFormData.insurance_amount -
                cleanFormData.discount;

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
                item_price: total_item_price_in_purchase_currency, // Store in purchase currency
                item_weight: total_item_weight,
                final_total: finalTotal,
                sub_total: subTotal,
                vat: vat,
                international_shipping: internationalShippingCost,
                customs_and_ecs: customsAndECS,
                payment_gateway_fee: paymentGatewayFee,
                // Store the ORIGINAL input values (in purchase currency)
                sales_tax_price: cleanFormData.sales_tax_price,
                merchant_shipping_price: cleanFormData.merchant_shipping_price,
                domestic_shipping: cleanFormData.domestic_shipping,
                handling_charge: cleanFormData.handling_charge,
                insurance_amount: cleanFormData.insurance_amount,
                discount: cleanFormData.discount,
                final_currency: purchaseCurrency || countrySettings.currency,
                final_total_local: finalTotal, // Already in purchase currency
                // Store the shipping route's exchange rate if available, otherwise use purchase currency rate
                exchange_rate: (shippingCost.route as any)?.exchange_rate || purchaseCurrencyRate,
                // New fields for shipping routes
                origin_country: originCountry,
                shipping_method: shippingMethod,
                shipping_route_id: shippingRouteId ?? null,
                // Preserve current status - don't change status on calculation
                status: currentStatus as any
            };
            
            // Log the values returned in the calculation result
            console.log('[QuoteCalc Debug] Calculation result (ORIGINAL values returned):', {
                sales_tax_price: updatedQuote.sales_tax_price,
                merchant_shipping_price: updatedQuote.merchant_shipping_price,
                domestic_shipping: updatedQuote.domestic_shipping,
                handling_charge: updatedQuote.handling_charge,
                discount: updatedQuote.discount,
                insurance_amount: updatedQuote.insurance_amount
            });
            
            return updatedQuote;

        } catch (error) {
            console.error('Error calculating shipping cost:', error);
            
            // Fallback to old calculation method if route lookup fails
            const purchaseCurrencyRate = countrySettings.rate_from_usd || 1;
            const total_item_price_in_usd = total_item_price_in_purchase_currency / purchaseCurrencyRate;
            
            const cleanFormDataInUSD = {
                sales_tax_price: cleanFormData.sales_tax_price / purchaseCurrencyRate,
                merchant_shipping_price: cleanFormData.merchant_shipping_price / purchaseCurrencyRate,
                domestic_shipping: cleanFormData.domestic_shipping / purchaseCurrencyRate,
                handling_charge: cleanFormData.handling_charge / purchaseCurrencyRate,
                discount: cleanFormData.discount / purchaseCurrencyRate,
                insurance_amount: cleanFormData.insurance_amount / purchaseCurrencyRate,
            };

            const countrySettingsInUSD = {
                ...countrySettings,
                min_shipping: (countrySettings.min_shipping || 0) / purchaseCurrencyRate,
                additional_weight: (countrySettings.additional_weight || 0) / purchaseCurrencyRate,
                payment_gateway_fixed_fee: (countrySettings.payment_gateway_fixed_fee || 0) / purchaseCurrencyRate,
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

            // Convert all USD values back to purchase currency
            const finalTotal = calculatedQuote.finalTotal * purchaseCurrencyRate;
            const subTotal = calculatedQuote.subTotal * purchaseCurrencyRate;
            const vat = calculatedQuote.vat * purchaseCurrencyRate;
            const internationalShippingCost = calculatedQuote.interNationalShipping * purchaseCurrencyRate;
            const customsAndECS = calculatedQuote.customsAndECS * purchaseCurrencyRate;
            const paymentGatewayFee = calculatedQuote.paymentGatewayFee * purchaseCurrencyRate;

            const updatedQuote = {
                ...restOfQuoteData,
                id: quoteDataFromForm.id,
                item_price: total_item_price_in_purchase_currency,
                item_weight: total_item_weight,
                final_total: finalTotal,
                sub_total: subTotal,
                vat: vat,
                international_shipping: internationalShippingCost,
                customs_and_ecs: customsAndECS,
                payment_gateway_fee: paymentGatewayFee,
                // Store the ORIGINAL input values (in purchase currency)
                sales_tax_price: cleanFormData.sales_tax_price,
                merchant_shipping_price: cleanFormData.merchant_shipping_price,
                domestic_shipping: cleanFormData.domestic_shipping,
                handling_charge: cleanFormData.handling_charge,
                insurance_amount: cleanFormData.insurance_amount,
                discount: cleanFormData.discount,
                final_currency: purchaseCurrency || countrySettings.currency,
                final_total_local: finalTotal,
                // Store the purchase currency rate for fallback case
                exchange_rate: purchaseCurrencyRate,
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
