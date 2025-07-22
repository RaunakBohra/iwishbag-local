import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'StatusBadge displays quote and order statuses with appropriate colors, icons, and tooltips.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: [
        'pending',
        'sent', 
        'approved',
        'paid',
        'ordered',
        'shipped',
        'completed',
        'rejected',
        'expired',
        'cancelled'
      ],
      description: 'Status value to display',
    },
    category: {
      control: 'select',
      options: ['quote', 'order'],
      description: 'Category type for status configuration',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show the status icon',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Quote Status Stories
export const QuotePending: Story = {
  args: {
    status: 'pending',
    category: 'quote',
  },
};

export const QuoteSent: Story = {
  args: {
    status: 'sent',
    category: 'quote',
  },
};

export const QuoteApproved: Story = {
  args: {
    status: 'approved',
    category: 'quote',
  },
};

export const QuoteRejected: Story = {
  args: {
    status: 'rejected',
    category: 'quote',
  },
};

export const QuoteExpired: Story = {
  args: {
    status: 'expired',
    category: 'quote',
  },
};

// Order Status Stories  
export const OrderPaid: Story = {
  args: {
    status: 'paid',
    category: 'order',
  },
};

export const OrderOrdered: Story = {
  args: {
    status: 'ordered',
    category: 'order',
  },
};

export const OrderShipped: Story = {
  args: {
    status: 'shipped',
    category: 'order',
  },
};

export const OrderCompleted: Story = {
  args: {
    status: 'completed',
    category: 'order',
  },
};

export const OrderCancelled: Story = {
  args: {
    status: 'cancelled',
    category: 'order',
  },
};

// Edge Cases
export const NullStatus: Story = {
  args: {
    status: null,
    category: 'quote',
  },
};

export const UndefinedStatus: Story = {
  args: {
    status: undefined,
    category: 'quote',
  },
};

export const UnknownStatus: Story = {
  args: {
    status: 'unknown_status',
    category: 'quote',
  },
};

// Icon Variations
export const WithoutIcon: Story = {
  args: {
    status: 'approved',
    category: 'quote',
    showIcon: false,
  },
};

export const WithCustomClassName: Story = {
  args: {
    status: 'shipped',
    category: 'order',
    className: 'text-lg px-4 py-2',
  },
};

// All Quote Statuses Group
export const AllQuoteStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="pending" category="quote" />
      <StatusBadge status="sent" category="quote" />
      <StatusBadge status="approved" category="quote" />
      <StatusBadge status="rejected" category="quote" />
      <StatusBadge status="expired" category="quote" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Display of all quote status variations',
      },
    },
  },
};

// All Order Statuses Group
export const AllOrderStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="paid" category="order" />
      <StatusBadge status="ordered" category="order" />
      <StatusBadge status="shipped" category="order" />
      <StatusBadge status="completed" category="order" />
      <StatusBadge status="cancelled" category="order" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Display of all order status variations',
      },
    },
  },
};

// Dark Theme Example
export const DarkTheme: Story = {
  args: {
    status: 'shipped',
    category: 'order',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};