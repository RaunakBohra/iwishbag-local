import type { Meta, StoryObj } from '@storybook/react';
import { DualCurrencyDisplay, SimpleDualCurrency, CurrencyInputLabel } from './DualCurrencyDisplay';

const meta: Meta<typeof DualCurrencyDisplay> = {
  title: 'Components/DualCurrencyDisplay',
  component: DualCurrencyDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'DualCurrencyDisplay shows amounts in both origin and destination currencies with exchange rate information, status indicators, and conversion details. Core component for iwishBag\'s international pricing system.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    amount: {
      control: { type: 'number', min: 0, step: 0.01 },
      description: 'Amount in origin currency (USD)',
    },
    originCountry: {
      control: 'select',
      options: ['US', 'JP', 'UK', 'CN', 'IN'],
      description: 'Origin country code (where we buy from)',
    },
    destinationCountry: {
      control: 'select', 
      options: ['IN', 'NP', 'US', 'UK', 'AU', 'CA'],
      description: 'Destination country code (where we deliver to)',
    },
    exchangeRate: {
      control: { type: 'number', min: 0.01, step: 0.01 },
      description: 'Exchange rate from origin to destination currency',
    },
    exchangeRateSource: {
      control: 'select',
      options: ['shipping_route', 'country_settings', 'fallback'],
      description: 'Source of the exchange rate data',
    },
    warning: {
      control: 'text',
      description: 'Warning message to display',
    },
    showTooltip: {
      control: 'boolean',
      description: 'Whether to show tooltip with conversion details',
    },
    isTransactional: {
      control: 'boolean',
      description: 'Whether this is a real transaction or estimate',
    },
    showEstimateIndicator: {
      control: 'boolean',
      description: 'Whether to show estimate badge for non-transactional displays',
    },
  },
  args: {
    amount: 150.00,
    originCountry: 'US',
    destinationCountry: 'IN',
    exchangeRate: 83.12,
    exchangeRateSource: 'shipping_route',
    showTooltip: true,
    isTransactional: false,
    showEstimateIndicator: true,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Examples
export const Default: Story = {};

export const HighValue: Story = {
  args: {
    amount: 2450.99,
    originCountry: 'JP',
    destinationCountry: 'IN',
    exchangeRate: 0.56,
  },
};

export const LowValue: Story = {
  args: {
    amount: 12.50,
    originCountry: 'US',
    destinationCountry: 'NP',
    exchangeRate: 134.25,
  },
};

// Exchange Rate Sources
export const ShippingRoute: Story = {
  args: {
    exchangeRateSource: 'shipping_route',
    exchangeRate: 83.12,
  },
  parameters: {
    docs: {
      description: {
        story: 'Uses exchange rate from shipping route configuration (most accurate)',
      },
    },
  },
};

export const CountrySettings: Story = {
  args: {
    exchangeRateSource: 'country_settings',
    exchangeRate: 82.45,
  },
  parameters: {
    docs: {
      description: {
        story: 'Uses exchange rate from country settings table',
      },
    },
  },
};

export const FallbackRate: Story = {
  args: {
    exchangeRateSource: 'fallback',
    exchangeRate: 80.00,
    warning: 'Using fallback exchange rate - may not be current',
  },
  parameters: {
    docs: {
      description: {
        story: 'Uses fallback exchange rate when primary sources unavailable',
      },
    },
  },
};

// Same Currency (No Conversion)
export const SameCurrency: Story = {
  args: {
    amount: 99.99,
    originCountry: 'US',
    destinationCountry: 'US',
  },
  parameters: {
    docs: {
      description: {
        story: 'When origin and destination use same currency, no conversion is shown',
      },
    },
  },
};

// Transaction vs Estimate
export const TransactionalAmount: Story = {
  args: {
    amount: 299.99,
    isTransactional: true,
    showEstimateIndicator: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Real transaction amount - no estimate indicator shown',
      },
    },
  },
};

export const EstimateAmount: Story = {
  args: {
    amount: 299.99,
    isTransactional: false,
    showEstimateIndicator: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Estimate amount - shows estimate indicator and tooltip warning',
      },
    },
  },
};

// Edge Cases
export const ZeroAmount: Story = {
  args: {
    amount: 0,
  },
};

export const NullAmount: Story = {
  args: {
    amount: null,
  },
};

export const UndefinedAmount: Story = {
  args: {
    amount: undefined,
  },
};

export const NoTooltip: Story = {
  args: {
    showTooltip: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Display without tooltip - icons and badges still shown',
      },
    },
  },
};

export const WithWarning: Story = {
  args: {
    warning: 'Exchange rate is older than 24 hours',
    exchangeRateSource: 'country_settings',
  },
};

export const CustomClassName: Story = {
  args: {
    className: 'text-lg bg-blue-50 p-3 rounded border',
  },
};

// Different Country Combinations
export const USToNepal: Story = {
  args: {
    amount: 100.00,
    originCountry: 'US',
    destinationCountry: 'NP',
    exchangeRate: 134.25,
  },
};

export const JapanToIndia: Story = {
  args: {
    amount: 15000,
    originCountry: 'JP',
    destinationCountry: 'IN',
    exchangeRate: 0.56,
  },
};

export const UKToAustralia: Story = {
  args: {
    amount: 75.50,
    originCountry: 'UK',
    destinationCountry: 'AU',
    exchangeRate: 1.96,
  },
};

// Comparison View
export const ComparisonView: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="font-semibold">Same Amount, Different Sources</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm">Route:</span>
          <DualCurrencyDisplay 
            amount={150}
            originCountry="US"
            destinationCountry="IN"
            exchangeRate={83.12}
            exchangeRateSource="shipping_route"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm">Country:</span>
          <DualCurrencyDisplay 
            amount={150}
            originCountry="US"
            destinationCountry="IN"
            exchangeRate={82.45}
            exchangeRateSource="country_settings"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm">Fallback:</span>
          <DualCurrencyDisplay 
            amount={150}
            originCountry="US"
            destinationCountry="IN"
            exchangeRate={80.00}
            exchangeRateSource="fallback"
            warning="Outdated rate"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of different exchange rate sources for the same amount',
      },
    },
  },
};

// Simple Dual Currency Component
export const SimpleDualCurrencyStory: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="font-semibold">SimpleDualCurrency Component</h3>
      <div className="space-y-2">
        <SimpleDualCurrency 
          amount={99.99}
          originCountry="US"
          destinationCountry="IN"
          exchangeRate={83.12}
        />
        <SimpleDualCurrency 
          amount={2500}
          originCountry="JP"
          destinationCountry="NP"
          exchangeRate={0.87}
          className="text-lg text-blue-600"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Simplified version without tooltips and badges - just the formatted amount',
      },
    },
  },
};

// Currency Input Label Component
export const CurrencyInputLabelStory: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="font-semibold">CurrencyInputLabel Component</h3>
      <div className="space-y-3">
        <CurrencyInputLabel countryCode="US" label="Item Price" required />
        <CurrencyInputLabel countryCode="IN" label="Local Amount" />
        <CurrencyInputLabel countryCode="NP" label="Shipping Cost" required />
        <CurrencyInputLabel countryCode="JP" label="Product Total" className="text-blue-600" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Currency input labels with appropriate currency symbols',
      },
    },
  },
};

// Dark Theme
export const DarkTheme: Story = {
  args: {
    amount: 199.99,
    exchangeRateSource: 'shipping_route',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Dark theme compatibility',
      },
    },
  },
};