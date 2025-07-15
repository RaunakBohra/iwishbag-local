import { supabase } from '@/integrations/supabase/client';

export async function recordTestPayUPayment(quoteId: string, amount: number) {
  console.log('Recording test PayU payment...');
  
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('Not authenticated');
    }
    
    // Create payment ledger entry
    const { data, error } = await supabase
      .from('payment_ledger')
      .insert({
        quote_id: quoteId,
        payment_type: 'customer_payment',
        payment_method: 'payu',
        amount: amount,
        currency: 'USD',
        status: 'completed',
        payment_date: new Date().toISOString(),
        reference_number: `TEST-PAYU-${Date.now()}`,
        notes: 'Test PayU payment for refund testing',
        created_by: userData.user.id
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error recording test payment:', error);
      throw error;
    }
    
    console.log('Test payment recorded:', data);
    
    // Also update quote amount_paid
    const { data: quote } = await supabase
      .from('quotes')
      .select('amount_paid, final_total')
      .eq('id', quoteId)
      .single();
      
    if (quote) {
      const newAmountPaid = (quote.amount_paid || 0) + amount;
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          amount_paid: newAmountPaid,
          payment_status: newAmountPaid >= quote.final_total ? 'paid' : 'partial'
        })
        .eq('id', quoteId);
        
      if (updateError) {
        console.error('Error updating quote:', updateError);
      }
    }
    
    return data;
  } catch (err) {
    console.error('Failed to record test payment:', err);
    throw err;
  }
}

// Export to window for console testing
if (typeof window !== 'undefined') {
  // Extend window interface for test function
  interface WindowWithTestPayment extends Window {
    recordTestPayUPayment: typeof recordTestPayUPayment;
  }
  
  (window as WindowWithTestPayment).recordTestPayUPayment = recordTestPayUPayment;
}