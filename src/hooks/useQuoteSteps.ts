import { useMemo } from 'react';
import { Quote } from '@/types/quote';

export type QuoteStep = {
  id: string;
  label: string;
  description: string;
  date: string | null;
  status: 'completed' | 'current' | 'upcoming' | 'error';
  icon: string;
};

export const useQuoteSteps = (quote: Quote | null) => {
  return useMemo(() => {
    if (!quote) return [];

    const steps: QuoteStep[] = [
      {
        id: 'requested',
        label: 'Requested',
        description: 'Quote request submitted',
        date: quote.created_at,
        status: 'upcoming',
        icon: 'shopping-cart'
      },
      {
        id: 'calculated',
        label: 'Calculated',
        description: 'Quote has been calculated',
        date: quote.calculated_at,
        status: 'upcoming',
        icon: 'calculator'
      },
      {
        id: 'sent',
        label: 'Sent',
        description: 'Quote has been sent to customer',
        date: quote.sent_at,
        status: 'upcoming',
        icon: 'send'
      }
    ];

    if (quote.status !== 'calculated' && quote.status !== 'cancelled') {
      steps.push({
        id: 'approved',
        label: 'Approved',
        description: 'Quote has been approved by customer',
        date: quote.approved_at,
        status: 'upcoming',
        icon: 'check-circle'
      });
    }
    if (quote.status === 'approved' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'paid',
        label: 'Paid',
        description: 'Payment has been received',
        date: quote.paid_at,
        status: 'upcoming',
        icon: 'credit-card'
      });
    }
    if (quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'ordered',
        label: 'Ordered',
        description: 'Order has been placed with seller',
        date: quote.ordered_at,
        status: 'upcoming',
        icon: 'package'
      });
    }
    if (quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'shipped',
        label: 'Shipped',
        description: 'Order has been shipped',
        date: quote.shipped_at,
        status: 'upcoming',
        icon: 'truck'
      });
    }
    if (quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'delivered',
        label: 'Delivered',
        description: 'Order has been delivered',
        date: quote.delivered_at,
        status: 'upcoming',
        icon: 'home'
      });
    }

    // Find the last reached step
    let lastReached = -1;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (
        (step.id === 'requested' && quote.status !== 'pending') ||
        (step.id === 'calculated' && (quote.status === 'calculated' || quote.status === 'sent' || quote.status === 'approved' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered')) ||
        (step.id === 'sent' && (quote.status === 'sent' || quote.status === 'approved' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered')) ||
        (step.id === 'approved' && (quote.status === 'approved' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered')) ||
        (step.id === 'paid' && (quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered')) ||
        (step.id === 'ordered' && (quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered')) ||
        (step.id === 'shipped' && (quote.status === 'shipped' || quote.status === 'delivered')) ||
        (step.id === 'delivered' && quote.status === 'delivered')
      ) {
        lastReached = i;
      }
    }

    // Set statuses
    for (let i = 0; i < steps.length; i++) {
      if (i < lastReached) {
        steps[i].status = 'completed';
      } else if (i === lastReached) {
        steps[i].status = 'current';
      } else {
        steps[i].status = 'upcoming';
      }
    }

    // Handle error/cancelled
    if (quote.status === 'cancelled' && steps.length > 0) {
      if (steps[lastReached + 1]) {
        steps[lastReached + 1].status = 'error';
      }
    }

    // Special case: if quote.status is 'pending', highlight 'requested' as current
    if (quote.status === 'pending' && steps.length > 0) {
      steps[0].status = 'current';
      for (let i = 1; i < steps.length; i++) {
        steps[i].status = 'upcoming';
      }
      return steps;
    }

    return steps;
  }, [quote]);
}; 