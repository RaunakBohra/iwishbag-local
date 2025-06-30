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
            
            const formData = {
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
                internal_notes: quote.internal_notes,
                status: quote.status,
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
            item_currency: item.item_currency,
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
                    finalQuoteData.status = data.status;
                }
                
                // Include other form fields
                finalQuoteData.internal_notes = data.internal_notes;
                finalQuoteData.priority = data.priority;
                
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
