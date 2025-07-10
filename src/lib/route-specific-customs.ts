import { supabase } from '@/integrations/supabase/client';

export interface ProductData {
  price: number;
  weight: number;
  category?: string;
  title?: string;
}

export interface CustomsResult {
  category: string;
  dutyPercentage: number;
  confidence: number;
  ruleApplied: string;
  route: string;
}

export interface CustomsRule {
  id: string;
  origin_country: string;
  destination_country: string;
  category: string;
  conditions: any;
  duty_percentage: number;
  priority: number;
  is_active: boolean;
  name?: string;
}

/**
 * Apply route-specific customs rules based on origin and destination countries
 */
export async function applyRouteSpecificCustomsRules(
  productData: ProductData,
  originCountry: string,
  destinationCountry: string
): Promise<CustomsResult> {
  try {
    console.log(`🔍 Checking customs rules for route: ${originCountry} → ${destinationCountry}`);
    console.log(`📦 Product: ${productData.weight}kg, $${productData.price}, category: ${productData.category || 'unknown'}`);

    // Get route-specific customs rules
    const { data: customsRules, error } = await supabase
      .from('customs_rules')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('❌ Error fetching customs rules:', error);
      throw error;
    }

    console.log(`📋 Found ${customsRules?.length || 0} customs rules for ${originCountry} → ${destinationCountry}`);

    // Match against route-specific rules
    for (const rule of customsRules || []) {
      if (matchesConditions(productData, rule.conditions)) {
        const result: CustomsResult = {
          category: rule.category,
          dutyPercentage: rule.duty_percentage,
          confidence: 0.9, // High confidence for route-specific rules
          ruleApplied: `${rule.category} (${originCountry}→${destinationCountry})`,
          route: `${originCountry}→${destinationCountry}`
        };
        
        console.log(`✅ Matched rule: ${rule.category} (${rule.duty_percentage}%)`);
        return result;
      }
    }

    // Fallback to general route rule
    const { data: fallbackRule } = await supabase
      .from('customs_rules')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('category', 'general')
      .eq('is_active', true)
      .single();

    if (fallbackRule) {
      const result: CustomsResult = {
        category: fallbackRule.category,
        dutyPercentage: fallbackRule.duty_percentage,
        confidence: 0.7,
        ruleApplied: `General (${originCountry}→${destinationCountry})`,
        route: `${originCountry}→${destinationCountry}`
      };
      
      console.log(`⚠️ Using fallback rule: General (${fallbackRule.duty_percentage}%)`);
      return result;
    }

    // Final fallback - no route-specific rules found
    const result: CustomsResult = {
      category: 'general',
      dutyPercentage: 0,
      confidence: 0.3,
      ruleApplied: `No route rules found (${originCountry}→${destinationCountry})`,
      route: `${originCountry}→${destinationCountry}`
    };
    
    console.log(`❌ No customs rules found for ${originCountry} → ${destinationCountry}, using default`);
    return result;

  } catch (error) {
    console.error('❌ Error in route-specific customs:', error);
    
    // Return safe fallback
    return {
      category: 'general',
      dutyPercentage: 0,
      confidence: 0.1,
      ruleApplied: `Error occurred (${originCountry}→${destinationCountry})`,
      route: `${originCountry}→${destinationCountry}`
    };
  }
}

/**
 * Check if product data matches the conditions of a customs rule
 */
