import { currencyService } from './CurrencyService';
import { DiscountService } from './DiscountService';

interface CalculationInput {
  items: Array<{
    quantity: number;
    unit_price_usd: number;
    weight_kg?: number;
    discount_percentage?: number; // Item-level discount
    // Optional HSN fields - safe additions
    hsn_code?: string;
    use_hsn_rates?: boolean; // Feature flag per item
  }>;
  origin_country: string;
  origin_state?: string; // For US sales tax
  destination_country: string;
  destination_state?: string; // For domestic delivery rates
  shipping_method?: 'standard' | 'express' | 'economy';
  insurance_required?: boolean;
  handling_fee_type?: 'fixed' | 'percentage' | 'both';
  payment_gateway?: 'stripe' | 'paypal' | 'esewa' | 'khalti' | 'payu';
  
  // Discount fields
  order_discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    code?: string; // Promo code used
  };
  shipping_discount?: {
    type: 'percentage' | 'fixed' | 'free';
    value?: number; // Not needed if type is 'free'
  };
  
  // Enhanced discount inputs
  discount_codes?: string[];
  customer_id?: string;
  is_first_order?: boolean;
  apply_component_discounts?: boolean; // Enable component-based discounts
}

interface CalculationResult {
  inputs: {
    items_cost: number;
    total_weight_kg: number;
    origin_country: string;
    origin_state?: string;
    destination_country: string;
    destination_state?: string;
    shipping_method: string;
    payment_gateway: string;
  };
  applied_rates: {
    exchange_rate: number;
    origin_sales_tax_percentage: number;
    customs_percentage: number;
    local_tax_percentage: number; // GST/VAT/Sales Tax
    insurance_percentage: number;
    shipping_rate_per_kg: number;
    handling_fee_fixed: number;
    handling_fee_percentage: number;
    payment_gateway_fee_percentage: number;
    payment_gateway_fee_fixed: number;
  };
  calculation_steps: {
    items_subtotal: number;
    item_discounts: number; // Total item-level discounts
    discounted_items_subtotal: number;
    order_discount_amount: number;
    origin_sales_tax: number;
    shipping_cost: number;
    shipping_discount_amount: number;
    discounted_shipping_cost: number;
    insurance_amount: number;
    cif_value: number;
    customs_duty: number;
    customs_discount_amount?: number; // NEW: Customs discount
    discounted_customs_duty?: number; // NEW: Final customs after discount
    handling_fee: number;
    handling_discount_amount?: number; // NEW: Handling fee discount
    discounted_handling_fee?: number; // NEW: Final handling fee after discount
    domestic_delivery: number;
    delivery_discount_amount?: number; // NEW: Delivery discount
    discounted_delivery?: number; // NEW: Final delivery after discount
    taxable_value: number; // All costs before local tax
    local_tax_amount: number; // GST/VAT on taxable value
    tax_discount_amount?: number; // NEW: Tax discount (rare)
    discounted_tax_amount?: number; // NEW: Final tax after discount
    subtotal_before_gateway: number;
    payment_gateway_fee: number;
    total_usd: number;
    total_customer_currency: number;
    total_savings: number; // Total discount amount
    component_discounts?: { // NEW: Breakdown by component
      [component: string]: {
        original: number;
        discount: number;
        final: number;
        applied_discounts: Array<{
          source: string;
          description: string;
          amount: number;
        }>;
      };
    };
  };
  calculation_timestamp: string;
  calculation_version: 'v2';
}

// Country-specific tax configurations
const COUNTRY_TAX_CONFIG = {
  IN: {
    customs: 20,
    local_tax: 18, // GST
    local_tax_name: 'GST',
    name: 'India'
  },
  NP: {
    customs: 15,
    local_tax: 13, // VAT
    local_tax_name: 'VAT',
    name: 'Nepal'
  },
  US: {
    customs: 0,
    local_tax: 0, // State-specific, will be calculated separately
    local_tax_name: 'Sales Tax',
    name: 'United States'
  },
  CA: {
    customs: 5,
    local_tax: 13, // GST + PST average
    local_tax_name: 'GST/PST',
    name: 'Canada'
  },
  GB: {
    customs: 10,
    local_tax: 20, // VAT
    local_tax_name: 'VAT',
    name: 'United Kingdom'
  },
  AU: {
    customs: 5,
    local_tax: 10, // GST
    local_tax_name: 'GST',
    name: 'Australia'
  },
  // Default for other countries
  DEFAULT: {
    customs: 10,
    local_tax: 15, // VAT
    local_tax_name: 'VAT',
    name: 'Other'
  }
};

