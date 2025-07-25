// ============================================================================
// STANDARDIZED FEE GROUPING UTILITIES
// Provides consistent fee categorization across admin and user breakdown components
// Ensures uniform display logic for handling, insurance, and payment fees
// ============================================================================

import type { UnifiedQuote } from '@/types/unified-quote';

export interface FeeBreakdown {
  // Service fees (handling + insurance)
  serviceFees: {
    total: number;
    handling: number;
    insurance: number;
    label: string;
    description: string;
  };
  
  // Payment processing fees
  paymentFees: {
    total: number;
    gatewayFee: number;
    label: string;
    description: string;
  };
  
  // Combined total for compact display
  allFees: {
    total: number;
    label: string;
    description: string;
  };
}

/**
 * Standardized fee grouping for all breakdown components
 * Follows industry standards and user-friendly terminology
 */
export function getStandardizedFeeBreakdown(quote: UnifiedQuote): FeeBreakdown {
  const breakdown = quote.calculation_data?.breakdown || {};
  
  // Extract individual fee components
  const handlingFee = Number(breakdown.handling || quote.handling_charge || 0);
  const insuranceFee = Number(breakdown.insurance || quote.insurance_amount || 0);
  const gatewayFee = Number(breakdown.fees || quote.payment_gateway_fee || 0);
  
  // Calculate totals
  const serviceFeeTotal = handlingFee + insuranceFee;
  const paymentFeeTotal = gatewayFee;
  const allFeesTotal = serviceFeeTotal + paymentFeeTotal;
  
  return {
    serviceFees: {
      total: serviceFeeTotal,
      handling: handlingFee,
      insurance: insuranceFee,
      label: 'Service fees',
      description: 'Package handling and protection insurance',
    },
    
    paymentFees: {
      total: paymentFeeTotal,
      gatewayFee: gatewayFee,
      label: 'Payment processing',
      description: 'Payment gateway and transaction fees',
    },
    
    allFees: {
      total: allFeesTotal,
      label: 'Processing fees',
      description: 'Service, handling, and payment processing charges',
    },
  };
}

/**
 * Admin-specific fee breakdown with detailed component visibility
 * Shows individual components when they have non-zero values
 */
export function getAdminFeeBreakdown(quote: UnifiedQuote): {
  compactDisplay: FeeBreakdown['allFees'];
  expandedDisplay: Array<{
    label: string;
    amount: number;
    description: string;
    category: 'service' | 'payment';
  }>;
} {
  const standardBreakdown = getStandardizedFeeBreakdown(quote);
  
  const expandedDisplay = [];
  
  // Add handling fee if present
  if (standardBreakdown.serviceFees.handling > 0) {
    expandedDisplay.push({
      label: 'Handling charge',
      amount: standardBreakdown.serviceFees.handling,
      description: 'Package processing and preparation',
      category: 'service' as const,
    });
  }
  
  // Add insurance fee if present
  if (standardBreakdown.serviceFees.insurance > 0) {
    expandedDisplay.push({
      label: 'Package protection',
      amount: standardBreakdown.serviceFees.insurance,
      description: 'Insurance coverage for shipment',
      category: 'service' as const,
    });
  }
  
  // Add payment gateway fee if present
  if (standardBreakdown.paymentFees.gatewayFee > 0) {
    expandedDisplay.push({
      label: 'Payment gateway fee',
      amount: standardBreakdown.paymentFees.gatewayFee,
      description: 'Payment processing charges',
      category: 'payment' as const,
    });
  }
  
  return {
    compactDisplay: standardBreakdown.allFees,
    expandedDisplay,
  };
}

/**
 * Customer-friendly fee breakdown with simplified grouping
 * Groups related fees together for cleaner customer experience
 */
export function getCustomerFeeBreakdown(quote: UnifiedQuote): {
  serviceFees: FeeBreakdown['serviceFees'];
  paymentFees: FeeBreakdown['paymentFees'];
  showSeparately: boolean; // Whether to show service and payment fees separately
} {
  const standardBreakdown = getStandardizedFeeBreakdown(quote);
  
  // Show separately only if both categories have meaningful amounts
  const showSeparately = 
    standardBreakdown.serviceFees.total > 0 && 
    standardBreakdown.paymentFees.total > 0;
  
  return {
    serviceFees: standardBreakdown.serviceFees,
    paymentFees: standardBreakdown.paymentFees,
    showSeparately,
  };
}

/**
 * Dashboard-specific fee breakdown for order history and receipts
 * Provides detailed visibility for customer service and transparency
 */
export function getDashboardFeeBreakdown(quote: UnifiedQuote): {
  totalFees: number;
  components: Array<{
    label: string;
    amount: number;
    description: string;
    isSignificant: boolean; // Whether amount is significant enough to show
  }>;
} {
  const standardBreakdown = getStandardizedFeeBreakdown(quote);
  
  const components = [
    {
      label: 'Service fees',
      amount: standardBreakdown.serviceFees.total,
      description: 'Handling and insurance charges',
      isSignificant: standardBreakdown.serviceFees.total > 0,
    },
    {
      label: 'Payment processing',
      amount: standardBreakdown.paymentFees.total,
      description: 'Gateway and transaction fees',
      isSignificant: standardBreakdown.paymentFees.total > 0,
    },
  ];
  
  return {
    totalFees: standardBreakdown.allFees.total,
    components: components.filter(comp => comp.isSignificant),
  };
}