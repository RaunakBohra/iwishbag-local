import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompactShippingManager } from '../smart-components/CompactShippingManager';
import { trackingService } from '@/services/TrackingService';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('@/services/TrackingService');
vi.mock('@/hooks/use-toast');

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Truck: ({ className }: { className?: string }) => <div className={className} data-testid="truck-icon">🚛</div>,
  Package: ({ className }: { className?: string }) => <div className={className} data-testid="package-icon">📦</div>,
  Calendar: ({ className }: { className?: string }) => <div className={className} data-testid="calendar-icon">📅</div>,
  Hash: ({ className }: { className?: string }) => <div className={className} data-testid="hash-icon">#</div>,
  CheckCircle: ({ className }: { className?: string }) => <div className={className} data-testid="check-circle-icon">✓</div>,
  Clock: ({ className }: { className?: string }) => <div className={className} data-testid="clock-icon">⏰</div>,
  AlertCircle: ({ className }: { className?: string }) => <div className={className} data-testid="alert-circle-icon">⚠️</div>,
  Send: ({ className }: { className?: string }) => <div className={className} data-testid="send-icon">📤</div>,
  Loader2: ({ className }: { className?: string }) => <div className={className} data-testid="loader-icon">⏳</div>,
}));

// Create mock UnifiedQuote for testing
const createMockQuote = (overrides: Partial<UnifiedQuote> = {}): UnifiedQuote => ({
  id: 'test-quote-123',
  user_id: 'test-user',
  origin_country: 'US',
  destination_country: 'IN',
  currency: 'USD',
  final_total_usd: 150.00,
  iwish_tracking_id: null,
  tracking_status: null,
  shipping_carrier: null,
  tracking_number: null,
  estimated_delivery_date: null,
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      price_usd: 100,
      weight_kg: 2,
      quantity: 1,
      sku: 'TEST-001',
      category: 'Electronics',
    },
  ],
  calculation_data: {
    breakdown: {
      items_total: 100,
      shipping: 25,
      customs: 15,
      taxes: 10,
      fees: 8,
      discount: 0,
    },
    exchange_rate: {
      rate: 1.0,
      source: 'cached',
      confidence: 0.9,
    },
    sales_tax_price: 10,
    discount: 0,
  },
  operational_data: {
    customs: {
      percentage: 10,
    },
    shipping: {
      selected_option: 'standard',
    },
    handling_charge: 5,
    insurance_amount: 3,
    payment_gateway_fee: 5,
    domestic_shipping: 0,
    vat_amount: 0,
  },
  customer_data: {
    preferences: {
      insurance_opted_in: false,
    },
  },
  optimization_score: 85,
  ...overrides,
});

