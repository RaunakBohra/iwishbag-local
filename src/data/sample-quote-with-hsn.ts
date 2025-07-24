// ============================================================================
// SAMPLE QUOTE WITH HSN DATA - For Real UI Testing
// Creates a realistic quote that works with existing UnifiedQuoteInterface
// ============================================================================

import type { UnifiedQuote } from '@/types/unified-quote';

export const createSampleHSNQuote = (): UnifiedQuote => {
  const now = new Date().toISOString();
  
  return {
    id: 'hsn-test-quote-001',
    display_id: '#HSN2001',
    user_id: 'test-user-hsn',
    status: 'pending',
    origin_country: 'IN', // India
    destination_country: 'NP', // Nepal
    currency: 'INR',
    
    // Sample items with HSN codes and realistic pricing
    items: [
      {
        id: 'hsn-item-1',
        name: 'Traditional Nepali Kurta - Women\'s Cotton',
        quantity: 1,
        price_usd: 6.02, // ₹500 INR (will trigger minimum valuation)
        weight_kg: 0.3,
        url: 'https://example.com/kurta-women-cotton',
        image_url: 'https://images.unsplash.com/photo-1594736797933-d0d6b4ed6a60?w=400',
        options: 'Size: M, Color: Royal Blue, Material: 100% Cotton',
        hsn_code: '6204', // Women's garments - $10 USD minimum
        category: 'clothing',
        smart_data: {
          weight_confidence: 0.85,
          category_detected: 'clothing',
          optimization_hints: ['Consider bulk shipping for multiple items'],
          customs_suggestions: ['Minimum valuation may apply'],
        },
      },
      {
        id: 'hsn-item-2', 
        name: 'Samsung Galaxy A54 5G Smartphone',
        quantity: 1,
        price_usd: 301.20, // ₹25,000 INR (above minimum valuation)
        weight_kg: 0.2,
        url: 'https://example.com/samsung-galaxy-a54',  
        image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        options: '128GB Storage, Awesome Blue, Dual SIM',
        hsn_code: '8517', // Mobile phones - $50 USD minimum
        category: 'electronics',
        smart_data: {
          weight_confidence: 0.95,
          category_detected: 'electronics',
          optimization_hints: ['High-value item - consider insurance'],
          customs_suggestions: ['Actual price exceeds minimum valuation'],
        },
      },
      {
        id: 'hsn-item-3',
        name: 'Advanced JavaScript Programming Book',
        quantity: 2,
        price_usd: 36.14, // ₹3,000 INR total (₹1,500 each)
        weight_kg: 0.8,
        url: 'https://example.com/javascript-book',
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
        options: 'Paperback Edition, Latest 2024 Version',
        hsn_code: '4901', // Books - tax exempt, no minimum
        category: 'books',
        smart_data: {
          weight_confidence: 0.9,
          category_detected: 'books',
          optimization_hints: ['Educational material - may be tax exempt'],
          customs_suggestions: ['Books typically have reduced or zero duties'],
        },
      },
      {
        id: 'hsn-item-4',
        name: 'Premium Cotton T-Shirts (Pack of 3)',
        quantity: 1, // Pack of 3
        price_usd: 18.07, // ₹1,500 INR total
        weight_kg: 0.6,
        url: 'https://example.com/cotton-tshirts-pack',
        image_url: 'https://images.unsplash.com/photo-1521497043336-23d8fd16e7b9?w=400',
        options: 'Size: L, Colors: White, Black, Navy, 100% Cotton',
        hsn_code: '6109', // T-shirts - $5 USD minimum (will use actual price)
        category: 'clothing',
        smart_data: {
          weight_confidence: 0.88,
          category_detected: 'clothing',
          optimization_hints: ['Pack pricing may affect valuation'],
          customs_suggestions: ['Actual price likely exceeds minimum'],
        },
      },
    ],

    // Calculated totals
    base_total_usd: 361.43, // Sum of all item prices in USD
    final_total_usd: 0, // Will be calculated by system

    // Calculation data in INR (origin currency)
    calculation_data: {
      breakdown: {
        items_total: 30000, // ₹30,000 INR (361.43 * 83)
        shipping: 0, // Will be calculated
        customs: 0, // Will be calculated by HSN system
        taxes: 0, // Will be calculated by HSN system  
        fees: 0,
        discount: 0,
      },
      exchange_rate: {
        rate: 83.0, // USD to INR
        source: 'unified_configuration',
        confidence: 1,
      },
      smart_optimizations: [],
    },

    // Customer data
    customer_data: {
      info: {
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '+977-9841234567',
        social_handle: '@priya_nepal',
      },
      shipping_address: {
        line1: 'Thamel-26, Kathmandu',
        line2: 'Near Garden of Dreams',
        city: 'Kathmandu',
        state: 'Bagmati Province',
        postal: '44600',
        country: 'Nepal', 
        locked: false,
      },
      profile: {
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-6ef1c7d17b36?w=100',
      },
    },

    // Operational data
    operational_data: {
      customs: {
        percentage: 0, // Will be calculated per-item by HSN system
        tier_suggestions: [],
      },
      shipping: {
        method: 'DHL Express',
        available_options: [],
        smart_recommendations: [],
      },
      payment: {
        amount_paid: 0,
        reminders_sent: 0,
        status: 'unpaid',
      },
      timeline: [
        {
          timestamp: now,
          event: 'created',
          description: 'HSN test quote created for development testing',
          actor: 'system',
        },
      ],
      admin: {
        priority: 'normal',
        flags: ['hsn_test', 'mixed_categories'],
        notes: 'Sample quote for testing HSN customs calculation system',
      },
    },

    // Smart suggestions
    smart_suggestions: [
      {
        id: 'hsn-suggestion-1',
        type: 'customs',
        message: 'Multiple items may have different minimum valuations - review HSN breakdown',
        confidence: 0.9,
        potential_impact: {
          cost_change: 'Customs may vary per item based on HSN minimum valuations',
        },
      },
      {
        id: 'hsn-suggestion-2', 
        type: 'weight',
        message: 'Electronics item weight seems accurate based on product specifications',
        confidence: 0.95,
        potential_impact: {
          accuracy_improvement: 0.1,
        },
      },
    ],

    // Additional fields
    weight_confidence: 0.89,
    optimization_score: 0.78,
    in_cart: false,
    is_anonymous: false,
    quote_source: 'admin_test',
    created_at: now,
    updated_at: now,

    // iwishBag tracking (optional)
    iwish_tracking_id: null,
    tracking_status: null,
    estimated_delivery_date: null,
    shipping_carrier: null,
    tracking_number: null,
    expires_at: undefined,
    share_token: undefined,
    internal_notes: 'HSN test quote with mixed categories and minimum valuations',
    admin_notes: 'Test quote for validating enhanced customs calculation system',
  };
};

