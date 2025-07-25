// ============================================================================
// SAMPLE HSN QUOTE LOADER - Development Utility
// Inject sample HSN quote data into existing admin interface for testing
// ============================================================================

import { sampleHSNQuote } from '@/data/sample-quote-with-hsn';
import type { UnifiedQuote } from '@/types/unified-quote';

/**
 * Load sample HSN quote into the admin interface
 * This utility helps test the HSN system with realistic data
 */
export const loadSampleHSNQuote = (): UnifiedQuote => {
  return sampleHSNQuote;
};

/**
 * Create a URL that loads the sample HSN quote in the admin interface
 * Usage: Navigate to this URL to test HSN components
 */
export const getSampleHSNQuoteURL = (): string => {
  // Use the sample quote ID to construct admin URL
  return `/admin/quotes/${sampleHSNQuote.id}`;
};

/**
 * Development helper to simulate loading sample data
 * This can be used in development components or testing scenarios
 */
export const simulateHSNQuoteLoad = async (): Promise<UnifiedQuote> => {
  // Simulate API delay for realistic testing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return the sample quote with current timestamp
  return {
    ...sampleHSNQuote,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * Generate multiple test quotes for comprehensive testing
 */
export const generateTestHSNQuotes = (): UnifiedQuote[] => {
  const baseQuote = sampleHSNQuote;
  
  return [
    // Original mixed categories quote
    baseQuote,
    
    // Low-value quote (minimum valuation will apply)
    {
      ...baseQuote,
      id: 'hsn-test-low-value-001',
      display_id: '#HSN2005',
      items: [
        {
          ...baseQuote.items[0], // Kurta
          id: 'low-kurta-001',
          name: 'Simple Cotton Kurta - Basic Design',
          costprice_origin: 3.61, // ₹300 INR (below $10 minimum)
          options: 'Size: S, Color: White, Material: Basic Cotton',
        }
      ],
      base_total_usd: 3.61,
      calculation_data: {
        ...baseQuote.calculation_data,
        breakdown: {
          ...baseQuote.calculation_data.breakdown,
          items_total: 300, // ₹300 INR
        }
      },
      operational_data: {
        ...baseQuote.operational_data,
        admin: {
          ...baseQuote.operational_data.admin,
          notes: 'Low-value test - minimum valuation should apply',
          flags: ['hsn_test', 'minimum_valuation_test'],
        }
      }
    },
    
    // High-value quote (actual price will be used)
    {
      ...baseQuote,
      id: 'hsn-test-high-value-001',
      display_id: '#HSN2006',
      items: [
        {
          ...baseQuote.items[1], // Smartphone
          id: 'high-mobile-001',
          name: 'iPhone 15 Pro Max - 256GB Natural Titanium',
          costprice_origin: 1445.78, // ₹120,000 INR (well above minimums)
          options: '256GB Storage, Natural Titanium, AppleCare+',
        }
      ],
      base_total_usd: 1445.78,
      calculation_data: {
        ...baseQuote.calculation_data,
        breakdown: {
          ...baseQuote.calculation_data.breakdown,
          items_total: 120000, // ₹120,000 INR
        }
      },
      operational_data: {
        ...baseQuote.operational_data,
        admin: {
          ...baseQuote.operational_data.admin,
          notes: 'High-value test - actual price should be used',
          flags: ['hsn_test', 'high_value_test'],
        }
      }
    }
  ];
};

/**
 * Development console helper
 * Call this in browser console to load sample data
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).loadSampleHSNQuote = loadSampleHSNQuote;
  (window as any).getSampleHSNQuoteURL = getSampleHSNQuoteURL;
  (window as any).generateTestHSNQuotes = generateTestHSNQuotes;
  
  console.log('🧪 HSN Development Utils Available:');
  console.log('- loadSampleHSNQuote(): Load sample quote data');
  console.log('- getSampleHSNQuoteURL(): Get admin URL for sample quote');  
  console.log('- generateTestHSNQuotes(): Generate multiple test scenarios');
}

export default {
  loadSampleHSNQuote,
  getSampleHSNQuoteURL,
  simulateHSNQuoteLoad,
  generateTestHSNQuotes,
};