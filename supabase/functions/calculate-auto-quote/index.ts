import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateUnifiedQuote } from './shipping-calculator.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req)
    });
  }
  try {
    const { scrapedData, purchaseCountry, userId } = await req.json();
    if (!scrapedData || !purchaseCountry) {
      throw new Error('Scraped data and purchase country are required');
    }
    console.log(`🔵 Calculating auto quote for: ${scrapedData.title} from ${purchaseCountry}`);
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Apply rules engine
    const quoteCalculation = await calculateAutoQuote(scrapedData, purchaseCountry, supabase, userId);
    // Create quote in database
    const quote = await createAutoQuote(quoteCalculation, userId, purchaseCountry, supabase);
    console.log(`✅ Auto quote calculated: $${quote.final_total}`);
    return new Response(JSON.stringify(quote), {
      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Auto quote calculation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      quote: null
    }), {
      status: 400,
      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json'
      }
    });
  }
});
async function calculateAutoQuote(scrapedData, purchaseCountry, supabase, userId) {
  console.log('🔵 Starting auto quote calculation...');
  // Get purchase country settings (for currency and local costs)
  const { data: purchaseCountrySettings, error: purchaseCountryError } = await supabase.from('country_settings').select('*').eq('code', purchaseCountry).single();
  if (purchaseCountryError || !purchaseCountrySettings) {
    throw new Error(`Country settings not found for purchase country: ${purchaseCountry}`);
  }
  // Get user's shipping country (for shipping and customs)
  let userShippingCountry = purchaseCountry // Default to purchase country
  ;
  if (userId) {
    const { data: userProfile } = await supabase.from('profiles').select('country').eq('id', userId).single();
    if (userProfile?.country) {
      userShippingCountry = userProfile.country;
    }
  }
  // Get shipping country settings (for shipping and customs)
  const { data: shippingCountrySettings, error: shippingCountryError } = await supabase.from('country_settings').select('*').eq('code', userShippingCountry).single();
  if (shippingCountryError || !shippingCountrySettings) {
    throw new Error(`Country settings not found for shipping country: ${userShippingCountry}`);
  }
  // Handle currency conversion
  const scrapedCurrency = scrapedData.currency || 'USD';
  const scrapedPrice = scrapedData.price || 0;
  let priceInUSD = scrapedPrice;
  // Convert to USD if needed
  if (scrapedCurrency !== 'USD') {
    // Get exchange rate for the scraped currency to USD
    const { data: currencySettings } = await supabase.from('country_settings').select('rate_from_usd').eq('currency', scrapedCurrency).single();
    if (currencySettings?.rate_from_usd) {
      // Convert from scraped currency to USD
      priceInUSD = scrapedPrice / currencySettings.rate_from_usd;
      console.log(`🔵 Converted ${scrapedPrice} ${scrapedCurrency} to ${priceInUSD} USD`);
    } else {
      console.log(`⚠️ No exchange rate found for ${scrapedCurrency}, using scraped price as USD`);
    }
  }
  // Create updated scraped data with USD price
  const updatedScrapedData = {
    ...scrapedData,
    price: priceInUSD,
    originalPrice: scrapedPrice,
    originalCurrency: scrapedCurrency
  };
  // Apply weight rules
  const weightResult = await applyWeightRules(updatedScrapedData, supabase);
  console.log(`🔵 Weight calculated: ${weightResult.weight}kg (confidence: ${weightResult.confidence})`);
  // Apply customs rules (based on shipping country)
  const customsResult = await applyCustomsRules(updatedScrapedData, weightResult.weight, userShippingCountry, supabase);
  console.log(`🔵 Customs category: ${customsResult.category} (${customsResult.dutyPercentage}%)`);
  // Apply pricing rules (based on purchase country)
  const pricingResult = await applyPricingRules(updatedScrapedData, weightResult.weight, purchaseCountry, supabase);
  console.log(`🔵 Pricing applied: ${pricingResult.markupType} (${pricingResult.markupValue})`);
  // Calculate final quote using existing calculator
  const finalCalculation = await calculateFinalQuote(updatedScrapedData, weightResult, customsResult, pricingResult, purchaseCountrySettings, shippingCountrySettings, supabase);
  return {
    ...finalCalculation,
    appliedRules: {
      weight: weightResult.ruleApplied,
      customs: customsResult.ruleApplied,
      pricing: pricingResult.ruleApplied
    },
    scrapedData: {
      originalPrice: scrapedPrice,
      originalCurrency: scrapedCurrency,
      originalWeight: scrapedData.weight,
      title: scrapedData.title,
      images: scrapedData.images,
      category: scrapedData.category,
      url: scrapedData.url
    },
    purchaseCountry,
    userShippingCountry
  };
}
async function applyWeightRules(scrapedData, supabase) {
  // Get weight rules from database
  const { data: weightRules, error } = await supabase.from('weight_rules').select('*').eq('is_active', true).order('priority', {
    ascending: false
  });
  if (error) {
    console.error('Error fetching weight rules:', error);
    return {
      weight: 0.5,
      confidence: 0.5,
      ruleApplied: 'default'
    };
  }
  // Find applicable rule
  for (const rule of weightRules){
    if (matchesConditions(scrapedData, rule.conditions)) {
      const weight = executeWeightRule(rule, scrapedData);
      return {
        weight,
        confidence: rule.actions.confidence || 0.7,
        ruleApplied: rule.name
      };
    }
  }
  // Default fallback
  return {
    weight: 0.5,
    confidence: 0.5,
    ruleApplied: 'default'
  };
}
async function applyCustomsRules(scrapedData, weight, destination, supabase) {
  // Get customs rules from database
  const { data: customsRules, error } = await supabase.from('customs_rules').select('*').eq('is_active', true).order('priority', {
    ascending: false
  });
  if (error) {
    console.error('Error fetching customs rules:', error);
    return {
      category: 'general',
      dutyPercentage: 0,
      ruleApplied: 'default'
    };
  }
  // Find applicable rule
  for (const rule of customsRules){
    if (matchesConditions({
      ...scrapedData,
      weight,
      destination
    }, rule.conditions)) {
      return {
        category: rule.actions.customsCategory,
        dutyPercentage: rule.actions.dutyPercentage || 0,
        requiresDocumentation: rule.actions.requiresDocumentation || false,
        ruleApplied: rule.name
      };
    }
  }
  // Default fallback
  return {
    category: 'general',
    dutyPercentage: 0,
    ruleApplied: 'default'
  };
}
async function applyPricingRules(scrapedData, weight, destination, supabase) {
  // Get pricing rules from database
  const { data: pricingRules, error } = await supabase.from('pricing_rules').select('*').eq('is_active', true).order('priority', {
    ascending: false
  });
  if (error) {
    console.error('Error fetching pricing rules:', error);
    return {
      markupType: 'percentage',
      markupValue: 5.0,
      ruleApplied: 'default'
    };
  }
  // Find applicable rule
  for (const rule of pricingRules){
    if (matchesConditions({
      ...scrapedData,
      weight,
      destination
    }, rule.conditions)) {
      return {
        markupType: rule.actions.markupType,
        markupValue: rule.actions.markupValue,
        minimumMarkup: rule.actions.minimumMarkup,
        maximumMarkup: rule.actions.maximumMarkup,
        ruleApplied: rule.name
      };
    }
  }
  // Default fallback
  return {
    markupType: 'percentage',
    markupValue: 5.0,
    ruleApplied: 'default'
  };
}
function matchesConditions(data, conditions) {
  // Check weight range
  if (conditions.weightRange) {
    const weight = data.weight || 0;
    if (weight < conditions.weightRange.min || weight > conditions.weightRange.max) {
      return false;
    }
  }
  // Check price range
  if (conditions.priceRange) {
    const price = data.price || 0;
    if (price < conditions.priceRange.min || price > conditions.priceRange.max) {
      return false;
    }
  }
  // Check categories
  if (conditions.categories && conditions.categories.length > 0) {
    const category = data.category || '';
    if (!conditions.categories.some((cat)=>category.toLowerCase().includes(cat.toLowerCase()))) {
      return false;
    }
  }
  // Check countries
  if (conditions.countries && conditions.countries.length > 0) {
    const country = data.destination || '';
    if (!conditions.countries.includes(country)) {
      return false;
    }
  }
  // Check keywords
  if (conditions.keywords && conditions.keywords.length > 0) {
    const title = data.title || '';
    const titleLower = title.toLowerCase();
    if (!conditions.keywords.some((keyword)=>titleLower.includes(keyword.toLowerCase()))) {
      return false;
    }
  }
  return true;
}
function executeWeightRule(rule, scrapedData) {
  const actions = rule.actions;
  // Handle both old and new weight rule formats
  // Old format: weightType, weightValue, weightCalculation
  // New format: estimationMethod, defaultWeight, weightMultiplier
  // Check for old format first
  if (actions.weightType === 'fixed') {
    return actions.weightValue || 0.5;
  } else if (actions.weightType === 'calculated') {
    const baseWeight = actions.weightCalculation?.baseWeight || 0;
    const priceMultiplier = actions.weightCalculation?.priceMultiplier || 0;
    return baseWeight + scrapedData.price * priceMultiplier / 100;
  }
  // Check for new format
  if (actions.estimationMethod === 'fixed') {
    return actions.defaultWeight || 0.5;
  } else if (actions.estimationMethod === 'calculated') {
    const baseWeight = actions.defaultWeight || 0;
    const priceMultiplier = actions.weightMultiplier || 0;
    return baseWeight + scrapedData.price * priceMultiplier / 100;
  } else if (actions.estimationMethod === 'category') {
    // Use category-based weight estimation
    const categoryWeights = {
      'electronics': 1.0,
      'clothing': 0.3,
      'books': 0.5,
      'cosmetics': 0.2,
      'food': 0.8,
      'jewelry': 0.1,
      'furniture': 15.0,
      'general': 0.5
    };
    return categoryWeights[actions.category] || actions.defaultWeight || 0.5;
  }
  // Default fallback
  return actions.defaultWeight || actions.weightValue || 0.5;
}
async function calculateFinalQuote(scrapedData, weightResult, customsResult, pricingResult, purchasingCountrySettings, destinationCountrySettings, supabase) {
  // Apply pricing markup
  let basePrice = scrapedData.price;
  if (pricingResult.markupType === 'percentage') {
    const markup = basePrice * pricingResult.markupValue / 100;
    const finalMarkup = Math.max(pricingResult.minimumMarkup || 0, Math.min(markup, pricingResult.maximumMarkup || Infinity));
    basePrice += finalMarkup;
  }
  // Convert to USD if needed (assuming scraped price is in USD)
  const itemPriceUSD = basePrice;
  // Use unified shipping calculator instead of old calculation
  const unifiedInput = {
    itemPrice: itemPriceUSD,
    itemWeight: weightResult.weight,
    destinationCountry: destinationCountrySettings.code,
    originCountry: purchasingCountrySettings.code,
    salesTax: 0,
    merchantShipping: 0,
    domesticShipping: 5.00,
    handlingCharge: 10.00,
    insuranceAmount: itemPriceUSD > 100 ? 15.00 : 0,
    discount: 0,
    customsCategory: customsResult.category || 'general'
  };
  // Calculate using unified calculator
  const unifiedResult = await calculateUnifiedQuote(unifiedInput, supabase);
  return {
    item_price: itemPriceUSD,
    item_weight: weightResult.weight,
    final_total: unifiedResult.totalCost,
    sub_total: unifiedResult.breakdown.itemPrice + unifiedResult.breakdown.internationalShipping + unifiedResult.breakdown.customsDuty + unifiedResult.breakdown.domesticShipping + unifiedResult.breakdown.handlingCharge + unifiedResult.breakdown.insuranceAmount,
    vat: unifiedResult.breakdown.vat,
    international_shipping: unifiedResult.breakdown.internationalShipping,
    customs_and_ecs: unifiedResult.breakdown.customsDuty,
    payment_gateway_fee: 0,
    final_currency: destinationCountrySettings.currency,
    final_total_local: unifiedResult.totalCost * (destinationCountrySettings.rate_from_usd || 1),
    confidence_score: weightResult.confidence,
    status: 'calculated',
    // New fields for shipping routes
    origin_country: unifiedResult.settings.originCountry,
    shipping_method: unifiedResult.settings.usedSettings,
    shipping_route_id: unifiedResult.settings.usedRoute?.id || null,
    // Additional info for debugging
    shipping_carrier: unifiedResult.shippingCost.carrier,
    shipping_delivery_days: unifiedResult.shippingCost.deliveryDays,
    breakdown: unifiedResult.breakdown
  };
}
async function createAutoQuote(quoteCalculation, userId, purchaseCountry, supabase) {
  // Get user email if userId is provided
  let userEmail = 'auto-quote@system.com' // Default fallback
  ;
  if (userId) {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('email').eq('id', userId).single();
    if (!profileError && profile?.email) {
      userEmail = profile.email;
    }
  }
  const quoteData = {
    user_id: userId,
    email: userEmail,
    quote_type: 'auto',
    product_name: quoteCalculation.scrapedData.title,
    product_url: quoteCalculation.scrapedData.url,
    item_price: quoteCalculation.item_price,
    item_weight: quoteCalculation.item_weight,
    final_total: quoteCalculation.final_total,
    sub_total: quoteCalculation.sub_total,
    vat: quoteCalculation.vat,
    international_shipping: quoteCalculation.international_shipping,
    customs_and_ecs: quoteCalculation.customs_and_ecs,
    payment_gateway_fee: quoteCalculation.payment_gateway_fee,
    final_currency: quoteCalculation.final_currency,
    final_total_local: quoteCalculation.final_total_local,
    confidence_score: quoteCalculation.confidence_score,
    applied_rules: quoteCalculation.appliedRules,
    scraped_data: quoteCalculation.scrapedData,
    status: quoteCalculation.status,
    approval_status: 'pending',
    priority: 'normal',
    country_code: purchaseCountry,
    items_currency: quoteCalculation.scrapedData.originalCurrency || 'USD',
    // New shipping route fields
    origin_country: quoteCalculation.origin_country,
    shipping_method: quoteCalculation.shipping_method,
    shipping_route_id: quoteCalculation.shipping_route_id,
    // Additional shipping info
    shipping_carrier: quoteCalculation.shipping_carrier,
    shipping_delivery_days: quoteCalculation.shipping_delivery_days,
    // Save the full breakdown as JSON
    breakdown: quoteCalculation.breakdown
  };
  const { data: quote, error } = await supabase.from('quotes').insert(quoteData).select().single();
  if (error) {
    throw new Error(`Failed to create quote: ${error.message}`);
  }
  return quote;
}
