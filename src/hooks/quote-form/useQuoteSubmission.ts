import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuoteFormValues } from "@/components/forms/quote-form-validation";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { Tables } from "@/integrations/supabase/types";

interface UseQuoteSubmissionProps {
  form: UseFormReturn<QuoteFormValues>;
  selectedCountryCurrency: string;
}

interface QuoteSubmissionData extends QuoteFormValues {
  shippingAddress?: {
    fullName: string;
    recipientName?: string;
    streetAddress: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode?: string;
    phone?: string;
  };
}

export const useQuoteSubmission = ({ form, selectedCountryCurrency }: UseQuoteSubmissionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { sendEmail } = useEmailNotifications();

  // Simple confirmation email function
  const sendConfirmationEmail = async (quoteId: string, email: string) => {
    try {
      await sendEmail({
        to: email,
        template: 'quote_sent',
        data: {
          quoteId: quoteId,
          customerName: user?.full_name || user?.email?.split('@')[0] || 'Customer',
          totalAmount: 'Pending',
          currency: selectedCountryCurrency
        }
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  };

  const submitSeparateQuotes = async (values: QuoteSubmissionData, finalEmail: string) => {
    const { items, countryCode, shippingAddress } = values;
    const createdQuotes: string[] = [];

    // Ensure user profile exists
    if (user?.id) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, country, preferred_display_currency')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            phone: user.phone || null,
            country: countryCode || null,
            preferred_display_currency: selectedCountryCurrency || null,
            referral_code: 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            email: user.email
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          toast({
            title: "Error",
            description: "There was an error setting up your profile. Please try again.",
            variant: "destructive",
          });
          return false;
        }

        // Create user role
        await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'user',
            created_by: user.id
          });
      } else {
        // Check if this is user's first quote and country/currency not set
        if (!existingProfile.country || !existingProfile.preferred_display_currency) {
          // Check if user has any previous quotes
          const { data: existingQuotes } = await supabase
            .from('quotes')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          // If no previous quotes, update profile with destination country/currency
          if (!existingQuotes || existingQuotes.length === 0) {
            // Get destination country from shipping address
            const destinationCountry = shippingAddress?.country_code || shippingAddress?.country || countryCode;
            
            // Get currency for destination country
            let destinationCurrency = 'USD';
            if (destinationCountry) {
              const { data: countrySettings } = await supabase
                .from('country_settings')
                .select('currency')
                .eq('code', destinationCountry)
                .single();
              
              if (countrySettings) {
                destinationCurrency = countrySettings.currency;
              }
            }
            
            const updateData: any = {};
            
            if (!existingProfile.country) {
              updateData.country = destinationCountry;
            }
            
            if (!existingProfile.preferred_display_currency) {
              updateData.preferred_display_currency = destinationCurrency;
            }

            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

              if (!updateError) {
                toast({
                  title: "Profile Updated",
                  description: `We've set your default country to ${destinationCountry} and currency to ${destinationCurrency} based on your shipping destination.`,
                });
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Prepare quote data
      const quoteData: any = {
        email: finalEmail || null, // Allow null email for anonymous quotes
        country_code: countryCode,
        user_id: user?.id ?? null,
        currency: selectedCountryCurrency,
        final_currency: 'NPR',
        status: 'pending',
        in_cart: false
      };

      // Add shipping address to shipping_address column if provided
      if (shippingAddress) {
        quoteData.shipping_address = {
          fullName: shippingAddress.fullName,
          recipientName: shippingAddress.recipientName,
          streetAddress: shippingAddress.streetAddress,
          addressLine2: shippingAddress.addressLine2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          countryCode: shippingAddress.countryCode,
          phone: shippingAddress.phone,
        };
        // Temporarily comment out these fields to debug
        // quoteData.address_updated_at = new Date().toISOString();
        // quoteData.address_updated_by = user?.id;
      }
      
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert(quoteData)
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
        item_price: item.price ? parseFloat(item.price) : 0,
        item_weight: item.weight ? parseFloat(item.weight) : 0,
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

    // Send confirmation emails for each quote (only if email provided)
    if (finalEmail) {
      for (const quoteId of createdQuotes) {
        try {
          await sendConfirmationEmail(quoteId, finalEmail);
        } catch (error) {
          console.error(`Error sending confirmation for quote ${quoteId}:`, error);
        }
      }
    }

    toast({
      title: "Quotes Requested!",
      description: finalEmail 
        ? `We've received your ${items.length} separate quote requests. You'll receive confirmation emails shortly, and your quotes will be ready within 24-48 hours.`
        : `We've received your ${items.length} separate quote requests. Your quotes will be ready within 24-48 hours.`,
    });
    return true;
  };

  const submitCombinedQuote = async (values: QuoteSubmissionData, finalEmail: string) => {
    const { items, countryCode, shippingAddress } = values;

    // Ensure user profile exists
    if (user?.id) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, country, preferred_display_currency')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            phone: user.phone || null,
            country: countryCode || null,
            preferred_display_currency: selectedCountryCurrency || null,
            referral_code: 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            email: user.email
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          toast({
            title: "Error",
            description: "There was an error setting up your profile. Please try again.",
            variant: "destructive",
          });
          return false;
        }

        // Create user role
        await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'user',
            created_by: user.id
          });
      } else {
        // Check if this is user's first quote and country/currency not set
        if (!existingProfile.country || !existingProfile.preferred_display_currency) {
          // Check if user has any previous quotes
          const { data: existingQuotes } = await supabase
            .from('quotes')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          // If no previous quotes, update profile with destination country/currency
          if (!existingQuotes || existingQuotes.length === 0) {
            // Get destination country from shipping address
            const destinationCountry = shippingAddress?.country_code || shippingAddress?.country || countryCode;
            
            // Get currency for destination country
            let destinationCurrency = 'USD';
            if (destinationCountry) {
              const { data: countrySettings } = await supabase
                .from('country_settings')
                .select('currency')
                .eq('code', destinationCountry)
                .single();
              
              if (countrySettings) {
                destinationCurrency = countrySettings.currency;
              }
            }
            
            const updateData: any = {};
            
            if (!existingProfile.country) {
              updateData.country = destinationCountry;
            }
            
            if (!existingProfile.preferred_display_currency) {
              updateData.preferred_display_currency = destinationCurrency;
            }

            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

              if (!updateError) {
                toast({
                  title: "Profile Updated",
                  description: `We've set your default country to ${destinationCountry} and currency to ${destinationCurrency} based on your shipping destination.`,
                });
              }
            }
          }
        }
      }
    }

    // Prepare quote data
    const quoteData: any = {
      email: finalEmail || null, // Allow null email for anonymous quotes
      country_code: countryCode,
      user_id: user?.id ?? null,
      currency: selectedCountryCurrency,
      final_currency: 'NPR',
      status: 'pending',
      in_cart: false
    };

    // Add shipping address to shipping_address column if provided
    if (shippingAddress) {
      quoteData.shipping_address = {
        fullName: shippingAddress.fullName,
        recipientName: shippingAddress.recipientName,
        streetAddress: shippingAddress.streetAddress,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        countryCode: shippingAddress.countryCode,
        phone: shippingAddress.phone,
      };
      // Temporarily comment out these fields to debug
      // quoteData.address_updated_at = new Date().toISOString();
      // quoteData.address_updated_by = user?.id;
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert(quoteData)
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
        item_price: item.price ? parseFloat(item.price) : 0,
        item_weight: item.weight ? parseFloat(item.weight) : 0,
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

    // Send confirmation email (only if email provided)
    if (finalEmail) {
      try {
        await sendConfirmationEmail(quote.id, finalEmail);
      } catch (error) {
        console.error("Error sending confirmation email:", error);
      }
    }

    toast({
      title: "Quote Requested!",
      description: finalEmail 
        ? "We've received your request and will email your confirmation shortly. Your quote will be ready within 24-48 hours."
        : "We've received your request. Your quote will be ready within 24-48 hours.",
    });
    return true;
  };

  const onSubmit = async (values: QuoteSubmissionData) => {
    setLoading(true);

    const finalEmail = user?.email || values.email;

    // Only require email for authenticated users or when email is provided
    if (user && (!finalEmail || !z.string().email().safeParse(finalEmail).success)) {
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
    
    // If email is provided (even for anonymous), validate it
    if (finalEmail && !z.string().email().safeParse(finalEmail).success) {
      form.setError("email", {
        type: "manual",
        message: "Please enter a valid email address.",
      });
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
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
