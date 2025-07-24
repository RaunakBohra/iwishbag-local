import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { QuoteBreakdown } from './QuoteBreakdown';
import { action } from '@storybook/addon-actions';

// Create a query client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

// Mock quote data that matches the expected structure
const createMockQuote = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  user_id: 'user-123',
  status: 'sent',
  origin_country: 'US',
  destination_country: 'IN',
  currency: 'USD',
  destination_currency: 'INR',
  final_total_usd: 150.99,
  final_total_local: 12574.17,
  item_price: 120.0,
  sales_tax_price: 8.4,
  international_shipping: 25.0,
  customs_and_ecs: 18.9,
  domestic_shipping: 15.0,
  handling_charge: 10.0,
  insurance_amount: 5.5,
  payment_gateway_fee: 4.6,
  vat: 3.0,
  discount: 0.0,
  sub_total: 147.99,
  exchange_rate: 83.28,
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-15T11:45:00Z',
  expires_at: '2025-01-22T10:30:00Z',
  breakdown: {
    itemPrice: 120.0,
    salesTax: 8.4,
    merchantShipping: 12.59,
    internationalShipping: 25.0,
    customsAndEcs: 18.9,
    domesticShipping: 15.0,
    handlingCharge: 10.0,
    insurance: 5.5,
    paymentGatewayFee: 4.6,
    vat: 3.0,
    discount: 0.0,
    totalUSD: 150.99,
    totalINR: 12574.17,
    exchangeRate: 83.28,
  },
  items: [
    {
      id: 'item-1',
      name: 'Wireless Bluetooth Headphones',
      quantity: 1,
      price_usd: 89.99,
      weight_kg: 0.3,
      url: 'https://amazon.com/product/123',
      image_url:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
      options: 'Color: Black, Size: Over-ear',
    },
    {
      id: 'item-2',
      name: 'Phone Case',
      quantity: 2,
      price_usd: 15.0,
      weight_kg: 0.1,
      url: 'https://amazon.com/product/456',
      image_url: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=300&h=300&fit=crop',
      options: 'Material: Silicone, Color: Clear',
    },
  ],
  quote_items: [],
  in_cart: false,
  iwish_tracking_id: null,
  ...overrides,
});

// Wrapper component to provide necessary context
const StoryWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <div className="max-w-4xl mx-auto p-4">{children}</div>
    </MemoryRouter>
  </QueryClientProvider>
);

