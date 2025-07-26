/**
 * Populate D1 with initial data
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/populate' && request.method === 'POST') {
      try {
        // Insert exchange rates
        const exchangeRates = [
          { pair: 'USD_INR', rate: 83.12 },
          { pair: 'USD_NPR', rate: 132.45 },
          { pair: 'USD_EUR', rate: 0.92 },
          { pair: 'USD_GBP', rate: 0.79 },
          { pair: 'INR_NPR', rate: 1.59 },
          { pair: 'EUR_USD', rate: 1.09 },
          { pair: 'GBP_USD', rate: 1.27 }
        ];

        for (const { pair, rate } of exchangeRates) {
          await env.DB.prepare(
            'INSERT OR REPLACE INTO exchange_rates_cache (currency_pair, rate, updated_at) VALUES (?, ?, ?)'
          ).bind(pair, rate, Math.floor(Date.now() / 1000)).run();
        }

        // Insert popular products
        const products = [
          {
            id: 'prod-001',
            name: 'iPhone 15 Pro',
            category: 'Electronics',
            hsn_code: '8517',
            avg_weight: 0.221,
            avg_price_usd: 999,
            popularity_score: 100
          },
          {
            id: 'prod-002',
            name: 'Nike Air Max',
            category: 'Footwear',
            hsn_code: '6404',
            avg_weight: 0.8,
            avg_price_usd: 150,
            popularity_score: 85
          },
          {
            id: 'prod-003',
            name: 'Levi\'s 501 Jeans',
            category: 'Apparel',
            hsn_code: '6203',
            avg_weight: 0.5,
            avg_price_usd: 80,
            popularity_score: 75
          }
        ];

        for (const product of products) {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO popular_products_cache 
             (id, name, category, hsn_code, avg_weight, avg_price_usd, popularity_score) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            product.id,
            product.name,
            product.category,
            product.hsn_code,
            product.avg_weight,
            product.avg_price_usd,
            product.popularity_score
          ).run();
        }

        // Insert HSN tax rates
        const hsnTaxRates = [
          {
            hsn: '8517',
            origin: 'US',
            dest: 'IN',
            customs_rate: 0.20,
            gst_rate: 0.18
          },
          {
            hsn: '6404',
            origin: 'US',
            dest: 'IN',
            customs_rate: 0.25,
            gst_rate: 0.12
          },
          {
            hsn: '6203',
            origin: 'US',
            dest: 'IN',
            customs_rate: 0.10,
            gst_rate: 0.05
          }
        ];

        for (const tax of hsnTaxRates) {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO hsn_tax_cache 
             (hsn_code, origin_country, destination_country, customs_rate, gst_rate, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            tax.hsn,
            tax.origin,
            tax.dest,
            tax.customs_rate,
            tax.gst_rate,
            Math.floor(Date.now() / 1000)
          ).run();
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Data populated successfully',
          inserted: {
            exchange_rates: exchangeRates.length,
            products: products.length,
            hsn_tax_rates: hsnTaxRates.length
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          error: 'Population failed',
          message: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('POST to /populate to insert data', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};