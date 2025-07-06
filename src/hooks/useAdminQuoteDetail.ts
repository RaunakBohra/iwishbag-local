import { useToast } from "@/components/ui/use-toast";
import { useQuoteQueries } from "./useQuoteQueries";
import { useQuoteMutations } from "./useQuoteMutations";
import { useQuoteCalculation } from "./useQuoteCalculation";
import { useAllCountries } from "./useAllCountries";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminQuoteFormSchema, AdminQuoteFormValues } from "@/components/admin/admin-quote-form-validation";
import { useEffect } from "react";

export const useAdminQuoteDetail = (id: string | undefined) => {
    const { toast } = useToast();
    const { quote, quoteLoading, error, countries, shippingCountries } = useQuoteQueries(id);
    const { data: allCountries } = useAllCountries();
    const { updateQuote, updateQuoteItem, sendQuoteEmail, isUpdating, isSendingEmail } = useQuoteMutations(id);
    const { calculateUpdatedQuote } = useQuoteCalculation();
    
    const form = useForm<AdminQuoteFormValues>({
        resolver: zodResolver(adminQuoteFormSchema),
    });

    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: "items",
    });

    useEffect(() => {
        if (quote) {
            // Determine the purchase country currency
            const purchaseCountry = quote.country_code;
            const purchaseCurrency = allCountries?.find(c => c.code === purchaseCountry)?.currency || 'USD';
            
            const formData: any = {
                id: quote.id,
                sales_tax_price: quote.sales_tax_price,
                merchant_shipping_price: quote.merchant_shipping_price,
                domestic_shipping: quote.domestic_shipping,
                handling_charge: quote.handling_charge,
                discount: quote.discount,
                insurance_amount: quote.insurance_amount,
                country_code: quote.country_code,
                customs_percentage: quote.customs_percentage ?? undefined,
                currency: quote.currency || purchaseCurrency, // Use quote currency or determine from country
                final_currency: quote.final_currency || 'USD',
                priority: quote.priority ?? undefined,
                internal_notes: quote.internal_notes ?? '',
                status: quote.status ?? '',
                items: quote.quote_items.map(item => ({
                    id: item.id,
                    item_price: item.item_price || 0,
                    item_weight: item.item_weight || 0,
                    quantity: item.quantity,
                    product_name: item.product_name,
                    options: item.options,
                    product_url: item.product_url,
                    image_url: item.image_url,
                }))
            };
            // Map snake_case to camelCase for UI breakdown
            formData.salesTaxPrice = quote.sales_tax_price;
            formData.merchantShippingPrice = quote.merchant_shipping_price;
            formData.interNationalShipping = quote.international_shipping;
            formData.customsAndECS = quote.customs_and_ecs;
            formData.domesticShipping = quote.domestic_shipping;
            formData.handlingCharge = quote.handling_charge;
            formData.insuranceAmount = quote.insurance_amount;
            formData.paymentGatewayFee = quote.payment_gateway_fee;
            try {
                form.reset(formData);
            } catch (error) {
                console.error('[ADMIN QUOTE DETAIL] Error resetting form:', error);
            }
        }
    }, [quote, form, allCountries]);

    const onSubmit = async (data: AdminQuoteFormValues) => {
        if (!quote) {
            toast({ title: "Quote data not loaded yet.", variant: "destructive" });
            return;
        }

        const itemsToUpdate = data.items.map(item => ({
            id: item.id,
            item_price: item.item_price || 0,
            item_weight: item.item_weight || 0,
            quantity: item.quantity,
            product_name: item.product_name,
            options: item.options,
            product_url: item.product_url,
            image_url: item.image_url,
        }));

        try {
            await Promise.all(
                itemsToUpdate.map(item => updateQuoteItem(item))
            );
        } catch (error: any) {
            console.error('[ADMIN QUOTE SUBMIT] Error updating items:', error);
            toast({ title: "Error updating items", description: error.message, variant: "destructive" });
            return;
        }
        
        try {
            const finalQuoteData = await calculateUpdatedQuote(
                data,
                itemsToUpdate,
                allCountries || [],
                quote?.shipping_address,
                quote?.status
            );

            if (finalQuoteData) {
                if (itemsToUpdate.length > 1) {
                    finalQuoteData.product_name = `${itemsToUpdate[0].product_name || 'Item'} and ${itemsToUpdate.length - 1} more items`;
                } else if (itemsToUpdate.length === 1) {
                    finalQuoteData.product_name = itemsToUpdate[0].product_name;
                }
                // Ensure the updated currency is included
                finalQuoteData.currency = data.currency;
                // Include status update if it has changed
                if (data.status && data.status !== quote.status) {
                    finalQuoteData.status = data.status || '';
                }
                // Include other form fields
                finalQuoteData.internal_notes = data.internal_notes || '';

                // --- Priority Logic ---
                const country = allCountries?.find(c => c.code === quote.country_code);
                const thresholds = (country?.priority_thresholds || { low: 0, normal: 500, urgent: 2000 }) as any;
                const finalTotal = finalQuoteData.final_total || 0;
                // Always recalculate priority on calculate
                let priority;
                if (finalTotal < thresholds.normal) {
                    priority = 'low';
                } else if (finalTotal < thresholds.urgent) {
                    priority = 'normal';
                } else {
                    priority = 'urgent';
                }
                finalQuoteData.priority = priority;
                form.setValue('priority', priority);
                
                // Debug logging
                console.log('[Priority Calculation]', {
                    countryCode: quote.country_code,
                    countryName: country?.name,
                    thresholds,
                    finalTotal,
                    calculatedPriority: priority,
                    previousPriority: data.priority
                });
                // --- End Priority Logic ---

                // --- Map snake_case to camelCase for UI breakdown (using USD-calculated values) ---
                (finalQuoteData as any).salesTaxPrice = finalQuoteData.sales_tax_price;
                (finalQuoteData as any).domesticShipping = finalQuoteData.domestic_shipping;
                (finalQuoteData as any).handlingCharge = finalQuoteData.handling_charge;
                (finalQuoteData as any).insuranceAmount = finalQuoteData.insurance_amount;
                (finalQuoteData as any).merchantShippingPrice = finalQuoteData.merchant_shipping_price;
                (finalQuoteData as any).discount = finalQuoteData.discount;
                (finalQuoteData as any).interNationalShipping = finalQuoteData.international_shipping;
                (finalQuoteData as any).customsAndECS = finalQuoteData.customs_and_ecs;
                (finalQuoteData as any).paymentGatewayFee = finalQuoteData.payment_gateway_fee;
                // --- End UI mapping ---

                // --- Remove camelCase fields before DB save ---
                delete (finalQuoteData as any).salesTaxPrice;
                delete (finalQuoteData as any).merchantShippingPrice;
                delete (finalQuoteData as any).interNationalShipping;
                delete (finalQuoteData as any).customsAndECS;
                delete (finalQuoteData as any).domesticShipping;
                delete (finalQuoteData as any).handlingCharge;
                delete (finalQuoteData as any).insuranceAmount;
                delete (finalQuoteData as any).paymentGatewayFee;
                // --- End removal ---

                updateQuote(finalQuoteData);
            }
        } catch (error: any) {
            console.error('[ADMIN QUOTE SUBMIT] Error calculating quote:', error);
            toast({ title: "Error calculating quote", description: error.message, variant: "destructive" });
        }
    };

    return {
        quote,
        quoteLoading,
        error: error as Error | null,
        countries,
        shippingCountries,
        allCountries,
        sendQuoteEmail,
        isSendingEmail,
        isUpdating,
        form,
        fields,
        remove,
        append,
        onSubmit,
        updateQuote,
    };
};
