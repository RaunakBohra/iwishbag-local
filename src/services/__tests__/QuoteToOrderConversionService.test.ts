import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QuoteToOrderConversionService from '../QuoteToOrderConversionService';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('QuoteToOrderConversionService', () => {
  let service: QuoteToOrderConversionService;
  let mockSupabaseFrom: any;

  beforeEach(() => {
    service = QuoteToOrderConversionService.getInstance();
    
    // Create a more comprehensive mock chain
    const createMockChain = () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        gte: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      })
    });

    mockSupabaseFrom = vi.fn().mockImplementation(createMockChain);
    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('convertQuoteToOrder', () => {
    const mockQuoteData = {
      id: 'quote-1',
      customer_id: 'customer-1',
      total_amount: 150.00,
      currency: 'USD',
      items: [
        {
          id: 'item-1',
          product_name: 'Test Product 1',
          product_url: 'https://example.com/product1',
          quantity: 2,
          price_usd: 75.00,
          weight_kg: 1.2,
          seller_platform: 'amazon',
          origin_country: 'US',
          destination_country: 'IN'
        }
      ],
      delivery_address: {
        address_line1: '123 Test St',
        city: 'Mumbai',
        state: 'MH',
        postal_code: '400001',
        country: 'IN'
      }
    };

    const mockOptions = {
      payment_method: 'stripe' as const,
      delivery_preferences: {
        delivery_method: 'warehouse_consolidation' as const,
        consolidation_preference: 'wait_for_all' as const,
        quality_check_level: 'standard' as const,
        priority: 'balanced' as const
      },
      warehouse_assignment: 'auto' as const,
      automation_enabled: true
    };

    it('should successfully convert a valid quote to order', async () => {
      // Mock successful quote fetch
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: {
          ...mockQuoteData,
          quote_items_v2: mockQuoteData.items
        },
        error: null
      });

      // Mock customer validation
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'customer-1' },
        error: null
      });

      // Mock existing order check
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock order count for number generation
      mockSupabaseFrom().select().gte().lt.mockResolvedValue({
        data: [1, 2, 3], // 3 existing orders this month
        error: null
      });

      // Mock order creation
      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: {
          id: 'order-1',
          order_number: 'ORD-202501-0004',
          status: 'pending_payment'
        },
        error: null
      });

      // Mock order items creation
      mockSupabaseFrom().insert().select.mockResolvedValue({
        data: [{ id: 'order-item-1', order_id: 'order-1' }],
        error: null
      });

      // Mock delivery preferences creation
      mockSupabaseFrom().insert.mockResolvedValue({
        data: {},
        error: null
      });

      // Mock automation task creation
      mockSupabaseFrom().select().eq.mockResolvedValue({
        data: [{ id: 'order-item-1', seller_platform: 'amazon' }],
        error: null
      });

      mockSupabaseFrom().insert.mockResolvedValue({
        data: {},
        error: null
      });

      // Mock quote update
      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await service.convertQuoteToOrder('quote-1', mockOptions);

      expect(result.success).toBe(true);
      expect(result.order_id).toBe('order-1');
      expect(result.order_number).toBe('ORD-202501-0004');
      expect(result.error).toBeUndefined();
    });

    it('should fail when quote is not found', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Quote not found' }
      });

      const result = await service.convertQuoteToOrder('invalid-quote', mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quote not found or inaccessible');
    });

    it('should fail when quote has no items', async () => {
      const emptyQuoteData = { ...mockQuoteData, items: [] };
      
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: {
          ...emptyQuoteData,
          quote_items_v2: []
        },
        error: null
      });

      const result = await service.convertQuoteToOrder('quote-1', mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quote has no items to convert');
    });

    it('should fail when customer does not exist', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: {
          ...mockQuoteData,
          quote_items_v2: mockQuoteData.items
        },
        error: null
      });

      // Mock customer not found
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Customer not found' }
      });

      const result = await service.convertQuoteToOrder('quote-1', mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });

    it('should fail when quote is already converted', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: {
          ...mockQuoteData,
          quote_items_v2: mockQuoteData.items
        },
        error: null
      });

      // Mock customer exists
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'customer-1' },
        error: null
      });

      // Mock existing order found
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'existing-order-1' },
        error: null
      });

      const result = await service.convertQuoteToOrder('quote-1', mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quote has already been converted to an order');
    });

    it('should set correct payment status for COD orders', async () => {
      const codOptions = { ...mockOptions, payment_method: 'cod' as const };

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: {
          ...mockQuoteData,
          quote_items_v2: mockQuoteData.items
        },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'customer-1' },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      mockSupabaseFrom().select().gte().lt.mockResolvedValue({
        data: [],
        error: null
      });

      const mockOrderInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'order-1',
          order_number: 'ORD-202501-0001',
          status: 'payment_pending',
          payment_status: 'cod_pending'
        },
        error: null
      });

      mockSupabaseFrom().insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockOrderInsert
        })
      });

      const result = await service.convertQuoteToOrder('quote-1', codOptions);

      expect(result.success).toBe(true);
      
      // Verify the order was created with correct COD status
      const orderInsertCall = mockSupabaseFrom().insert.mock.calls[0][0];
      expect(orderInsertCall.status).toBe('payment_pending');
      expect(orderInsertCall.payment_status).toBe('cod_pending');
      expect(orderInsertCall.payment_method).toBe('cod');
    });

    it('should determine correct warehouse based on item origins', async () => {
      const multiOriginQuoteData = {
        ...mockQuoteData,
        items: [
          { ...mockQuoteData.items[0], origin_country: 'IN' },
          { ...mockQuoteData.items[0], origin_country: 'IN', id: 'item-2' },
          { ...mockQuoteData.items[0], origin_country: 'CN', id: 'item-3' }
        ]
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: {
          ...multiOriginQuoteData,
          quote_items_v2: multiOriginQuoteData.items
        },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'customer-1' },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      mockSupabaseFrom().select().gte().lt.mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: { id: 'order-1', order_number: 'ORD-202501-0001' },
        error: null
      });

      await service.convertQuoteToOrder('quote-1', mockOptions);

      const orderInsertCall = mockSupabaseFrom().insert.mock.calls[0][0];
      expect(orderInsertCall.primary_warehouse).toBe('india_warehouse'); // IN is most common
    });

    it('should handle order creation failure gracefully', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: {
          ...mockQuoteData,
          quote_items_v2: mockQuoteData.items
        },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'customer-1' },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      mockSupabaseFrom().select().gte().lt.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock order creation failure
      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create order' }
      });

      const result = await service.convertQuoteToOrder('quote-1', mockOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create order record');
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate correct order number format', async () => {
      mockSupabaseFrom().select().gte().lt.mockResolvedValue({
        data: [1, 2, 3], // 3 existing orders this month
        error: null
      });

      // Access private method via any cast for testing
      const orderNumber = await (service as any).generateOrderNumber();
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const expectedPattern = `ORD-${year}${month}-0004`; // 4th order this month

      expect(orderNumber).toBe(expectedPattern);
    });

    it('should handle first order of the month', async () => {
      mockSupabaseFrom().select().gte().lt.mockResolvedValue({
        data: [], // No existing orders this month
        error: null
      });

      const orderNumber = await (service as any).generateOrderNumber();
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const expectedPattern = `ORD-${year}${month}-0001`; // First order this month

      expect(orderNumber).toBe(expectedPattern);
    });
  });

  describe('determinePrimaryWarehouse', () => {
    it('should return preferred warehouse when specified', async () => {
      const items = [
        { origin_country: 'US' },
        { origin_country: 'CN' }
      ];

      const warehouse = await (service as any).determinePrimaryWarehouse(items, 'china_warehouse');
      
      expect(warehouse).toBe('china_warehouse');
    });

    it('should determine warehouse based on most common origin country', async () => {
      const items = [
        { origin_country: 'IN' },
        { origin_country: 'IN' },
        { origin_country: 'US' }
      ];

      const warehouse = await (service as any).determinePrimaryWarehouse(items, 'auto');
      
      expect(warehouse).toBe('india_warehouse');
    });

    it('should default to india_warehouse for unknown countries', async () => {
      const items = [
        { origin_country: 'XX' },
        { origin_country: 'YY' }
      ];

      const warehouse = await (service as any).determinePrimaryWarehouse(items, 'auto');
      
      expect(warehouse).toBe('india_warehouse');
    });
  });

  describe('getOrderWithDetails', () => {
    it('should fetch order with all related data', async () => {
      const mockOrderData = {
        id: 'order-1',
        order_number: 'ORD-202501-0001',
        status: 'pending_payment',
        order_items: [],
        customer_delivery_preferences: {},
        order_shipments: [],
        profiles: {
          id: 'customer-1',
          full_name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890'
        }
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockOrderData,
        error: null
      });

      const result = await service.getOrderWithDetails('order-1');

      expect(result).toEqual(mockOrderData);
      expect(mockSupabaseFrom().select).toHaveBeenCalledWith(expect.stringContaining('profiles!customer_id'));
    });

    it('should return null when order not found', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Order not found' }
      });

      const result = await service.getOrderWithDetails('invalid-order');

      expect(result).toBeNull();
    });
  });

  describe('validation methods', () => {
    it('should validate quote data correctly', async () => {
      const validQuoteData = {
        id: 'quote-1',
        customer_id: 'customer-1',
        total_amount: 100.00,
        items: [{ id: 'item-1' }]
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: { id: 'customer-1' },
        error: null
      });

      mockSupabaseFrom().select().eq().single.mockResolvedValueOnce({
        data: null, // No existing order
        error: null
      });

      const result = await (service as any).validateQuoteForConversion(validQuoteData);

      expect(result.valid).toBe(true);
    });

    it('should reject quote with zero total amount', async () => {
      const invalidQuoteData = {
        id: 'quote-1',
        customer_id: 'customer-1',
        total_amount: 0,
        items: [{ id: 'item-1' }]
      };

      const result = await (service as any).validateQuoteForConversion(invalidQuoteData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Quote total amount must be greater than 0');
    });
  });
});