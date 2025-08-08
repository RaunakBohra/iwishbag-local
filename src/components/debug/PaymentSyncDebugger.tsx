import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PaymentSyncDebugger = () => {
  // Check payment proof messages
  const { data: paymentProofs, refetch: refetchProofs } = useQuery({
    queryKey: ['debug-payment-proofs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, quote_id, verification_status, admin_notes, created_at')
        .eq('message_type', 'payment_proof');

      if (error) {
        console.error('Debug: Error fetching payment proofs:', error);
        return [];
      }
      return data || [];
    },
  });

  // Check quote payment data
  const { data: quotes, refetch: refetchQuotes } = useQuery({
    queryKey: ['debug-quote-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, display_id, status, payment_status, amount_paid, final_total_origincurrency, currency');

      if (error) {
        console.error('Debug: Error fetching quotes:', error);
        return [];
      }
      return data || [];
    },
  });

  useEffect(() => {
    console.log('=== PAYMENT SYNC DEBUGGER ===');
    console.log('Payment Proofs:', paymentProofs);
    console.log('Quotes Payment Data:', quotes);

    if (paymentProofs && quotes) {
      console.log('\n--- SYNC ANALYSIS ---');

      // Find quotes with payment proofs
      const quotesWithProofs = quotes.filter((quote) =>
        paymentProofs.some((proof) => proof.quote_id === quote.id),
      );

      console.log('Quotes with payment proofs:', quotesWithProofs.length);

      quotesWithProofs.forEach((quote) => {
        const proofs = paymentProofs.filter((p) => p.quote_id === quote.id);
        const verifiedProofs = proofs.filter((p) => p.verification_status === 'verified');
        const pendingProofs = proofs.filter(
          (p) => !p.verification_status || p.verification_status === 'pending',
        );

        console.log(`\nQuote ${quote.display_id}:`);
        console.log(`  Status: ${quote.status}`);
        console.log(`  Payment Status: ${quote.payment_status}`);
        console.log(`  Amount Paid: ${quote.amount_paid} ${quote.destination_currency}`);
        console.log(`  Final Total: ${quote.final_total_origincurrency} ${quote.destination_currency}`);
        console.log(`  Total Proofs: ${proofs.length}`);
        console.log(`  Verified Proofs: ${verifiedProofs.length}`);
        console.log(`  Pending Proofs: ${pendingProofs.length}`);

        // Check for sync issues
        if (verifiedProofs.length > 0 && quote.amount_paid === 0) {
          console.log(`  ⚠️ SYNC ISSUE: Has verified proofs but amount_paid is 0`);
        }

        if (quote.amount_paid > 0 && quote.payment_status === 'unpaid') {
          console.log(`  ⚠️ SYNC ISSUE: Has amount_paid but payment_status is unpaid`);
        }

        if (quote.payment_status === 'paid' && quote.status === 'payment_pending') {
          console.log(
            `  ⚠️ SYNC ISSUE: Payment status is paid but order status is still payment_pending`,
          );
        }
      });
    }
  }, [paymentProofs, quotes]);

  const handleRefresh = () => {
    console.log('🔄 Manually refreshing payment sync data...');
    refetchProofs();
    refetchQuotes();
  };

  return (
    <div className="fixed bottom-20 right-4 bg-red-100 text-red-800 p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Payment Sync Debug</div>
      <div>Payment Proofs: {paymentProofs?.length || 0}</div>
      <div>Quotes: {quotes?.length || 0}</div>
      <button
        onClick={handleRefresh}
        className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
      >
        Refresh Data
      </button>
      <div className="mt-1 text-xs">Check console for detailed sync analysis</div>
    </div>
  );
};
