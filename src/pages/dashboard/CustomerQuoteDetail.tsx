import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  ShoppingCart,
  Info,
  Calculator,
  Package,
  Clock,
  MapPin,
  User,
  Calendar,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Shield,
  CreditCard,
  Globe,
  FileText,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { QuoteBreakdownDetails } from '@/components/dashboard/QuoteBreakdownDetails';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useQuoteState } from '@/hooks/useQuoteState';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
// import { useGuestCurrency } from '@/contexts/GuestCurrencyContext'; // Not needed for authenticated users
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { formatCurrency } from '@/utils/currencyConversion';
import { InsuranceToggle } from '@/components/customer/InsuranceToggle';
import { useShippingRoutes } from '@/hooks/useShippingRoutes';

const CustomerQuoteDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getStatusConfig } = useStatusManagement();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingInsurance, setIsUpdatingInsurance] = useState(false);

  // Initialize quote state hook
  const quoteStateHook = useQuoteState(id || '');

  // Fetch quote data with all relations
  const {
    data: quote,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer-quote-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No quote ID provided');

      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          *,
          profiles!quotes_user_id_fkey(
            id,
            full_name,
            email,
            preferred_display_currency
          ),
          payment_transactions(
            id,
            amount,
            currency,
            status,
            created_at
          )
        `,
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  // Get display currency - for authenticated users, use their preferred currency
  const displayCurrency = quote?.profiles?.preferred_display_currency || quote?.currency || 'USD';

  // Get status configuration
  const statusConfig = quote ? getStatusConfig(quote.status, 'quote') : null;
  
  // Fetch shipping routes for insurance calculation
  const { data: shippingRoutes } = useShippingRoutes(
    quote?.origin_country || 'US',
    quote?.destination_country || 'US'
  );
  
  // Get selected shipping option
  const selectedShippingOption = shippingRoutes?.shippingOptions?.find(
    option => option.id === quote?.operational_data?.shipping?.selected_option
  );

  // Calculate totals
  const itemsTotal =
    quote?.items?.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) || 0;

  const handleAddToCart = async () => {
    try {
      await quoteStateHook.addToCart();
      toast({
        title: 'Added to Cart',
        description: 'Quote has been added to your cart.',
      });
      navigate('/cart');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add quote to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleInsuranceToggle = async (enabled: boolean) => {
    if (!quote) return;
    
    setIsUpdatingInsurance(true);
    try {
      // Update the quote's insurance preference
      const { error } = await supabase
        .from('quotes')
        .update({
          customer_data: {
            ...quote.customer_data,
            preferences: {
              ...quote.customer_data?.preferences,
              insurance_opted_in: enabled,
            },
          },
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: enabled ? 'Insurance Added' : 'Insurance Removed',
        description: enabled
          ? 'Package protection has been added to your quote'
          : 'Package protection has been removed from your quote',
      });
      
      // Refresh the quote data
      window.location.reload();
    } catch (error) {
      console.error('Failed to update insurance:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update insurance preference. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingInsurance(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Quote Not Found</h1>
            <p className="text-gray-600 mb-6">
              The quote you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerData = customerDisplayUtils.getCustomerDisplayData(quote, quote.profiles);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Quote #{quote.display_id || quote.id.slice(0, 8)}
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Badge
                      variant={(statusConfig?.variant as any) || 'outline'}
                      className={statusConfig?.className}
                    >
                      {statusConfig?.icon && <statusConfig.icon className="h-3 w-3 mr-1" />}
                      {statusConfig?.label || quote.status}
                    </Badge>
                    <span>•</span>
                    <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              {quote.status === 'approved' && (
                <Button size="sm" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Double Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Quote Details */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{customerData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{customerData.email}</p>
                  </div>
                  {customerData.phone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{customerData.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {quote.destination_country}
                    </p>
                  </div>
                  {quote.shipping_address && (
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium text-sm">
                        {quote.shipping_address.formatted ||
                          `${quote.shipping_address.street}, ${quote.shipping_address.city}, ${quote.shipping_address.state} ${quote.shipping_address.postalCode}`}
                      </p>
                    </div>
                  )}
                  {quote.shipping_option && (
                    <div>
                      <p className="text-sm text-gray-500">Shipping Method</p>
                      <p className="font-medium flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {quote.shipping_option.name}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items ({quote.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.items?.map((item: any, index: number) => (
                    <div key={item.id || index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Quantity: {item.quantity} ×{' '}
                            {formatCurrency(item.price, displayCurrency)}
                          </p>
                          {item.product_url && (
                            <a
                              href={item.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View Product
                            </a>
                          )}
                        </div>
                        <p className="font-medium">
                          {formatCurrency(item.price * item.quantity, displayCurrency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            {quote.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Special Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Pricing & Actions */}
          <div className="space-y-6">
            {/* Price Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Price Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteBreakdownDetails
                  quote={quote}
                  displayCurrency={displayCurrency}
                  showEducation={true}
                />
              </CardContent>
            </Card>

            {/* Payment Status */}
            {quote.payment_transactions && quote.payment_transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quote.payment_transactions.map((payment: any) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {formatCurrency(parseFloat(payment.amount), payment.currency)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={payment.status === 'completed' ? 'success' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Quote Created</p>
                      <p className="text-sm text-gray-500">
                        {new Date(quote.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {quote.status === 'approved' && quote.approved_at && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Quote Approved</p>
                        <p className="text-sm text-gray-500">
                          {new Date(quote.approved_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {quote.expires_at && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-yellow-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Expires</p>
                        <p className="text-sm text-gray-500">
                          {new Date(quote.expires_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {quote.status === 'approved' && (
              <>
                {/* Insurance Option */}
                <InsuranceToggle
                  quote={quote}
                  selectedShippingOption={selectedShippingOption}
                  onToggle={handleInsuranceToggle}
                  isLoading={isUpdatingInsurance}
                />

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p className="font-medium text-green-900">Quote Approved</p>
                    </div>
                    <p className="text-sm text-green-800 mb-4">
                      Your quote has been approved and is ready for checkout.
                    </p>
                    <Button className="w-full" size="lg" onClick={handleAddToCart}>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {quote.status === 'pending' && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="font-medium text-yellow-900">Pending Review</p>
                  </div>
                  <p className="text-sm text-yellow-800">
                    Your quote is being reviewed by our team. We'll notify you once it's approved.
                  </p>
                </CardContent>
              </Card>
            )}

            {quote.status === 'rejected' && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="font-medium text-red-900">Quote Rejected</p>
                  </div>
                  <p className="text-sm text-red-800">
                    {quote.rejection_reason ||
                      'This quote has been rejected. Please contact support for more information.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerQuoteDetail;
