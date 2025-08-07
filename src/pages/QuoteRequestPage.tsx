import { useState, useEffect } from 'react';
import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Clock, CheckCircle, Package, Mail, User, Shield, Plus, Trash2, FileText, MapPin, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useShippingCountries } from '@/hooks/useShippingCountries';
import { useCountryUnit } from '@/hooks/useCountryUnits';
import { useUrlAutoDetection } from '@/hooks/useUrlAnalysis';
import { useProductScraping } from '@/hooks/useProductScraping';
import { formatCountryDisplay, sortCountriesByPopularity } from '@/utils/countryUtils';
import { CompactAddressSelector } from '@/components/profile/CompactAddressSelector';

// Product item component to fix hooks rule violation
interface ProductItemProps {
  item: any;
  index: number;
  form: UseFormReturn<any>;
  sortedCountries: any[];
  loadingCountries: boolean;
  onRemoveItem: (index: number) => void;
  canRemoveItem: boolean;
}

function ProductItem({ item, index, form, sortedCountries, loadingCountries, onRemoveItem, canRemoveItem }: ProductItemProps) {
  const { toast } = useToast();
  const selectedOriginCountry = form.watch(`items.${index}.origin_country`);
  const currentUrl = form.watch(`items.${index}.product_url`);
  const { currency, weightUnit } = useCountryUnit(selectedOriginCountry);
  const urlAnalysis = useUrlAutoDetection(currentUrl);
  const { data: purchaseCountries = [] } = usePurchaseCountries();
  
  // Product scraping integration with delivery country
  const deliveryCountry = form.watch('destination_country');
  const productScraping = useProductScraping(currentUrl, deliveryCountry);
  
  // Auto-detect country when URL changes
  useEffect(() => {
    // Only process if we have a valid URL analysis and countries are loaded
    if (!urlAnalysis.shouldAutoSetCountry || !urlAnalysis.suggestedCountry || purchaseCountries.length === 0) {
      return;
    }
    
    const currentCountry = form.getValues(`items.${index}.origin_country`);
    
    // Only auto-set if current country is default (US) or empty
    if (!currentCountry || currentCountry === 'US') {
      // Check if the suggested country exists in the dropdown options
      const countryExists = purchaseCountries.some(country => country.code === urlAnalysis.suggestedCountry);
      
      if (countryExists) {
        console.log(`🔄 Auto-detecting country for ${urlAnalysis.domain}: ${currentCountry} → ${urlAnalysis.suggestedCountry}`);
        
        form.setValue(`items.${index}.origin_country`, urlAnalysis.suggestedCountry, { 
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
        console.log(`✅ Country auto-set to: ${urlAnalysis.suggestedCountry}`);
      } else {
        console.warn(`⚠️ Country ${urlAnalysis.suggestedCountry} not available for purchase`);
      }
    }
  }, [urlAnalysis.suggestedCountry, urlAnalysis.shouldAutoSetCountry, index, form, purchaseCountries]);
  
  // Auto-fill product data when scraping completes - OVERWRITE all fields
  useEffect(() => {
    if (productScraping.shouldAutoFill && productScraping.autoFillData) {
      console.log(`🎯 Auto-filling data for item ${index}:`, productScraping.autoFillData);
      
      try {
        const { productName, price, weight } = productScraping.autoFillData;
        
        // Apply form updates without triggering validation to prevent loops
        if (productName && typeof productName === 'string') {
          form.setValue(`items.${index}.product_name`, productName, { shouldValidate: false, shouldDirty: false });
        }
        
        if (price && typeof price === 'number' && price > 0) {
          form.setValue(`items.${index}.price_origin`, price, { shouldValidate: false, shouldDirty: false });
        }
        
        if (weight && typeof weight === 'number' && weight > 0) {
          form.setValue(`items.${index}.weight_kg`, weight, { shouldValidate: false, shouldDirty: false });
        }
        
        // Show success toast once
        toast({
          title: "Product data loaded!",
          description: `Auto-filled from ${productScraping.urlAnalysis.domain}`,
          duration: 3000,
        });
        
        console.log(`✅ Auto-fill completed for item ${index}`);
      } catch (autoFillError) {
        console.error(`❌ Auto-fill failed for item ${index}:`, autoFillError);
      }
    }
  }, [productScraping.shouldAutoFill, productScraping.autoFillData?.productName, index]);

  return (
    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Product {index + 1}</h4>
        {canRemoveItem && (
          <Button
            type="button"
            onClick={() => onRemoveItem(index)}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    
      {/* First row: URL and Product Name */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`items.${index}.product_url`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                <span>Product URL</span>
                <div className="flex items-center space-x-2">
                  {productScraping.isLoading && (
                    <div className="flex items-center text-xs text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Fetching...
                    </div>
                  )}
                  {productScraping.isScraped && !productScraping.error && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      ✓ Data loaded
                    </span>
                  )}
                  {productScraping.error && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Scraping failed
                    </span>
                  )}
                  {currentUrl && !productScraping.isLoading && !productScraping.isScraped && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => productScraping.scrapeProduct(currentUrl)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Fetch Data
                    </Button>
                  )}
                </div>
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://amazon.com/..., https://zara.com/..., https://lego.com/..." 
                  {...field} 
                  className={productScraping.isScraped ? 'border-green-200 bg-green-50/30' : ''}
                />
              </FormControl>
              <FormMessage />
              {productScraping.error && (
                <p className="text-xs text-red-600 mt-1">{productScraping.error}</p>
              )}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`items.${index}.product_name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Product Name *
                {productScraping.isScraped && productScraping.autoFillData?.productName && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Auto-filled
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  className={productScraping.isScraped && productScraping.autoFillData?.productName ? 'border-green-200 bg-green-50/30' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Second row: Origin Country, Quantity, Weight, Price */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        <FormField
          control={form.control}
          name={`items.${index}.origin_country`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Origin Country *
                {urlAnalysis.shouldAutoSetCountry && urlAnalysis.suggestedCountry === field.value && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Auto-detected
                  </span>
                )}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingCountries}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCountries ? "Loading..." : "Select"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loadingCountries ? (
                    <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                  ) : sortedCountries.length > 0 ? (
                    sortedCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {formatCountryDisplay(country, false)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {urlAnalysis.isValid && urlAnalysis.domain && (
                <div className="text-xs text-gray-500 mt-1">
                  Detected from: {urlAnalysis.domain}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="1"
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`items.${index}.weight_kg`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Weight ({weightUnit})
                {productScraping.isScraped && productScraping.autoFillData?.weight && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Auto-filled
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.1" 
                  min="0"
                  placeholder={weightUnit === 'kg' ? '0.5' : '1.1'}
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  className={productScraping.isScraped && productScraping.autoFillData?.weight ? 'border-green-200 bg-green-50/30' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`items.${index}.price_origin`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Price ({currency})
                {productScraping.isScraped && productScraping.autoFillData?.price && (
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Auto-filled
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder={currency === 'USD' ? '999.99' : currency === 'INR' ? '8299.99' : '999.99'}
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  className={productScraping.isScraped && productScraping.autoFillData?.price ? 'border-green-200 bg-green-50/30' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={`items.${index}.notes`}
        render={({ field }) => (
          <FormItem className="mt-4">
            <FormLabel>
              Additional Notes
              {urlAnalysis.category && (
                <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {urlAnalysis.category}
                </span>
              )}
            </FormLabel>
            <FormControl>
              <Textarea 
                placeholder={urlAnalysis.notesPlaceholder}
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            {urlAnalysis.tips.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                <strong>Tips:</strong> {urlAnalysis.tips.join(' • ')}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Form schema - dynamic based on user authentication
const createQuoteRequestSchema = (isLoggedIn: boolean) => z.object({
  customer_name: isLoggedIn ? z.string().optional() : z.string().min(2, 'Name must be at least 2 characters'),
  customer_email: isLoggedIn ? z.string().optional() : z.string().email('Please enter a valid email address'),
  customer_phone: z.string().optional(),
  destination_country: z.string().min(1, 'Please select a destination country'),
  delivery_address_id: isLoggedIn ? z.string().min(1, 'Please select a delivery address') : z.string().optional(),
  quote_type: z.enum(['single', 'separate'], {
    required_error: 'Please select quote type',
  }),
  items: z.array(z.object({
    product_name: z.string().min(1, 'Product name is required'),
    product_url: z.string().url().optional().or(z.literal('')),
    origin_country: z.string().min(1, 'Please select origin country'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    price_origin: z.number().min(0, 'Price must be positive'),
    weight_kg: z.number().min(0, 'Weight must be positive'),
    notes: z.string().optional(),
  })).min(1, 'At least one product is required'),
  special_requirements: z.string().optional(),
});

export default function QuoteRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [submittedQuoteNumber, setSubmittedQuoteNumber] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  
  // Country data
  const { data: purchaseCountries = [], isLoading: loadingCountries } = usePurchaseCountries();
  const { data: shippingCountries = [], isLoading: loadingShippingCountries } = useShippingCountries();
  
  // Sort countries with popular ones first
  const sortedCountries = sortCountriesByPopularity(purchaseCountries);
  const sortedShippingCountries = sortCountriesByPopularity(shippingCountries);

  // Create schema based on user authentication status  
  const quoteRequestSchema = createQuoteRequestSchema(!!user);
  type QuoteRequestFormData = z.infer<typeof quoteRequestSchema>;

  const form = useForm<QuoteRequestFormData>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      customer_name: user?.user_metadata?.name || '',
      customer_email: user?.email || '',
      customer_phone: user?.phone || '',
      destination_country: 'IN',
      delivery_address_id: '',
      quote_type: 'single',
      items: [{
        product_name: '',
        product_url: '',
        origin_country: 'US',
        quantity: 1,
        price_origin: 0,
        weight_kg: 0,
        notes: '',
      }],
      special_requirements: '',
    },
  });

  const { fields: items, append: addItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const addNewItem = () => {
    addItem({
      product_name: '',
      product_url: '',
      origin_country: 'US',
      quantity: 1,
      price_origin: 0,
      weight_kg: 0,
      notes: '',
    });
  };

  const removeItemAt = (index: number) => {
    if (items.length > 1) {
      removeItem(index);
    }
  };

  const onSubmit = async (data: QuoteRequestFormData) => {
    setIsSubmitting(true);

    try {
      const baseQuoteData = {
        customer_email: user?.email || data.customer_email || '',
        customer_name: user?.user_metadata?.name || data.customer_name || '',
        customer_phone: user?.phone || data.customer_phone || null,
        origin_country: data.quote_type === 'single' ? data.items[0]?.origin_country || 'US' : 'US',
        destination_country: data.destination_country,
        delivery_address_id: data.delivery_address_id || null,
        status: 'draft',
        created_by: user?.id || null,
        admin_notes: data.special_requirements || null,
      };

      let submittedQuotes: string[] = [];

      if (data.quote_type === 'single') {
        // Single quote - combine all items
        const mappedItems = data.items.map(item => ({
          name: item.product_name,
          url: item.product_url || '',
          quantity: item.quantity,
          costprice_origin: item.price_origin,
          weight: item.weight_kg,
          customer_notes: item.notes || '',
        }));

        const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.price_origin), 0);

        const quoteData = {
          ...baseQuoteData,
          items: mappedItems,
          total_usd: totalAmount,
          total_customer_currency: totalAmount,
          customer_currency: 'USD',
        };

        const { data: createdQuote, error } = await supabase
          .from('quotes_v2')
          .insert([quoteData])
          .select('id, quote_number')
          .single();

        if (error) {
          throw new Error(`Failed to submit quote: ${error.message}`);
        }

        submittedQuotes.push(createdQuote.quote_number || `Q${createdQuote.id}`);
      } else {
        // Separate quotes - one per item
        for (const item of data.items) {
          const mappedItem = {
            name: item.product_name,
            url: item.product_url || '',
            quantity: item.quantity,
            costprice_origin: item.price_origin,
            weight: item.weight_kg,
            customer_notes: item.notes || '',
          };

          const itemTotal = item.quantity * item.price_origin;

          const quoteData = {
            ...baseQuoteData,
            origin_country: item.origin_country, // Use item's origin country for separate quotes
            items: [mappedItem],
            total_usd: itemTotal,
            total_customer_currency: itemTotal,
            customer_currency: 'USD',
          };

          const { data: createdQuote, error } = await supabase
            .from('quotes_v2')
            .insert([quoteData])
            .select('id, quote_number')
            .single();

          if (error) {
            throw new Error(`Failed to submit quote for ${item.product_name}: ${error.message}`);
          }

          submittedQuotes.push(createdQuote.quote_number || `Q${createdQuote.id}`);
        }
      }

      setSubmittedQuoteNumber(submittedQuotes.join(', '));
      setQuoteSubmitted(true);

      toast({
        title: 'Quote Request Submitted!',
        description: `${submittedQuotes.length} quote${submittedQuotes.length > 1 ? 's' : ''} created. We'll respond within 24 hours.`,
      });

    } catch (error) {
      console.error('Quote submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success page
  if (quoteSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <div className="bg-white rounded-2xl shadow-lg border border-green-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-8 text-center">
              <CheckCircle className="mx-auto h-16 w-16 mb-4" />
              <h1 className="text-3xl font-bold mb-2">Quote Request Submitted!</h1>
              <p className="text-green-100 text-lg">
                Quote #{submittedQuoteNumber} - We'll respond within 24 hours
              </p>
            </div>

            <div className="p-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h3 className="font-semibold text-blue-900">What's Next?</h3>
                    <p className="text-blue-700 text-sm">
                      Our team will review your request and send detailed pricing to your email within 24 hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                >
                  Back to Home
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                >
                  Submit Another Quote
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-6 w-6 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Get Your Quote</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tell us what you want to buy, and we'll handle everything - from purchase to delivery at your doorstep.
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Quote Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Quote Type</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="quote_type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>How would you like to receive your quotes?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                            <RadioGroupItem value="single" id="single" />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor="single"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                🎯 Single Combined Quote
                              </label>
                              <p className="text-xs text-muted-foreground">
                                All items in one quote with combined shipping and customs
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                            <RadioGroupItem value="separate" id="separate" />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor="separate"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                📋 Separate Quotes
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Individual quote for each item with separate pricing
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contact Information - Only show for non-logged in users */}
            {!user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="destination_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ship to Country *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingShippingCountries}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingShippingCountries ? "Loading countries..." : "Select country"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingShippingCountries ? (
                                <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                              ) : sortedShippingCountries.length > 0 ? (
                                sortedShippingCountries.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {formatCountryDisplay(country, false)}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ship to Country for logged-in users */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Shipping Destination</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="destination_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ship to Country *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingShippingCountries}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingShippingCountries ? "Loading countries..." : "Select country"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingShippingCountries ? (
                              <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                            ) : sortedShippingCountries.length > 0 ? (
                              sortedShippingCountries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {formatCountryDisplay(country, false)}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Products</span>
                  </div>
                  <Button
                    type="button"
                    onClick={addNewItem}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.map((item, index) => (
                  <ProductItem
                    key={item.id}
                    item={item}
                    index={index}
                    form={form}
                    sortedCountries={sortedCountries}
                    loadingCountries={loadingCountries}
                    onRemoveItem={removeItemAt}
                    canRemoveItem={items.length > 1}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Special Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Special Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="special_requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any special requests or requirements?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Express shipping, gift wrapping, specific delivery date, etc."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Delivery Address Selection for logged-in users */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Delivery Address</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="delivery_address_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select delivery address *</FormLabel>
                        <FormControl>
                          <CompactAddressSelector
                            selectedAddressId={field.value}
                            onSelectAddress={(address) => {
                              field.onChange(address.id);
                              setSelectedAddress(address);
                              // Auto-update destination country based on selected address
                              if (address.destination_country) {
                                form.setValue('destination_country', address.destination_country);
                              }
                            }}
                            showAddButton={true}
                            className="mt-2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="px-8 py-4"
              >
                {isSubmitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Quote Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1 text-green-600" />
              Secure & Trusted
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-blue-600" />
              24hr Response
            </div>
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-1 text-purple-600" />
              Email Updates
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}