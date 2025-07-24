/**
 * HSN Test Setup
 * Global test configuration and mocks for HSN system testing
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Global test environment setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset any global state
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete (window as any).__HSN_DEBUG__;
  }

  // Mock console methods to avoid noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Cleanup React Testing Library
  cleanup();

  // Restore console methods
  vi.restoreAllMocks();
});

// Mock fetch globally for API tests
global.fetch = vi.fn();

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// HSN-specific test utilities
export const HSNTestUtils = {
  // Create mock quote for testing
  createMockQuote: (overrides = {}) => ({
    id: 'test-quote-' + Math.random().toString(36).substr(2, 9),
    origin_country: 'US',
    destination_country: 'IN',
    items: [
      {
        id: 'test-item-1',
        name: 'Test Product',
        costprice_origin: 100,
        quantity: 1,
        weight_kg: 0.5,
        hsn_code: '8517',
        category: 'electronics',
      },
    ],
    final_total_usd: 0,
    calculation_data: {
      breakdown: {
        items_total: 100,
        shipping: 25,
        customs: 10,
        destination_tax: 18,
        fees: 5,
      },
    },
    operational_data: {
      hsn_tax_calculation: true,
      calculation_method: 'per_item_hsn',
    },
    ...overrides,
  }),

  // Create mock HSN calculation result
  createMockHSNResult: (overrides = {}) => ({
    success: true,
    quote: HSNTestUtils.createMockQuote(),
    itemBreakdowns: [
      {
        itemId: 'test-item-1',
        itemName: 'Test Product',
        costPrice: 100,
        costPriceUSD: 100,
        quantity: 1,
        valuationMethod: 'cost_price',
        valuationAmount: 100,
        hsnCode: '8517',
        category: 'electronics',
        classificationConfidence: 0.95,
        customsDuty: { rate: 10, amount: 10 },
        localTax: { rate: 18, amount: 18 },
        totalTaxAmount: 28,
        totalItemCostWithTax: 128,
      },
    ],
    realTimeUpdates: {
      taxRatesUpdated: true,
      weightDetected: false,
      hsnCodesClassified: 1,
      apiCallsMade: 1,
      cacheHits: 0,
    },
    ...overrides,
  }),

  // Create mock system status
  createMockSystemStatus: (overrides = {}) => ({
    overall_status: 'healthy',
    services: {
      india_gst: { status: 'online', stats: { requestCount: 10 } },
      nepal_vat: { status: 'online', stats: { localDataEntries: 100 } },
      us_taxjar: { status: 'online', stats: { hasValidAPIKey: true } },
    },
    orchestrator_stats: {
      totalRequests: 50,
      apiCallsMade: 20,
      cacheHits: 30,
      fallbacksUsed: 0,
      errors: 0,
    },
    ...overrides,
  }),

  // Create mock performance stats
  createMockPerformanceStats: (overrides = {}) => ({
    totalCalculations: 100,
    averageProcessingTime: 500,
    cacheHitRate: 0.75,
    apiCallsSaved: 25,
    errorsHandled: 2,
    ...overrides,
  }),

  // Wait for async operations in tests
  waitForAsyncOperations: async (timeout = 1000) => {
    await new Promise((resolve) => setTimeout(resolve, timeout));
  },

  // Mock API responses
  mockAPIResponses: {
    indiaGST: {
      success: true,
      data: {
        hsn_code: '8517',
        gst_rate: 18,
        cess_rate: 0,
        exemption_status: 'taxable',
        last_updated: '2024-01-01T00:00:00Z',
      },
    },
    nepalVAT: {
      success: true,
      data: {
        hsn_code: '6109',
        vat_rate: 13,
        customs_duty: 12,
        minimum_valuation: { amount: 10, currency: 'USD' },
        source: 'local_database',
        last_updated: '2024-01-01T00:00:00Z',
      },
    },
    usTaxJar: {
      success: true,
      data: {
        total_sales_tax: 8.88,
        state_tax_rate: 6.25,
        county_tax_rate: 1.0,
        city_tax_rate: 1.5,
        combined_rate: 8.75,
        state: 'CA',
        last_updated: '2024-01-01T00:00:00Z',
      },
    },
  },
};

// Export test utilities globally
(global as any).HSNTestUtils = HSNTestUtils;

// Mock environment variables
process.env.VITE_HSN_TEST_MODE = 'true';
process.env.NODE_ENV = 'test';

// Setup global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// HSN-specific mock implementations
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user' } },
          error: null,
        }),
      ),
    },
  },
}));

vi.mock('@/lib/security/HSNSecurityManager', () => ({
  hsnSecurity: {
    checkPermission: vi.fn(),
    getAPIKey: vi.fn(() => 'test-api-key'),
    setSecurityContext: vi.fn(),
  },
  HSNPermission: {
    CALCULATE_TAXES: 'calculate_taxes',
    USE_GOVERNMENT_APIS: 'use_government_apis',
    MANAGE_HSN_CODES: 'manage_hsn_codes',
  },
}));

vi.mock('@/lib/error-handling/HSNSystemError', () => ({
  HSNSystemError: class HSNSystemError extends Error {
    constructor(
      public code: string,
      message: string,
      public severity: string,
      public context: any,
    ) {
      super(message);
    }
  },
  HSNErrors: {
    calculationFailed: (service: string, context: any, originalError: Error) =>
      new (global as any).HSNSystemError(
        'CALCULATION_FAILED',
        'Calculation failed',
        'HIGH',
        context,
      ),
    governmentAPIError: (api: string, context: any, originalError: Error) =>
      new (global as any).HSNSystemError('API_ERROR', 'API error', 'MEDIUM', context),
  },
  hsnErrorHandler: {
    handleError: vi.fn(),
  },
}));

console.log('🧪 HSN Test Setup Complete');
console.log(
  '🔧 Mocks configured for:',
  [
    'Supabase Client',
    'Security Manager',
    'Error Handling',
    'Global APIs (fetch, crypto, etc.)',
    'DOM APIs (IntersectionObserver, ResizeObserver)',
    'Window APIs (matchMedia)',
  ].join(', '),
);

export default HSNTestUtils;