// Shipping rates per kg (USD)
const SHIPPING_RATES = {
  standard: 25,
  express: 40,
  economy: 15
};

// US State sales tax rates (simplified - major states)
const US_STATE_TAX_RATES: Record<string, number> = {
  'CA': 7.25, // California
  'TX': 6.25, // Texas
  'NY': 8.0,  // New York
  'FL': 6.0,  // Florida
  'WA': 6.5,  // Washington
  'OR': 0,    // Oregon (no sales tax)
  'MT': 0,    // Montana (no sales tax)
  'NH': 0,    // New Hampshire (no sales tax)
  'DE': 0,    // Delaware (no sales tax)
  'DEFAULT': 5.0 // Average for other states
};

// Payment gateway fees
const PAYMENT_GATEWAY_FEES = {
  stripe: { percentage: 2.9, fixed: 0.30 },
  paypal: { percentage: 2.9, fixed: 0.30 },
  esewa: { percentage: 2.0, fixed: 0 },
  khalti: { percentage: 2.5, fixed: 0 },
  payu: { percentage: 2.0, fixed: 0 }
};

// Handling fees configuration
const HANDLING_FEES = {
  fixed: 10,      // $10 fixed
  percentage: 2   // 2% of order value
};

// Domestic delivery rates (USD)
const DOMESTIC_DELIVERY_RATES: Record<string, { urban: number; rural: number }> = {
  'IN': { urban: 5, rural: 10 },     // India
  'NP': { urban: 3, rural: 7 },      // Nepal  
  'US': { urban: 15, rural: 25 },    // United States
  'DEFAULT': { urban: 10, rural: 20 }
};

// Simple HSN rates lookup (can be moved to database later)
// Only activated when use_hsn_rates is true
const HSN_CUSTOMS_RATES: Record<string, Record<string, number>> = {
  // India specific HSN rates
  'IN': {
    '6109': 12,    // T-shirts (lower than default 20%)
    '8517': 18,    // Mobile phones
    '8471': 0,     // Laptops (exempted)
    '6204': 12,    // Women's dresses
    'DEFAULT': 20  // Fallback to country default
  },
  // Nepal specific HSN rates  
  'NP': {
    '6109': 10,    // T-shirts
    '8517': 15,    // Mobile phones
    '8471': 5,     // Laptops (lower rate)
    '6204': 10,    // Women's dresses
    'DEFAULT': 15  // Fallback to country default
  }
};

class SimplifiedQuoteCalculator {
  // Safe method to get customs rate - HSN only if explicitly enabled
  private getCustomsRateForItem(item: any, destinationCountry: string, defaultRate: number): number {
    // Only use HSN if explicitly enabled for this item
    if (item.use_hsn_rates && item.hsn_code) {
      const countryHsnRates = HSN_CUSTOMS_RATES[destinationCountry];
      if (countryHsnRates) {
        const hsnRate = countryHsnRates[item.hsn_code];
        if (hsnRate !== undefined) {
          console.log(`[HSN] Using HSN rate for ${item.hsn_code}: ${hsnRate}% (instead of default ${defaultRate}%)`);
          return hsnRate;
        }
      }
    }
    // Fallback to default country rate
    return defaultRate;
  }

