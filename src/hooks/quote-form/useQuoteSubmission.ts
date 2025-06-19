import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuoteFormValues } from "@/components/forms/quote-form-validation";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { useQuoteAutomation } from "@/hooks/useQuoteAutomation";
import { useQuoteNotifications } from "@/hooks/useQuoteNotifications";

interface UseQuoteSubmissionProps {
  form: UseFormReturn<QuoteFormValues>;
  selectedCountryCurrency: string;
}

export const useQuoteSubmission = ({ form, selectedCountryCurrency }: UseQuoteSubmissionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { processNewQuote } = useQuoteAutomation();
  const { sendConfirmationEmail } = useQuoteNotifications();

  const submitSeparateQuotes = async (values: QuoteFormValues, finalEmail: string) => {
    const { items, countryCode } = values;
    const createdQuotes: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          email: finalEmail,
          country_code: countryCode,
          user_id: user?.id ?? null,
          items_currency: selectedCountryCurrency,
          final_currency: 'NPR',
          in_cart: false
        })
        .select('id')
        .single();

      if (quoteError || !quote) {
        console.error("Error inserting quote:", quoteError);
        toast({
          title: "Error",
          description: `There was an error creating quote ${i + 1}. Please try again.`,
          variant: "destructive",
        });
        return false;
      }

      const { error: itemsError } = await supabase.from("quote_items").insert({
        quote_id: quote.id,
        product_url: item.productUrl,
        product_name: item.productName,
        quantity: item.quantity,
        options: item.options,
        image_url: item.imageUrl,
      });

      if (itemsError) {
        console.error("Error inserting quote item:", itemsError);
        toast({
          title: "Error",
          description: `There was an error saving item ${i + 1}. Please try again.`,
          variant: "destructive",
        });
        return false;
      }

      createdQuotes.push(quote.id);
    }

    // Send confirmation emails and start processing for each quote
    for (const quoteId of createdQuotes) {
      try {
        await sendConfirmationEmail(quoteId);
        // Start automated processing
        processNewQuote(quoteId);
      } catch (error) {
        console.error(`Error processing quote ${quoteId}:`, error);
      }
    }

    toast({
      title: "Quotes Requested!",
      description: `We've received your ${items.length} separate quote requests. You'll receive confirmation emails shortly, and your quotes will be ready within 24-48 hours.`,
    });
    return true;
  };

  const submitCombinedQuote = async (values: QuoteFormValues, finalEmail: string) => {
    const { items, countryCode } = values;

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        email: finalEmail,
        country_code: countryCode,
        user_id: user?.id ?? null,
        items_currency: selectedCountryCurrency,
        final_currency: 'NPR',
        in_cart: false
      })
      .select('id')
      .single();

    if (quoteError || !quote) {
      console.error("Error inserting quote:", quoteError);
      toast({
        title: "Error",
        description: "There was an error submitting your quote. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    const quoteItemsToInsert = items.map(item => ({
        quote_id: quote.id,
        product_url: item.productUrl,
        product_name: item.productName,
        quantity: item.quantity,
        options: item.options,
        image_url: item.imageUrl,
    }));

    const { error: itemsError } = await supabase.from("quote_items").insert(quoteItemsToInsert);

    if (itemsError) {
      console.error("Error inserting quote items:", itemsError);
      toast({
        title: "Error",
        description: "There was an error saving the items for your quote. Please try again.",
        variant: "destructive",
      });
      return false;
    }

    // Send confirmation email and start processing
    try {
      await sendConfirmationEmail(quote.id);
      // Start automated processing
      processNewQuote(quote.id);
    } catch (error) {
      console.error("Error processing quote:", error);
    }

    toast({
      title: "Quote Requested!",
      description: "We've received your request and will email your confirmation shortly. Your quote will be ready within 24-48 hours.",
    });
    return true;
  };

  const onSubmit = async (values: QuoteFormValues) => {
    setLoading(true);

    const finalEmail = user?.email || values.email;

    if (!finalEmail || !z.string().email().safeParse(finalEmail).success) {
      form.setError("email", {
        type: "manual",
        message: "Please enter a valid email address.",
      });
      toast({
        title: "Invalid Email",
        description: "A valid email is required to submit a quote.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { quoteType } = values;
    let success = false;

    if (quoteType === "separate") {
      success = await submitSeparateQuotes(values, finalEmail);
    } else {
      success = await submitCombinedQuote(values, finalEmail);
    }

    if (success) {
      form.reset({
        items: [{ productUrl: "", productName: "", quantity: 1, options: "", imageUrl: "" }],
        countryCode: "",
        email: user?.email || "",
        quoteType: "combined",
      });
    }
    
    setLoading(false);
  };

  return {
    onSubmit,
    loading,
  };
};
