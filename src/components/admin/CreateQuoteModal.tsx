import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X } from "lucide-react";
import { CountryField } from "@/components/forms/quote-form-fields/CountryField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GuestEmailField } from "@/components/forms/quote-form-fields/GuestEmailField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { useAllCountries } from "@/hooks/useAllCountries";

interface CreateQuoteModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onQuoteCreated: (quoteId: string) => void;
}

const quoteItemSchema = z.object({
  productUrl: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  price: z.coerce.number().min(0, "Price must be positive"),
  weight: z.coerce.number().min(0, "Weight must be positive"),
});

const formSchema = z.object({
  items: z.array(quoteItemSchema).min(1, "Please add at least one item."),
  purchaseCountry: z.string().min(1, { message: "Please select purchase country." }),
  shippingCountry: z.string().min(1, { message: "Please select shipping country." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal("")),
  userId: z.string().optional(),
  customerCurrency: z.string().min(1, { message: "Please select customer currency." }),
});

export const CreateQuoteModal = ({ isOpen, onOpenChange, onQuoteCreated }: CreateQuoteModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { getDefaultQuoteStatus } = useStatusManagement();
  const { data: allCountries } = useAllCountries();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{
        productUrl: "",
        productName: "",
        quantity: 1,
        price: 0,
        weight: 0,
      }],
      email: "",
      purchaseCountry: "",
      shippingCountry: "",
      userId: undefined,
      customerCurrency: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const shippingCountry = form.watch('shippingCountry');

  // Auto-fill currency based on shipping country
  useEffect(() => {
    if (shippingCountry && allCountries) {
      const country = allCountries.find(c => c.code === shippingCountry);
      if (country?.currency) {
        form.setValue('customerCurrency', country.currency);
      }
    }
  }, [shippingCountry, allCountries, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const { items, shippingCountry, purchaseCountry, email, userId, customerCurrency } = values;

    // Get default status
    const defaultStatus = getDefaultQuoteStatus();

    // Clean email value
    const cleanEmail = email && email.trim() !== '' ? email : null;

    // Determine origin currency from purchase country
    const originCurrency = allCountries?.find(c => c.code === purchaseCountry)?.currency || 'USD';

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        email: cleanEmail,
        country_code: purchaseCountry, // Purchase country (for calculation system)
        origin_country: purchaseCountry, // Also set origin_country for consistency
        currency: originCurrency, // Currency for calculations
        final_currency: customerCurrency, // Customer's preferred display currency
        status: defaultStatus,
        // Admin-created quotes don't link to user profiles
        user_id: null,
        is_anonymous: true, // Admin-created quotes are anonymous
        shipping_address: {
          country_code: shippingCountry // Minimal address with just shipping country for calculator
        }
      })
      .select('id')
      .single();

    if (quoteError || !quote) {
      console.error("Error inserting quote:", quoteError);
      toast({
        title: "Error",
        description: "There was an error creating the quote. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const quoteItemsToInsert = items.map(item => ({
      quote_id: quote.id,
      product_url: item.productUrl,
      product_name: item.productName,
      quantity: item.quantity,
      item_price: item.price,
      item_weight: item.weight,
    }));

    const { error: itemsError } = await supabase.from("quote_items").insert(quoteItemsToInsert);

    if (itemsError) {
      console.error("Error inserting quote items:", itemsError);
      await supabase.from('quotes').delete().eq('id', quote.id);

      toast({
        title: "Error",
        description: "There was an error saving the items for your quote. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Quote Created!",
        description: cleanEmail 
          ? "The new quote has been successfully created for the customer."
          : "The new anonymous quote has been successfully created.",
      });
      form.reset();
      onQuoteCreated(quote.id);
      onOpenChange(false);
    }
    setLoading(false);
  }

  // Get available currencies based on all countries (just currency codes)
  const availableCurrencies = allCountries?.reduce((acc, country) => {
    if (country.currency && !acc.find(c => c.code === country.currency)) {
      acc.push({
        code: country.currency,
        name: country.currency // Just show currency code like "USD", "EUR", etc.
      });
    }
    return acc;
  }, [] as Array<{code: string, name: string}>) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>
            Create a new quote for a customer with product details and shipping information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer & Shipping Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Customer & Shipping</h3>
              
              <GuestEmailField 
                control={form.control} 
                setValue={form.setValue} 
                enableUserSearch={true} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <CountryField 
                  control={form.control} 
                  isLoading={loading} 
                  filter="purchase" 
                  name="purchaseCountry"
                  label="Purchase Country"
                />

                <CountryField 
                  control={form.control} 
                  isLoading={loading} 
                  filter="shipping" 
                  name="shippingCountry"
                  label="Shipping Country"
                />
              </div>

              <FormField
                control={form.control}
                name="customerCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCurrencies.map(currency => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Product Details</h3>
              
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`items.${index}.productUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.productName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.weight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ 
                  productUrl: "", 
                  productName: "", 
                  quantity: 1,
                  price: 0,
                  weight: 0,
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Item
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Quote"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};