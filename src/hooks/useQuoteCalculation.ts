import { useToast } from '@/components/ui/use-toast';
import { getShippingCost } from '@/lib/unified-shipping-calculator';
import { Tables } from '@/integrations/supabase/types';
import { AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';

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
    shippingAddress?: Record<string, unknown>,
    currentStatus?: string,
  ): Promise<(Partial<Quote> & { id: string }) | null> => {
    const { items, ...restOfQuoteData } = quoteDataFromForm;

    // Calculate total item price in purchase currency (no USD conversion needed)
    const { currency: purchaseCurrency } = quoteDataFromForm;

    const total_item_price_in_purchase_currency = itemsToUpdate.reduce((sum, item) => {
      // Item prices are already in purchase currency, no conversion needed
      const priceInPurchaseCurrency = item.item_price || 0;
      return sum + priceInPurchaseCurrency * item.quantity;
    }, 0);

    const total_item_weight = itemsToUpdate.reduce(
      (sum, item) => sum + (item.item_weight || 0) * item.quantity,
      0,
    );

    const { destination_country, customs_percentage } = quoteDataFromForm;

    if (!total_item_price_in_purchase_currency || !total_item_weight || !destination_country) {
      toast({
        title: 'Missing required data',
        description:
          'Quote needs total item price, total weight, and country to calculate pricing. Make sure all items have a price and weight.',
        variant: 'destructive',
      });
      return null;
    }

    // Clean and validate form data - ensure all values are numbers in purchase currency
    const parseToNumber = (value: unknown): number => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    const cleanFormData = {
      sales_tax_price: parseToNumber(quoteDataFromForm.sales_tax_price),
      merchant_shipping_price: parseToNumber(quoteDataFromForm.merchant_shipping_price),
      domestic_shipping: parseToNumber(quoteDataFromForm.domestic_shipping),
      handling_charge: parseToNumber(quoteDataFromForm.handling_charge),
      discount: parseToNumber(quoteDataFromForm.discount),
      insurance_amount: parseToNumber(quoteDataFromForm.insurance_amount),
    };

    console.log('[QuoteCalc Debug] Raw form data from form:', {
      sales_tax_price: quoteDataFromForm.sales_tax_price,
      merchant_shipping_price: quoteDataFromForm.merchant_shipping_price,
      domestic_shipping: quoteDataFromForm.domestic_shipping,
      handling_charge: quoteDataFromForm.handling_charge,
      discount: quoteDataFromForm.discount,
      insurance_amount: quoteDataFromForm.insurance_amount,
    });

    console.log('[QuoteCalc Debug] Cleaned form data (numbers):', cleanFormData);

    // Validate input values to prevent calculation errors
    const validateInputValue = (value: number, name: string): boolean => {
      if (isNaN(value) || !isFinite(value)) {
        console.error(`[QuoteCalc Validation] Invalid ${name}:`, value);
        toast({
          title: 'Invalid Input',
          description: `${name} contains invalid value. Please check your input.`,
          variant: 'destructive',
        });
        return false;
      }
      if (value < 0 && name !== 'discount') {
        console.error(`[QuoteCalc Validation] Negative ${name}:`, value);
        toast({
          title: 'Invalid Input',
          description: `${name} cannot be negative.`,
          variant: 'destructive',
        });
        return false;
      }
      if (value > 100000) {
        // Reasonable upper limit for individual components
        console.error(`[QuoteCalc Validation] Extremely high ${name}:`, value);
        toast({
          title: 'Invalid Input',
          description: `${name} seems unreasonably high: ${value.toLocaleString()}. Please verify.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    };

    // Validate all form inputs
    for (const [key, value] of Object.entries(cleanFormData)) {
      if (!validateInputValue(value, key.replace('_', ' '))) {
        return null;
      }
    }

    // Validate item totals
    if (!validateInputValue(total_item_price_in_purchase_currency, 'total item price')) {
      return null;
    }
    if (!validateInputValue(total_item_weight, 'total item weight')) {
      return null;
    }

    const countrySettings = allCountrySettings.find((c) => c.code === destination_country);
    if (!countrySettings) {
      toast({ title: 'Country settings not found', variant: 'destructive' });
      return null;
    }

    // Validate currency rate
    const currencyRate = countrySettings.rate_from_usd || 1;
    if (isNaN(currencyRate) || currencyRate <= 0 || !isFinite(currencyRate)) {
      console.error('[QuoteCalc Validation] Invalid currency rate:', currencyRate);
      toast({
        title: 'Invalid Currency Rate',
        description: `Currency exchange rate for ${destination_country} is invalid: ${currencyRate}. Please contact admin.`,
        variant: 'destructive',
      });
      return null;
    }

    // Hard limit for currency rates to prevent calculation errors
    const MAX_EXCHANGE_RATE = 1000;
    if (currencyRate > MAX_EXCHANGE_RATE) {
      console.error('[QuoteCalc Validation] Exchange rate exceeds maximum allowed:', currencyRate);
      toast({
        title: 'Invalid Exchange Rate',
        description: `Currency rate for ${destination_country} (${currencyRate}) exceeds maximum allowed rate of ${MAX_EXCHANGE_RATE}. Please contact support.`,
        variant: 'destructive',
      });
      return null; // Prevent calculation with invalid rate
    }

    // Use purchase country as origin, shipping address destination_country as destination
    const originCountry = quoteDataFromForm.origin_country || 'US';
    let destinationCountry =
      shippingAddress?.destination_country ||
      shippingAddress?.country ||
      quoteDataFromForm.destination_country;

    // Convert country name to country code if needed (similar to route-specific-customs.ts)
    if (destinationCountry && destinationCountry.length > 2) {
      const countryByName = allCountrySettings.find((c) => c.name === destinationCountry);
      if (countryByName) {
        destinationCountry = countryByName.code;
      }
    }

    if (!originCountry || !destinationCountry) {
      toast({
        title: 'Missing country information',
        description: 'Both purchase and shipping country codes are required.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      console.log('[QuoteCalc Debug] Starting calculation with:', {
        total_item_price_in_purchase_currency,
        total_item_weight,
        originCountry,
        destinationCountry,
        purchaseCurrency,
        countrySettings: {
          rate_from_usd: countrySettings.rate_from_usd,
          currency: countrySettings.currency,
        },
        formData: cleanFormData,
      });

      // Get shipping cost - this should return cost in purchase currency
      const shippingCost = await getShippingCost(
        originCountry,
        destinationCountry,
        total_item_weight,
        total_item_price_in_purchase_currency, // Pass in purchase currency, not USD
      );

      console.log('[QuoteCalc Debug] Shipping cost result:', shippingCost);

      // Use customs percentage from form if provided, otherwise default to 0
      // Ensure customs percentage is reasonable (should be like 5.2%, not 520000%)
      const rawCustomsPercent =
        customs_percentage !== null && customs_percentage !== undefined
          ? parseToNumber(customs_percentage)
          : 0;

      // Handle extremely high percentages that might be stored incorrectly
      let customsPercent = rawCustomsPercent;
      if (rawCustomsPercent > 10000) {
        // Likely stored as basis points (e.g., 520 for 5.2%)
        customsPercent = rawCustomsPercent / 10000;
      } else if (rawCustomsPercent > 100) {
        // Likely stored as percentage * 100 (e.g., 520 for 5.2%)
        customsPercent = rawCustomsPercent / 100;
      }

      // Final safety check - customs should never exceed 50%
      if (customsPercent > 50) {
        console.warn(
          '[QuoteCalc Debug] Extremely high customs percentage detected:',
          rawCustomsPercent,
        );
        customsPercent = Math.min(customsPercent / 100, 50); // Try one more division, cap at 50%
      }

      console.log('[QuoteCalc Debug] Customs percentage:', {
        raw: rawCustomsPercent,
        adjusted: customsPercent,
        willCalculateAs: `(item_total + taxes + shipping) * ${customsPercent}%`,
      });

      // Use the new shipping cost if available, otherwise fall back to old calculation
      let internationalShippingCost: number;
      let shippingMethod: string;
      let shippingRouteId: number | null = null;
      let customsAndECS: number;
      let paymentGatewayFee: number;

      const purchaseCurrencyRate = countrySettings.rate_from_usd || 1;
      console.log('[QuoteCalc Debug] Purchase currency rate from USD:', purchaseCurrencyRate);

      if (shippingCost.method === 'route-specific' && shippingCost.route) {
        console.log('[QuoteCalc Debug] Using route-specific shipping');
        internationalShippingCost = shippingCost.cost;
        shippingMethod = 'route-specific';
        shippingRouteId = shippingCost.route.id ?? null;

        // Calculate customs and fees directly in purchase currency for route-specific
        customsAndECS =
          (total_item_price_in_purchase_currency +
            cleanFormData.sales_tax_price +
            cleanFormData.merchant_shipping_price +
            internationalShippingCost) *
          (customsPercent / 100);

        // Payment gateway fee calculation in purchase currency
        const subtotalBeforeGatewayFee =
          total_item_price_in_purchase_currency +
          cleanFormData.sales_tax_price +
          cleanFormData.merchant_shipping_price +
          internationalShippingCost +
          customsAndECS +
          cleanFormData.domestic_shipping +
          cleanFormData.handling_charge +
          cleanFormData.insurance_amount -
          cleanFormData.discount;

        // Ensure payment gateway percent fee is reasonable (should be like 2.5%, not 250%)
        const gatewayPercentFee = countrySettings.payment_gateway_percent_fee || 0;
        const reasonablePercentFee =
          gatewayPercentFee > 100 ? gatewayPercentFee / 100 : gatewayPercentFee;

        paymentGatewayFee =
          (countrySettings.payment_gateway_fixed_fee || 0) +
          (subtotalBeforeGatewayFee * reasonablePercentFee) / 100;

        console.log('[QuoteCalc Debug] Payment gateway fee calculation:', {
          fixed_fee: countrySettings.payment_gateway_fixed_fee || 0,
          original_percent_fee: gatewayPercentFee,
          reasonable_percent_fee: reasonablePercentFee,
          subtotalBeforeGatewayFee,
          calculated_percent_fee: (subtotalBeforeGatewayFee * reasonablePercentFee) / 100,
          total_paymentGatewayFee: paymentGatewayFee,
        });

        console.log('[QuoteCalc Debug] Route-specific calculation:', {
          internationalShippingCost,
          customsAndECS,
          paymentGatewayFee,
          subtotalBeforeGatewayFee,
        });
      } else {
        console.log('[QuoteCalc Debug] Using basic calculation without specific route');
        // Basic calculation without route-specific shipping
        internationalShippingCost =
          (countrySettings.min_shipping || 25) +
          total_item_weight * (countrySettings.additional_weight || 5);

        // Calculate customs directly in purchase currency
        customsAndECS =
          (total_item_price_in_purchase_currency +
            cleanFormData.sales_tax_price +
            cleanFormData.merchant_shipping_price +
            internationalShippingCost) *
          (customsPercent / 100);

        // Payment gateway fee calculation
        const subtotalBeforeGatewayFee =
          total_item_price_in_purchase_currency +
          cleanFormData.sales_tax_price +
          cleanFormData.merchant_shipping_price +
          internationalShippingCost +
          customsAndECS +
          cleanFormData.domestic_shipping +
          cleanFormData.handling_charge +
          cleanFormData.insurance_amount -
          cleanFormData.discount;

        const gatewayPercentFee = countrySettings.payment_gateway_percent_fee || 0;
        const reasonablePercentFee =
          gatewayPercentFee > 100 ? gatewayPercentFee / 100 : gatewayPercentFee;

        paymentGatewayFee =
          (countrySettings.payment_gateway_fixed_fee || 0) +
          (subtotalBeforeGatewayFee * reasonablePercentFee) / 100;

        shippingMethod = 'country_settings';
        shippingRouteId = null;

        console.log('[QuoteCalc Debug] Basic calculation:', {
          internationalShippingCost,
          customsAndECS,
          paymentGatewayFee,
        });
      }

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
      const vat = Math.round(((subTotal * (countrySettings.vat || 0)) / 100) * 100) / 100;
      const finalTotal = Math.round((subTotal + vat) * 100) / 100;

      console.log('[QuoteCalc Debug] Final calculation breakdown:', {
        total_item_price_in_purchase_currency,
        sales_tax_price: cleanFormData.sales_tax_price,
        merchant_shipping_price: cleanFormData.merchant_shipping_price,
        internationalShippingCost,
        customsAndECS,
        domestic_shipping: cleanFormData.domestic_shipping,
        handling_charge: cleanFormData.handling_charge,
        insurance_amount: cleanFormData.insurance_amount,
        discount: cleanFormData.discount,
        subtotalBeforeFees,
        paymentGatewayFee,
        subTotal,
        vat,
        finalTotal,
      });

      // Validate that the calculated values are reasonable
      if (finalTotal > 1000000) {
        // $1M limit
        console.error('[useQuoteCalculation] Calculated total too high:', finalTotal);
        console.error('[useQuoteCalculation] Debug breakdown:', {
          subtotalBeforeFees,
          paymentGatewayFee,
          vat,
          purchaseCurrencyRate,
          formData: cleanFormData,
        });
        toast({
          title: 'Calculation Error',
          description: `Calculated total is unreasonably high: ${finalTotal.toLocaleString()}. Please check your input values and currency rates.`,
          variant: 'destructive',
        });
        return null;
      }

      // Add additional validation for negative or NaN values
      if (isNaN(finalTotal) || finalTotal < 0) {
        console.error('[useQuoteCalculation] Invalid final total:', finalTotal);
        toast({
          title: 'Calculation Error',
          description: 'Invalid calculation result. Please check your input values.',
          variant: 'destructive',
        });
        return null;
      }

      const updatedQuote = {
        ...restOfQuoteData,
        id: quoteDataFromForm.id,
        item_price: total_item_price_in_purchase_currency, // Store in purchase currency
        item_weight: total_item_weight,
        final_total_usd: finalTotal,
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
        destination_currency: purchaseCurrency || countrySettings.currency,
        final_total_local: finalTotal, // Already in purchase currency
        // Store the shipping route's exchange rate if available, otherwise use purchase currency rate
        exchange_rate:
          ((shippingCost.route as Record<string, unknown>)?.exchange_rate as number) ||
          purchaseCurrencyRate,
        // New fields for shipping routes
        origin_country: originCountry,
        shipping_method: shippingMethod,
        shipping_route_id: shippingRouteId ?? null,
        // Preserve current status - don't change status on calculation
        status: currentStatus as string,
      };

      // Log the values returned in the calculation result
      console.log('[QuoteCalc Debug] Calculation result (ORIGINAL values returned):', {
        sales_tax_price: updatedQuote.sales_tax_price,
        merchant_shipping_price: updatedQuote.merchant_shipping_price,
        domestic_shipping: updatedQuote.domestic_shipping,
        handling_charge: updatedQuote.handling_charge,
        discount: updatedQuote.discount,
        insurance_amount: updatedQuote.insurance_amount,
      });

      return updatedQuote;
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate shipping cost. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  return { calculateUpdatedQuote };
};