function matchesConditions(productData: ProductData, conditions: any): boolean {
  if (!conditions) return true;

  try {
    // Weight conditions
    if (conditions.weight_min !== undefined && productData.weight < conditions.weight_min) {
      return false;
    }
    if (conditions.weight_max !== undefined && productData.weight > conditions.weight_max) {
      return false;
    }

    // Price conditions
    if (conditions.price_min !== undefined && productData.price < conditions.price_min) {
      return false;
    }
    if (conditions.price_max !== undefined && productData.price > conditions.price_max) {
      return false;
    }

    // Category conditions
    if (conditions.category_contains && productData.category) {
      const categoryLower = productData.category.toLowerCase();
      const requiredCategories = Array.isArray(conditions.category_contains) 
        ? conditions.category_contains 
        : [conditions.category_contains];
      
      const matchesCategory = requiredCategories.some(required => 
        categoryLower.includes(required.toLowerCase())
      );
      
      if (!matchesCategory) {
        return false;
      }
    }

    // Title conditions
    if (conditions.title_contains && productData.title) {
      const titleLower = productData.title.toLowerCase();
      const requiredTerms = Array.isArray(conditions.title_contains) 
        ? conditions.title_contains 
        : [conditions.title_contains];
      
      const matchesTitle = requiredTerms.some(term => 
        titleLower.includes(term.toLowerCase())
      );
      
      if (!matchesTitle) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error matching conditions:', error);
    return false;
  }
}

/**
 * Get all available customs rules for a specific route
 */
export async function getRouteCustomsRules(
  originCountry: string,
  destinationCountry: string
): Promise<CustomsRule[]> {
  const { data, error } = await supabase
    .from('customs_rules')
    .select('*')
    .eq('origin_country', originCountry)
    .eq('destination_country', destinationCountry)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('❌ Error fetching route customs rules:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all available routes that have customs rules
 */
export async function getAvailableCustomsRoutes(): Promise<Array<{origin: string, destination: string}>> {
  const { data, error } = await supabase
    .from('customs_rules')
    .select('origin_country, destination_country')
    .eq('is_active', true)
    .order('origin_country, destination_country');

  if (error) {
    console.error('❌ Error fetching available routes:', error);
    return [];
  }

  // Remove duplicates
  const uniqueRoutes = new Set();
  const routes: Array<{origin: string, destination: string}> = [];
  
  data?.forEach(rule => {
    const routeKey = `${rule.origin_country}→${rule.destination_country}`;
    if (!uniqueRoutes.has(routeKey)) {
      uniqueRoutes.add(routeKey);
      routes.push({
        origin: rule.origin_country,
        destination: rule.destination_country
      });
    }
  });

  return routes;
}

/**
 * Returns the origin and destination country codes for a quote, using unified logic.
 * @param {any} quote - The quote object
 * @param {any} shippingAddress - The shipping address (optional)
 * @param {any[]} allCountries - List of all countries (optional, for name/code resolution)
 * @param {function} fetchRouteById - Async function to fetch route by id (must return {origin_country, destination_country})
 * @returns {Promise<{origin: string, destination: string}>}
 */
export async function getQuoteRouteCountries(quote, shippingAddress, allCountries, fetchRouteById) {
  // 1. If shipping_route_id exists, always fetch from DB first
  if (quote.shipping_route_id && fetchRouteById) {
    try {
      const route = await fetchRouteById(quote.shipping_route_id);
      if (route && route.origin_country && route.destination_country) {
        return { origin: route.origin_country, destination: route.destination_country };
      }
    } catch (e) {
      console.warn('Failed to fetch shipping route by ID:', e);
    }
  }
  
  // 2. Use quote's origin_country and country_code as the standard
  // origin_country = where the product is purchased from
  // country_code = destination country for shipping
  let origin = quote.origin_country || 'US';
  let destination = quote.country_code || '';
  
  // 3. If destination is still empty, try to get from shipping address
  if (!destination && shippingAddress) {
    destination = shippingAddress.country_code || shippingAddress.countryCode || shippingAddress.country || '';
  }
  
  // 4. Normalize country names to codes if needed
  if (allCountries && allCountries.length > 0) {
    const findCode = (val) => {
      if (!val) return '';
      if (val.length === 2) return val.toUpperCase();
      const found = allCountries.find(c => c.name === val || c.code === val.toUpperCase());
      return found ? found.code : val;
    };
    origin = findCode(origin);
    destination = findCode(destination);
  }
  
  return { origin: origin || '', destination: destination || '' };
} 