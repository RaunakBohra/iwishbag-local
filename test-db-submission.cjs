// Test database submission for quote form
const { exec } = require('child_process');

// Test data that matches our form structure
const testSingleQuote = {
  customer_name: 'Test User',
  customer_email: 'test@example.com',
  customer_phone: '+1234567890',
  destination_country: 'IN',
  quote_type: 'single',
  items: [
    {
      product_name: 'iPhone 15 Pro',
      product_url: 'https://apple.com/iphone-15-pro',
      origin_country: 'US',
      quantity: 1,
      price_usd: 999.99,
      weight_kg: 0.2,
      notes: 'Space Black color'
    },
    {
      product_name: 'MacBook Air',
      product_url: 'https://apple.com/macbook-air',
      origin_country: 'US',
      quantity: 1,
      price_usd: 1299.99,
      weight_kg: 1.2,
      notes: 'M3 chip, 16GB RAM'
    }
  ],
  special_requirements: 'Express shipping preferred'
};

const testSeparateQuotes = {
  ...testSingleQuote,
  quote_type: 'separate',
  items: [
    {
      product_name: 'German Camera',
      product_url: 'https://example.de/camera',
      origin_country: 'DE',
      quantity: 1,
      price_usd: 599.99,
      weight_kg: 0.8,
      notes: 'Professional DSLR'
    },
    {
      product_name: 'Chinese Laptop',
      product_url: 'https://example.cn/laptop',
      origin_country: 'CN',
      quantity: 1,
      price_usd: 799.99,
      weight_kg: 1.5,
      notes: 'Gaming laptop'
    }
  ]
};

// Function to create the SQL for testing our mapping
function createTestInsertSQL(data, quoteType) {
  const baseQuoteData = {
    origin_country: quoteType === 'single' ? data.items[0]?.origin_country || 'US' : 'US',
    destination_country: data.destination_country,
    status: 'pending',
    customer_data: JSON.stringify({
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone || null,
      special_requirements: data.special_requirements || null,
      source: 'quote_request_form',
    }),
  };

  if (quoteType === 'single') {
    // Single quote - combine all items
    const mappedItems = data.items.map(item => ({
      name: item.product_name,
      url: item.product_url || '',
      quantity: item.quantity,
      costprice_origin: item.price_usd,
      weight: item.weight_kg,
      customer_notes: item.notes || '',
    }));

    const costpriceTotal = data.items.reduce((sum, item) => sum + (item.quantity * item.price_usd), 0);

    return `
INSERT INTO quotes (
  origin_country, 
  destination_country, 
  status, 
  customer_data, 
  items, 
  costprice_total_usd, 
  final_total_usd
) VALUES (
  '${baseQuoteData.origin_country}',
  '${baseQuoteData.destination_country}',
  '${baseQuoteData.status}',
  '${baseQuoteData.customer_data}',
  '${JSON.stringify(mappedItems)}',
  ${costpriceTotal},
  ${costpriceTotal}
) RETURNING id, display_id;`;
  } else {
    // Separate quotes - generate multiple INSERT statements
    return data.items.map(item => {
      const mappedItem = {
        name: item.product_name,
        url: item.product_url || '',
        quantity: item.quantity,
        costprice_origin: item.price_usd,
        weight: item.weight_kg,
        customer_notes: item.notes || '',
      };

      const itemTotal = item.quantity * item.price_usd;

      return `
INSERT INTO quotes (
  origin_country, 
  destination_country, 
  status, 
  customer_data, 
  items, 
  costprice_total_usd, 
  final_total_usd
) VALUES (
  '${item.origin_country}',
  '${baseQuoteData.destination_country}',
  '${baseQuoteData.status}',
  '${baseQuoteData.customer_data}',
  '[${JSON.stringify(mappedItem)}]',
  ${itemTotal},
  ${itemTotal}
) RETURNING id, display_id;`;
    }).join('\n\n');
  }
}

console.log('🧪 Testing Quote Form Database Submission Logic\n');

console.log('📋 Single Quote Test SQL:');
console.log('========================');
console.log(createTestInsertSQL(testSingleQuote, 'single'));

console.log('\n📋 Separate Quotes Test SQL:');
console.log('=============================');
console.log(createTestInsertSQL(testSeparateQuotes, 'separate'));

console.log('\n✅ SQL generation test completed!');
console.log('Next: Test actual database insertion...');