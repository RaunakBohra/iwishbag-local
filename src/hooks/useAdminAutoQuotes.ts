import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminAutoQuotes = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          *,
          profiles:user_id(email, country)
        `)
        .eq('quote_type', 'auto')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data to include user email
      const transformedQuotes = data?.map(quote => ({
        ...quote,
        userEmail: quote.profiles?.email || quote.email || 'Guest',
        purchaseCountry: quote.country_code,
        userShippingCountry: quote.profiles?.country,
        originalCurrency: quote.items_currency || 'USD',
        productName: quote.product_name,
        productUrl: quote.product_url,
        itemPrice: quote.item_price,
        finalTotal: quote.final_total,
        internationalShipping: quote.international_shipping,
        customsAndECS: quote.customs_and_ecs,
        handlingCharge: quote.handling_charge,
        insuranceAmount: quote.insurance_amount,
        paymentGatewayFee: quote.payment_gateway_fee,
        vat: quote.vat,
        confidence: quote.confidence_score,
        appliedRules: quote.applied_rules,
        scrapedData: quote.scraped_data,
        createdAt: quote.created_at,
        updatedAt: quote.updated_at
      })) || [];

      setQuotes(transformedQuotes);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch auto quotes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approveQuote = async (quoteId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Quote approved successfully",
      });

      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId 
          ? { ...quote, status: 'approved' }
          : quote
      ));

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to approve quote: " + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const rejectQuote = async (quoteId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Quote rejected successfully",
      });

      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId 
          ? { ...quote, status: 'rejected' }
          : quote
      ));

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to reject quote: " + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const convertToManual = async (quoteId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          quote_type: 'manual',
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Quote converted to manual review",
      });

      // Remove from auto quotes list
      setQuotes(prev => prev.filter(quote => quote.id !== quoteId));

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to convert quote: " + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (deleteError) {
        throw deleteError;
      }

      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });

      // Remove from local state
      setQuotes(prev => prev.filter(quote => quote.id !== quoteId));

      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to delete quote: " + err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getQuoteStats = () => {
    const total = quotes.length;
    const pending = quotes.filter(q => q.status === 'pending').length;
    const approved = quotes.filter(q => q.status === 'approved').length;
    const rejected = quotes.filter(q => q.status === 'rejected').length;
    const avgConfidence = quotes.length > 0 
      ? quotes.reduce((sum, q) => sum + (q.confidence || 0), 0) / quotes.length 
      : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  };

  // Initial fetch
  useEffect(() => {
    fetchQuotes();
  }, []);

  return {
    quotes,
    isLoading,
    error,
    fetchQuotes: fetchQuotes,
    approveQuote,
    rejectQuote,
    convertToManual,
    deleteQuote,
    getQuoteStats,
    refreshQuotes: fetchQuotes
  };
}; 