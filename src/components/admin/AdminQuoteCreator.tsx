import React, { useState } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Mail, MessageCircle, Share2, Users, UserPlus, Calculator } from "lucide-react";
import { CountryField } from "@/components/forms/quote-form-fields/CountryField";
import { GuestEmailField } from "@/components/forms/quote-form-fields/GuestEmailField";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useQuoteCalculation } from "@/hooks/useQuoteCalculation";
import { useAllCountries } from "@/hooks/useAllCountries";

const quoteItemSchema = z.object({
  productUrl: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  options: z.string().optional(),
  imageUrl: z.string().optional(),
  estimatedPrice: z.coerce.number().min(0, "Price must be positive").optional(),
});

const formSchema = z.object({
  // Customer Information
  customerType: z.enum(['existing', 'anonymous']),
  email: z.string().email({ message: "Please enter a valid email." }).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  socialHandle: z.string().optional(),
  quoteSource: z.enum(['website', 'facebook', 'instagram', 'whatsapp', 'telegram', 'other']),
  
  // Quote Details
  items: z.array(quoteItemSchema).min(1, "Please add at least one item."),
  originCountry: z.string().min(1, { message: "Please select an origin country." }),
  countryCode: z.string().min(1, { message: "Please select a destination country." }),
  
  // Anonymous Quote Settings
  isAnonymous: z.boolean().default(false),
  expiresInDays: z.coerce.number().min(1).max(30).default(7),
  
  // Additional Information
  internalNotes: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

type FormData = z.infer<typeof formSchema>;

interface AdminQuoteCreatorProps {
  onQuoteCreated: (quoteId: string, shareToken?: string) => void;
}

export const AdminQuoteCreator: React.FC<AdminQuoteCreatorProps> = ({ onQuoteCreated }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [calculatedQuote, setCalculatedQuote] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['quote-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quote_templates').select('*').order('template_name');
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const { data: allCountries } = useAllCountries();
  const { calculateUpdatedQuote } = useQuoteCalculation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerType: 'existing',
      email: "",
      customerName: "",
      customerPhone: "",
      socialHandle: "",
      quoteSource: 'website',
      items: [{
        productUrl: "",
        productName: "",
        quantity: 1,
        options: "",
        imageUrl: "",
        estimatedPrice: undefined,
      }],
      originCountry: "",
      countryCode: "",
      isAnonymous: false,
      expiresInDays: 7,
      internalNotes: "",
      priority: 'normal',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const customerType = form.watch('customerType');
  const isAnonymous = form.watch('isAnonymous');

  const handleTemplateSelect = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (!template) return;

    form.setValue('items.0.productName', template.product_name || "", { shouldValidate: true });
    form.setValue('items.0.productUrl', template.product_url || "", { shouldValidate: true });
    form.setValue('items.0.quantity', template.quantity || 1, { shouldValidate: true });
    form.setValue('items.0.options', template.options || "", { shouldValidate: true });
    form.setValue('items.0.imageUrl', template.image_url || "", { shouldValidate: true });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const generateShareLink = (shareToken: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/quote/${shareToken}`;
  };

  const handleCalculateQuote = async () => {
    const values = form.getValues();
    if (!values.items || values.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to calculate",
        variant: "destructive",
      });
      return;
    }

    if (!values.originCountry || !values.countryCode) {
      toast({
        title: "Error",
        description: "Please select both origin and destination countries",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      // Determine currency based on origin country
      const originCurrency = allCountries?.find(c => c.code === values.originCountry)?.currency || 'USD';

      // Prepare data for calculation
      const quoteData = {
        country_code: values.countryCode,
        origin_country: values.originCountry,
        currency: originCurrency, // Use currency from origin country
        items: values.items.map((item, index) => ({
          id: `temp-${index}`, // Temporary ID for calculation
          product_name: item.productName,
          quantity: item.quantity,
          item_price: item.estimatedPrice || 0,
          item_weight: 0, // We'll need to add weight field
          item_currency: originCurrency, // Use currency from origin country
        })),
      };

      const result = await calculateUpdatedQuote(
        quoteData,
        quoteData.items,
        allCountries || [],
        null // shipping address
      );

      if (result) {
        setCalculatedQuote(result);
        toast({
          title: "Quote Calculated!",
          description: `Total: $${result.final_total?.toFixed(2) || 'N/A'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate quote",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  async function onSubmit(values: FormData) {
    setLoading(true);
    setGeneratedLink('');

    try {
      const { items, countryCode, originCountry, ...quoteData } = values;

      // Determine currency based on origin country
      const originCurrency = allCountries?.find(c => c.code === originCountry)?.currency || 'USD';

      // Prepare quote data
      const quoteInsertData: any = {
        country_code: countryCode,
        origin_country: originCountry,
        currency: originCurrency, // Use currency from origin country
        status: 'pending',
        priority: quoteData.priority,
        internal_notes: quoteData.internalNotes,
        quote_source: quoteData.quoteSource,
        is_anonymous: quoteData.isAnonymous,
      };

      // Handle customer information based on type
      if (quoteData.customerType === 'existing' && quoteData.email) {
        quoteInsertData.email = quoteData.email;
        quoteInsertData.is_anonymous = false;
      } else if (quoteData.customerType === 'anonymous') {
        quoteInsertData.is_anonymous = true;
        quoteInsertData.customer_name = quoteData.customerName || null;
        quoteInsertData.customer_phone = quoteData.customerPhone || null;
        quoteInsertData.social_handle = quoteData.socialHandle || null;
        quoteInsertData.email = quoteData.email || null; // Optional for anonymous
        quoteInsertData.expires_at = new Date(Date.now() + quoteData.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
      }

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert(quoteInsertData)
        .select('id, share_token')
        .single();

      if (quoteError || !quote) {
        throw new Error(quoteError?.message || "Failed to create quote");
      }

      // Create quote items
      const quoteItemsToInsert = items.map(item => ({
        quote_id: quote.id,
        product_url: item.productUrl,
        product_name: item.productName,
        quantity: item.quantity,
        options: item.options,
        image_url: item.imageUrl,
        item_price: item.estimatedPrice,
        item_currency: originCurrency, // Use currency from origin country
      }));

      const { error: itemsError } = await supabase.from("quote_items").insert(quoteItemsToInsert);

      if (itemsError) {
        // Clean up quote if items fail
        await supabase.from('quotes').delete().eq('id', quote.id);
        throw new Error(itemsError.message);
      }

      // Generate share link for anonymous quotes
      if (quoteData.isAnonymous && quote.share_token) {
        const shareLink = generateShareLink(quote.share_token);
        setGeneratedLink(shareLink);
      }

      toast({
        title: "Quote Created!",
        description: quoteData.isAnonymous 
          ? "Anonymous quote created with share link" 
          : "Quote created successfully",
      });

      onQuoteCreated(quote.id, quote.share_token);

    } catch (error: any) {
      console.error("Error creating quote:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Quote for Customer
          </CardTitle>
          <CardDescription>
            Create quotes for existing customers or generate shareable links for social media leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={customerType} onValueChange={(value) => form.setValue('customerType', value as 'existing' | 'anonymous')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Existing Customer
                  </TabsTrigger>
                  <TabsTrigger value="anonymous" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Social Media Lead
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Existing Customer</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Create a quote for a customer who already has an account or email in your system.
                    </p>
                  </div>

                  <GuestEmailField 
                    control={form.control} 
                    setValue={form.setValue} 
                    enableUserSearch={true} 
                  />
                </TabsContent>

                <TabsContent value="anonymous" className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Social Media Lead</span>
                    </div>
                    <p className="text-sm text-orange-700">
                      Generate a shareable quote link for customers from Facebook, Instagram, WhatsApp, etc.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="socialHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Social Handle (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quoteSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="telegram">Telegram</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional for anonymous quotes)</FormLabel>
                        <FormControl>
                          <Input placeholder="customer@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expiresInDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link Expires In (Days)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Quote Details Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Quote Details</h3>
                  <Badge variant="outline">{fields.length} item{fields.length !== 1 ? 's' : ''}</Badge>
                </div>

                <FormField
                  control={form.control}
                  name="originCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin Country (Purchase Country)</FormLabel>
                      <CountryField 
                        control={form.control} 
                        isLoading={loading} 
                        filter="purchase" 
                        name="originCountry"
                        label="Origin Country (Purchase Country)"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Country (Shipping Country)</FormLabel>
                      <CountryField 
                        control={form.control} 
                        isLoading={loading} 
                        filter="shipping" 
                        name="countryCode"
                        label="Destination Country (Shipping Country)"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Calculate Quote Button */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={handleCalculateQuote}
                    disabled={isCalculating || loading}
                    className="flex items-center gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    {isCalculating ? "Calculating..." : "Calculate Quote"}
                  </Button>
                </div>

                {/* Quote Calculation Results */}
                {calculatedQuote && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Quote Calculation Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Subtotal:</span>
                          <div className="font-semibold">${calculatedQuote.sub_total?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Shipping:</span>
                          <div className="font-semibold">${calculatedQuote.international_shipping?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Customs:</span>
                          <div className="font-semibold">${calculatedQuote.customs_and_ecs?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Total:</span>
                          <div className="font-semibold text-lg">${calculatedQuote.final_total?.toFixed(2) || '0.00'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Use Template (Optional)</Label>
                  <Select onValueChange={handleTemplateSelect} disabled={templatesLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template to pre-fill item details" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                      {templates?.length === 0 && <SelectItem value="none" disabled>No templates available</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quote Items */}
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                          name={`items.${index}.estimatedPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Price ($)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.options`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Options/Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Color, size, special requirements..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => append({ 
                    productUrl: "", 
                    productName: "", 
                    quantity: 1, 
                    options: "", 
                    imageUrl: "",
                    estimatedPrice: undefined,
                  })}
                >
                  Add Another Item
                </Button>
              </div>

              <Separator />

              {/* Additional Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Add notes for your team..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating Quote..." : "Create Quote"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}; 