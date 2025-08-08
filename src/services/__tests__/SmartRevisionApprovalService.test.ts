import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SmartRevisionApprovalService from '../SmartRevisionApprovalService';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('SmartRevisionApprovalService', () => {
  let service: SmartRevisionApprovalService;
  let mockSupabaseFrom: any;

  beforeEach(() => {
    service = SmartRevisionApprovalService.getInstance();
    mockSupabaseFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn(),
          maybeSingle: vi.fn()
        }),
        in: vi.fn().mockReturnValue({
          order: vi.fn()
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn()
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn()
      })
    });
    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createRevision', () => {
    const mockOrderItem = {
      id: 'order-item-1',
      order_id: 'order-1',
      current_price: 100.00,
      current_weight: 2.0,
      auto_approval_threshold_amount: 25.00,
      auto_approval_threshold_percentage: 5.00,
      orders: {
        id: 'order-1',
        customer_id: 'customer-1',
        currency: 'USD',
        total_items: 2,
        current_order_total: 200.00
      }
    };

    const mockRevisionData = {
      order_item_id: 'order-item-1',
      change_type: 'price_increase' as const,
      change_reason: 'Seller updated pricing',
      original_price: 100.00,
      new_price: 120.00,
      total_cost_impact: 20.00,
      admin_notes: 'Automatic price update from seller'
    };

    it('should auto-approve small price increases within thresholds', async () => {
      // Mock order item fetch
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockOrderItem,
        error: null
      });

      // Mock revision creation
      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: {
          id: 'revision-1',
          auto_approved: true,
          customer_approval_status: 'auto_approved'
        },
        error: null
      });

      // Mock order item update
      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      // Mock order totals update
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: { current_order_total: 200.00, variance_amount: 0 },
        error: null
      });

      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await service.createRevision(mockRevisionData);

      expect(result.success).toBe(true);
      expect(result.auto_approved).toBe(true);
      expect(result.requires_customer_approval).toBe(false);
      expect(result.requires_management_approval).toBe(false);
      expect(result.total_impact).toBe(20.00);
    });

    it('should require customer approval for larger price increases', async () => {
      const largeIncreaseData = {
        ...mockRevisionData,
        new_price: 140.00, // $40 increase (40% of original)
        total_cost_impact: 40.00
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockOrderItem,
        error: null
      });

      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: {
          id: 'revision-1',
          auto_approved: false,
          customer_approval_status: 'pending'
        },
        error: null
      });

      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await service.createRevision(largeIncreaseData);

      expect(result.success).toBe(true);
      expect(result.auto_approved).toBe(false);
      expect(result.requires_customer_approval).toBe(true);
      expect(result.requires_management_approval).toBe(false);
      expect(result.approval_deadline).toBeDefined();
    });

    it('should require management approval for very large increases', async () => {
      const hugeIncreaseData = {
        ...mockRevisionData,
        new_price: 250.00, // $150 increase (exceeds management threshold)
        total_cost_impact: 150.00
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockOrderItem,
        error: null
      });

      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: {
          id: 'revision-1',
          auto_approved: false,
          customer_approval_status: 'pending',
          requires_management_approval: true
        },
        error: null
      });

      const result = await service.createRevision(hugeIncreaseData);

      expect(result.success).toBe(true);
      expect(result.auto_approved).toBe(false);
      expect(result.requires_customer_approval).toBe(false);
      expect(result.requires_management_approval).toBe(true);
    });

    it('should be more lenient with price decreases', async () => {
      const priceDecreaseData = {
        ...mockRevisionData,
        change_type: 'price_decrease' as const,
        new_price: 85.00, // $15 decrease (15% decrease)
        total_cost_impact: -15.00
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockOrderItem,
        error: null
      });

      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: {
          id: 'revision-1',
          auto_approved: true,
          customer_approval_status: 'auto_approved'
        },
        error: null
      });

      const result = await service.createRevision(priceDecreaseData);

      expect(result.success).toBe(true);
      expect(result.auto_approved).toBe(true);
      expect(result.total_impact).toBe(-15.00); // Negative impact (savings)
    });

    it('should handle mixed weight and price changes', async () => {
      const mixedChangeData = {
        ...mockRevisionData,
        change_type: 'both_increase' as const,
        new_price: 110.00,
        original_weight: 2.0,
        new_weight: 2.5,
        total_cost_impact: 15.00 // $10 price + $5 shipping impact
      };

      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockOrderItem,
        error: null
      });

      mockSupabaseFrom().insert().select().single.mockResolvedValue({
        data: {
          id: 'revision-1',
          auto_approved: true,
          customer_approval_status: 'auto_approved'
        },
        error: null
      });

      const result = await service.createRevision(mixedChangeData);

      expect(result.success).toBe(true);
      expect(result.auto_approved).toBe(true);
    });

    it('should fail when order item is not found', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Order item not found' }
      });

      const result = await service.createRevision(mockRevisionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order item not found');
    });

    it('should calculate shipping cost impact for weight changes', async () => {
      const weightIncreaseData = {
        ...mockRevisionData,
        change_type: 'weight_increase' as const,
        original_weight: 2.0,
        new_weight: 3.0, // 1kg increase
        total_cost_impact: 5.00 // $5 per kg shipping impact
      };

      // Test the private method calculateShippingImpact
      const shippingImpact = await (service as any).calculateShippingImpact(mockOrderItem, 1.0);
      
      expect(shippingImpact).toBe(5.00); // $5 per kg
    });

    it('should calculate customs duty impact for price changes', async () => {
      // Test the private method calculateCustomsImpact
      const customsImpact = await (service as any).calculateCustomsImpact(mockOrderItem, 20.00);
      
      expect(customsImpact).toBe(3.00); // 15% of $20 = $3
    });

    it('should ignore minimal weight changes', async () => {
      // Test with very small weight change
      const shippingImpact = await (service as any).calculateShippingImpact(mockOrderItem, 0.05);
      
      expect(shippingImpact).toBe(0); // Should ignore changes < 0.1kg
    });

    it('should ignore minimal price changes for customs', async () => {
      // Test with very small price change
      const customsImpact = await (service as any).calculateCustomsImpact(mockOrderItem, 0.50);
      
      expect(customsImpact).toBe(0); // Should ignore changes < $1.00
    });
  });

  describe('processCustomerResponse', () => {
    const mockRevision = {
      id: 'revision-1',
      order_item_id: 'order-item-1',
      new_price: 120.00,
      new_weight: 2.5,
      total_cost_impact: 25.00,
      order_items: {
        id: 'order-item-1',
        order_id: 'order-1',
        original_price: 100.00,
        original_weight: 2.0,
        orders: {
          id: 'order-1',
          customer_id: 'customer-1'
        }
      }
    };

    it('should process customer approval correctly', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockRevision,
        error: null
      });

      // Mock revision update
      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      // Mock order item update (apply changes)
      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await service.processCustomerResponse(
        'revision-1',
        'approved',
        'Customer approved the price increase'
      );

      expect(result.success).toBe(true);
      
      // Verify revision was updated with customer response
      expect(mockSupabaseFrom().update).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_approval_status: 'approved',
          customer_response_notes: 'Customer approved the price increase',
          customer_responded_at: expect.any(String)
        })
      );
    });

    it('should process customer rejection correctly', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: mockRevision,
        error: null
      });

      mockSupabaseFrom().update().eq.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await service.processCustomerResponse(
        'revision-1',
        'rejected',
        'Customer does not accept price increase'
      );

      expect(result.success).toBe(true);
      
      // Verify order item status was reset
      expect(mockSupabaseFrom().update).toHaveBeenCalledWith(
        expect.objectContaining({
          item_status: 'pending_order_placement',
          requires_customer_approval: false
        })
      );
    });

    it('should fail when revision is not found', async () => {
      mockSupabaseFrom().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Revision not found' }
      });

      const result = await service.processCustomerResponse('invalid-revision', 'approved');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Revision not found');
    });
  });

  describe('getPendingRevisions', () => {
    it('should fetch pending revisions for customer', async () => {
      const mockRevisions = [
        {
          id: 'revision-1',
          customer_approval_status: 'pending',
          change_type: 'price_increase',
          total_cost_impact: 25.00,
          order_items: {
            id: 'order-item-1',
            product_name: 'Test Product',
            orders: {
              id: 'order-1',
              order_number: 'ORD-202501-0001',
              customer_id: 'customer-1'
            }
          }
        }
      ];

      mockSupabaseFrom().select().eq().order.mockResolvedValue({
        data: mockRevisions,
        error: null
      });

      const result = await service.getPendingRevisions('customer-1');

      expect(result).toEqual(mockRevisions);
      expect(mockSupabaseFrom().select).toHaveBeenCalledWith(expect.stringContaining('order_items!inner'));
    });

    it('should return empty array when no pending revisions', async () => {
      mockSupabaseFrom().select().eq().order.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await service.getPendingRevisions('customer-1');

      expect(result).toEqual([]);
    });

    it('should handle fetch error gracefully', async () => {
      mockSupabaseFrom().select().eq().order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await service.getPendingRevisions('customer-1');

      expect(result).toEqual([]);
    });
  });

  describe('approval logic', () => {
    it('should determine auto-approval for small amounts', () => {
      const impactAnalysis = {
        absolute_impact: 20.00,
        impact_percentage: 4.0,
        total_cost_impact: 20.00
      };

      const config = (service as any).defaultConfig;
      const decision = (service as any).determineApprovalRequirements(impactAnalysis, config);

      expect(decision.auto_approved).toBe(true);
      expect(decision.requires_customer_approval).toBe(false);
      expect(decision.requires_management_approval).toBe(false);
    });

    it('should require customer approval for medium amounts', () => {
      const impactAnalysis = {
        absolute_impact: 40.00,
        impact_percentage: 8.0,
        total_cost_impact: 40.00
      };

      const config = (service as any).defaultConfig;
      const decision = (service as any).determineApprovalRequirements(impactAnalysis, config);

      expect(decision.auto_approved).toBe(false);
      expect(decision.requires_customer_approval).toBe(true);
      expect(decision.requires_management_approval).toBe(false);
    });

    it('should require management approval for large amounts', () => {
      const impactAnalysis = {
        absolute_impact: 150.00,
        impact_percentage: 20.0,
        total_cost_impact: 150.00
      };

      const config = (service as any).defaultConfig;
      const decision = (service as any).determineApprovalRequirements(impactAnalysis, config);

      expect(decision.auto_approved).toBe(false);
      expect(decision.requires_customer_approval).toBe(false);
      expect(decision.requires_management_approval).toBe(true);
    });

    it('should be more lenient with decreases', () => {
      const impactAnalysis = {
        absolute_impact: 40.00,
        impact_percentage: 12.0,
        total_cost_impact: -40.00 // Negative (decrease)
      };

      const config = (service as any).defaultConfig;
      const decision = (service as any).determineApprovalRequirements(impactAnalysis, config);

      expect(decision.auto_approved).toBe(true); // Should auto-approve decreases up to 15%
    });
  });

  describe('impact calculation', () => {
    const mockOrderItem = {
      current_price: 100.00,
      current_weight: 2.0
    };

    it('should calculate price change percentage correctly', async () => {
      const revisionData = {
        original_price: 100.00,
        new_price: 110.00,
        original_weight: 2.0,
        new_weight: 2.0,
        total_cost_impact: 10.00
      };

      const impact = await (service as any).calculateRevisionImpact(mockOrderItem, revisionData);

      expect(impact.price_change).toBe(10.00);
      expect(impact.price_change_percentage).toBe(10.0);
      expect(impact.weight_change).toBe(0);
      expect(impact.weight_change_percentage).toBe(0);
    });

    it('should calculate weight change percentage correctly', async () => {
      const revisionData = {
        original_price: 100.00,
        new_price: 100.00,
        original_weight: 2.0,
        new_weight: 2.5,
        total_cost_impact: 5.00
      };

      const impact = await (service as any).calculateRevisionImpact(mockOrderItem, revisionData);

      expect(impact.price_change).toBe(0);
      expect(impact.weight_change).toBe(0.5);
      expect(impact.weight_change_percentage).toBe(25.0);
    });

    it('should calculate total impact correctly', async () => {
      const revisionData = {
        original_price: 100.00,
        new_price: 110.00,
        original_weight: 2.0,
        new_weight: 2.5,
        total_cost_impact: 15.00 // $10 price + $5 shipping
      };

      const impact = await (service as any).calculateRevisionImpact(mockOrderItem, revisionData);

      expect(impact.total_cost_impact).toBe(15.00);
      expect(impact.absolute_impact).toBe(15.00);
      expect(impact.impact_percentage).toBe(15.0); // 15/100 = 15%
    });
  });
});