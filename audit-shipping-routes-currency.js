#!/usr/bin/env node

/**
 * Audit Script: Shipping Routes Currency Consistency
 * 
 * This script checks all shipping routes to ensure costs are entered in the 
 * correct currency (purchase/origin country's currency).
 * 
 * Usage: node audit-shipping-routes-currency.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - update these with your actual values
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Currency mapping for validation
const countryCurrencies = {
  'US': 'USD',
  'IN': 'INR', 
  'NP': 'NPR',
  'CN': 'CNY',
  'GB': 'GBP',
  'EU': 'EUR',
  'CA': 'CAD',
  'AU': 'AUD'
};

// Expected cost ranges by currency (for validation)
const expectedRanges = {
  'USD': { min: 5, max: 500 },
  'INR': { min: 100, max: 50000 },
  'NPR': { min: 100, max: 80000 },
  'CNY': { min: 30, max: 3000 },
  'GBP': { min: 5, max: 400 },
  'EUR': { min: 5, max: 450 },
  'CAD': { min: 7, max: 700 },
  'AUD': { min: 8, max: 800 }
};

async function auditShippingRoutes() {
  console.log('🔍 Starting Shipping Routes Currency Audit...\n');

  try {
    // Fetch all shipping routes
    const { data: routes, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .order('origin_country', 'asc');

    if (error) {
      console.error('❌ Error fetching shipping routes:', error);
      return;
    }

    if (!routes || routes.length === 0) {
      console.log('ℹ️  No shipping routes found.');
      return;
    }

    console.log(`📊 Found ${routes.length} shipping routes to audit.\n`);

    let issuesFound = 0;
    let recommendations = [];

    // Audit each route
    for (const route of routes) {
      const originCurrency = countryCurrencies[route.origin_country];
      const expectedRange = expectedRanges[originCurrency];
      
      if (!originCurrency) {
        console.log(`⚠️  Route ${route.id} (${route.origin_country} → ${route.destination_country}): Unknown origin country currency`);
        issuesFound++;
        continue;
      }

      const costs = [
        { name: 'Base Shipping Cost', value: route.base_shipping_cost },
        { name: 'Cost per KG', value: route.cost_per_kg },
        { name: 'Shipping per KG', value: route.shipping_per_kg }
      ];

      let routeHasIssues = false;
      let routeRecommendations = [];

      // Check each cost field
      for (const cost of costs) {
        if (cost.value && expectedRange) {
          if (cost.value < expectedRange.min || cost.value > expectedRange.max) {
            console.log(`⚠️  Route ${route.id} (${route.origin_country} → ${route.destination_country}): ${cost.name} (${cost.value}) seems outside expected range for ${originCurrency} (${expectedRange.min}-${expectedRange.max})`);
            routeHasIssues = true;
            routeRecommendations.push(`Review ${cost.name}: ${cost.value} ${originCurrency}`);
          }
        }
      }

      // Check weight tiers
      if (route.weight_tiers && Array.isArray(route.weight_tiers)) {
        for (const tier of route.weight_tiers) {
          if (tier.cost && expectedRange) {
            if (tier.cost < expectedRange.min || tier.cost > expectedRange.max) {
              console.log(`⚠️  Route ${route.id} (${route.origin_country} → ${route.destination_country}): Weight tier cost (${tier.cost}) seems outside expected range for ${originCurrency}`);
              routeHasIssues = true;
              routeRecommendations.push(`Review weight tier cost: ${tier.cost} ${originCurrency}`);
            }
          }
        }
      }

      if (routeHasIssues) {
        issuesFound++;
        recommendations.push({
          routeId: route.id,
          route: `${route.origin_country} → ${route.destination_country}`,
          currency: originCurrency,
          recommendations: routeRecommendations
        });
      }
    }

    // Summary
    console.log('\n📋 Audit Summary:');
    console.log(`✅ Total routes checked: ${routes.length}`);
    console.log(`⚠️  Routes with potential issues: ${issuesFound}`);
    console.log(`✅ Routes with no issues: ${routes.length - issuesFound}`);

    if (recommendations.length > 0) {
      console.log('\n🔧 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. Route ${rec.routeId} (${rec.route}) - ${rec.currency}:`);
        rec.recommendations.forEach(rec => console.log(`   • ${rec}`));
      });
    }

    console.log('\n💡 Next Steps:');
    console.log('1. Review the routes flagged above');
    console.log('2. Verify costs are in the correct currency (origin country)');
    console.log('3. Update any incorrect values in the admin UI');
    console.log('4. Consider adding currency validation to the form');

  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

// Run the audit
auditShippingRoutes().then(() => {
  console.log('\n✅ Audit complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
}); 