  async calculate(input: CalculationInput): Promise<CalculationResult> {
    console.log('[CALCULATOR V2] Starting calculation', input);

    // Step 1: Calculate items total with item-level discounts
    let itemsTotal = 0;
    let totalItemDiscounts = 0;
    
    input.items.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price_usd;
      const itemDiscount = item.discount_percentage 
        ? itemSubtotal * (item.discount_percentage / 100)
        : 0;
      itemsTotal += itemSubtotal;
      totalItemDiscounts += itemDiscount;
    });
    
    const discountedItemsSubtotal = itemsTotal - totalItemDiscounts;
    
    const totalWeight = input.items.reduce((sum, item) => 
      sum + (item.quantity * (item.weight_kg || 0.5)), 0 // Default 0.5kg if not specified
    );

    // Step 2: Get configurations
    const countryConfig = COUNTRY_TAX_CONFIG[input.destination_country as keyof typeof COUNTRY_TAX_CONFIG] 
      || COUNTRY_TAX_CONFIG.DEFAULT;
    
    const customerCurrency = await this.getCustomerCurrency(input.destination_country);
    const exchangeRate = await currencyService.getExchangeRate('USD', customerCurrency);

    // Step 3: Apply order-level discount
    let orderDiscountAmount = 0;
    if (input.order_discount) {
      if (input.order_discount.type === 'percentage') {
        orderDiscountAmount = discountedItemsSubtotal * (input.order_discount.value / 100);
      } else {
        orderDiscountAmount = Math.min(input.order_discount.value, discountedItemsSubtotal);
      }
    }
    
    const finalItemsSubtotal = discountedItemsSubtotal - orderDiscountAmount;

    // Step 4: Calculate origin sales tax (on discounted amount)
    let originSalesTax = 0;
    let originSalesTaxRate = 0;
    if (input.origin_country === 'US' && input.origin_state) {
      originSalesTaxRate = US_STATE_TAX_RATES[input.origin_state] || US_STATE_TAX_RATES.DEFAULT;
      originSalesTax = finalItemsSubtotal * (originSalesTaxRate / 100);
    }

    // Step 5: Calculate shipping with discount
    const shippingMethod = input.shipping_method || 'standard';
    const shippingRatePerKg = SHIPPING_RATES[shippingMethod];
    const baseShippingCost = Math.max(totalWeight * shippingRatePerKg, 25); // Minimum $25
    
    let shippingDiscountAmount = 0;
    let finalShippingCost = baseShippingCost;
    
    if (input.shipping_discount) {
      if (input.shipping_discount.type === 'free') {
        shippingDiscountAmount = baseShippingCost;
        finalShippingCost = 0;
      } else if (input.shipping_discount.type === 'percentage') {
        shippingDiscountAmount = baseShippingCost * ((input.shipping_discount.value || 0) / 100);
        finalShippingCost = baseShippingCost - shippingDiscountAmount;
      } else {
        shippingDiscountAmount = Math.min(input.shipping_discount.value || 0, baseShippingCost);
        finalShippingCost = baseShippingCost - shippingDiscountAmount;
      }
    }

    // Step 6: Calculate insurance (on discounted value)
    const insurancePercentage = input.insurance_required !== false ? 1 : 0;
    const insuranceAmount = insurancePercentage > 0 
      ? Math.max((finalItemsSubtotal + originSalesTax) * (insurancePercentage / 100), 5)
      : 0;

    // Step 7: Calculate CIF (Cost + Insurance + Freight) - using discounted values
    const cifValue = finalItemsSubtotal + originSalesTax + insuranceAmount + finalShippingCost;

    // Step 8: Calculate customs duty on CIF
    // Check if any items use HSN rates
    const itemsWithHSN = input.items.filter(item => item.use_hsn_rates && item.hsn_code);
    let effectiveCustomsRate = countryConfig.customs;
    
    // If HSN is used, calculate weighted average customs rate (safe approach)
    if (itemsWithHSN.length > 0) {
      let totalValue = 0;
      let weightedRateSum = 0;
      
      input.items.forEach(item => {
        const itemValue = item.quantity * item.unit_price_usd;
        const itemRate = this.getCustomsRateForItem(item, input.destination_country, countryConfig.customs);
        totalValue += itemValue;
        weightedRateSum += itemValue * itemRate;
      });
      
      effectiveCustomsRate = totalValue > 0 ? weightedRateSum / totalValue : countryConfig.customs;
      console.log(`[HSN] Using weighted average customs rate: ${effectiveCustomsRate.toFixed(2)}%`);
    }
    
    const customsDuty = cifValue * (effectiveCustomsRate / 100);

    // Step 9: Apply component-based discounts if enabled
    let componentDiscounts: { [key: string]: any } = {};
    let discountedCustomsDuty = customsDuty;
    let customsDiscountAmount = 0;
    let discountedHandlingFee = 0;
    let handlingDiscountAmount = 0;
    let discountedDelivery = 0;
    let deliveryDiscountAmount = 0;
    let discountedTaxAmount = 0;
    let taxDiscountAmount = 0;
    
    // Fetch all component discounts once
    let discountsByComponent = new Map<string, any[]>();
    if (input.apply_component_discounts && input.customer_id) {
      try {
        discountsByComponent = await DiscountService.getComponentDiscounts(
          input.customer_id,
          finalItemsSubtotal,
          input.destination_country,
          input.is_first_order || false,
          input.items.length,
          input.discount_codes || []
        );
        
        // Apply customs discounts
        if (discountsByComponent.has('customs')) {
          const customsDiscountResult = DiscountService.calculateComponentDiscount(
            customsDuty,
            discountsByComponent.get('customs')!,
            'customs'
          );
          discountedCustomsDuty = customsDiscountResult.finalValue;
          customsDiscountAmount = customsDiscountResult.totalDiscount;
          componentDiscounts.customs = {
            original: customsDuty,
            discount: customsDiscountAmount,
            final: discountedCustomsDuty,
            applied_discounts: customsDiscountResult.appliedDiscounts.map(d => ({
              source: d.discount_source,
              description: d.description || '',
              amount: d.discount_amount
            }))
          };
        }
      } catch (error) {
        console.error('Error fetching component discounts:', error);
      }
    }

    // Step 10: Calculate handling fee (on discounted items value)
    const handlingFeeType = input.handling_fee_type || 'both';
    let handlingFee = 0;
    let handlingFeeFixed = 0;
    let handlingFeePercentage = 0;
    
    if (handlingFeeType === 'fixed' || handlingFeeType === 'both') {
      handlingFeeFixed = HANDLING_FEES.fixed;
      handlingFee += handlingFeeFixed;
    }
    if (handlingFeeType === 'percentage' || handlingFeeType === 'both') {
      handlingFeePercentage = HANDLING_FEES.percentage;
      handlingFee += finalItemsSubtotal * (handlingFeePercentage / 100);
    }

    // Apply handling fee discounts if available
    discountedHandlingFee = handlingFee;
    if (discountsByComponent.has('handling')) {
      const handlingDiscountResult = DiscountService.calculateComponentDiscount(
        handlingFee,
        discountsByComponent.get('handling')!,
        'handling'
      );
      discountedHandlingFee = handlingDiscountResult.finalValue;
      handlingDiscountAmount = handlingDiscountResult.totalDiscount;
      componentDiscounts.handling = {
        original: handlingFee,
        discount: handlingDiscountAmount,
        final: discountedHandlingFee,
        applied_discounts: handlingDiscountResult.appliedDiscounts.map(d => ({
          source: d.discount_source,
          description: d.description || '',
          amount: d.discount_amount
        }))
      };
    }

    // Step 11: Calculate domestic delivery
    const deliveryRates = DOMESTIC_DELIVERY_RATES[input.destination_country] || DOMESTIC_DELIVERY_RATES.DEFAULT;
    const domesticDelivery = input.destination_state === 'rural' ? deliveryRates.rural : deliveryRates.urban;

    // Apply delivery discounts if available
    discountedDelivery = domesticDelivery;
    if (discountsByComponent.has('delivery')) {
      const deliveryDiscountResult = DiscountService.calculateComponentDiscount(
        domesticDelivery,
        discountsByComponent.get('delivery')!,
        'delivery'
      );
      discountedDelivery = deliveryDiscountResult.finalValue;
      deliveryDiscountAmount = deliveryDiscountResult.totalDiscount;
      componentDiscounts.delivery = {
        original: domesticDelivery,
        discount: deliveryDiscountAmount,
        final: discountedDelivery,
        applied_discounts: deliveryDiscountResult.appliedDiscounts.map(d => ({
          source: d.discount_source,
          description: d.description || '',
          amount: d.discount_amount
        }))
      };
    }

    // Step 12: Calculate taxable value (all costs before local tax)
    const taxableValue = cifValue + discountedCustomsDuty + discountedHandlingFee + discountedDelivery;

    // Step 11: Calculate local tax (GST/VAT) on taxable value
    let localTaxRate = countryConfig.local_tax;
    
    // For US, use state-specific rate if destination state provided
    if (input.destination_country === 'US' && input.destination_state) {
      localTaxRate = US_STATE_TAX_RATES[input.destination_state] || US_STATE_TAX_RATES.DEFAULT;
    }
    
    const localTaxAmount = taxableValue * (localTaxRate / 100);
    
    // Apply tax discounts if available (rare but possible for "we pay the VAT" campaigns)
    discountedTaxAmount = localTaxAmount;
    if (discountsByComponent.has('taxes')) {
      const taxDiscountResult = DiscountService.calculateComponentDiscount(
        localTaxAmount,
        discountsByComponent.get('taxes')!,
        'taxes'
      );
      discountedTaxAmount = taxDiscountResult.finalValue;
      taxDiscountAmount = taxDiscountResult.totalDiscount;
      componentDiscounts.taxes = {
        original: localTaxAmount,
        discount: taxDiscountAmount,
        final: discountedTaxAmount,
        applied_discounts: taxDiscountResult.appliedDiscounts.map(d => ({
          source: d.discount_source,
          description: d.description || '',
          amount: d.discount_amount
        }))
      };
    }

    // Step 12: Calculate subtotal before payment gateway fee
    const subtotalBeforeGateway = taxableValue + discountedTaxAmount;

    // Step 13: Calculate payment gateway fee
    const gateway = input.payment_gateway || 'stripe';
    const gatewayFees = PAYMENT_GATEWAY_FEES[gateway as keyof typeof PAYMENT_GATEWAY_FEES] || PAYMENT_GATEWAY_FEES.stripe;
    const paymentGatewayFee = (subtotalBeforeGateway * (gatewayFees.percentage / 100)) + gatewayFees.fixed;

    // Step 14: Calculate final totals
    const totalUSD = subtotalBeforeGateway + paymentGatewayFee;
    const totalCustomerCurrency = totalUSD * exchangeRate;
    
    // Calculate total savings (including all component discounts)
    const totalSavings = totalItemDiscounts + orderDiscountAmount + shippingDiscountAmount + 
                        customsDiscountAmount + handlingDiscountAmount + deliveryDiscountAmount + taxDiscountAmount;

    // Return structured result
    return {
      inputs: {
        items_cost: itemsTotal,
        total_weight_kg: totalWeight,
        origin_country: input.origin_country,
        origin_state: input.origin_state,
        destination_country: input.destination_country,
        destination_state: input.destination_state,
        shipping_method: shippingMethod,
        payment_gateway: gateway
      },
      applied_rates: {
        exchange_rate: exchangeRate,
        origin_sales_tax_percentage: originSalesTaxRate,
        customs_percentage: effectiveCustomsRate, // Now shows HSN-adjusted rate if used
        local_tax_percentage: localTaxRate,
        insurance_percentage: insurancePercentage,
        shipping_rate_per_kg: shippingRatePerKg,
        handling_fee_fixed: handlingFeeFixed,
        handling_fee_percentage: handlingFeePercentage,
        payment_gateway_fee_percentage: gatewayFees.percentage,
        payment_gateway_fee_fixed: gatewayFees.fixed,
        // Additional HSN info
        hsn_applied: itemsWithHSN.length > 0,
        hsn_items_count: itemsWithHSN.length
      },
      calculation_steps: {
        items_subtotal: this.round(itemsTotal),
        item_discounts: this.round(totalItemDiscounts),
        discounted_items_subtotal: this.round(discountedItemsSubtotal),
        order_discount_amount: this.round(orderDiscountAmount),
        origin_sales_tax: this.round(originSalesTax),
        shipping_cost: this.round(baseShippingCost),
        shipping_discount_amount: this.round(shippingDiscountAmount),
        discounted_shipping_cost: this.round(finalShippingCost),
        insurance_amount: this.round(insuranceAmount),
        cif_value: this.round(cifValue),
        customs_duty: this.round(customsDuty),
        customs_discount_amount: this.round(customsDiscountAmount),
        discounted_customs_duty: this.round(discountedCustomsDuty),
        handling_fee: this.round(handlingFee),
        handling_discount_amount: this.round(handlingDiscountAmount),
        discounted_handling_fee: this.round(discountedHandlingFee),
        domestic_delivery: this.round(domesticDelivery),
        delivery_discount_amount: this.round(deliveryDiscountAmount),
        discounted_delivery: this.round(discountedDelivery),
        taxable_value: this.round(taxableValue),
        local_tax_amount: this.round(localTaxAmount),
        tax_discount_amount: this.round(taxDiscountAmount),
        discounted_tax_amount: this.round(discountedTaxAmount),
        subtotal_before_gateway: this.round(subtotalBeforeGateway),
        payment_gateway_fee: this.round(paymentGatewayFee),
        total_usd: this.round(totalUSD),
        total_customer_currency: this.round(totalCustomerCurrency),
        total_savings: this.round(totalSavings),
        component_discounts: Object.keys(componentDiscounts).length > 0 ? componentDiscounts : undefined
      },
      calculation_timestamp: new Date().toISOString(),
      calculation_version: 'v2'
    };
  }

  private async getCustomerCurrency(countryCode: string): Promise<string> {
    // Map country to currency
    const countryCurrencyMap: Record<string, string> = {
      IN: 'INR',
      NP: 'NPR',
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      AU: 'AUD',
      // Add more as needed
    };

    return countryCurrencyMap[countryCode] || 'USD';
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // Get tax info for display
  getTaxInfo(countryCode: string) {
    const config = COUNTRY_TAX_CONFIG[countryCode as keyof typeof COUNTRY_TAX_CONFIG] 
      || COUNTRY_TAX_CONFIG.DEFAULT;
    
    return {
      country: config.name,
      customs: config.customs,
      local_tax: config.local_tax,
      local_tax_name: config.local_tax_name
    };
  }

  // Get available shipping methods
  getShippingMethods() {
    return [
      { value: 'economy', label: 'Economy (15-20 days)', rate: SHIPPING_RATES.economy },
      { value: 'standard', label: 'Standard (7-10 days)', rate: SHIPPING_RATES.standard },
      { value: 'express', label: 'Express (3-5 days)', rate: SHIPPING_RATES.express }
    ];
  }

  // Get US states for sales tax
  getUSStates() {
    return Object.entries(US_STATE_TAX_RATES)
      .filter(([code]) => code !== 'DEFAULT')
      .map(([code, rate]) => ({ code, rate }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // Get payment gateways
  getPaymentGateways() {
    return Object.entries(PAYMENT_GATEWAY_FEES).map(([gateway, fees]) => ({
      value: gateway,
      label: gateway.charAt(0).toUpperCase() + gateway.slice(1),
      fees
    }));
  }

  // Get handling fee options
  getHandlingFeeOptions() {
    return [
      { value: 'fixed', label: `Fixed ($${HANDLING_FEES.fixed})` },
      { value: 'percentage', label: `Percentage (${HANDLING_FEES.percentage}%)` },
      { value: 'both', label: `Both ($${HANDLING_FEES.fixed} + ${HANDLING_FEES.percentage}%)` }
    ];
  }

  // Get delivery location types
  getDeliveryTypes() {
    return [
      { value: 'urban', label: 'Urban/City' },
      { value: 'rural', label: 'Rural/Remote' }
    ];
  }

  // Get HSN information (safe lookup - display only)
  getHSNInfo(hsnCode: string, country: string) {
    const countryRates = HSN_CUSTOMS_RATES[country];
    if (!countryRates) return null;
    
    const rate = countryRates[hsnCode];
    if (rate === undefined) return null;
    
    // Simple HSN descriptions (can be expanded)
    const hsnDescriptions: Record<string, string> = {
      '6109': 'T-shirts, singlets and other vests',
      '8517': 'Mobile phones and communication devices',
      '8471': 'Laptops and computing devices',
      '6204': 'Women\'s dresses and clothing'
    };
    
    return {
      code: hsnCode,
      description: hsnDescriptions[hsnCode] || 'Product',
      customsRate: rate,
      countryRate: COUNTRY_TAX_CONFIG[country as keyof typeof COUNTRY_TAX_CONFIG]?.customs || 10
    };
  }
}

export const simplifiedQuoteCalculator = new SimplifiedQuoteCalculator();