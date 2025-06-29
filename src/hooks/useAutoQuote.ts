import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { env } from '@/config/env';

interface ScrapedProduct {
  title: string;
  price: number;
  weight: number;
  images: string[];
  availability: string;
  category: string;
  currency?: string;
  country?: string;
}

interface AutoQuote {
  id: string;
  product_name: string;
  item_price: number;
  item_weight: number;
  final_total: number;
  sub_total: number;
  vat: number;
  international_shipping: number;
  customs_and_ecs: number;
  payment_gateway_fee: number;
  final_currency: string;
  final_total_local: number;
  confidence_score: number;
  applied_rules: {
    weight: string;
    customs: string;
    pricing: string;
  };
  scraped_data: {
    originalPrice: number;
    originalWeight: number;
    title: string;
    images: string[];
    category: string;
  };
  status: string;
  created_at: string;
}

export const useAutoQuote = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<AutoQuote | null>(null);
  const { toast } = useToast();

  const scrapeProduct = async (url: string): Promise<{ success: boolean; data?: ScrapedProduct; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract website domain from URL
      const urlObj = new URL(url);
      const websiteDomain = urlObj.hostname.replace('www.', '');

      console.log(`🔵 Scraping product from ${websiteDomain}: ${url}`);

      // Call Supabase edge function
      const { data, error: functionError } = await supabase.functions.invoke('scrape-product', {
        body: {
          url,
          website_domain: websiteDomain
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to scrape product');
      }

      console.log(`✅ Successfully scraped: ${data.data.title}`);
      return { success: true, data: data.data };

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to scrape product';
      console.error('❌ Scraping error:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Scraping Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const calculateQuote = async (scrapedData: ScrapedProduct, purchaseCountry: string, shippingCountry: string): Promise<AutoQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      console.log(`🔵 Calculating auto quote for: ${scrapedData.title} from ${purchaseCountry} to ${shippingCountry} (${scrapedData.currency || 'USD'})`);

      // Call Supabase edge function
      const { data, error: functionError } = await supabase.functions.invoke('calculate-auto-quote', {
        body: {
          scrapedData,
          purchaseCountry,
          shippingCountry,
          userId: user?.id || null
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to calculate quote');
      }

      const autoQuote = data as AutoQuote;
      setQuote(autoQuote);

      console.log(`✅ Auto quote calculated: $${autoQuote.final_total}`);

      toast({
        title: "Quote Generated",
        description: `Instant quote ready: $${autoQuote.final_total} ${autoQuote.final_currency}`,
      });

      return autoQuote;

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to calculate quote';
      console.error('❌ Quote calculation error:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Calculation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptQuote = async (quoteId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          approval_status: 'approved',
          status: 'accepted'
        })
        .eq('id', quoteId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Quote Accepted",
        description: "Your quote has been accepted and is being processed.",
      });

      return true;

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const requestManualReview = async (quoteId: string, reason?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          approval_status: 'pending',
          status: 'pending_review',
          internal_notes: reason || 'User requested manual review'
        })
        .eq('id', quoteId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Review Requested",
        description: "Your quote has been sent for manual review. We'll notify you when it's ready.",
      });

      return true;

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const saveForLater = async (quoteId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          in_cart: false,
          status: 'saved'
        })
        .eq('id', quoteId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Quote Saved",
        description: "Your quote has been saved for later. You can find it in your dashboard.",
      });

      return true;

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const addToCart = async (quoteId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          in_cart: true,
          status: 'in_cart'
        })
        .eq('id', quoteId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Added to Cart",
        description: "Quote has been added to your cart.",
      });

      return true;

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const reset = () => {
    setQuote(null);
    setError(null);
  };

  return {
    scrapeProduct,
    calculateQuote,
    acceptQuote,
    requestManualReview,
    saveForLater,
    addToCart,
    reset,
    isLoading,
    error,
    quote,
    isAutoQuoteEnabled: env.AUTO_QUOTE_ENABLED
  };
}; 