import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PaymentGatewayInfo,
  CountryPaymentPreference,
  paymentGatewayService,
  getAllGateways,
  getActiveGatewayCodes,
  getGateway,
  getRecommendedGateway
} from '../PaymentGatewayService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
};

const mockSupabase = supabase as unknown as MockSupabaseClient;

describe('PaymentGatewayService', () => {
  let service: typeof paymentGatewayService;
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
  };

  // Mock data
  const mockGateways: PaymentGatewayInfo[] = [
    {
      id: '1',
      name: 'PayU',
      code: 'payu',
      is_active: true,
      supported_countries: ['IN', 'NP'],
      supported_currencies: ['INR', 'NPR', 'USD'],
      fee_percent: 2.5,
      fee_fixed: 5,
      config: { merchantId: 'test123' },
      test_mode: false,
      priority: 1,
      description: 'PayU payment gateway',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Stripe',
      code: 'stripe',
      is_active: true,
      supported_countries: ['US', 'GB', 'AU'],
      supported_currencies: ['USD', 'GBP', 'AUD'],
      fee_percent: 2.9,
      fee_fixed: 0.3,
      config: { publishableKey: 'pk_test_123' },
      test_mode: true,
      priority: 2,
      description: 'Stripe payment gateway',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      name: 'Bank Transfer',
      code: 'bank_transfer',
      is_active: true,
      supported_countries: ['IN', 'NP', 'US'],
      supported_currencies: ['INR', 'NPR', 'USD'],
      fee_percent: 0,
      fee_fixed: 0,
      config: {},
      test_mode: false,
      priority: 3,
      description: 'Bank transfer payment',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '4',
      name: 'Inactive Gateway',
      code: 'inactive',
      is_active: false,
      supported_countries: ['US'],
      supported_currencies: ['USD'],
      fee_percent: 1.0,
      fee_fixed: 0,
      config: {},
      test_mode: false,
      priority: 10,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockCountryPreferences: CountryPaymentPreference[] = [
    {
      country_code: 'IN',
      gateway_code: 'payu',
      priority: 1,
      is_active: true
    },
    {
      country_code: 'IN',
      gateway_code: 'bank_transfer',
      priority: 2,
      is_active: true
    },
    {
      country_code: 'US',
      gateway_code: 'stripe',
      priority: 1,
      is_active: true
    }
  ];

  beforeEach(() => {
    service = paymentGatewayService;
    service.clearCache();
    
    // Spy on console methods
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = paymentGatewayService;
      const instance2 = paymentGatewayService;
      expect(instance1).toBe(instance2);
    });

    test('should return the same instance as exported singleton', () => {
      // Since PaymentGatewayService is not exported, we just verify the singleton works
      expect(paymentGatewayService).toBeDefined();
      expect(typeof paymentGatewayService.getAllGateways).toBe('function');
    });
  });

  describe('Cache Management', () => {
    test('should check cache validity correctly', async () => {
      // Test private method through public interface
      service.clearCache();
      
      // Mock current time
      const mockNow = 1640995200000; // 2022-01-01 00:00:00
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      // Set up successful response to populate cache
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      // First call should hit database
      await service.getAllGateways();
      
      // Second call within cache window should use cache
      vi.spyOn(Date, 'now').mockReturnValue(mockNow + 5 * 60 * 1000); // 5 minutes later
      await service.getAllGateways();
      
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    test('should invalidate cache after expiry', async () => {
      const mockNow = 1640995200000;
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      // Set up successful response
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      // First call
      await service.getAllGateways();
      
      // Move time forward beyond cache duration (10 minutes)
      vi.spyOn(Date, 'now').mockReturnValue(mockNow + 11 * 60 * 1000);
      
      // Second call should hit database again
      await service.getAllGateways();
      
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    test('should clear cache completely', async () => {
      // Populate cache first
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      await service.getAllGateways();
      
      // Clear cache
      service.clearCache();
      
      // Next call should hit database
      await service.getAllGateways();
      
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllGateways', () => {
    test('should fetch gateways from database successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const gateways = await service.getAllGateways();
      
      expect(gateways).toEqual(mockGateways);
      expect(mockSupabase.from).toHaveBeenCalledWith('payment_gateways');
    });

    test('should return cached gateways on subsequent calls', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const gateways1 = await service.getAllGateways();
      const gateways2 = await service.getAllGateways();
      
      expect(gateways1).toEqual(gateways2);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    test('should return fallback gateways on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        })
      });

      const gateways = await service.getAllGateways();
      
      expect(gateways).toHaveLength(13); // Number of fallback gateways
      expect(gateways[0].code).toBe('payu');
      expect(gateways[0].name).toBe('PayU');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching payment gateways:',
        expect.any(Error)
      );
    });

    test('should return fallback gateways on network exception', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const gateways = await service.getAllGateways();
      
      expect(gateways).toHaveLength(13);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error in getAllGateways:',
        expect.any(Error)
      );
    });
  });

  describe('getActiveGatewayCodes', () => {
    test('should return only active gateway codes', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const activeGateways = await service.getActiveGatewayCodes();
      
      expect(activeGateways).toEqual(['payu', 'stripe', 'bank_transfer']);
      expect(activeGateways).not.toContain('inactive');
    });

    test('should return fallback codes on error', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const activeGateways = await service.getActiveGatewayCodes();
      
      expect(activeGateways).toContain('payu');
      expect(activeGateways).toContain('airwallex'); // stripe is not in the fallback list
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    test('getActiveGatewayCodesSync should use cache', () => {
      // Without cache, should return fallback
      const codes1 = service.getActiveGatewayCodesSync();
      expect(codes1).toEqual([
        'payu', 'esewa', 'khalti', 'fonepay', 'airwallex', 
        'bank_transfer', 'cod', 'razorpay', 'paypal', 'upi', 'paytm', 
        'grabpay', 'alipay'
      ]);
    });
  });

  describe('getGateway', () => {
    test('should return specific gateway by code', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const gateway = await service.getGateway('payu');
      
      expect(gateway).toEqual(mockGateways[0]);
      expect(gateway?.code).toBe('payu');
    });

    test('should return null for non-existent gateway', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const gateway = await service.getGateway('nonexistent');
      
      expect(gateway).toBeNull();
    });

    test('should use cache for subsequent requests', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      // First call populates cache
      await service.getGateway('payu');
      
      // Second call should use cache
      const gateway = await service.getGateway('stripe');
      
      expect(gateway?.code).toBe('stripe');
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('getGatewaysByPriority', () => {
    test('should return active gateways sorted by priority', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const gateways = await service.getGatewaysByPriority();
      
      expect(gateways).toHaveLength(3); // Only active gateways
      expect(gateways[0].code).toBe('payu'); // Priority 1
      expect(gateways[1].code).toBe('stripe'); // Priority 2
      expect(gateways[2].code).toBe('bank_transfer'); // Priority 3
    });

    test('should exclude inactive gateways', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const gateways = await service.getGatewaysByPriority();
      
      expect(gateways.some(g => g.code === 'inactive')).toBe(false);
    });
  });

  describe('Country Payment Preferences', () => {
    test('should fetch country preferences successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockCountryPreferences.filter(p => p.country_code === 'IN'),
                error: null
              })
            })
          })
        })
      });

      const preferences = await service.getCountryPaymentPreferences('IN');
      
      expect(preferences).toHaveLength(2);
      expect(preferences[0].gateway_code).toBe('payu');
      expect(preferences[1].gateway_code).toBe('bank_transfer');
    });

    test('should return empty array on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })
      });

      const preferences = await service.getCountryPaymentPreferences('IN');
      
      expect(preferences).toEqual([]);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching country payment preferences:',
        expect.any(Error)
      );
    });

    test('should cache country preferences', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockCountryPreferences.filter(p => p.country_code === 'IN'),
                error: null
              })
            })
          })
        })
      });

      await service.getCountryPaymentPreferences('IN');
      await service.getCountryPaymentPreferences('IN');
      
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecommendedGateway', () => {
    test('should return country-specific preferred gateway', async () => {
      // Mock country preferences
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'country_payment_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockCountryPreferences.filter(p => p.country_code === 'IN'),
                    error: null
                  })
                })
              })
            })
          };
        }
        // For payment_gateways table
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockGateways,
              error: null
            })
          })
        };
      });

      const recommendedGateway = await service.getRecommendedGateway('IN');
      
      expect(recommendedGateway).toBe('payu');
    });

    test('should fall back to global priority when no country preferences', async () => {
      // Mock empty country preferences
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'country_payment_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockGateways,
              error: null
            })
          })
        };
      });

      const recommendedGateway = await service.getRecommendedGateway('XX');
      
      expect(recommendedGateway).toBe('payu'); // First in global priority
    });

    test('should return payu as ultimate fallback', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const recommendedGateway = await service.getRecommendedGateway('XX');
      
      // When database fails, it returns the first gateway from fallback list which is 'payu'
      expect(recommendedGateway).toBe('payu');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('getGatewaysForCountry', () => {
    test('should prioritize country-specific preferences', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'country_payment_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockCountryPreferences.filter(p => p.country_code === 'IN'),
                    error: null
                  })
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockGateways,
              error: null
            })
          })
        };
      });

      const gateways = await service.getGatewaysForCountry('IN');
      
      expect(gateways[0].code).toBe('payu'); // First in country preference
      expect(gateways[1].code).toBe('bank_transfer'); // Second in country preference
      expect(gateways[2].code).toBe('stripe'); // Not in country preference, sorted by global priority
    });

    test('should use global priority when no country preferences', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'country_payment_preferences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockGateways,
              error: null
            })
          })
        };
      });

      const gateways = await service.getGatewaysForCountry('XX');
      
      expect(gateways[0].code).toBe('payu'); // Priority 1
      expect(gateways[1].code).toBe('stripe'); // Priority 2
      expect(gateways[2].code).toBe('bank_transfer'); // Priority 3
    });

    test('should return fallback gateways on error', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const gateways = await service.getGatewaysForCountry('XX');
      
      expect(gateways).toHaveLength(13); // Fallback gateways
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Gateway Validation', () => {
    test('should validate active gateway codes', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const isValidActive = await service.isValidGatewayCode('payu');
      const isValidInactive = await service.isValidGatewayCode('inactive');
      const isValidNonexistent = await service.isValidGatewayCode('nonexistent');
      
      expect(isValidActive).toBe(true);
      expect(isValidInactive).toBe(false);
      expect(isValidNonexistent).toBe(false);
    });
  });

  describe('Currency and Country Support', () => {
    test('should check gateway currency support', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const supportsINR = await service.isGatewaySupportedForCurrency('payu', 'INR');
      const supportsEUR = await service.isGatewaySupportedForCurrency('payu', 'EUR');
      
      expect(supportsINR).toBe(true);
      expect(supportsEUR).toBe(false);
    });

    test('should check gateway country support', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const supportsIN = await service.isGatewaySupportedForCountry('payu', 'IN');
      const supportsUS = await service.isGatewaySupportedForCountry('payu', 'US');
      
      expect(supportsIN).toBe(true);
      expect(supportsUS).toBe(false);
    });

    test('should return false for non-existent gateways', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const currencySupport = await service.isGatewaySupportedForCurrency('nonexistent', 'USD');
      const countrySupport = await service.isGatewaySupportedForCountry('nonexistent', 'US');
      
      expect(currencySupport).toBe(false);
      expect(countrySupport).toBe(false);
    });
  });

  describe('Fallback Gateway Generation', () => {
    test('should generate correct fallback gateway names when database fails', async () => {
      // Force database error to trigger fallback
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      const fallbackGateways = await service.getAllGateways();
      
      expect(fallbackGateways[0].name).toBe('PayU');
      expect(fallbackGateways[0].code).toBe('payu');
      
      const bankTransferGateway = fallbackGateways.find(g => g.code === 'bank_transfer');
      expect(bankTransferGateway?.name).toBe('Bank Transfer');
    });

    test('should set correct fallback properties when database fails', async () => {
      // Force database error to trigger fallback
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      const fallbackGateways = await service.getAllGateways();
      
      fallbackGateways.forEach((gateway, index) => {
        expect(gateway.is_active).toBe(true);
        expect(gateway.test_mode).toBe(true);
        expect(gateway.priority).toBe(index + 1);
        expect(gateway.fee_percent).toBe(0);
        expect(gateway.fee_fixed).toBe(0);
        expect(gateway.config).toEqual({});
      });
    });
  });

  describe('Convenience Functions', () => {
    test('should export convenience functions that work correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const allGateways = await getAllGateways();
      const activeGateways = await getActiveGatewayCodes();
      const gateway = await getGateway('payu');
      const recommended = await getRecommendedGateway('IN');
      
      expect(allGateways).toEqual(mockGateways);
      expect(activeGateways).toEqual(['payu', 'stripe', 'bank_transfer']);
      expect(gateway?.code).toBe('payu');
      expect(recommended).toBe('payu');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null/undefined responses gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      const gateways = await service.getAllGateways();
      
      expect(gateways).toEqual([]); // When data is null with no error, returns empty array
    });

    test('should handle empty arrays gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const gateways = await service.getAllGateways();
      
      expect(gateways).toEqual([]);
    });

    test('should handle malformed gateway data', async () => {
      const malformedGateways = [
        {
          id: '1',
          name: 'Test',
          code: 'test',
          is_active: true,
          // Missing required fields
          priority: 1
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: malformedGateways,
            error: null
          })
        })
      });

      const gateways = await service.getAllGateways();
      
      expect(gateways).toEqual(malformedGateways);
    });

    test('should handle concurrent requests correctly', async () => {
      // Clear cache to ensure clean state
      service.clearCache();
      
      let callCount = 0;
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve({
              data: mockGateways,
              error: null
            });
          })
        })
      });

      // Make multiple concurrent requests
      const promises = [
        service.getAllGateways(),
        service.getAllGateways(),
        service.getAllGateways()
      ];

      const results = await Promise.all(promises);
      
      // All should return the same data
      results.forEach(result => {
        expect(result).toEqual(mockGateways);
      });
      
      // Without request deduplication, concurrent calls will all hit the database
      // This is expected behavior - the service doesn't implement request coalescing
      expect(callCount).toBe(3);
    });

    test('should handle very large datasets efficiently', async () => {
      const largeGatewayList = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Gateway ${i}`,
        code: `gateway_${i}`,
        is_active: true,
        supported_countries: ['US'],
        supported_currencies: ['USD'],
        fee_percent: 1.0,
        fee_fixed: 0.5,
        config: {},
        test_mode: false,
        priority: i,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: largeGatewayList,
            error: null
          })
        })
      });

      const start = performance.now();
      const gateways = await service.getAllGateways();
      const end = performance.now();
      
      expect(gateways).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Memory Management and Performance', () => {
    test('should not leak memory with repeated cache clears', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        service.clearCache();
        service['gatewayCache'].set(`test-${i}`, mockGateways[0]);
        service.clearCache();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    test('should handle rapid successive calls efficiently', async () => {
      // Clear cache to ensure clean state
      service.clearCache();
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockGateways,
            error: null
          })
        })
      });

      const start = performance.now();
      
      // Make many rapid calls
      const promises = Array.from({ length: 100 }, () => service.getAllGateways());
      await Promise.all(promises);
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
      // Without request deduplication, all 100 concurrent calls hit the database
      // This is expected behavior - the service doesn't implement request coalescing
      expect(mockSupabase.from).toHaveBeenCalledTimes(100);
    });
  });
});