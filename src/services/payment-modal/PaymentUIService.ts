/**
 * Payment UI Service
 * Handles UI state management, formatters, and display utilities for payment operations
 */

import { logger } from '@/utils/logger';
import { currencyService } from '@/services/CurrencyService';
import { getCurrencySymbol } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';
import React from 'react';
import {
  DollarSign,
  Banknote,
  CreditCard,
  Smartphone,
  FileText,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { PaymentMethodType } from '@/services/UnifiedPaymentValidationService';
import { PaymentSummaryData } from './PaymentDataService';

// UI state types
export type TabValue = 'overview' | 'record' | 'verify' | 'history' | 'refund';

export interface UIState {
  activeTab: TabValue;
  showRefundModal: boolean;
  isLoading: boolean;
  previewImageLoading: boolean;
  previewImageError: boolean;
}

export interface PaymentFormState {
  // Record payment form
  amount: string;
  method: PaymentMethodType;
  currency: string;
  transactionId: string;
  date: string;
  notes: string;
  isRecording: boolean;

  // Verify payment form
  verifyProofId: string | null;
  verifyAmount: string;
  verifyNotes: string;
  rejectionReason: string;
  isVerifying: boolean;
  isRejecting: boolean;
}

export interface DisplayOptions {
  showCurrencyCode?: boolean;
  showSymbol?: boolean;
  decimalPlaces?: number;
  useGrouping?: boolean;
}

export class PaymentUIService {
  private defaultUIState: UIState = {
    activeTab: 'overview',
    showRefundModal: false,
    isLoading: false,
    previewImageLoading: false,
    previewImageError: false,
  };

  private defaultFormState: PaymentFormState = {
    amount: '',
    method: 'bank_transfer',
    currency: 'USD',
    transactionId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    isRecording: false,
    verifyProofId: null,
    verifyAmount: '',
    verifyNotes: '',
    rejectionReason: '',
    isVerifying: false,
    isRejecting: false,
  };

  constructor() {
    logger.info('PaymentUIService initialized');
  }

  /**
   * Get initial UI state
   */
  getInitialUIState(): UIState {
    return { ...this.defaultUIState };
  }

  /**
   * Get initial form state
   */
  getInitialFormState(currency: string = 'USD'): PaymentFormState {
    return {
      ...this.defaultFormState,
      currency,
    };
  }

  /**
   * Format currency amount with various options
   */
  formatAmount(
    amount: number,
    currency: string,
    options: DisplayOptions = {}
  ): string {
    const {
      showCurrencyCode = false,
      showSymbol = true,
      decimalPlaces = 2,
      useGrouping = true,
    } = options;

    try {
      const formatted = currencyService.formatAmount(amount, currency);
      
      if (!showSymbol) {
        // Remove currency symbol
        const symbol = getCurrencySymbol(currency);
        return formatted.replace(symbol, '').trim();
      }

      if (showCurrencyCode) {
        return `${formatted} ${currency}`;
      }

      return formatted;
    } catch (error) {
      logger.warn('Amount formatting error:', error);
      return `${getCurrencySymbol(currency)}${amount.toFixed(decimalPlaces)}`;
    }
  }

  /**
   * Get payment method icon
   */
  getPaymentMethodIcon(method: string | null | undefined): React.ReactElement {
    if (!method) return React.createElement(DollarSign, { className: "w-5 h-5" });

    switch (method.toLowerCase()) {
      case 'bank_transfer':
      case 'wire_transfer':
        return React.createElement(Banknote, { className: "w-5 h-5 text-teal-500" });
      case 'payu':
      case 'stripe':
      case 'credit_card':
        return React.createElement(CreditCard, { className: "w-5 h-5 text-green-500" });
      case 'cash':
        return React.createElement(DollarSign, { className: "w-5 h-5 text-gray-500" });
      case 'upi':
      case 'esewa':
        return React.createElement(Smartphone, { className: "w-5 h-5 text-orange-500" });
      case 'check':
      case 'cheque':
        return React.createElement(FileText, { className: "w-5 h-5 text-orange-500" });
      case 'credit_note':
        return React.createElement(Receipt, { className: "w-5 h-5 text-yellow-500" });
      default:
        return React.createElement(DollarSign, { className: "w-5 h-5 text-gray-500" });
    }
  }

  /**
   * Get payment status color classes
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'partial':
        return 'text-orange-600 bg-orange-50';
      case 'unpaid':
        return 'text-red-600 bg-red-50';
      case 'partially_refunded':
        return 'text-orange-600 bg-orange-50';
      case 'fully_refunded':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  /**
   * Get payment status display text
   */
  getStatusDisplayText(status: string, paymentSummary: PaymentSummaryData, currency: string): string {
    const currencySymbol = getCurrencySymbol(currency);

    switch (status) {
      case 'paid':
        return 'Fully Paid';
      case 'partial':
        return 'Partially Paid';
      case 'partially_refunded':
        return `Partially Refunded (${currencySymbol}${paymentSummary.totalRefunds.toFixed(2)})`;
      case 'fully_refunded':
        return 'Fully Refunded';
      case 'unpaid':
      default:
        return 'Unpaid';
    }
  }

  /**
   * Calculate payment balance for verification preview
   */
  calculatePaymentBalance(
    currentPaid: number,
    orderTotal: number,
    newAmount: number
  ): {
    currentPaid: number;
    orderTotal: number;
    newAmount: number;
    newTotal: number;
    newStatus: string;
    overpayment: number;
  } {
    const newTotal = currentPaid + newAmount;

    let newStatus = 'unpaid';
    if (newTotal >= orderTotal) {
      newStatus = newTotal > orderTotal ? 'overpaid' : 'paid';
    } else if (newTotal > 0) {
      newStatus = 'partial';
    }

    return {
      currentPaid,
      orderTotal,
      newAmount,
      newTotal,
      newStatus,
      overpayment: newTotal > orderTotal ? newTotal - orderTotal : 0,
    };
  }

  /**
   * Get available tabs based on quote state
   */
  getAvailableTabs(
    paymentSummary: PaymentSummaryData,
    paymentMethod?: string,
    hasUnverifiedProofs?: boolean
  ): TabValue[] {
    const tabs: TabValue[] = ['overview', 'history'];

    // Show record tab for unpaid or partially paid
    if (paymentSummary.status !== 'paid' || paymentSummary.isOverpaid) {
      tabs.splice(1, 0, 'record');
    }

    // Show verify tab for bank transfers with unverified proofs
    if (paymentMethod === 'bank_transfer' && hasUnverifiedProofs) {
      tabs.splice(tabs.indexOf('record') + 1, 0, 'verify');
    }

    // Show refund tab for paid or overpaid
    if (paymentSummary.totalPaid > 0) {
      tabs.push('refund');
    }

    return tabs;
  }

  /**
   * Validate image file for preview
   */
  isImage(filename: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  }

  /**
   * Generate download link for file
   */
  createDownloadLink(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'payment-proof';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      logger.warn('Clipboard copy failed:', error);
      
      // Fallback method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      } catch (fallbackError) {
        logger.error('Fallback clipboard copy failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      switch (format) {
        case 'long':
          return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        case 'time':
          return dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        case 'short':
        default:
          return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
      }
    } catch (error) {
      logger.warn('Date formatting error:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Get progress bar configuration
   */
  getProgressBarConfig(paymentSummary: PaymentSummaryData): {
    percentage: number;
    colorClass: string;
    label: string;
  } {
    const percentage = Math.min(100, Math.round(paymentSummary.percentagePaid));
    
    let colorClass = 'bg-orange-600';
    if (paymentSummary.isOverpaid) {
      colorClass = 'bg-teal-600';
    } else if (paymentSummary.status === 'paid') {
      colorClass = 'bg-green-600';
    }

    return {
      percentage,
      colorClass,
      label: `${percentage}%`,
    };
  }

  /**
   * Generate timeline dot styling
   */
  getTimelineDotStyle(entryType: string, amount: number): {
    className: string;
    icon: React.ReactElement;
  } {
    const isPayment = entryType === 'payment' || entryType === 'customer_payment' || amount > 0;
    const isRefund = entryType === 'refund' || entryType === 'partial_refund' || amount < 0;

    const className = cn(
      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full',
      isPayment
        ? 'bg-green-100 text-green-600'
        : isRefund
          ? 'bg-red-100 text-red-600'
          : 'bg-gray-100 text-gray-600'
    );

    const icon = isPayment
      ? React.createElement(DollarSign, { className: "h-5 w-5" })
      : isRefund
        ? React.createElement(RefreshCw, { className: "h-5 w-5" })
        : React.createElement(FileText, { className: "h-5 w-5" });

    return { className, icon };
  }

  /**
   * Format payment method display name
   */
  formatPaymentMethod(method: string): string {
    const methodNames: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      wire_transfer: 'Wire Transfer',
      credit_card: 'Credit Card',
      upi: 'UPI',
      payu: 'PayU',
      stripe: 'Stripe',
      esewa: 'eSewa',
      credit_note: 'Credit Note',
      cash: 'Cash',
      check: 'Check/Cheque',
      other: 'Other',
    };

    return methodNames[method.toLowerCase()] || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get validation message styling
   */
  getValidationStyling(hasErrors: boolean): {
    inputClassName: string;
    messageClassName: string;
  } {
    return {
      inputClassName: hasErrors ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '',
      messageClassName: hasErrors ? 'text-red-600' : 'text-orange-600',
    };
  }

  /**
   * Generate summary statistics for display
   */
  generateDisplayStats(paymentSummary: PaymentSummaryData, currency: string): Array<{
    label: string;
    value: string;
    color: string;
    icon?: React.ReactElement;
  }> {
    return [
      {
        label: 'Total Payments',
        value: this.formatAmount(paymentSummary.totalPayments, currency),
        color: 'text-green-600',
        icon: React.createElement(DollarSign, { className: "w-4 h-4" }),
      },
      {
        label: 'Total Refunds',
        value: this.formatAmount(paymentSummary.totalRefunds, currency),
        color: 'text-red-600',
        icon: React.createElement(RefreshCw, { className: "w-4 h-4" }),
      },
      {
        label: 'Net Amount',
        value: this.formatAmount(paymentSummary.totalPaid, currency),
        color: paymentSummary.totalPaid >= paymentSummary.finalTotal ? 'text-green-600' : 'text-orange-600',
      },
    ];
  }

  /**
   * Get keyboard shortcuts help text
   */
  getKeyboardShortcuts(): Array<{ key: string; description: string; condition?: string }> {
    return [
      { key: 'Ctrl+Enter', description: 'Approve verification', condition: 'When verifying payment proof' },
      { key: 'Ctrl+R', description: 'Reject proof', condition: 'When verifying payment proof' },
      { key: 'Escape', description: 'Close modal', condition: 'Any time' },
      { key: 'Tab', description: 'Navigate between tabs', condition: 'Any time' },
    ];
  }

  /**
   * Generate CSS classes for amount display
   */
  getAmountDisplayClasses(
    amount: number,
    type: 'payment' | 'refund' | 'balance',
    size: 'small' | 'medium' | 'large' = 'medium'
  ): string {
    const baseClasses = 'font-semibold';
    
    let sizeClasses = 'text-base';
    switch (size) {
      case 'small':
        sizeClasses = 'text-sm';
        break;
      case 'large':
        sizeClasses = 'text-lg';
        break;
    }

    let colorClasses = 'text-gray-600';
    switch (type) {
      case 'payment':
        colorClasses = amount > 0 ? 'text-green-600' : 'text-gray-600';
        break;
      case 'refund':
        colorClasses = amount > 0 ? 'text-red-600' : 'text-gray-600';
        break;
      case 'balance':
        colorClasses = amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-gray-600';
        break;
    }

    return cn(baseClasses, sizeClasses, colorClasses);
  }

  /**
   * Clean up UI resources
   */
  cleanup(): void {
    logger.info('PaymentUIService cleanup completed');
  }
}

// Singleton instance
export const paymentUIService = new PaymentUIService();

// React hook for using Payment UI Service
export function usePaymentUIService() {
  return {
    formatAmount: (amount: number, currency: string, options?: DisplayOptions) =>
      paymentUIService.formatAmount(amount, currency, options),
    getPaymentMethodIcon: (method: string | null | undefined) =>
      paymentUIService.getPaymentMethodIcon(method),
    getStatusColor: (status: string) => paymentUIService.getStatusColor(status),
    getStatusDisplayText: (status: string, paymentSummary: PaymentSummaryData, currency: string) =>
      paymentUIService.getStatusDisplayText(status, paymentSummary, currency),
    formatPaymentMethod: (method: string) => paymentUIService.formatPaymentMethod(method),
    formatDate: (date: string | Date, format?: 'short' | 'long' | 'time') =>
      paymentUIService.formatDate(date, format),
    copyToClipboard: (text: string) => paymentUIService.copyToClipboard(text),
    createDownloadLink: (url: string, filename: string) =>
      paymentUIService.createDownloadLink(url, filename),
  };
}

export default PaymentUIService;