const meta: Meta<typeof QuoteBreakdown> = {
  title: 'Components/QuoteBreakdown',
  component: QuoteBreakdown,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'QuoteBreakdown displays comprehensive quote information including items, pricing breakdown, status, and action buttons. Core component for customer quote management in iwishBag.',
      },
    },
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Story />
      </StoryWrapper>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    quote: {
      description: 'Quote object with items and pricing details',
    },
    onApprove: { action: 'approve' },
    onReject: { action: 'reject' },
    onCalculate: { action: 'calculate' },
    onRecalculate: { action: 'recalculate' },
    onSave: { action: 'save' },
    onCancel: { action: 'cancel' },
    onAddToCart: { action: 'addToCart' },
    isProcessing: {
      control: 'boolean',
      description: 'Whether an operation is in progress',
    },
    addToCartText: {
      control: 'text',
      description: 'Custom text for add to cart button',
    },
  },
  args: {
    onApprove: action('approve'),
    onReject: action('reject'),
    onCalculate: action('calculate'),
    onRecalculate: action('recalculate'),
    onSave: action('save'),
    onCancel: action('cancel'),
    onAddToCart: action('addToCart'),
    isProcessing: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Quote Status Variations
export const PendingQuote: Story = {
  args: {
    quote: createMockQuote({
      status: 'pending',
      final_total_usd: null,
      final_total_local: null,
      breakdown: null,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote in pending status - no calculation yet, shows items only',
      },
    },
  },
};

export const SentQuote: Story = {
  args: {
    quote: createMockQuote({
      status: 'sent',
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote sent to customer - shows full breakdown with approval actions',
      },
    },
  },
};

export const ApprovedQuote: Story = {
  args: {
    quote: createMockQuote({
      status: 'approved',
      in_cart: false,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Approved quote ready for cart - shows add to cart action',
      },
    },
  },
};

export const ApprovedInCart: Story = {
  args: {
    quote: createMockQuote({
      status: 'approved',
      in_cart: true,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Approved quote already in cart - shows cart status',
      },
    },
  },
};

export const RejectedQuote: Story = {
  args: {
    quote: createMockQuote({
      status: 'rejected',
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Rejected quote - shows rejection status and re-approval option',
      },
    },
  },
};

export const ExpiredQuote: Story = {
  args: {
    quote: createMockQuote({
      status: 'expired',
      expires_at: '2025-01-10T10:30:00Z', // Past date
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Expired quote - shows expiry status',
      },
    },
  },
};

export const PaidOrder: Story = {
  args: {
    quote: createMockQuote({
      status: 'paid',
      in_cart: true,
      iwish_tracking_id: 'IWB20251001',
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Paid order with tracking ID - shows order status',
      },
    },
  },
};

// Price Variations
export const HighValueQuote: Story = {
  args: {
    quote: createMockQuote({
      final_total_usd: 2499.99,
      final_total_local: 208249.17,
      item_price: 2200.0,
      sales_tax_price: 154.0,
      international_shipping: 89.99,
      customs_and_ecs: 315.0,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'High-value quote with significant customs and shipping',
      },
    },
  },
};

export const LowValueQuote: Story = {
  args: {
    quote: createMockQuote({
      final_total_usd: 25.99,
      final_total_local: 2164.47,
      item_price: 19.99,
      sales_tax_price: 1.4,
      international_shipping: 4.6,
      customs_and_ecs: 0.0,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Low-value quote with minimal fees and no customs',
      },
    },
  },
};

export const WithDiscount: Story = {
  args: {
    quote: createMockQuote({
      discount: 25.0,
      final_total_usd: 125.99,
      final_total_local: 10489.17,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote with discount applied',
      },
    },
  },
};

// Different Country Combinations
export const USToNepal: Story = {
  args: {
    quote: createMockQuote({
      origin_country: 'US',
      destination_country: 'NP',
      destination_currency: 'NPR',
      final_total_local: 20284.0,
      exchange_rate: 134.25,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'US to Nepal shipping with NPR currency',
      },
    },
  },
};

export const JapanToIndia: Story = {
  args: {
    quote: createMockQuote({
      origin_country: 'JP',
      destination_country: 'IN',
      currency: 'JPY',
      destination_currency: 'INR',
      final_total_usd: 150.99,
      final_total_local: 12574.17,
      exchange_rate: 83.28,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Japan to India shipping with JPY origin currency',
      },
    },
  },
};

// Single vs Multiple Items
export const SingleItem: Story = {
  args: {
    quote: createMockQuote({
      items: [
        {
          id: 'item-1',
          name: 'Premium Mechanical Keyboard',
          quantity: 1,
          price_usd: 149.99,
          weight_kg: 1.2,
          url: 'https://amazon.com/product/keyboard',
          image_url:
            'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300&h=300&fit=crop',
          options: 'Switch: Cherry MX Blue, Layout: US',
        },
      ],
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote with single item',
      },
    },
  },
};

export const MultipleItems: Story = {
  args: {
    quote: createMockQuote({
      items: [
        {
          id: 'item-1',
          name: 'Gaming Mouse',
          quantity: 1,
          price_usd: 79.99,
          weight_kg: 0.15,
          url: 'https://amazon.com/product/mouse',
          image_url:
            'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=300&fit=crop',
          options: 'DPI: 16000, RGB: Yes',
        },
        {
          id: 'item-2',
          name: 'Gaming Mousepad',
          quantity: 1,
          price_usd: 29.99,
          weight_kg: 0.3,
          url: 'https://amazon.com/product/mousepad',
          image_url:
            'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop',
          options: 'Size: XL, Surface: Speed',
        },
        {
          id: 'item-3',
          name: 'USB Cable',
          quantity: 2,
          price_usd: 12.99,
          weight_kg: 0.05,
          url: 'https://amazon.com/product/cable',
          image_url:
            'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=300&fit=crop',
          options: 'Length: 2m, Type: USB-C',
        },
      ],
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote with multiple items of different types',
      },
    },
  },
};

// Processing States
export const Processing: Story = {
  args: {
    quote: createMockQuote(),
    isProcessing: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote in processing state - shows loading indicators',
      },
    },
  },
};

export const CustomAddToCartText: Story = {
  args: {
    quote: createMockQuote({
      status: 'approved',
      in_cart: false,
    }),
    addToCartText: 'Add to Shopping Bag',
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote with custom add to cart button text',
      },
    },
  },
};

// Edge Cases
export const NoItems: Story = {
  args: {
    quote: createMockQuote({
      items: [],
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote with no items - edge case handling',
      },
    },
  },
};

export const MissingBreakdown: Story = {
  args: {
    quote: createMockQuote({
      breakdown: null,
      final_total_usd: null,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Quote without breakdown data - shows items only',
      },
    },
  },
};

// Mobile Layout
export const MobileLayout: Story = {
  args: {
    quote: createMockQuote(),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Quote breakdown optimized for mobile display',
      },
    },
  },
};

// Comparison View
export const StatusComparison: Story = {
  render: () => (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold">Quote Status Comparison</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Pending Quote</h4>
          <QuoteBreakdown
            quote={createMockQuote({ status: 'pending', final_total_usd: null, breakdown: null })}
            onApprove={action('approve')}
            onReject={action('reject')}
            onCalculate={action('calculate')}
            onRecalculate={action('recalculate')}
            onSave={action('save')}
            onCancel={action('cancel')}
            isProcessing={false}
          />
        </div>

        <div>
          <h4 className="font-medium mb-2">Sent Quote (Ready for Approval)</h4>
          <QuoteBreakdown
            quote={createMockQuote({ status: 'sent' })}
            onApprove={action('approve')}
            onReject={action('reject')}
            onCalculate={action('calculate')}
            onRecalculate={action('recalculate')}
            onSave={action('save')}
            onCancel={action('cancel')}
            isProcessing={false}
          />
        </div>

        <div>
          <h4 className="font-medium mb-2">Approved Quote</h4>
          <QuoteBreakdown
            quote={createMockQuote({ status: 'approved', in_cart: false })}
            onApprove={action('approve')}
            onReject={action('reject')}
            onCalculate={action('calculate')}
            onRecalculate={action('recalculate')}
            onSave={action('save')}
            onCancel={action('cancel')}
            onAddToCart={action('addToCart')}
            isProcessing={false}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of different quote statuses',
      },
    },
  },
};
