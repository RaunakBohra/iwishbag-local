import { useEffect } from 'react';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const StatusDebugger = () => {
  const {
    quoteStatuses,
    orderStatuses,
    getStatusesForQuotesList,
    getStatusesForOrdersList,
    findStatusForPaymentMethod,
  } = useStatusManagement();

  // Check for quotes with payment_pending status
  const { data: paymentPendingQuotes } = useQuery({
    queryKey: ['debug-payment-pending-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, display_id, status, product_name')
        .eq('status', 'payment_pending');

      if (error) {
        console.error('Debug: Error fetching payment_pending quotes:', error);
        return [];
      }
      return data || [];
    },
  });

  // Check all quotes to see what statuses exist
  const { data: allQuotes } = useQuery({
    queryKey: ['debug-all-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotes').select('status').limit(50);

      if (error) {
        console.error('Debug: Error fetching all quotes:', error);
        return [];
      }
      return data || [];
    },
  });

  useEffect(() => {
    console.log('=== STATUS DEBUGGER ===');
    console.log('Environment:', import.meta.env.VITE_ENVIRONMENT);
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Is Local:', import.meta.env.VITE_IS_LOCAL);

    console.log('\n--- Quote Statuses ---');
    console.log('Total quote statuses loaded:', quoteStatuses?.length || 0);
    console.log('All quote statuses:');
    quoteStatuses?.forEach((status) => {
      console.log(`  - "${status.name}": showsInQuotesList=${status.showsInQuotesList}`);
      if (status.name === 'payment_pending') {
        console.log(
          `payment_pending found in quote statuses: showsInQuotesList=${status.showsInQuotesList}`,
        );
      }
    });

    console.log('\n--- Order Statuses ---');
    console.log('Total order statuses loaded:', orderStatuses?.length || 0);
    console.log('All order statuses:');
    orderStatuses?.forEach((status) => {
      console.log(`  - "${status.name}": showsInOrdersList=${status.showsInOrdersList}`);
      if (status.name === 'payment_pending' || status.name === 'payment pending') {
        console.log(
          `Payment status found: "${status.name}" showsInOrdersList=${status.showsInOrdersList}`,
        );
      }
    });

    console.log('\n--- Filtering Logic ---');
    const quotesListStatuses = getStatusesForQuotesList();
    const ordersListStatuses = getStatusesForOrdersList();
    console.log('Statuses allowed in quotes list:', quotesListStatuses);
    console.log('Statuses allowed in orders list:', ordersListStatuses);
    console.log(
      'payment_pending allowed in quotes?',
      quotesListStatuses.includes('payment_pending'),
    );
    console.log(
      'payment_pending allowed in orders?',
      ordersListStatuses.includes('payment_pending'),
    );
    console.log(
      '"payment pending" (space) allowed in orders?',
      ordersListStatuses.includes('payment pending'),
    );

    // Test the findStatusForPaymentMethod function
    console.log('\n--- Payment Method Status Resolution ---');
    const bankTransferStatus = findStatusForPaymentMethod('bank_transfer');
    console.log('Bank transfer status config:', bankTransferStatus);
    console.log('Bank transfer status name:', bankTransferStatus?.name);

    if (paymentPendingQuotes) {
      console.log('\n--- Payment Pending Quotes ---');
      console.log(
        `Found ${paymentPendingQuotes.length} quotes with payment_pending status:`,
        paymentPendingQuotes,
      );
    }

    if (allQuotes) {
      const uniqueStatuses = [...new Set(allQuotes.map((q) => q.status))];
      console.log('\n--- All Quote Statuses in Database ---');
      console.log('Unique statuses found:', uniqueStatuses);
    }
  }, [quoteStatuses, orderStatuses, paymentPendingQuotes, allQuotes, findStatusForPaymentMethod, getStatusesForOrdersList, getStatusesForQuotesList]);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Status Debug Info</div>
      <div>Environment: {import.meta.env.VITE_ENVIRONMENT}</div>
      <div>Quote Statuses: {quoteStatuses?.length || 0}</div>
      <div>Order Statuses: {orderStatuses?.length || 0}</div>
      <div>Payment Pending Quotes: {paymentPendingQuotes?.length || 0}</div>
      <div>All Quotes: {allQuotes?.length || 0}</div>
      <div className="mt-2">
        <div>Quotes List: {getStatusesForQuotesList().join(', ')}</div>
        <div>Orders List: {getStatusesForOrdersList().join(', ')}</div>
      </div>
    </div>
  );
};