describe('CompactShippingManager', () => {
  const mockProps = {
    onUpdateQuote: vi.fn(),
    compact: true,
  };

  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock toast hook
    vi.doMock('@/hooks/use-toast', () => ({
      useToast: () => ({ toast: mockToast }),
    }));

    // Mock TrackingService methods
    vi.mocked(trackingService.generateTrackingId).mockResolvedValue('IWB20251001');
    vi.mocked(trackingService.markAsShipped).mockResolvedValue(true);
  });

  describe('Tracking ID Generation', () => {
    it('should generate tracking ID when button is clicked', async () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: null,
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      // Find and click the generate tracking ID button
      const generateButton = screen.getByRole('button', { name: /generate.*tracking/i });
      expect(generateButton).toBeInTheDocument();

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(trackingService.generateTrackingId).toHaveBeenCalledWith('test-quote-123');
        expect(trackingService.generateTrackingId).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success toast when tracking ID generation succeeds', async () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: null,
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate.*tracking/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Tracking ID Generated',
          description: 'iwishBag Tracking ID: IWB20251001',
          duration: 3000,
        });
        expect(mockProps.onUpdateQuote).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error toast when tracking ID generation fails', async () => {
      vi.mocked(trackingService.generateTrackingId).mockResolvedValue(null);

      const mockQuote = createMockQuote({
        iwish_tracking_id: null,
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate.*tracking/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Generation Failed',
          description: 'Unable to generate tracking ID. Please try again.',
          variant: 'destructive',
        });
      });
    });

    it('should handle exceptions during tracking ID generation', async () => {
      vi.mocked(trackingService.generateTrackingId).mockRejectedValue(new Error('Network error'));

      const mockQuote = createMockQuote({
        iwish_tracking_id: null,
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate.*tracking/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'An error occurred while generating tracking ID.',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Mark as Shipped Functionality', () => {
    it('should mark quote as shipped when all required fields are provided', async () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251001',
        tracking_status: 'pending',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      // Fill in shipping form
      const carrierSelect = screen.getByRole('combobox');
      fireEvent.click(carrierSelect);
      
      const dhlOption = screen.getByText('DHL Express');
      fireEvent.click(dhlOption);

      const trackingInput = screen.getByPlaceholderText(/tracking.*number/i);
      fireEvent.change(trackingInput, { target: { value: 'DHL123456789' } });

      const estimatedDateInput = screen.getByDisplayValue('');
      fireEvent.change(estimatedDateInput, { target: { value: '2025-07-30' } });

      // Click mark as shipped button
      const markShippedButton = screen.getByRole('button', { name: /mark.*shipped/i });
      fireEvent.click(markShippedButton);

      await waitFor(() => {
        expect(trackingService.markAsShipped).toHaveBeenCalledWith(
          'test-quote-123',
          'dhl',
          'DHL123456789',
          '2025-07-30'
        );
        expect(trackingService.markAsShipped).toHaveBeenCalledTimes(1);
      });
    });

    it('should show validation error when required fields are missing', async () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251001',
        tracking_status: 'pending',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      // Try to mark as shipped without filling required fields
      const markShippedButton = screen.getByRole('button', { name: /mark.*shipped/i });
      fireEvent.click(markShippedButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Missing Information',
          description: 'Please select carrier and enter tracking number.',
          variant: 'destructive',
        });
        expect(trackingService.markAsShipped).not.toHaveBeenCalled();
      });
    });

    it('should show success toast when marking as shipped succeeds', async () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251001',
        tracking_status: 'pending',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      // Fill form and submit
      const carrierSelect = screen.getByRole('combobox');
      fireEvent.click(carrierSelect);
      const fedexOption = screen.getByText('FedEx');
      fireEvent.click(fedexOption);

      const trackingInput = screen.getByPlaceholderText(/tracking.*number/i);
      fireEvent.change(trackingInput, { target: { value: 'FX987654321' } });

      const markShippedButton = screen.getByRole('button', { name: /mark.*shipped/i });
      fireEvent.click(markShippedButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Marked as Shipped',
          description: 'Package shipped via fedex',
          duration: 3000,
        });
        expect(mockProps.onUpdateQuote).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error toast when marking as shipped fails', async () => {
      vi.mocked(trackingService.markAsShipped).mockResolvedValue(false);

      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251001',
        tracking_status: 'pending',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      // Fill form and submit
      const carrierSelect = screen.getByRole('combobox');
      fireEvent.click(carrierSelect);
      const upsOption = screen.getByText('UPS');
      fireEvent.click(upsOption);

      const trackingInput = screen.getByPlaceholderText(/tracking.*number/i);
      fireEvent.change(trackingInput, { target: { value: 'UPS111222333' } });

      const markShippedButton = screen.getByRole('button', { name: /mark.*shipped/i });
      fireEvent.click(markShippedButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Update Failed',
          description: 'Unable to mark as shipped. Please try again.',
          variant: 'destructive',
        });
      });
    });

    it('should handle exceptions during mark as shipped', async () => {
      vi.mocked(trackingService.markAsShipped).mockRejectedValue(new Error('Database error'));

      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251001',
        tracking_status: 'pending',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      // Fill form and submit
      const carrierSelect = screen.getByRole('combobox');
      fireEvent.click(carrierSelect);
      const blueDartOption = screen.getByText('Blue Dart');
      fireEvent.click(blueDartOption);

      const trackingInput = screen.getByPlaceholderText(/tracking.*number/i);
      fireEvent.change(trackingInput, { target: { value: 'BD555666777' } });

      const markShippedButton = screen.getByRole('button', { name: /mark.*shipped/i });
      fireEvent.click(markShippedButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'An error occurred while updating shipping status.',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Status Display', () => {
    it('should display correct status icon for pending status', () => {
      const mockQuote = createMockQuote({
        tracking_status: 'pending',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should display correct status icon for preparing status', () => {
      const mockQuote = createMockQuote({
        tracking_status: 'preparing',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should display correct status icon for shipped status', () => {
      const mockQuote = createMockQuote({
        tracking_status: 'shipped',
        shipping_carrier: 'DHL',
        tracking_number: 'DHL123456789',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      expect(screen.getByTestId('truck-icon')).toBeInTheDocument();
      expect(screen.getByText('DHL')).toBeInTheDocument();
      expect(screen.getByText('DHL123456789')).toBeInTheDocument();
    });

    it('should display correct status icon for delivered status', () => {
      const mockQuote = createMockQuote({
        tracking_status: 'delivered',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should display correct status icon for exception status', () => {
      const mockQuote = createMockQuote({
        tracking_status: 'exception',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('should display existing tracking information when available', () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251005',
        tracking_status: 'shipped',
        shipping_carrier: 'FedEx',
        tracking_number: 'FX987654321',
        estimated_delivery_date: '2025-07-28',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      expect(screen.getByText('IWB20251005')).toBeInTheDocument();
      expect(screen.getByText('FedEx')).toBeInTheDocument();
      expect(screen.getByText('FX987654321')).toBeInTheDocument();
      expect(screen.getByText('2025-07-28')).toBeInTheDocument();
    });
  });

  describe('Carrier Selection', () => {
    it('should provide all standard carrier options', () => {
      const mockQuote = createMockQuote({
        iwish_tracking_id: 'IWB20251001',
      });

      render(
        <CompactShippingManager
          quote={mockQuote}
          {...mockProps}
        />
      );

      const carrierSelect = screen.getByRole('combobox');
      fireEvent.click(carrierSelect);

      // Check that all expected carriers are available
      expect(screen.getByText('DHL Express')).toBeInTheDocument();
      expect(screen.getByText('FedEx')).toBeInTheDocument();
      expect(screen.getByText('UPS')).toBeInTheDocument();
      expect(screen.getByText('Blue Dart')).toBeInTheDocument();
      expect(screen.getByText('Delhivery')).toBeInTheDocument();
      expect(screen.getByText('DTDC')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });
  });
});