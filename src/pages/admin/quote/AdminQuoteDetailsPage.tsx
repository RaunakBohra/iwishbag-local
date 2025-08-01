import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Calculator, Send, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { QuoteSendEmailSimple } from '@/components/admin/QuoteSendEmailSimple';
// Admin role check will be done directly with Supabase RPC
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';

interface QuoteV2 {
  id: string;
  destination_country: string;
  origin_country: string;
  status: string;
  customer_currency: string;
  items: any[];
  total_usd: number;
  total_customer_currency: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  calculation_data: any;
  validity_days: number;
  expires_at: string;
  share_token: string;
  email_sent: boolean;
  reminder_count: number;
  version: number;
  customer_message: string | null;
  payment_terms: string | null;
  created_at: string;
  updated_at: string;
}

const AdminQuoteDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quote, setQuote] = useState<QuoteV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdminAndFetchQuote();
  }, [id]);

  const checkAdminAndFetchQuote = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access this page",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Check admin role
      const { data: adminStatus, error: adminError } = await supabase.rpc('is_admin');
      
      if (adminError || !adminStatus) {
        toast({
          title: "Access Denied",
          description: "Admin access required",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      
      // Fetch quote if we have an ID
      if (id) {
        await fetchQuote();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchQuote = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuote(data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast({
        title: "Error",
        description: "Failed to load quote details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!quote) return;

    try {
      setIsCalculating(true);
      
      // Prepare calculation input
      const calculationInput = {
        quote: {
          id: quote.id,
          items: quote.items.map((item, index) => ({
            id: item.id || `item-${index}`,
            name: item.name,
            url: item.url || '',
            description: item.notes || '',
            category: item.category || '',
            quantity: item.quantity || 1,
            weight: item.weight || 0,
            costprice_origin: item.costprice_origin || 0,
            hsn_code: item.hsn_code || '',
            tax_options: item.tax_options,
            actual_price: item.actual_price || item.costprice_origin || 0,
            valuation_method: item.valuation_method || 'actual_price',
            minimum_valuation_usd: item.minimum_valuation_usd || 0,
            customer_notes: item.customer_notes || ''
          })),
          destination_country: quote.destination_country,
          origin_country: quote.origin_country,
          status: quote.status,
          calculation_data: quote.calculation_data || {},
          operational_data: {},
          customer_data: {}
        },
        preferences: {
          speed_priority: 'medium' as const,
          cost_priority: 'medium' as const,
          show_all_options: true
        },
        tax_calculation_preferences: {
          calculation_method_preference: 'hsn_only',
          valuation_method_preference: 'higher_of_both',
          admin_id: 'admin-quote-v2'
        }
      };

      const result = await smartCalculationEngine.calculateWithShippingOptions(calculationInput);
      setCalculationResult(result);
      
      // Extract totals from the result
      const totalUSD = result.summary?.totalCost?.usd || 0;
      const totalCustomerCurrency = result.summary?.totalCost?.customerCurrency || totalUSD;
      
      // Update the quote with calculation results
      const { error: updateError } = await supabase
        .from('quotes_v2')
        .update({
          calculation_data: result,
          total_usd: totalUSD,
          total_customer_currency: totalCustomerCurrency,
          status: 'calculated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Quote calculated successfully",
      });

      // Refresh quote data
      await fetchQuote();
      setShowEmailSection(true);
    } catch (error) {
      console.error('Error calculating quote:', error);
      toast({
        title: "Error",
        description: "Failed to calculate quote",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleEmailSent = async () => {
    // Refresh quote to get updated email_sent status
    await fetchQuote();
    setShowEmailSection(false);
    toast({
      title: "Success",
      description: "Quote email sent successfully",
    });
  };

  if (isAdmin === null || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Quote Not Found</h1>
          <p className="text-gray-600 mb-6">The quote you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/quotes')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/admin/quotes')}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quote Details (V2)</h1>
              <p className="text-gray-600 mt-1">ID: {quote.id}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={quote.status === 'calculated' ? 'default' : 'secondary'}>
                {quote.status}
              </Badge>
              {quote.email_sent && (
                <Badge variant="outline" className="text-green-600">
                  <Mail className="mr-1 h-3 w-3" />
                  Email Sent
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Quote Information</CardTitle>
                <CardDescription>Basic details about this quote</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Customer Details</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">Name</dt>
                        <dd className="text-sm font-medium">{quote.customer_name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Email</dt>
                        <dd className="text-sm font-medium">{quote.customer_email}</dd>
                      </div>
                      {quote.customer_phone && (
                        <div>
                          <dt className="text-sm text-gray-500">Phone</dt>
                          <dd className="text-sm font-medium">{quote.customer_phone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Quote Details</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-gray-500">Route</dt>
                        <dd className="text-sm font-medium">
                          {quote.origin_country} → {quote.destination_country}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Currency</dt>
                        <dd className="text-sm font-medium">{quote.customer_currency}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Share Token</dt>
                        <dd className="text-sm font-medium font-mono">{quote.share_token}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Expires</dt>
                        <dd className="text-sm font-medium">
                          {format(new Date(quote.expires_at), 'PPP')}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {quote.customer_message && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Customer Message</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {quote.customer_message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Quote Items</CardTitle>
                <CardDescription>Products included in this quote</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.items.map((item, index) => (
                    <div key={item.id || index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Product
                            </a>
                          )}
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          <p className="font-medium">
                            {formatCurrency(item.costprice_origin, 'USD')}
                          </p>
                          <p className="text-sm text-gray-500">{item.weight} kg</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculation">
            <Card>
              <CardHeader>
                <CardTitle>Quote Calculation</CardTitle>
                <CardDescription>Calculate shipping costs and total price</CardDescription>
              </CardHeader>
              <CardContent>
                {!calculationResult && quote.status === 'pending' && (
                  <div className="text-center py-8">
                    <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">Quote not calculated yet</p>
                    <Button onClick={handleCalculate} disabled={isCalculating}>
                      {isCalculating ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculate Quote
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {(calculationResult || quote.calculation_data) && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Cost Breakdown</h3>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Products Total</dt>
                          <dd className="font-medium">
                            {formatCurrency(
                              calculationResult?.summary?.productsCost || quote.calculation_data?.summary?.productsCost || 0,
                              quote.customer_currency
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Shipping Cost</dt>
                          <dd className="font-medium">
                            {formatCurrency(
                              calculationResult?.summary?.shippingCost?.customerCurrency || quote.calculation_data?.summary?.shippingCost?.customerCurrency || 0,
                              quote.customer_currency
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Tax & Duties</dt>
                          <dd className="font-medium">
                            {formatCurrency(
                              calculationResult?.summary?.totalTax?.customerCurrency || quote.calculation_data?.summary?.totalTax?.customerCurrency || 0,
                              quote.customer_currency
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Insurance</dt>
                          <dd className="font-medium">
                            {formatCurrency(
                              calculationResult?.summary?.insuranceCost?.customerCurrency || quote.calculation_data?.summary?.insuranceCost?.customerCurrency || 0,
                              quote.customer_currency
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <dt className="font-semibold">Total</dt>
                          <dd className="font-bold text-lg">
                            {formatCurrency(
                              calculationResult?.summary?.totalCost?.customerCurrency || quote.total_customer_currency,
                              quote.customer_currency
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {quote.status === 'calculated' && !quote.email_sent && (
                      <Button onClick={() => setShowEmailSection(true)} className="w-full">
                        <Send className="mr-2 h-4 w-4" />
                        Send Quote Email
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Management</CardTitle>
                <CardDescription>Send and track quote emails</CardDescription>
              </CardHeader>
              <CardContent>
                {showEmailSection || !quote.email_sent ? (
                  <QuoteSendEmailSimple
                    quoteId={quote.id}
                    onEmailSent={handleEmailSent}
                    isV2={true}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Mail className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <p className="text-gray-600 mb-2">Email already sent</p>
                    <p className="text-sm text-gray-500">
                      Customer can view quote at: /quote/view/{quote.share_token}
                    </p>
                    {quote.reminder_count > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Reminders sent: {quote.reminder_count}/3
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminQuoteDetailsPage;