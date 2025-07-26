/**
 * Sync Supabase data to Cloudflare D1 Edge Database
 * Run this periodically to keep edge cache updated
 */

import { supabase } from '@/integrations/supabase/client';

const D1_WORKER_URL = import.meta.env.VITE_D1_WORKER_URL || 'https://iwishbag-d1-api.YOUR_SUBDOMAIN.workers.dev';

export async function syncCountriesToD1() {
  try {
    console.log('🔄 Syncing countries to D1...');
    
    // Fetch countries from Supabase
    const { data: countries, error } = await supabase
      .from('country_settings')
      .select('*')
      .order('name');

    if (error) throw error;

    // Transform for D1
    const d1Countries = countries.map(country => ({
      code: country.code,
      name: country.name,
      currency: country.currency,
      symbol: country.symbol,
      exchange_rate: country.exchange_rate || 1,
      flag: country.flag,
      phone_prefix: country.phone_prefix,
      payment_gateways: country.enabled_payment_gateways || [],
      shipping_zones: [] // Add shipping zones if available
    }));

    // Sync to D1
    const response = await fetch(`${D1_WORKER_URL}/api/sync/countries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(d1Countries),
    });

    if (!response.ok) throw new Error('Failed to sync countries');

    const result = await response.json();
    console.log(`✅ Synced ${result.count} countries to D1`);
    
    return result;
  } catch (error) {
    console.error('❌ Country sync failed:', error);
    throw error;
  }
}

export async function syncExchangeRatesToD1() {
  try {
    console.log('🔄 Syncing exchange rates to D1...');
    
    // Get unique currencies
    const { data: countries } = await supabase
      .from('country_settings')
      .select('currency, exchange_rate')
      .not('currency', 'eq', 'USD');

    if (!countries) return;

    // Create rate pairs
    const rates = countries
      .filter(c => c.exchange_rate)
      .map(country => ({
        pair: `USD_${country.currency}`,
        rate: country.exchange_rate
      }));

    // Also add inverse rates
    const inverseRates = rates.map(r => ({
      pair: `${r.pair.split('_')[1]}_USD`,
      rate: 1 / r.rate
    }));

    const allRates = [...rates, ...inverseRates];

    // Sync to D1
    const response = await fetch(`${D1_WORKER_URL}/api/sync/rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(allRates),
    });

    if (!response.ok) throw new Error('Failed to sync rates');

    console.log(`✅ Synced ${allRates.length} exchange rates to D1`);
    
    return { success: true, count: allRates.length };
  } catch (error) {
    console.error('❌ Exchange rate sync failed:', error);
    throw error;
  }
}

export async function syncPopularProductsToD1() {
  try {
    console.log('🔄 Syncing popular products to D1...');
    
    // Fetch top products from quotes
    const { data: popularItems } = await supabase
      .from('quote_items')
      .select('product_name, category, quantity')
      .limit(100);

    if (!popularItems) return;

    // Aggregate by product name
    const productMap = new Map();
    
    popularItems.forEach(item => {
      const key = item.product_name.toLowerCase();
      if (!productMap.has(key)) {
        productMap.set(key, {
          id: key.replace(/\s+/g, '-'),
          name: item.product_name,
          category: item.category,
          search_count: 0,
          purchase_count: 0,
        });
      }
      productMap.get(key).purchase_count += item.quantity || 1;
    });

    // Convert to array and calculate popularity
    const products = Array.from(productMap.values()).map(p => ({
      ...p,
      popularity_score: p.search_count + (p.purchase_count * 10),
      last_accessed: Math.floor(Date.now() / 1000),
    }));

    // Sort by popularity
    products.sort((a, b) => b.popularity_score - a.popularity_score);

    // Take top 50
    const topProducts = products.slice(0, 50);

    // Note: This would need a batch insert endpoint in the worker
    console.log(`✅ Identified ${topProducts.length} popular products`);
    
    return topProducts;
  } catch (error) {
    console.error('❌ Product sync failed:', error);
    throw error;
  }
}

export async function syncHSNTaxRatesToD1() {
  try {
    console.log('🔄 Syncing HSN tax rates to D1...');
    
    // Fetch HSN data
    const { data: hsnData } = await supabase
      .from('hsn_tax_rates')
      .select('*');

    if (!hsnData) return;

    // Transform and sync (would need batch endpoint)
    console.log(`✅ Found ${hsnData.length} HSN tax rates to sync`);
    
    return hsnData;
  } catch (error) {
    console.error('❌ HSN sync failed:', error);
    throw error;
  }
}

// Run all syncs
export async function syncAllToD1() {
  console.log('🚀 Starting full D1 sync...');
  
  const results = await Promise.allSettled([
    syncCountriesToD1(),
    syncExchangeRatesToD1(),
    syncPopularProductsToD1(),
    syncHSNTaxRatesToD1(),
  ]);

  const summary = {
    countries: results[0].status === 'fulfilled' ? '✅' : '❌',
    rates: results[1].status === 'fulfilled' ? '✅' : '❌',
    products: results[2].status === 'fulfilled' ? '✅' : '❌',
    hsn: results[3].status === 'fulfilled' ? '✅' : '❌',
  };

  console.log('📊 Sync Summary:', summary);
  return summary;
}

// Auto-sync every 5 minutes if this module is imported
if (typeof window !== 'undefined') {
  // Initial sync after 10 seconds
  setTimeout(syncAllToD1, 10000);
  
  // Then every 5 minutes
  setInterval(syncAllToD1, 5 * 60 * 1000);
}