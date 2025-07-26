/**
 * D1 Migration Worker
 * Run migrations directly in the Worker
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/migrate' && request.method === 'POST') {
      try {
        // Create all tables
        const migrations = [
          // Country settings
          `CREATE TABLE IF NOT EXISTS country_settings_cache (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            currency TEXT NOT NULL,
            symbol TEXT NOT NULL,
            exchange_rate REAL NOT NULL,
            flag TEXT,
            phone_prefix TEXT,
            payment_gateways TEXT,
            shipping_zones TEXT,
            updated_at INTEGER DEFAULT (unixepoch())
          )`,
          
          // Popular products
          `CREATE TABLE IF NOT EXISTS popular_products_cache (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            hsn_code TEXT,
            avg_weight REAL,
            avg_price_usd REAL,
            popularity_score INTEGER DEFAULT 0,
            search_count INTEGER DEFAULT 0,
            purchase_count INTEGER DEFAULT 0,
            last_accessed INTEGER DEFAULT (unixepoch()),
            metadata TEXT
          )`,
          
          // Exchange rates
          `CREATE TABLE IF NOT EXISTS exchange_rates_cache (
            currency_pair TEXT PRIMARY KEY,
            rate REAL NOT NULL,
            bid REAL,
            ask REAL,
            updated_at INTEGER DEFAULT (unixepoch())
          )`,
          
          // Insert default data
          `INSERT OR REPLACE INTO country_settings_cache 
           (code, name, currency, symbol, exchange_rate) VALUES
           ('US', 'United States', 'USD', '$', 1),
           ('IN', 'India', 'INR', '₹', 83.12),
           ('NP', 'Nepal', 'NPR', 'रू', 132.45),
           ('EU', 'Europe', 'EUR', '€', 0.92)`,
           
          `INSERT OR REPLACE INTO exchange_rates_cache 
           (currency_pair, rate) VALUES
           ('USD_INR', 83.12),
           ('USD_NPR', 132.45),
           ('USD_EUR', 0.92)`
        ];
        
        const results = [];
        for (const sql of migrations) {
          try {
            await env.DB.prepare(sql).run();
            results.push({ sql: sql.substring(0, 50) + '...', success: true });
          } catch (error) {
            results.push({ sql: sql.substring(0, 50) + '...', error: error.message });
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          migrations_run: results.length,
          results
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'Migration failed',
          message: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('POST to /migrate to run migrations', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};