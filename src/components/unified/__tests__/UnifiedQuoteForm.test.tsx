import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteForm } from '../UnifiedQuoteForm';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Mock file upload
const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
Object.defineProperty(mockFile, 'size', { value: 1024 }); // 1KB

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
  },
});

// Mock gtag for analytics
Object.defineProperty(window, 'gtag', {
  value: vi.fn(),
});

// Test data
const mockExistingQuote: UnifiedQuote = {
  id: 'test-quote-id',
  display_id: 'QT-12345',
  user_id: 'test-user-id',
  status: 'pending',
  created_at: '2024-01-15T10:00:00Z',
  final_total_usd: 159.99,
  destination_country: 'IN',
  origin_country: 'US',
  customer_data: {
    info: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    }
  },
  shipping_address: {
    formatted: '123 Test St, Mumbai, Maharashtra 400001, India'
  },
  items: [
    {
      id: 'item-1',
      name: 'Test Product',
      description: 'A great test product',
      quantity: 2,
      price: 60.00,
      product_url: 'https://amazon.com/test-product',
      image_url: 'https://example.com/image.jpg'
    }
  ],
  notes: 'Test special instructions'
};

// Helper function to render component with providers
const renderUnifiedQuoteForm = (
  props: Partial<Parameters<typeof UnifiedQuoteForm>[0]> = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultProps = {
    mode: 'create' as const,
    viewMode: 'customer' as const,
    locale: 'en' as const,
    ...props,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>
          <UnifiedQuoteForm {...defaultProps} />
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('UnifiedQuoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render form with all required fields', () => {
      renderUnifiedQuoteForm();

      expect(screen.getByLabelText(/product url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/destination country/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit quote request/i })).toBeInTheDocument();
    });

    it('should show different title for edit mode', () => {
      renderUnifiedQuoteForm({ 
        mode: 'edit',
        existingQuote: mockExistingQuote
      });

      expect(screen.getByText('Update Quote')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update quote/i })).toBeInTheDocument();
    });

    it('should pre-populate fields in edit mode', () => {
      renderUnifiedQuoteForm({ 
        mode: 'edit',
        existingQuote: mockExistingQuote
      });

      expect(screen.getByDisplayValue('https://amazon.com/test-product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm();

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
      });
    });

    it('should validate URL format', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm();

      const urlInput = screen.getByLabelText(/product url/i);
      await user.type(urlInput, 'invalid-url');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });
    });

    it('should validate email format in guest mode', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ viewMode: 'guest' });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate quantity range', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm();

      const quantityInput = screen.getByLabelText(/quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/quantity must be at least 1/i)).toBeInTheDocument();
      });
    });

    it('should validate price limits', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm();

      const priceInput = screen.getByLabelText(/estimated price/i);
      await user.type(priceInput, '150000'); // Over limit

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/price cannot exceed/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload Security', () => {
    it('should accept valid file types', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableFileUpload: true });

      const fileInput = screen.getByLabelText(/select files/i).closest('input[type="file"]');
      expect(fileInput).toBeInTheDocument();

      await user.upload(fileInput!, mockFile);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
        expect(screen.getByText('0.00 MB')).toBeInTheDocument();
      });
    });

    it('should reject dangerous file types', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableFileUpload: true });

      const dangerousFile = new File(['malicious code'], 'virus.exe', { 
        type: 'application/octet-stream' 
      });

      const fileInput = screen.getByLabelText(/select files/i).closest('input[type="file"]');
      await user.upload(fileInput!, dangerousFile);

      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument();
      });
    });

    it('should enforce file size limits', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableFileUpload: true });

      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const fileInput = screen.getByLabelText(/select files/i).closest('input[type="file"]');
      await user.upload(fileInput!, largeFile);

      await waitFor(() => {
        expect(screen.getByText(/file size must be less than/i)).toBeInTheDocument();
      });
    });

    it('should limit number of files', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableFileUpload: true });

      const files = Array.from({ length: 6 }, (_, i) => 
        new File([`content ${i}`], `file${i}.pdf`, { type: 'application/pdf' })
      );

      const fileInput = screen.getByLabelText(/select files/i).closest('input[type="file"]');
      await user.upload(fileInput!, files);

      await waitFor(() => {
        expect(screen.getByText(/maximum 5 files allowed/i)).toBeInTheDocument();
      });
    });

    it('should allow removing uploaded files', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableFileUpload: true });

      const fileInput = screen.getByLabelText(/select files/i).closest('input[type="file"]');
      await user.upload(fileInput!, mockFile);

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Server Validation', () => {
    it('should validate URLs with server validation', async () => {
      const user = userEvent.setup();
      const mockServerValidation = {
        validateUrl: vi.fn().mockResolvedValue({
          valid: true,
          productName: 'Auto-filled Product Name',
          price: 25.99
        })
      };

      renderUnifiedQuoteForm({
        serverValidation: mockServerValidation
      });

      const urlInput = screen.getByLabelText(/product url/i);
      await user.type(urlInput, 'https://amazon.com/valid-product');

      // Wait for debounced server validation
      await waitFor(() => {
        expect(mockServerValidation.validateUrl).toHaveBeenCalledWith(
          'https://amazon.com/valid-product'
        );
      }, { timeout: 2000 });

      // Should auto-fill product name and price
      await waitFor(() => {
        expect(screen.getByDisplayValue('Auto-filled Product Name')).toBeInTheDocument();
        expect(screen.getByDisplayValue('25.99')).toBeInTheDocument();
      });
    });

    it('should handle server validation errors', async () => {
      const user = userEvent.setup();
      const mockServerValidation = {
        validateUrl: vi.fn().mockResolvedValue({
          valid: false,
          error: 'Product not found'
        })
      };

      renderUnifiedQuoteForm({
        serverValidation: mockServerValidation
      });

      const urlInput = screen.getByLabelText(/product url/i);
      await user.type(urlInput, 'https://amazon.com/invalid-product');

      await waitFor(() => {
        expect(screen.getByText('Product not found')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should check for duplicate quotes', async () => {
      const user = userEvent.setup();
      const mockServerValidation = {
        checkDuplicate: vi.fn().mockResolvedValue({
          isDuplicate: true,
          existingQuoteId: 'existing-quote-123'
        })
      };

      renderUnifiedQuoteForm({
        serverValidation: mockServerValidation
      });

      const urlInput = screen.getByLabelText(/product url/i);
      await user.type(urlInput, 'https://amazon.com/duplicate-product');

      await waitFor(() => {
        expect(mockServerValidation.checkDuplicate).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Internationalization (i18n)', () => {
    it('should display labels in Hindi locale', () => {
      renderUnifiedQuoteForm({ locale: 'hi' });

      expect(screen.getByText('उत्पाद का लिंक')).toBeInTheDocument(); // Product URL
      expect(screen.getByText('उत्पाद का नाम')).toBeInTheDocument(); // Product Name
      expect(screen.getByText('मात्रा')).toBeInTheDocument(); // Quantity
    });

    it('should display labels in Nepali locale', () => {
      renderUnifiedQuoteForm({ locale: 'ne' });

      expect(screen.getByText('उत्पादन लिङ्क')).toBeInTheDocument(); // Product URL
      expect(screen.getByText('उत्पादनको नाम')).toBeInTheDocument(); // Product Name
      expect(screen.getByText('परिमाण')).toBeInTheDocument(); // Quantity
    });

    it('should show localized error messages', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ locale: 'hi' });

      const submitButton = screen.getByRole('button', { name: /कोटेशन भेजें/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('यह फील्ड आवश्यक है')).toBeInTheDocument();
      });
    });

    it('should fallback to English for unsupported locales', () => {
      renderUnifiedQuoteForm({ locale: 'unsupported' as any });

      expect(screen.getByText('Product URL')).toBeInTheDocument();
      expect(screen.getByText('Product Name')).toBeInTheDocument();
    });
  });

  describe('View Mode Adaptations', () => {
    it('should show customer fields in guest mode', () => {
      renderUnifiedQuoteForm({ viewMode: 'guest' });

      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('should hide customer fields in customer mode', () => {
      renderUnifiedQuoteForm({ viewMode: 'customer' });

      expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    });

    it('should show admin fields in admin edit mode', () => {
      renderUnifiedQuoteForm({ 
        mode: 'edit',
        viewMode: 'admin',
        existingQuote: mockExistingQuote,
        enableAdvancedFields: true
      });

      // Should have admin fields toggle
      expect(screen.getByText(/show admin fields/i)).toBeInTheDocument();
    });

    it('should expand admin fields when toggled', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ 
        mode: 'edit',
        viewMode: 'admin',
        existingQuote: mockExistingQuote,
        enableAdvancedFields: true
      });

      const toggleButton = screen.getByText(/show admin fields/i);
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/admin notes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Validation', () => {
    it('should validate fields in real-time when enabled', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableRealTimeValidation: true });

      const urlInput = screen.getByLabelText(/product url/i);
      await user.type(urlInput, 'invalid');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });
    });

    it('should not validate in real-time when disabled', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm({ enableRealTimeValidation: false });

      const urlInput = screen.getByLabelText(/product url/i);
      await user.type(urlInput, 'invalid');
      await user.tab();

      // Should not show validation error until form submission
      expect(screen.queryByText(/please enter a valid url/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteForm({ onSubmit: mockOnSubmit });

      // Fill required fields
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/product');
      await user.type(screen.getByLabelText(/product name/i), 'Test Product');
      await user.type(screen.getByLabelText(/quantity/i), '2');
      await user.selectOptions(screen.getByLabelText(/destination country/i), 'IN');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            productUrl: 'https://amazon.com/product',
            productName: 'Test Product',
            quantity: 2,
            destinationCountry: 'IN'
          }),
          [] // files
        );
      });
    });

    it('should include uploaded files in submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });

      renderUnifiedQuoteForm({ 
        onSubmit: mockOnSubmit,
        enableFileUpload: true
      });

      // Upload file
      const fileInput = screen.getByLabelText(/select files/i).closest('input[type="file"]');
      await user.upload(fileInput!, mockFile);

      // Fill required fields
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/product');
      await user.type(screen.getByLabelText(/product name/i), 'Test Product');
      await user.type(screen.getByLabelText(/quantity/i), '1');
      await user.selectOptions(screen.getByLabelText(/destination country/i), 'IN');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.any(Object),
          [mockFile]
        );
      });
    });

    it('should handle submission errors', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Server error'));

      renderUnifiedQuoteForm({ onSubmit: mockOnSubmit });

      // Fill required fields
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/product');
      await user.type(screen.getByLabelText(/product name/i), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/destination country/i), 'IN');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderUnifiedQuoteForm({ onSubmit: mockOnSubmit });

      // Fill required fields
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/product');
      await user.type(screen.getByLabelText(/product name/i), 'Test Product');
      await user.selectOptions(screen.getByLabelText(/destination country/i), 'IN');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /submit quote request/i })).toBeDisabled();
      expect(screen.getByRole('button')).toHaveTextContent(/loading/i);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics in detailed mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderUnifiedQuoteForm({ performanceMode: 'detailed' });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('UnifiedQuoteForm Performance:'),
          expect.any(Object)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should track form complexity metrics', () => {
      const { container } = renderUnifiedQuoteForm({
        enableFileUpload: true,
        enableAdvancedFields: true,
        performanceMode: 'detailed'
      });

      // Should have complex form with multiple sections
      expect(container.querySelectorAll('input').length).toBeGreaterThan(5);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      renderUnifiedQuoteForm();

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    it('should show validation errors with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm();

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/this field is required/i);
        errorMessages.forEach(error => {
          expect(error).toHaveAttribute('role', 'alert');
        });
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderUnifiedQuoteForm();

      const firstInput = screen.getByLabelText(/product url/i);
      firstInput.focus();

      await user.tab();
      expect(screen.getByLabelText(/product name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/quantity/i)).toHaveFocus();
    });
  });

  describe('Security Features', () => {
    it('should show security indicator', () => {
      renderUnifiedQuoteForm();

      expect(screen.getByText('Secure & Encrypted')).toBeInTheDocument();
    });

    it('should handle XSS attempts in form fields', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn();

      renderUnifiedQuoteForm({ onSubmit: mockOnSubmit });

      const maliciousInput = '<script>alert("xss")</script>Product Name';
      await user.type(screen.getByLabelText(/product name/i), maliciousInput);

      // Input should be sanitized (mocked behavior)
      expect(screen.getByDisplayValue('Product Name')).toBeInTheDocument();
    });
  });
});