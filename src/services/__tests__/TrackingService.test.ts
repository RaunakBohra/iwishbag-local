import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackingService } from '../TrackingService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/services/UnifiedDataEngine');

describe('TrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateTrackingId - ID Generation', () => {
    it('should generate tracking ID in correct format (IWB{YEAR}{SEQUENCE})', async () => {
      const currentYear = new Date().getFullYear();
      const mockTrackingId = `IWB${currentYear}1001`;

      // Mock database function call
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockTrackingId,
        error: null,
      });

      // Mock quote update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await trackingService.generateTrackingId('test-quote-123');

      expect(result).toBe(mockTrackingId);
      expect(result).toMatch(/^IWB\d{4}\d+$/);
      expect(supabase.rpc).toHaveBeenCalledWith('generate_iwish_tracking_id');
      expect(supabase.from).toHaveBeenCalledWith('quotes');
      expect(mockUpdate).toHaveBeenCalledWith({ iwish_tracking_id: mockTrackingId });
    });

    it('should return null when database function fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Function failed' },
      });

      const result = await trackingService.generateTrackingId('test-quote-456');

      expect(result).toBeNull();
    });

    it('should return null when quote update fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'IWB20251001',
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await trackingService.generateTrackingId('test-quote-789');

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Database connection failed'));

      const result = await trackingService.generateTrackingId('test-quote-error');

      expect(result).toBeNull();
    });
  });

  describe('updateTrackingStatus - Status Updates', () => {
    it('should successfully update tracking status with all fields', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const updateData = {
        tracking_status: 'shipped' as const,
        shipping_carrier: 'DHL',
        tracking_number: 'DHL123456789',
        estimated_delivery_date: '2025-07-28',
      };

      const result = await trackingService.updateTrackingStatus('test-quote-123', updateData);

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        tracking_status: 'shipped',
        shipping_carrier: 'DHL',
        tracking_number: 'DHL123456789',
        estimated_delivery_date: '2025-07-28',
      });
    });

    it('should update only tracking status when optional fields not provided', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const updateData = {
        tracking_status: 'preparing' as const,
      };

      const result = await trackingService.updateTrackingStatus('test-quote-456', updateData);

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        tracking_status: 'preparing',
      });
    });

    it('should return false when database update fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const updateData = {
        tracking_status: 'delivered' as const,
      };

      const result = await trackingService.updateTrackingStatus('test-quote-789', updateData);

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Database error');
      });

      const updateData = {
        tracking_status: 'exception' as const,
      };

      const result = await trackingService.updateTrackingStatus('test-quote-error', updateData);

      expect(result).toBe(false);
    });
  });

  describe('Status Workflow Validation', () => {
    it('should allow valid transitions: pending → preparing', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await trackingService.updateTrackingStatus('test-quote-123', {
        tracking_status: 'preparing',
      });

      expect(result).toBe(true);
    });

    it('should allow valid transitions: preparing → shipped', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await trackingService.updateTrackingStatus('test-quote-123', {
        tracking_status: 'shipped',
      });

      expect(result).toBe(true);
    });

    it('should allow valid transitions: shipped → delivered', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await trackingService.updateTrackingStatus('test-quote-123', {
        tracking_status: 'delivered',
      });

      expect(result).toBe(true);
    });

    it('should allow exception status from any state (recovery path)', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await trackingService.updateTrackingStatus('test-quote-123', {
        tracking_status: 'exception',
      });

      expect(result).toBe(true);
    });

    it('should allow recovery from exception to any valid status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      // Exception → preparing (recovery)
      const result = await trackingService.updateTrackingStatus('test-quote-recovery', {
        tracking_status: 'preparing',
      });

      expect(result).toBe(true);
    });
  });

  describe('markAsShipped - Mark as Shipped', () => {
    it('should mark as shipped with existing tracking ID', async () => {
      // Mock getBasicTrackingInfo to return existing tracking ID
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              iwish_tracking_id: 'IWB20251001',
              tracking_status: 'preparing',
              shipping_carrier: null,
              tracking_number: null,
              estimated_delivery_date: null,
              display_id: 'Q123',
            },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      } as any);

      const result = await trackingService.markAsShipped(
        'test-quote-123',
        'FedEx',
        'FX123456789',
        '2025-07-30'
      );

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        tracking_status: 'shipped',
        shipping_carrier: 'FedEx',
        tracking_number: 'FX123456789',
        estimated_delivery_date: '2025-07-30',
      });
    });

    it('should generate tracking ID and then mark as shipped when ID doesnt exist', async () => {
      // Mock getBasicTrackingInfo to return no tracking ID
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              iwish_tracking_id: null,
              tracking_status: 'pending',
              shipping_carrier: null,
              tracking_number: null,
              estimated_delivery_date: null,
              display_id: 'Q456',
            },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Mock RPC call for generating tracking ID
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'IWB20251002',
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      } as any);

      const result = await trackingService.markAsShipped(
        'test-quote-456',
        'UPS',
        'UPS987654321'
      );

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('generate_iwish_tracking_id');
    });

    it('should return false when tracking ID generation fails', async () => {
      // Mock getBasicTrackingInfo to return no tracking ID
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              iwish_tracking_id: null,
              tracking_status: 'pending',
            },
            error: null,
          }),
        }),
      });

      // Mock RPC to fail
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Sequence error' },
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await trackingService.markAsShipped(
        'test-quote-fail',
        'DHL',
        'DHL111111111'
      );

      expect(result).toBe(false);
    });

    it('should correctly set all shipping details', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { iwish_tracking_id: 'IWB20251003' },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      } as any);

      const result = await trackingService.markAsShipped(
        'test-quote-details',
        'USPS',
        'USPS555666777',
        '2025-08-01'
      );

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        tracking_status: 'shipped',
        shipping_carrier: 'USPS',
        tracking_number: 'USPS555666777',
        estimated_delivery_date: '2025-08-01',
      });
    });
  });

  describe('Tracking Information Retrieval', () => {
    it('should get basic tracking info by quote ID', async () => {
      const mockTrackingData = {
        iwish_tracking_id: 'IWB20251005',
        tracking_status: 'shipped',
        shipping_carrier: 'DHL',
        tracking_number: 'DHL123456789',
        estimated_delivery_date: '2025-07-28',
        display_id: 'Q789',
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTrackingData,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await trackingService.getBasicTrackingInfo('test-quote-123');

      expect(result).toEqual(mockTrackingData);
      expect(mockSelect).toHaveBeenCalledWith(
        'iwish_tracking_id, tracking_status, shipping_carrier, tracking_number, estimated_delivery_date, display_id'
      );
    });

    it('should get tracking info by iwishBag tracking ID', async () => {
      const mockTrackingData = {
        iwish_tracking_id: 'IWB20251006',
        tracking_status: 'delivered',
        shipping_carrier: 'FedEx',
        tracking_number: 'FX987654321',
        estimated_delivery_date: '2025-07-25',
        display_id: 'Q890',
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTrackingData,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await trackingService.getTrackingInfoByTrackingId('IWB20251006');

      expect(result).toEqual(mockTrackingData);
      expect(supabase.from).toHaveBeenCalledWith('quotes');
    });

    it('should return null when tracking ID not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'No rows returned' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await trackingService.getTrackingInfoByTrackingId('IWB99999999');

      expect(result).toBeNull();
    });

    it('should get full quote data for customer tracking', async () => {
      const mockQuoteData = {
        id: 'quote-123',
        iwish_tracking_id: 'IWB20251007',
        tracking_status: 'shipped',
        final_total_usd: 150,
        items: [{ name: 'Test Product', price_usd: 100 }],
      };

      // Mock the first select to get quote ID
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'quote-123' },
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // Mock the UnifiedDataEngine import and getQuote method
      const mockUnifiedDataEngine = {
        getQuote: vi.fn().mockResolvedValue(mockQuoteData),
      };

      vi.doMock('@/services/UnifiedDataEngine', () => ({
        unifiedDataEngine: mockUnifiedDataEngine,
      }));

      const result = await trackingService.getTrackingInfo('IWB20251007');

      expect(result).toEqual(mockQuoteData);
      expect(mockSelect).toHaveBeenCalledWith('id');
    });

    it('should return null when quote not found for tracking ID', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Quote not found' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await trackingService.getTrackingInfo('IWB99999999');

      expect(result).toBeNull();
    });
  });

  describe('Status Display Helpers', () => {
    it('should return correct display text for each status', () => {
      expect(trackingService.getStatusDisplayText('pending')).toBe('Order Confirmed');
      expect(trackingService.getStatusDisplayText('preparing')).toBe('Preparing for Shipment');
      expect(trackingService.getStatusDisplayText('shipped')).toBe('Shipped');
      expect(trackingService.getStatusDisplayText('delivered')).toBe('Delivered');
      expect(trackingService.getStatusDisplayText('exception')).toBe('Delivery Issue');
      expect(trackingService.getStatusDisplayText('unknown')).toBe('Unknown Status');
      expect(trackingService.getStatusDisplayText(null)).toBe('Unknown Status');
    });

    it('should return correct badge variants for each status', () => {
      expect(trackingService.getStatusBadgeVariant('pending')).toBe('secondary');
      expect(trackingService.getStatusBadgeVariant('preparing')).toBe('default');
      expect(trackingService.getStatusBadgeVariant('shipped')).toBe('default');
      expect(trackingService.getStatusBadgeVariant('delivered')).toBe('success');
      expect(trackingService.getStatusBadgeVariant('exception')).toBe('destructive');
      expect(trackingService.getStatusBadgeVariant('unknown')).toBe('secondary');
      expect(trackingService.getStatusBadgeVariant(null)).toBe('secondary');
    });
  });
});