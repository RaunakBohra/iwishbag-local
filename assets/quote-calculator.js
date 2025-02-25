const defaultSettings = {
    exchangeRateNPR: 0, salesTax: 0, minShipping: 0, additionalShipping: 0, additionalWeight: 0, currency: '', baseCurrency: '', weightUnit: 'lbs', volumetricDivisor: 166, paymentGatewayFixedFee: 0, paymentGatewayPercentFee: 0
};

function calculateVolumetricWeight(length, width, height, divisor, unit) {
    const volume = length * width * height;
    let volumetricWeight = volume / divisor; // In kg or lbs based on divisor
    if (unit === 'lbs' && divisor !== 166) {
        volumetricWeight *= 2.20462; // Convert kg to lbs if divisor is for kg
    }
    return volumetricWeight;
}

function calculateStandardInternationalShipping(itemWeight, price1, settings) {
    let shippingWeight = itemWeight;
    if (settings.weightUnit === 'kg') {
        shippingWeight *= 2.20462;
    }
    const price2 = parseFloat(price1) || 0;
    const { minShipping, additionalShipping, additionalWeight } = settings;
    let shippingCost = minShipping || 0;
    if (shippingWeight > 1) {
        shippingCost += (shippingWeight - 1) * (additionalWeight || 0);
    }
    shippingCost += (price2 * (additionalShipping || 0)) / 100;
    return shippingCost;
}

function calculateCustomsAndECS(itemPrice, salesTaxPrice, merchantShippingPrice, interNationalShipping, customsPercent) {
    return ((itemPrice + (salesTaxPrice || 0) + (merchantShippingPrice || 0) + interNationalShipping) * (customsPercent / 100));
}

function calculateShippingQuotes(itemWeight, itemPrice, salesTaxPrice, merchantShippingPrice, customsPercent, domesticShipping, handlingCharge, discount, insuranceAmount, settings) {
    console.log('Calculating shipping quotes with:', { itemWeight, itemPrice, salesTaxPrice, settings });
    const interNationalShipping = calculateStandardInternationalShipping(itemWeight, itemPrice, settings);
    const salesTaxAmount = itemPrice && salesTaxPrice !== undefined && salesTaxPrice !== '' ? parseFloat(salesTaxPrice) || 0 : 0;
    const customsAndECS = calculateCustomsAndECS(itemPrice, salesTaxAmount, merchantShippingPrice || 0, interNationalShipping, customsPercent || 0);
    
    let subTotalBeforeFees = (itemPrice || 0) + salesTaxAmount + (merchantShippingPrice || 0) + interNationalShipping + (customsAndECS || 0) + (domesticShipping || 0) + (handlingCharge || 0) + (insuranceAmount || 0) - (discount || 0);
    
    const paymentGatewayFixedFee = settings.paymentGatewayFixedFee || 0;
    const paymentGatewayPercentFee = settings.paymentGatewayPercentFee || 0;
    const paymentGatewayFee = paymentGatewayFixedFee + (subTotalBeforeFees * (paymentGatewayPercentFee / 100));
    
    let subTotal = subTotalBeforeFees + paymentGatewayFee;
    let vat = Math.round(subTotal * 0.13 * 100) / 100;
    let finalTotal = Math.round((subTotal + vat) * 100) / 100;

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
        paymentGatewayFee
    };
}

function convertToUserCurrency(quote, sourceSettings, userBaseCurrency = 'NPR') {
    console.log('Converting to user currency with:', { quote, sourceSettings, userBaseCurrency });
    if (!sourceSettings.currency) {
        return quote;
    }
    const sourceToNPR = sourceSettings.exchangeRateNPR || 1;
    if (sourceToNPR <= 0) {
        console.error('Invalid exchange rate (non-positive):', sourceToNPR);
        return quote;
    }

    return {
        finalTotal: quote.finalTotal * sourceToNPR,
        subTotal: quote.subTotal * sourceToNPR,
        vat: quote.vat * sourceToNPR,
        interNationalShipping: quote.interNationalShipping * sourceToNPR,
        customsAndECS: quote.customsAndECS * sourceToNPR,
        itemPrice: quote.itemPrice * sourceToNPR,
        salesTaxPrice: quote.salesTaxPrice * sourceToNPR,
        merchantShippingPrice: quote.merchantShippingPrice * sourceToNPR,
        domesticShipping: quote.domesticShipping * sourceToNPR,
        handlingCharge: quote.handlingCharge * sourceToNPR,
        discount: quote.discount * sourceToNPR,
        insuranceAmount: quote.insuranceAmount * sourceToNPR,
        paymentGatewayFee: quote.paymentGatewayFee * sourceToNPR
    };
}