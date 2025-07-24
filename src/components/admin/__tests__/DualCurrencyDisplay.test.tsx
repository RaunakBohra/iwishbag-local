import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DualCurrencyDisplay,
  SimpleDualCurrency,
  CurrencyInputLabel,
} from '../DualCurrencyDisplay';

// Mock the CurrencyService
vi.mock('../../../services/CurrencyService', () => ({
  currencyService: {
    getCurrencyForCountrySync: vi.fn((countryCode) => {
      const currencies = {
        US: 'USD',
        IN: 'INR',
        NP: 'NPR',
        GB: 'GBP',
        EU: 'EUR',
      };
      return currencies[countryCode as keyof typeof currencies] || 'USD';
    }),
    getCurrencySymbol: vi.fn((currency) => {
      const symbols = {
        USD: '$',
        INR: '₹',
        NPR: '₨',
        GBP: '£',
        EUR: '€',
      };
      return symbols[currency as keyof typeof symbols] || '$';
    }),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => (
    <div className={className} data-testid="alert-triangle-icon">
      ⚠️
    </div>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <div className={className} data-testid="check-circle-icon">
      ✓
    </div>
  ),
  Info: ({ className }: { className?: string }) => (
    <div className={className} data-testid="info-icon">
      ℹ️
    </div>
  ),
  Calculator: ({ className }: { className?: string }) => (
    <div className={className} data-testid="calculator-icon">
      🧮
    </div>
  ),
}));

describe('DualCurrencyDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render both USD and INR formatted amounts', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          exchangeRate={82.5}
          showTooltip={false}
        />,
      );

      // Should show the short format with both currencies
      expect(screen.getByText('$100.00 / ₹8250.00')).toBeInTheDocument();
    });

    it('should handle null amount gracefully', () => {
      render(
        <DualCurrencyDisplay
          amount={null}
          originCountry="US"
          destinationCountry="IN"
          showTooltip={false}
        />,
      );

      expect(screen.getByText('$0.00 / ₹0.00')).toBeInTheDocument();
    });

    it('should handle undefined amount gracefully', () => {
      render(
        <DualCurrencyDisplay
          amount={undefined}
          originCountry="US"
          destinationCountry="IN"
          showTooltip={false}
        />,
      );

      expect(screen.getByText('$0.00 / ₹0.00')).toBeInTheDocument();
    });

    it('should render same currency without conversion when origin equals destination', () => {
      render(
        <DualCurrencyDisplay
          amount={250}
          originCountry="US"
          destinationCountry="US"
          showTooltip={false}
        />,
      );

      // When same currency, should only show once
      expect(screen.getByText('$250.00')).toBeInTheDocument();
      // Should not show the dual format
      expect(screen.queryByText('$250.00 / $250.00')).not.toBeInTheDocument();
    });
  });

  describe('Exchange Rate Source Indicators', () => {
    it('should show route rate badge for shipping_route source', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          exchangeRateSource="shipping_route"
          showTooltip={false}
        />,
      );

      expect(screen.getByText('Route Rate')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should show USD rate badge for country_settings source', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          exchangeRateSource="country_settings"
          showTooltip={false}
        />,
      );

      expect(screen.getByText('USD Rate')).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('should show fallback badge for fallback source', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          exchangeRateSource="fallback"
          showTooltip={false}
        />,
      );

      expect(screen.getByText('Fallback')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });
  });

  describe('Estimate Indicator', () => {
    it('should show estimate badge for non-transactional displays', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          isTransactional={false}
          showEstimateIndicator={true}
          showTooltip={false}
        />,
      );

      expect(screen.getByText('Estimate')).toBeInTheDocument();
      expect(screen.getByTestId('calculator-icon')).toBeInTheDocument();
    });

    it('should not show estimate badge for transactional displays', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          isTransactional={true}
          showEstimateIndicator={true}
          showTooltip={false}
        />,
      );

      expect(screen.queryByText('Estimate')).not.toBeInTheDocument();
      expect(screen.queryByTestId('calculator-icon')).not.toBeInTheDocument();
    });

    it('should not show estimate badge when showEstimateIndicator is false', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          isTransactional={false}
          showEstimateIndicator={false}
          showTooltip={false}
        />,
      );

      expect(screen.queryByText('Estimate')).not.toBeInTheDocument();
    });

    it('should not show estimate badge for same currency', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="US"
          isTransactional={false}
          showEstimateIndicator={true}
          showTooltip={false}
        />,
      );

      expect(screen.queryByText('Estimate')).not.toBeInTheDocument();
    });
  });

  describe('Warning Display', () => {
    it('should show warning icon when warning prop is provided', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          warning="Exchange rate may be outdated"
          showTooltip={false}
        />,
      );

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should show warning icon when exchange rate source is fallback', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          exchangeRateSource="fallback"
          showTooltip={false}
        />,
      );

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });
  });

  describe('Tooltip Behavior', () => {
    it('should show info icon for same currency when tooltip enabled', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="US"
          showTooltip={true}
        />,
      );

      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('should not show tooltip elements when showTooltip is false', () => {
      render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          showTooltip={false}
        />,
      );

      // Should still show the badges but not wrapped in tooltip
      expect(screen.getByText('Route Rate')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <DualCurrencyDisplay
          amount={100}
          originCountry="US"
          destinationCountry="IN"
          className="custom-test-class"
          showTooltip={false}
        />,
      );

      expect(container.firstChild).toHaveClass('custom-test-class');
    });
  });
});

describe('SimpleDualCurrency', () => {
  it('should render simplified dual currency format', () => {
    render(
      <SimpleDualCurrency
        amount={150}
        originCountry="US"
        destinationCountry="IN"
        exchangeRate={80}
      />,
    );

    expect(screen.getByText('$150.00 / ₹12000.00')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SimpleDualCurrency
        amount={150}
        originCountry="US"
        destinationCountry="IN"
        className="simple-custom-class"
      />,
    );

    expect(container.firstChild).toHaveClass('simple-custom-class');
  });
});

describe('CurrencyInputLabel', () => {
  it('should render label with currency symbol', () => {
    render(<CurrencyInputLabel countryCode="US" label="Amount" />);

    expect(screen.getByText('Amount ($)')).toBeInTheDocument();
  });

  it('should show required asterisk when required is true', () => {
    render(<CurrencyInputLabel countryCode="IN" label="Total Price" required={true} />);

    expect(screen.getByText('Total Price (₹)')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should not show required asterisk when required is false', () => {
    render(<CurrencyInputLabel countryCode="GB" label="Optional Amount" required={false} />);

    expect(screen.getByText('Optional Amount (£)')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CurrencyInputLabel countryCode="NP" label="Price" className="label-custom-class" />,
    );

    expect(container.firstChild).toHaveClass('label-custom-class');
  });

  it('should handle different country codes with correct symbols', () => {
    const { rerender } = render(<CurrencyInputLabel countryCode="US" label="USD Price" />);
    expect(screen.getByText('USD Price ($)')).toBeInTheDocument();

    rerender(<CurrencyInputLabel countryCode="IN" label="INR Price" />);
    expect(screen.getByText('INR Price (₹)')).toBeInTheDocument();

    rerender(<CurrencyInputLabel countryCode="NP" label="NPR Price" />);
    expect(screen.getByText('NPR Price (₨)')).toBeInTheDocument();
  });
});