// Export both the function and a pre-created instance
export const sampleHSNQuote = createSampleHSNQuote();

// Helper to create additional test quotes
export const createTestQuoteVariants = () => {
  return [
    // Low-value items (minimum valuation will apply)
    {
      ...createSampleHSNQuote(),
      id: 'hsn-test-low-value',
      display_id: '#HSN2002',
      items: [
        {
          id: 'low-value-1',
          name: 'Simple Cotton Kurta',
          quantity: 1,
          price_usd: 3.61, // ₹300 INR (below $10 minimum)
          weight_kg: 0.25,
          url: 'https://example.com/simple-kurta',
          image_url: 'https://images.unsplash.com/photo-1594736797933-d0d6b4ed6a60?w=400',
          options: 'Size: S, Color: White',
          hsn_code: '6204',
          category: 'clothing', 
          smart_data: {
            weight_confidence: 0.8,
            category_detected: 'clothing',
            optimization_hints: [],
            customs_suggestions: ['Minimum valuation will likely apply'],
          },
        },
      ],
    },

    // High-value items (actual price will be used)
    {
      ...createSampleHSNQuote(),
      id: 'hsn-test-high-value',
      display_id: '#HSN2003',
      items: [
        {
          id: 'high-value-1',
          name: 'iPhone 15 Pro Max',
          quantity: 1,
          price_usd: 1445.78, // ₹120,000 INR (well above minimums)
          weight_kg: 0.25,
          url: 'https://example.com/iphone-15-pro',
          image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
          options: '256GB, Natural Titanium',
          hsn_code: '8517',
          category: 'electronics',
          smart_data: {
            weight_confidence: 0.98,
            category_detected: 'electronics',
            optimization_hints: ['High-value item - insurance recommended'],
            customs_suggestions: ['Actual price far exceeds minimum valuation'],
          },
        },
      ],
    },
  ];
};

export default sampleHSNQuote;