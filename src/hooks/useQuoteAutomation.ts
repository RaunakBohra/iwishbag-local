import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { calculateQuote } from "@/lib/quote-calculator";
import { productAnalyzer, ProductAnalysis } from '@/lib/productAnalyzer';

type Quote = Tables<'quotes'>;
type QuoteItem = Tables<'quote_items'>;

interface AutomatedQuoteData {
  quoteId: string;
  productUrl?: string;
  productName?: string;
  imageUrl?: string;
  countryCode: string;
}

export const useQuoteAutomation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Real product analysis using the ProductAnalyzer
  const analyzeProductMutation = useMutation({
    mutationFn: async ({ productUrl, productName }: { productUrl?: string; productName?: string }) => {
      if (!productUrl && !productName) {
        throw new Error("Product URL or name is required for analysis");
      }

      if (!productUrl) {
        // If no URL, create a manual analysis task
        const { data, error } = await supabase
          .from('manual_analysis_tasks')
          .insert({
            url: null,
            product_name: productName,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return {
          name: productName || 'Product (Manual Review Required)',
          price: 0,
          weight: 0,
          category: 'unknown',
          availability: true,
          currency: 'USD',
          error: 'Requires manual analysis'
        } as ProductAnalysis;
      }

      // Use the real product analyzer
      const analysis = await productAnalyzer.analyzeProduct(productUrl, productName);
      return analysis;
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Automated quote calculation
  const calculateQuoteAutomatically = useMutation({
    mutationFn: async (quoteData: AutomatedQuoteData) => {
      const { quoteId, countryCode } = quoteData;

      // Get quote and items
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error('Quote not found');

      // Get country settings
      const { data: countrySettings, error: countryError } = await supabase
        .from('country_settings')
        .select('*')
        .eq('code', countryCode)
        .single();

      if (countryError) throw countryError;
      if (!countrySettings) throw new Error('Country settings not found');

      // Analyze and update each item
      const updatedItems = await Promise.all(
        quote.quote_items.map(async (item) => {
          // Analyze product if we have URL
          if (item.product_url) {
            try {
              const analysis = await analyzeProductMutation.mutateAsync({
                productUrl: item.product_url,
                productName: item.product_name
              });

              // Update item with analyzed data
              const { error: updateError } = await supabase
                .from('quote_items')
                .update({
                  item_price: analysis.price,
                  item_weight: analysis.weight,
                  product_name: analysis.name || item.product_name,
                  image_url: analysis.imageUrl || item.image_url,
                  category: analysis.category || item.category
                })
                .eq('id', item.id);

              if (updateError) throw updateError;

              return {
                ...item,
                item_price: analysis.price,
                item_weight: analysis.weight,
                product_name: analysis.name || item.product_name,
                image_url: analysis.imageUrl || item.image_url,
                category: analysis.category || item.category
              };
            } catch (error) {
              console.error(`Failed to analyze item ${item.id}:`, error);
              // Continue with original item data if analysis fails
              return item;
            }
          }

          return item;
        })
      );

      // Calculate total quote
      const totalItemPrice = updatedItems.reduce((sum, item) => sum + (item.item_price || 0) * item.quantity, 0);
      const totalWeight = updatedItems.reduce((sum, item) => sum + (item.item_weight || 0) * item.quantity, 0);

      // Get customs category for the most expensive item or default
      const mostExpensiveItem = updatedItems.reduce((max, item) => 
        (item.item_price || 0) > (max.item_price || 0) ? item : max
      );

      const { data: customsCategory } = await supabase
        .from('customs_categories')
        .select('*')
        .eq('category', mostExpensiveItem.category || 'other')
        .single();

      // Use the quote calculator
      const calculatedQuote = calculateQuote({
        itemPrice: totalItemPrice,
        itemWeight: totalWeight,
        quantity: 1, // Already included in totals
        countrySettings,
        customsCategory: customsCategory || { duty_percent: 5 }, // Default category
        merchantShippingPrice: 0 // Will be updated by admin
      });

      // Update quote with calculated values
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          item_price: totalItemPrice,
          item_weight: totalWeight,
          final_total: calculatedQuote.finalTotal,
          sub_total: calculatedQuote.subTotal,
          vat: calculatedQuote.vat,
          international_shipping: calculatedQuote.interNationalShipping,
          customs_and_ecs: calculatedQuote.customsAndECS,
          payment_gateway_fee: calculatedQuote.paymentGatewayFee,
          status: 'calculated',
          final_currency: countrySettings.currency || 'USD'
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      return { quoteId, calculatedQuote };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quote', data.quoteId] });
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      toast({
        title: "Quote Calculated",
        description: "Quote has been automatically calculated and is ready for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process new quote requests automatically
  const processNewQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      // Get the quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error('Quote not found');

      // Only process if status is pending
      if (quote.status !== 'pending') {
        throw new Error('Quote is not in pending status');
      }

      // Start automated calculation
      await calculateQuoteAutomatically.mutateAsync({
        quoteId,
        countryCode: quote.country_code || 'US'
      });

      return quoteId;
    },
    onSuccess: (quoteId) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      toast({
        title: "Processing Started",
        description: "Quote is being processed automatically.",
      });
    }
  });

  return {
    analyzeProduct: analyzeProductMutation.mutate,
    isAnalyzing: analyzeProductMutation.isPending,
    calculateAutomatically: calculateQuoteAutomatically.mutate,
    isCalculating: calculateQuoteAutomatically.isPending,
    processNewQuote: processNewQuote.mutate,
    isProcessing: processNewQuote.isPending
  };
}; 