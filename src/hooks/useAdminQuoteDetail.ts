import { useToast } from '@/components/ui/use-toast';
import { useQuoteQueries } from './useQuoteQueries';
import { useQuoteMutations } from './useQuoteMutations';
import { useQuoteCalculation } from './useQuoteCalculation';
import { useAllCountries } from './useAllCountries';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminQuoteFormSchema,
  AdminQuoteFormValues,
} from '@/components/admin/admin-quote-form-validation';
import { useEffect } from 'react';
import { Tables } from '@/integrations/supabase/types';

export const useAdminQuoteDetail = (id: string | undefined) => {
  const { toast } = useToast();
  const { quote, quoteLoading, error, countries, shippingCountries } = useQuoteQueries(id);
  const { data: allCountries } = useAllCountries();
  const { updateQuote, updateQuoteItem, sendQuoteEmail, isUpdating, isSendingEmail } =
    useQuoteMutations(id);
  const { calculateUpdatedQuote } = useQuoteCalculation();

  const form = useForm<AdminQuoteFormValues>({
    resolver: zodResolver(adminQuoteFormSchema),
  });

  const { fields, remove, append } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (quote) {
      // Determine the purchase country currency
      const purchaseCountry = quote.destination_country;
      const purchaseCurrency =
        allCountries?.find((c) => c.code === purchaseCountry)?.currency || 'USD';

      // Always use the original input values from the quote (in purchase currency)
      const formData: Partial<AdminQuoteFormValues> & Record<string, unknown> = {
        id: quote.id,
        sales_tax_price: quote.sales_tax_price,
        merchant_shipping_price: quote.merchant_shipping_price,
        domestic_shipping: quote.domestic_shipping,
        handling_charge: quote.handling_charge,
        discount: quote.discount,
        insurance_amount: quote.insurance_amount,
        origin_country: quote.origin_country || quote.destination_country || 'US', // Use origin_country or fallback to destination_country for legacy quotes
        destination_country: quote.destination_country,
        customs_percentage: quote.customs_percentage ?? undefined,
        currency: quote.currency || purchaseCurrency, // Use quote currency or determine from country
        destination_currency: quote.destination_currency || 'USD',
        priority: quote.priority ?? undefined,
        internal_notes: quote.internal_notes ?? '',
        status: quote.status ?? '',
        items: quote.quote_items.map((item) => ({
          id: item.id,
          item_price: item.item_price || 0,
          item_weight: item.item_weight || 0,
          quantity: item.quantity,
          product_name: item.product_name,
          options: item.options,
          product_url: item.product_url,
          image_url: item.image_url,
        })),
      };
      // Map snake_case to camelCase for UI breakdown (for display only)
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
      toast({ title: 'Quote data not loaded yet.', variant: 'destructive' });
      return;
    }

    const itemsToUpdate = data.items.map((item) => ({
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
      await Promise.all(itemsToUpdate.map((item) => updateQuoteItem(item)));
    } catch (error) {
      console.error('[ADMIN QUOTE SUBMIT] Error updating items:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update items';
      toast({
        title: 'Error updating items',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    try {
      const finalQuoteData = await calculateUpdatedQuote(
        data,
        itemsToUpdate,
        allCountries || [],
        quote?.shipping_address,
        quote?.status,
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
        const country = allCountries?.find((c) => c.code === quote.destination_country);
        interface PriorityThresholds {
          low: number;
          normal: number;
          urgent: number;
        }
        const thresholds = (country?.priority_thresholds || {
          low: 0,
          normal: 500,
          urgent: 2000,
        }) as PriorityThresholds;
        const finalTotal = finalQuoteData.final_total_usd || 0;
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
          countryCode: quote.destination_country,
          countryName: country?.name,
          thresholds,
          finalTotal,
          calculatedPriority: priority,
          previousPriority: data.priority,
        });
        // --- End Priority Logic ---

        // --- Map snake_case to camelCase for UI breakdown (using USD-calculated values) ---
        interface ExtendedQuoteData extends Partial<Tables<'quotes'>> {
          id: string;
          salesTaxPrice?: number;
          domesticShipping?: number;
          handlingCharge?: number;
          insuranceAmount?: number;
          merchantShippingPrice?: number;
          discount?: number;
          interNationalShipping?: number;
          customsAndECS?: number;
          paymentGatewayFee?: number;
        }

        const extendedQuoteData = finalQuoteData as ExtendedQuoteData;
        extendedQuoteData.salesTaxPrice = finalQuoteData.sales_tax_price;
        extendedQuoteData.domesticShipping = finalQuoteData.domestic_shipping;
        extendedQuoteData.handlingCharge = finalQuoteData.handling_charge;
        extendedQuoteData.insuranceAmount = finalQuoteData.insurance_amount;
        extendedQuoteData.merchantShippingPrice = finalQuoteData.merchant_shipping_price;
        extendedQuoteData.discount = finalQuoteData.discount;
        extendedQuoteData.interNationalShipping = finalQuoteData.international_shipping;
        extendedQuoteData.customsAndECS = finalQuoteData.customs_and_ecs;
        extendedQuoteData.paymentGatewayFee = finalQuoteData.payment_gateway_fee;
        // --- End UI mapping ---

        // --- Remove camelCase fields before DB save ---
        delete extendedQuoteData.salesTaxPrice;
        delete extendedQuoteData.merchantShippingPrice;
        delete extendedQuoteData.interNationalShipping;
        delete extendedQuoteData.customsAndECS;
        delete extendedQuoteData.domesticShipping;
        delete extendedQuoteData.handlingCharge;
        delete extendedQuoteData.insuranceAmount;
        delete extendedQuoteData.paymentGatewayFee;
        // --- End removal ---

        updateQuote(finalQuoteData);
      }
    } catch (error) {
      console.error('[ADMIN QUOTE SUBMIT] Error calculating quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate quote';
      toast({
        title: 'Error calculating quote',
        description: errorMessage,
        variant: 'destructive',
      });
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
