# iwishBag API Documentation

## Overview

The iwishBag API enables seamless integration with our international shopping platform, allowing you to create quotes, track orders, and manage the entire quote-to-checkout flow programmatically.

## Quick Start

### 1. Get Your API Key
1. Sign up for an account at [iwishBag.com](https://iwishbag.com)
2. Access the admin dashboard
3. Navigate to API Documentation section
4. Generate your API key

### 2. Make Your First Request

```bash
curl -X GET "https://iwishbag.com/api/v1/quotes" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### 3. Create a Quote

```bash
curl -X POST "https://iwishbag.com/api/v1/quotes" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "Wireless Headphones",
        "price_usd": 99.99,
        "quantity": 1,
        "weight": 0.5,
        "url": "https://example.com/product"
      }
    ],
    "shipping_country": "NP",
    "customer_data": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

### 4. Calculate Shipping Costs

```bash
curl -X POST "https://iwishbag.com/api/v1/calculator/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "iPhone 15",
        "price_usd": 999.99,
        "quantity": 1,
        "weight": 0.2,
        "category": "electronics",
        "hsn_code": "8517"
      }
    ],
    "shipping_country": "NP",
    "include_taxes": true
  }'
```

## API Reference

### Base URL
```
https://iwishbag.com/api/v1
```

### Authentication
Include your API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

### Response Format
All API responses follow this structure:
```json
{
  "data": {}, // or []
  "version": "v1.1",
  "timestamp": "2025-01-28T10:30:00Z"
}
```

### Error Format
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limits

- **Authenticated requests**: 1,000 per hour
- **Unauthenticated requests**: 100 per hour

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```

## API Versions

| Version | Status | Support Ends |
|---------|--------|--------------|
| v1.1    | Current | - |
| v1.0    | Supported | 2025-12-31 |
| v0.9    | Deprecated | 2025-06-30 |

## Endpoints

### Quotes
- `GET /quotes` - List quotes
- `POST /quotes` - Create quote
- `GET /quotes/{id}` - Get quote details
- `PATCH /quotes/{id}` - Update quote status (admin)

### Orders
- `GET /orders` - List orders
- `GET /orders/{id}` - Get order details

### Calculator
- `POST /calculator/estimate` - Basic cost estimation
- `POST /calculator/detailed` - Detailed cost breakdown
- `GET /calculator/rates` - Get shipping rates and taxes
- `POST /calculator/bulk` - Bulk calculations
- `GET /calculator/hsn-lookup` - HSN code lookup

### Tracking
- `GET /tracking/{tracking_id}` - Track order

### Customers (Admin Only)
- `GET /customers` - List customers

### Webhooks
- `POST /webhooks/quote-status` - Quote status updates

## SDK and Tools

### Official SDKs
- **JavaScript/Node.js**: `npm install @iwishbag/api-client`
- **Python**: `pip install iwishbag-api`
- **PHP**: `composer require iwishbag/api-client`

### Development Tools
- **OpenAPI Specification**: [`openapi.yaml`](./openapi.yaml)
- **Postman Collection**: [`postman-collection.json`](./postman-collection.json)
- **Interactive Docs**: Available in admin dashboard

## Code Examples

### JavaScript/Node.js
```javascript
const IwishBagAPI = require('@iwishbag/api-client');

const client = new IwishBagAPI({
  apiKey: 'your-api-key',
  environment: 'production' // or 'staging'
});

// Create a quote
const quote = await client.quotes.create({
  items: [
    {
      name: 'Wireless Headphones',
      price_usd: 99.99,
      quantity: 1,
      weight: 0.5
    }
  ],
  shipping_country: 'NP',
  customer_data: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

console.log('Quote created:', quote.quote_number);

// Calculate shipping costs
const estimate = await client.calculator.estimate({
  items: [
    {
      name: 'iPhone 15',
      price_usd: 999.99,
      quantity: 1,
      weight: 0.2,
      category: 'electronics',
      hsn_code: '8517'
    }
  ],
  shipping_country: 'NP',
  include_taxes: true
});

console.log('Total estimate:', estimate.total_estimate);
```

### Python
```python
from iwishbag_api import IwishBagClient

client = IwishBagClient(api_key='your-api-key')

# List quotes
quotes = client.quotes.list(limit=10, status='pending')

# Track an order
tracking = client.tracking.get('IWB20251001')
print(f"Status: {tracking.status}")
```

### PHP
```php
<?php
use IwishBag\ApiClient;

$client = new ApiClient([
    'api_key' => 'your-api-key',
    'environment' => 'production'
]);

// Create quote
$quote = $client->quotes()->create([
    'items' => [
        [
            'name' => 'Wireless Headphones',
            'price_usd' => 99.99,
            'quantity' => 1,
            'weight' => 0.5
        ]
    ],
    'shipping_country' => 'NP'
]);

echo "Quote created: " . $quote['quote_number'];
?>
```

## Webhooks

### Setting Up Webhooks
1. Configure webhook URLs in admin dashboard
2. Choose events to subscribe to
3. Verify webhook signatures for security

### Webhook Events
- `quote.created` - New quote created
- `quote.approved` - Quote approved by admin
- `quote.rejected` - Quote rejected
- `order.paid` - Payment received
- `order.shipped` - Order shipped
- `order.delivered` - Order delivered

### Webhook Payload Example
```json
{
  "event": "quote.approved",
  "data": {
    "quote_id": "quote_123",
    "quote_number": "IWB-2025-001",
    "status": "approved",
    "total_amount": 150.50,
    "customer_email": "john@example.com"
  },
  "timestamp": "2025-01-28T10:30:00Z",
  "signature": "sha256=..."
}
```

## Best Practices

### Error Handling
```javascript
try {
  const quote = await client.quotes.create(quoteData);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 60000));
    return retry();
  }
  // Handle other errors
  console.error('API Error:', error.message);
}
```

### Pagination
```javascript
let allQuotes = [];
let offset = 0;
const limit = 100;

do {
  const response = await client.quotes.list({ limit, offset });
  allQuotes = allQuotes.concat(response.data);
  offset += limit;
} while (response.hasMore);
```

### Caching
- Cache quote calculations for 15 minutes
- Cache country settings for 1 hour
- Cache tracking info for 5 minutes

## Testing

### Sandbox Environment
Use the staging environment for testing:
```
https://staging.iwishbag.com/api/v1
```

### Test Data
- Use test credit cards for payment testing
- Test tracking IDs: `IWB99990001` to `IWB99990999`
- Test customer emails: `test+{number}@iwishbag.com`

## Support

### Getting Help
- **Documentation**: [docs.iwishbag.com/api](https://docs.iwishbag.com/api)
- **Email Support**: api@iwishbag.com
- **Discord Community**: [Join our Discord](https://discord.gg/iwishbag)
- **Status Page**: [status.iwishbag.com](https://status.iwishbag.com)

### Reporting Issues
When reporting API issues, include:
- API endpoint and method
- Request/response data (sanitized)
- Timestamp of the issue
- Your API key prefix (first 8 characters)

## Changelog

### v1.1.0 (2025-01-28)
- Added comprehensive tracking API
- Enhanced quote creation with HSN code support
- Improved error responses with detailed codes
- Added webhook signature verification

### v1.0.0 (2024-12-01)
- Initial stable release
- Quote and order management
- Basic tracking functionality
- Customer management (admin)

### v0.9.0 (2024-10-01)
- Beta release
- Limited functionality
- **Deprecated** - Support ends 2025-06-30

## License

This API documentation is proprietary to iwishBag. Usage is subject to our [Terms of Service](https://iwishbag.com/terms).