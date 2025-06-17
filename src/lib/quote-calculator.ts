
export interface CountrySettings {
  rate_from_usd: number;
  sales_tax: number;
  vat: number;
  min_shipping: number;
  additional_shipping: number; // percentage
  additional_weight: number; // cost per unit of weight
  currency: string;
  weight_unit: "lbs" | "kg";
  volumetric_divisor: number;
  payment_gateway_fixed_fee: number;
  payment_gateway_percent_fee: number;
}

export interface CustomsCategory {
  duty_percent: number;
  name: string;
}

export interface Quote {
  finalTotal: number;
  subTotal: number;
  vat: number;
  interNationalShipping: number;
  customsAndECS: number;
  itemPrice: number;
  salesTaxPrice: number;
  merchantShippingPrice: number;
  domesticShipping: number;
  handlingCharge: number;
  discount: number;
  insuranceAmount: number;
  paymentGatewayFee: number;
}

export interface CalculateQuoteParams {
  itemPrice: number;
  itemWeight: number;
  quantity: number;
  countrySettings: CountrySettings;
  customsCategory: CustomsCategory;
  merchantShippingPrice: number;
}

export function calculateStandardInternationalShipping(itemWeight: number, itemPrice: number, settings: CountrySettings): number {
  let shippingWeight = itemWeight;
  if (settings.weight_unit === "kg") {
    shippingWeight *= 2.20462; // Standardize to lbs for internal calculation base
  }

  // Apply rounding logic: round up to nearest whole number, with a minimum of 1 for any positive weight.
  if (shippingWeight > 0 && shippingWeight <= 1) {
      shippingWeight = 1;
  } else if (shippingWeight > 1) {
      shippingWeight = Math.ceil(shippingWeight);
  }
  // If shippingWeight is 0 or negative, it remains as is, which means no shipping cost will be added from here.

  const { min_shipping, additional_shipping, additional_weight } = settings;
  let shippingCost = min_shipping || 0;
  if (shippingWeight > 1) { // Apply additional weight charge for units above the first
    shippingCost += (shippingWeight - 1) * (additional_weight || 0);
  }
  shippingCost += (itemPrice * (additional_shipping || 0)) / 100;
  return shippingCost;
}

export function calculateCustomsAndECS(itemPrice: number, salesTaxPrice: number, merchantShippingPrice: number, interNationalShipping: number, customsPercent: number): number {
  return ((itemPrice + (salesTaxPrice || 0) + (merchantShippingPrice || 0) + interNationalShipping) * (customsPercent / 100));
}

export function calculateQuote(params: CalculateQuoteParams): Quote {
  const { itemPrice, itemWeight, quantity, countrySettings, customsCategory, merchantShippingPrice } = params;
  
  const totalItemPrice = itemPrice * quantity;
  const totalWeight = itemWeight * quantity;
  
  const interNationalShipping = calculateStandardInternationalShipping(totalWeight, totalItemPrice, countrySettings);
  const salesTaxPrice = (totalItemPrice * countrySettings.sales_tax) / 100;
  const customsAndECS = calculateCustomsAndECS(totalItemPrice, salesTaxPrice, merchantShippingPrice, interNationalShipping, customsCategory.duty_percent);

  const handlingCharge = 10; // Default handling charge
  const domesticShipping = 5; // Default domestic shipping
  const insuranceAmount = 0;
  const discount = 0;

  const subTotalBeforeFees =
    totalItemPrice +
    salesTaxPrice +
    merchantShippingPrice +
    interNationalShipping +
    customsAndECS +
    domesticShipping +
    handlingCharge +
    insuranceAmount -
    discount;

  const { payment_gateway_fixed_fee, payment_gateway_percent_fee } = countrySettings;
  const paymentGatewayFee = (payment_gateway_fixed_fee || 0) + (subTotalBeforeFees * (payment_gateway_percent_fee || 0)) / 100;

  const subTotal = subTotalBeforeFees + paymentGatewayFee;
  const vat = Math.round(subTotal * (countrySettings.vat / 100) * 100) / 100;
  const finalTotal = Math.round((subTotal + vat) * 100) / 100;

  return {
    finalTotal,
    subTotal,
    vat,
    interNationalShipping,
    customsAndECS,
    itemPrice: totalItemPrice,
    salesTaxPrice,
    merchantShippingPrice,
    domesticShipping,
    handlingCharge,
    discount,
    insuranceAmount,
    paymentGatewayFee,
  };
}

export function calculateShippingQuotes(
  itemWeight: number,
  itemPrice: number,
  salesTaxPrice: number,
  merchantShippingPrice: number,
  customsPercent: number,
  domesticShipping: number,
  handlingCharge: number,
  discount: number,
  insuranceAmount: number,
  settings: CountrySettings
): Quote {
  const interNationalShipping = calculateStandardInternationalShipping(itemWeight, itemPrice, settings);
  const salesTaxAmount = salesTaxPrice || 0;
  const customsAndECS = calculateCustomsAndECS(itemPrice, salesTaxAmount, merchantShippingPrice || 0, interNationalShipping, customsPercent || 0);

  const subTotalBeforeFees =
    (itemPrice || 0) +
    salesTaxAmount +
    (merchantShippingPrice || 0) +
    interNationalShipping +
    (customsAndECS || 0) +
    (domesticShipping || 0) +
    (handlingCharge || 0) +
    (insuranceAmount || 0) -
    (discount || 0);

  const { payment_gateway_fixed_fee, payment_gateway_percent_fee } = settings;
  const paymentGatewayFee = (payment_gateway_fixed_fee || 0) + (subTotalBeforeFees * (payment_gateway_percent_fee || 0)) / 100;

  const subTotal = subTotalBeforeFees + paymentGatewayFee;
  const vat = Math.round(subTotal * (settings.vat / 100) * 100) / 100;
  const finalTotal = Math.round((subTotal + vat) * 100) / 100;

  return {
    finalTotal,
    subTotal,
    vat,
    interNationalShipping,
    customsAndECS,
    itemPrice: itemPrice || 0,
    salesTaxPrice: salesTaxAmount,
    merchantShippingPrice: merchantShippingPrice || 0,
    domesticShipping: domesticShipping || 0,
    handlingCharge: handlingCharge || 0,
    discount: discount || 0,
    insuranceAmount: insuranceAmount || 0,
    paymentGatewayFee,
  };
}
