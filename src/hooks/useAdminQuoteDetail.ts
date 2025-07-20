import { useToast } from '@/components/ui/use-toast';
import { useQuoteQueries } from './useQuoteQueries';
import { useQuoteMutations } from './useQuoteMutations';
import { useAllCountries } from './useAllCountries';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
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
      // Extract values from unified structure JSONB fields
      const calculationData = quote.calculation_data || {};
      const operationalData = quote.operational_data || {};
      
      const formData: Partial<AdminQuoteFormValues> & Record<string, unknown> = {
        id: quote.id,
        sales_tax_price: calculationData.sales_tax_price || 0,
        merchant_shipping_price: calculationData.merchant_shipping_price || 0,
        domestic_shipping: operationalData.domestic_shipping || 0,
        handling_charge: operationalData.handling_charge || 0,
        discount: calculationData.discount || 0,
        insurance_amount: operationalData.insurance_amount || 0,
        origin_country: quote.origin_country || quote.destination_country || 'US', // Use origin_country or fallback to destination_country for legacy quotes
        destination_country: quote.destination_country,
        customs_percentage: calculationData.customs_percentage ?? undefined,
        currency: quote.currency || purchaseCurrency, // Use quote currency or determine from country
        destination_currency: quote.currency || 'USD', // Note: destination_currency field no longer exists, using currency
        priority: quote.priority ?? undefined,
        internal_notes: quote.internal_notes ?? '',
        status: quote.status ?? '',
        items: (quote.items || []).map((item, index) => ({
          id: item.id || `item-${index}`,
          item_price: item.price_usd || 0,
          item_weight: item.weight_kg || 0,
          quantity: item.quantity || 1,
          product_name: item.name || '',
          options: item.options || '',
          product_url: item.url || '',
          image_url: item.image || '',
        })),
      };
      // Map snake_case to camelCase for UI breakdown (for display only)
      formData.salesTaxPrice = calculationData.sales_tax_price || 0;
      formData.merchantShippingPrice = calculationData.merchant_shipping_price || 0;
      formData.interNationalShipping = calculationData.international_shipping || 0;
      formData.customsAndECS = calculationData.customs_and_ecs || 0;
      formData.domesticShipping = operationalData.domestic_shipping || 0;
      formData.handlingCharge = operationalData.handling_charge || 0;
      formData.insuranceAmount = operationalData.insurance_amount || 0;
      formData.paymentGatewayFee = operationalData.payment_gateway_fee || 0;
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
      // Create updated quote for SmartCalculationEngine
      const updatedQuote = {
        ...quote!,
        items: itemsToUpdate.map((item, index) => ({
          ...quote!.items[index],
          name: item.product_name || '',
          price_usd: item.item_price || 0,
          weight_kg: item.item_weight || 0,
          quantity: item.quantity || 1,
          url: item.product_url || '',
        })),
        operational_data: {
          ...quote!.operational_data,
          customs: {
            ...quote!.operational_data?.customs,
            percentage: Number(data.customs_percentage) || 0,
          },
          domestic_shipping: Number(data.domestic_shipping) || 0,
          handling_charge: Number(data.handling_charge) || 0,
          insurance_amount: Number(data.insurance_amount) || 0,
        },
        calculation_data: {
          ...quote!.calculation_data,
          sales_tax_price: Number(data.sales_tax_price) || 0,
          merchant_shipping_price: Number(data.merchant_shipping_price) || 0,
          discount: Number(data.discount) || 0,
        },
      };

      // Use SmartCalculationEngine to recalculate
      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote: updatedQuote,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: false,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Calculation failed');
      }

      const finalQuoteData = result.updated_quote;

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
        // Extract from unified structure if available, fallback to direct fields
        const calcData = finalQuoteData.calculation_data || {};
        const opData = finalQuoteData.operational_data || {};
        
        extendedQuoteData.salesTaxPrice = calcData.sales_tax_price || finalQuoteData.sales_tax_price;
        extendedQuoteData.domesticShipping = opData.domestic_shipping || finalQuoteData.domestic_shipping;
        extendedQuoteData.handlingCharge = opData.handling_charge || finalQuoteData.handling_charge;
        extendedQuoteData.insuranceAmount = opData.insurance_amount || finalQuoteData.insurance_amount;
        extendedQuoteData.merchantShippingPrice = calcData.merchant_shipping_price || finalQuoteData.merchant_shipping_price;
        extendedQuoteData.discount = calcData.discount || finalQuoteData.discount;
        extendedQuoteData.interNationalShipping = calcData.international_shipping || finalQuoteData.international_shipping;
        extendedQuoteData.customsAndECS = calcData.customs_and_ecs || finalQuoteData.customs_and_ecs;
        extendedQuoteData.paymentGatewayFee = opData.payment_gateway_fee || finalQuoteData.payment_gateway_fee;
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
