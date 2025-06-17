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
        status: 'completed',
        icon: 'shopping-cart'
      },
      {
        id: 'calculated',
        label: 'Calculated',
        description: 'Quote has been calculated',
        date: quote.calculated_at,
        status: quote.status === 'calculated' || quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered' ? 'completed' : 
               quote.status === 'cancelled' ? 'error' : 'upcoming',
        icon: 'calculator'
      },
      {
        id: 'sent',
        label: 'Sent',
        description: 'Quote has been sent to customer',
        date: quote.sent_at,
        status: quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered' ? 'completed' : 
               quote.status === 'cancelled' ? 'error' : 'upcoming',
        icon: 'send'
      }
    ];

    // Add approval step if quote has been sent
    if (quote.status !== 'calculated' && quote.status !== 'cancelled') {
      steps.push({
        id: 'approved',
        label: 'Approved',
        description: 'Quote has been approved by customer',
        date: quote.approved_at,
        status: quote.status === 'accepted' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered' ? 'completed' : 
               quote.status === 'cancelled' ? 'error' : 'upcoming',
        icon: 'check-circle'
      });
    }

    // Add payment step if quote has been approved
    if (quote.status === 'accepted' || quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'paid',
        label: 'Paid',
        description: 'Payment has been received',
        date: quote.paid_at,
        status: quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered' ? 'completed' : 'upcoming',
        icon: 'credit-card'
      });
    }

    // Add order step if payment has been received
    if (quote.status === 'paid' || quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'ordered',
        label: 'Ordered',
        description: 'Order has been placed with seller',
        date: quote.ordered_at,
        status: quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered' ? 'completed' : 'upcoming',
        icon: 'package'
      });
    }

    // Add shipping step if order has been placed
    if (quote.status === 'ordered' || quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'shipped',
        label: 'Shipped',
        description: 'Order has been shipped',
        date: quote.shipped_at,
        status: quote.status === 'shipped' || quote.status === 'delivered' ? 'completed' : 'upcoming',
        icon: 'truck'
      });
    }

    // Add delivery step if order has been shipped
    if (quote.status === 'shipped' || quote.status === 'delivered') {
      steps.push({
        id: 'delivered',
        label: 'Delivered',
        description: 'Order has been delivered',
        date: quote.delivered_at,
        status: quote.status === 'delivered' ? 'completed' : 'upcoming',
        icon: 'home'
      });
    }

    // Update current step based on last completed step
    let foundCurrent = false;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].status === 'completed' && !foundCurrent) {
        foundCurrent = true;
        if (i < steps.length - 1) {
          steps[i + 1].status = 'current';
        }
      }
    }

    return steps;
  }, [quote]);
}; 