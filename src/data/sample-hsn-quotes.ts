// ============================================================================
// SAMPLE HSN QUOTES DATA - For Testing Enhanced Customs Calculation
// Real-world scenarios with currency conversion and minimum valuations
// ============================================================================

import type { UnifiedQuote } from '@/types/unified-quote';

export const sampleHSNQuotes: UnifiedQuote[] = [
  // 1. India → Nepal Kurta (Classic minimum valuation scenario)
  {
    id: 'hsn-quote-1',
    display_id: '#2001',
    user_id: 'test-user-1',
    status: 'pending',
    origin_country: 'IN',
    destination_country: 'NP',
    currency: 'INR',
    items: [
      {
        id: 'item-kurta-1',
        name: 'Traditional Nepali Kurta',
        quantity: 1,
        price_usd: 6.02, // ₹500 INR converted to USD for storage
        weight_kg: 0.3,
        url: 'https://example.com/kurta',
        image_url: '',
        options: 'Size: M, Color: Blue',
        hsn_code: '6204', // Women's garments
        category: 'clothing',
        smart_data: {
          weight_confidence: 0.8,
          category_detected: 'clothing',
          optimization_hints: [],
          customs_suggestions: [],
        },
      },
    ],
    base_total_usd: 6.02,
    final_total_usd: 0, // Will be calculated
    calculation_data: {
      breakdown: {
        items_total: 500, // ₹500 INR
        shipping: 0,
        customs: 0,
        taxes: 0,
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
    customer_data: {
      info: {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '+977-9841234567',
      },
      shipping_address: {
        line1: 'Thamel, Kathmandu',
        city: 'Kathmandu',
        state: 'Bagmati',
        postal: '44600',
        country: 'Nepal',
        locked: false,
      },
    },
    operational_data: {
      customs: {
        percentage: 12,
        tier_suggestions: [],
      },
      shipping: {
        method: 'DHL',
        available_options: [],
        smart_recommendations: [],
      },
      payment: {
        amount_paid: 0,
        reminders_sent: 0,
        status: 'unpaid',
      },
      timeline: [],
      admin: {
        priority: 'normal',
        flags: [],
      },
    },
    smart_suggestions: [],
    weight_confidence: 0.8,
    optimization_score: 0.7,
    in_cart: false,
    is_anonymous: false,
    quote_source: 'website',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 2. India → Nepal Electronics (High value, minimum valuation applied)
  {
    id: 'hsn-quote-2',
    display_id: '#2002',
    user_id: 'test-user-2',
    status: 'approved',
    origin_country: 'IN',
    destination_country: 'NP',
    currency: 'INR',
    items: [
      {
        id: 'item-mobile-1',
        name: 'Samsung Galaxy A54 5G',
        quantity: 1,
        price_usd: 301.20, // ₹25,000 INR converted to USD
        weight_kg: 0.2,
        url: 'https://example.com/galaxy-a54',
        image_url: '',
        options: '128GB, Awesome Blue',
        hsn_code: '8517', // Mobile phones
        category: 'electronics',
        smart_data: {
          weight_confidence: 0.9,
          category_detected: 'electronics',
          optimization_hints: [],
          customs_suggestions: [],
        },
      },
    ],
    base_total_usd: 301.20,
    final_total_usd: 0,
    calculation_data: {
      breakdown: {
        items_total: 25000, // ₹25,000 INR
        shipping: 0,
        customs: 0,
        taxes: 0,
        fees: 0,
        discount: 0,
      },
      exchange_rate: {
        rate: 83.0,
        source: 'unified_configuration',
        confidence: 1,
      },
      smart_optimizations: [],
    },
    customer_data: {
      info: {
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '+977-9851234567',
      },
      shipping_address: {
        line1: 'Boudha, Kathmandu',
        city: 'Kathmandu',
        state: 'Bagmati',
        postal: '44600',
        country: 'Nepal',
        locked: false,
      },
    },
    operational_data: {
      customs: {
        percentage: 20,
        tier_suggestions: [],
      },
      shipping: {
        method: 'DHL',
        available_options: [],
        smart_recommendations: [],
      },
      payment: {
        amount_paid: 0,
        reminders_sent: 0,
        status: 'unpaid',
      },
      timeline: [],
      admin: {
        priority: 'high',
        flags: ['high_value'],
      },
    },
    smart_suggestions: [],
    weight_confidence: 0.9,
    optimization_score: 0.8,
    in_cart: false,
    is_anonymous: false,
    quote_source: 'website',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 3. India → Nepal Books (No minimum valuation, tax-exempt)
  {
    id: 'hsn-quote-3',
    display_id: '#2003',
    user_id: 'test-user-3',
    status: 'sent',
    origin_country: 'IN',
    destination_country: 'NP',
    currency: 'INR',
    items: [
      {
        id: 'item-book-1',
        name: 'Advanced JavaScript Programming',
        quantity: 2,
        price_usd: 36.14, // ₹3,000 INR total (₹1,500 each)
        weight_kg: 0.8,
        url: 'https://example.com/js-book',
        image_url: '',
        options: 'Paperback Edition',
        hsn_code: '4901', // Books
        category: 'books',
        smart_data: {
          weight_confidence: 0.95,
          category_detected: 'books',
          optimization_hints: [],
          customs_suggestions: [],
        },
      },
    ],
    base_total_usd: 36.14,
    final_total_usd: 0,
    calculation_data: {
      breakdown: {
        items_total: 3000, // ₹3,000 INR
        shipping: 0,
        customs: 0,
        taxes: 0,
        fees: 0,
        discount: 0,
      },
      exchange_rate: {
        rate: 83.0,
        source: 'unified_configuration',
        confidence: 1,
      },
      smart_optimizations: [],
    },
    customer_data: {
      info: {
        name: 'Anjali Thapa',
        email: 'anjali@example.com',
        phone: '+977-9861234567',
      },
      shipping_address: {
        line1: 'Patan Dhoka, Lalitpur',
        city: 'Lalitpur',
        state: 'Bagmati',
        postal: '44700',
        country: 'Nepal',
        locked: false,
      },
    },
    operational_data: {
      customs: {
        percentage: 0, // Books are typically exempt
        tier_suggestions: [],
      },
      shipping: {
        method: 'DHL',
        available_options: [],
        smart_recommendations: [],
      },
      payment: {
        amount_paid: 0,
        reminders_sent: 0,
        status: 'unpaid',
      },
      timeline: [],
      admin: {
        priority: 'low',
        flags: ['tax_exempt'],
      },
    },
    smart_suggestions: [],
    weight_confidence: 0.95,
    optimization_score: 0.6,
    in_cart: false,
    is_anonymous: false,
    quote_source: 'website',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 4. Multi-item quote (Mixed categories with different minimum valuations)
  {
    id: 'hsn-quote-4',
    display_id: '#2004',
    user_id: 'test-user-4',
    status: 'pending',
    origin_country: 'IN',
    destination_country: 'NP',
    currency: 'INR',
    items: [
      {
        id: 'item-multi-1',
        name: 'Cotton T-Shirt',
        quantity: 3,
        price_usd: 18.07, // ₹1,500 INR total (₹500 each)
        weight_kg: 0.6,
        url: 'https://example.com/tshirt',
        image_url: '',
        options: 'Size: L, Color: White',
        hsn_code: '6109', // T-shirts
        category: 'clothing',
        smart_data: {
          weight_confidence: 0.85,
          category_detected: 'clothing',
          optimization_hints: [],
          customs_suggestions: [],
        },
      },
      {
        id: 'item-multi-2',
        name: 'Bluetooth Earbuds',
        quantity: 1,
        price_usd: 24.10, // ₹2,000 INR
        weight_kg: 0.1,
        url: 'https://example.com/earbuds',
        image_url: '',
        options: 'True Wireless, Black',
        hsn_code: '8518', // Audio equipment
        category: 'electronics',
        smart_data: {
          weight_confidence: 0.9,
          category_detected: 'electronics',
          optimization_hints: [],
          customs_suggestions: [],
        },
      },
      {
        id: 'item-multi-3',
        name: 'Recipe Book - Indian Cuisine',
        quantity: 1,
        price_usd: 12.05, // ₹1,000 INR
        weight_kg: 0.4,
        url: 'https://example.com/recipe-book',
        image_url: '',
        options: 'Hardcover',
        hsn_code: '4901', // Books
        category: 'books',
        smart_data: {
          weight_confidence: 0.9,
          category_detected: 'books',
          optimization_hints: [],
          customs_suggestions: [],
        },
      },
    ],
    base_total_usd: 54.22,
    final_total_usd: 0,
    calculation_data: {
      breakdown: {
        items_total: 4500, // ₹4,500 INR total
        shipping: 0,
        customs: 0,
        taxes: 0,
        fees: 0,
        discount: 0,
      },
      exchange_rate: {
        rate: 83.0,
        source: 'unified_configuration',
        confidence: 1,
      },
      smart_optimizations: [],
    },
    customer_data: {
      info: {
        name: 'Bikash Shrestha',
        email: 'bikash@example.com',
        phone: '+977-9871234567',
      },
      shipping_address: {
        line1: 'Bhaktapur Durbar Square',
        city: 'Bhaktapur',
        state: 'Bagmati',
        postal: '44800',
        country: 'Nepal',
        locked: false,
      },
    },
    operational_data: {
      customs: {
        percentage: 15, // Mixed rate
        tier_suggestions: [],
      },
      shipping: {
        method: 'DHL',
        available_options: [],
        smart_recommendations: [],
      },
      payment: {
        amount_paid: 0,
        reminders_sent: 0,
        status: 'unpaid',
      },
      timeline: [],
      admin: {
        priority: 'normal',
        flags: ['multi_category'],
      },
    },
    smart_suggestions: [],
    weight_confidence: 0.85,
    optimization_score: 0.75,
    in_cart: false,
    is_anonymous: false,
    quote_source: 'website',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Additional HSN test data for seeding
export const additionalHSNData = [
  {
    hsn_code: '6109',
    description: 'T-shirts, singlets and other vests, knitted or crocheted',
    category: 'clothing',
    subcategory: 'casual_wear',
    keywords: ['tshirt', 't-shirt', 'vest', 'singlet', 'casual', 'cotton'],
    minimum_valuation_usd: 5.0, // $5 minimum for t-shirts
    requires_currency_conversion: true,
    weight_data: {
      typical_weights: {
        per_unit: { average: 0.2, min: 0.1, max: 0.3 },
      },
    },
    tax_data: {
      typical_rates: {
        customs: { common: 12 },
        gst: { standard: 12 },
        vat: { common: 13 },
      },
    },
    classification_data: {
      auto_classification: { confidence: 0.9 },
    },
    is_active: true,
  },
  {
    hsn_code: '8518',
    description: 'Microphones, loudspeakers, headphones and earphones',
    category: 'electronics',
    subcategory: 'audio',
    keywords: ['headphone', 'earphone', 'earbud', 'speaker', 'microphone', 'audio'],
    minimum_valuation_usd: 15.0, // $15 minimum for audio equipment
    requires_currency_conversion: true,
    weight_data: {
      typical_weights: {
        per_unit: { average: 0.15, min: 0.05, max: 0.5 },
      },
    },
    tax_data: {
      typical_rates: {
        customs: { common: 20 },
        gst: { standard: 18 },
        vat: { common: 13 },
      },
    },
    classification_data: {
      auto_classification: { confidence: 0.92 },
    },
    is_active: true,
  },
];

export default sampleHSNQuotes;