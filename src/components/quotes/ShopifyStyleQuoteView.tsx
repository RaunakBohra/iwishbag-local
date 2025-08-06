import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Shield, 
  Clock, 
  Download,
  MessageCircle,
  ChevronRight,
  Star,
  Heart,
  ArrowLeft,
  Lock,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  MobileStickyBar, 
  MobileProductSummary, 
  MobileBreakdown, 
  MobileTrustSignals, 
  MobileProgress,
  MobileQuoteOptions 
} from './ShopifyMobileOptimizations';
import { QuoteOptionsSelector } from './QuoteOptionsSelector';
import { CustomerBreakdown } from './CustomerBreakdown';

interface ShopifyStyleQuoteViewProps {
  viewMode: 'customer' | 'shared';
}

const QuoteProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { label: 'Requested', step: 1 },
    { label: 'Calculated', step: 2 },
    { label: 'Awaiting Approval', step: 3 },
    { label: 'In Cart', step: 4 },
    { label: 'Checkout', step: 5 }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.step} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step.step <= currentStep 
                  ? 'bg-green-500 text-white' 
                  : step.step === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.step <= currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.step
              )}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              step.step <= currentStep ? 'text-green-600' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-full mt-1 ${
                step.step < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <Progress value={(currentStep / steps.length) * 100} className="h-1" />
    </div>
  );
};

export const ShopifyStyleQuoteView: React.FC<ShopifyStyleQuoteViewProps> = ({
  viewMode
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCartStore();
  const { id: quoteId, shareToken } = useParams<{ id: string; shareToken: string }>();
  
  const queryClient = useQueryClient();
  
  // Use React Query for quote data with cache invalidation
  const { data: quote, isLoading: loading, refetch: refetchQuote } = useQuery({
    queryKey: ['quote', quoteId || shareToken],
    queryFn: async () => {
      let query = supabase.from('quotes_v2').select('*');
      
      if (quoteId) {
        query = query.eq('id', quoteId);
      } else if (shareToken) {
        query = query.eq('share_token', shareToken);
      }

      const { data, error } = await query.single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!(quoteId || shareToken),
    staleTime: 0, // Always refetch for real-time updates
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionType, setQuestionType] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [mobileBreakdownExpanded, setMobileBreakdownExpanded] = useState(false);
  const [quoteOptions, setQuoteOptions] = useState({
    shipping: 'express',
    insurance: true,
    discountCode: '',
    adjustedTotal: 0,
    shippingAdjustment: 0,
    insuranceAdjustment: 0,
    discountAmount: 0
  });
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDetails, setRejectDetails] = useState('');

  // React Query handles data fetching automatically

  // Quote refresh function for components that need to trigger updates
  const refreshQuote = useCallback(() => {
    console.log('🔄 Refreshing quote data...');
    refetchQuote();
  }, [refetchQuote]);

  const handleApprove = async () => {
    try {
      // Use adjusted total if options have been changed
      const finalTotal = quoteOptions.adjustedTotal || quote.total_usd;
      const finalTotalLocal = quoteOptions.adjustedTotal || quote.total_customer_currency;

      // Add to cart with selected options
      const cartItem = {
        id: quote.id,
        quoteId: quote.id,
        productName: quote.items?.[0]?.name || 'Quote Items',
        finalTotal: finalTotal,
        finalTotalLocal: finalTotalLocal,
        finalCurrency: quote.customer_currency,
        quantity: 1,
        itemWeight: quote.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 0,
        imageUrl: quote.items?.[0]?.images?.[0],
        countryCode: quote.destination_country,
        purchaseCountryCode: quote.origin_country,
        destinationCountryCode: quote.destination_country,
        inCart: true,
        isSelected: false,
        selectedOptions: {
          shipping: quoteOptions.shipping,
          insurance: quoteOptions.insurance,
          discountCode: quoteOptions.discountCode,
          adjustments: {
            shippingAdjustment: quoteOptions.shippingAdjustment,
            insuranceAdjustment: quoteOptions.insuranceAdjustment,
            discountAmount: quoteOptions.discountAmount
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addItem(cartItem);

      // Update quote status with selected options
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'approved',
          selected_options: {
            shipping: quoteOptions.shipping,
            insurance: quoteOptions.insurance,
            discountCode: quoteOptions.discountCode,
            finalTotal: finalTotal,
            adjustments: {
              shippingAdjustment: quoteOptions.shippingAdjustment,
              insuranceAdjustment: quoteOptions.insuranceAdjustment,
              discountAmount: quoteOptions.discountAmount
            }
          }
        })
        .eq('id', quote.id);

      toast({
        title: "Success!",
        description: "Quote approved and added to cart",
      });

      // Navigate to cart
      navigate('/cart');
      
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve quote",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    try {
      // Update quote status to rejected with reason
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectReason,
          rejection_details: rejectDetails,
          rejected_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      // Also create a support ticket for follow-up
      await supabase
        .from('customer_tickets')
        .insert({
          user_id: user?.id,
          quote_id: quote.id,
          subject: `Quote Rejected - #${quote.quote_number || quote.id.slice(0, 8)}`,
          message: `Quote rejected. Reason: ${rejectReason}\n\nDetails: ${rejectDetails}`,
          category: 'quote_rejection',
          priority: 'medium',
          status: 'open'
        });

      toast({
        title: "Quote Rejected",
        description: "We'll review your feedback and get back to you soon",
      });

      setRejectModalOpen(false);
      setRejectReason('');
      setRejectDetails('');
      
      // Refresh quote data to show updated status
      refreshQuote();
      
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: "Error",
        description: "Failed to reject quote",
        variant: "destructive"
      });
    }
  };

  const handleSubmitQuestion = async () => {
    try {
      // Create a support ticket
      const { error } = await supabase
        .from('customer_tickets')
        .insert({
          user_id: user?.id,
          quote_id: quote.id,
          subject: `Question about Quote #${quote.quote_number || quote.id.slice(0, 8)}`,
          message: questionText,
          category: questionType,
          priority: 'medium',
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Question Submitted",
        description: "We'll get back to you within 24 hours",
      });

      setQuestionModalOpen(false);
      setQuestionText('');
      setQuestionType('');
      
    } catch (error) {
      console.error('Error submitting question:', error);
      toast({
        title: "Error",
        description: "Failed to submit question",
        variant: "destructive"
      });
    }
  };

  const getDaysUntilExpiry = () => {
    if (!quote?.expires_at) return null;
    const expiry = new Date(quote.expires_at);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The quote you're looking for doesn't exist or has expired.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = quote.items || [];
  const breakdown = quote.calculation_data?.breakdown || {};
  const daysLeft = getDaysUntilExpiry();
  const currentStep = quote.status === 'approved' ? 4 : 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Back Button */}
        {viewMode === 'customer' && (
          <Button 
            variant="ghost" 
            className="mb-6 p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/dashboard/quotes')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Quote is Ready</h1>
          <p className="text-muted-foreground">
            Review your quote and approve to continue to checkout
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="hidden md:block">
          <QuoteProgress currentStep={currentStep} />
        </div>
        <MobileProgress currentStep={currentStep} />

        {/* Expiry Warning */}
        {daysLeft && daysLeft <= 7 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {daysLeft <= 1 ? 'Quote expires today!' : `Quote expires in ${daysLeft} days`}
                  </p>
                  <p className="text-sm text-orange-700">
                    Approve now to secure these prices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Components */}
        <MobileProductSummary 
          items={items} 
          quote={quote} 
          formatCurrency={formatCurrency}
        />
        
        <MobileQuoteOptions
          quote={quote}
          breakdown={breakdown}
          quoteOptions={quoteOptions}
          onOptionsChange={setQuoteOptions}
          formatCurrency={formatCurrency}
          onQuoteUpdate={refreshQuote}
        />
        
        <MobileBreakdown 
          quote={quote}
          breakdown={breakdown}
          expanded={mobileBreakdownExpanded}
          onToggle={() => setMobileBreakdownExpanded(!mobileBreakdownExpanded)}
          formatCurrency={formatCurrency}
          quoteOptions={quoteOptions}
          onOptionsChange={setQuoteOptions}
        />
        
        <MobileTrustSignals />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Product Details & Options */}
          <div className="lg:col-span-2 hidden md:block">
            {/* Product Summary */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {items[0]?.images?.[0] ? (
                      <img 
                        src={items[0].images[0]} 
                        alt={items[0].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-2">
                      {items.length > 1 
                        ? `${items[0]?.name} + ${items.length - 1} more item${items.length > 2 ? 's' : ''}`
                        : items[0]?.name || 'Your Items'
                      }
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>
                        {items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)}kg total
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">All items verified</span>
                      </div>
                      <div className="flex items-center text-blue-600">
                        <Truck className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Express shipping</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Estimate */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-muted-foreground">
                      <Truck className="w-4 h-4 mr-2" />
                      <span className="text-sm">Estimated delivery</span>
                    </div>
                    <span className="font-medium">
                      {(() => {
                        // Get selected shipping option from admin settings
                        const adminShippingOptions = quote.calculation_data?.shipping_options || [];
                        const selectedOption = adminShippingOptions.find((opt: any) => opt.id === quoteOptions.shipping) || 
                          { min_days: 12, max_days: 15 }; // fallback

                        const minDate = new Date(Date.now() + selectedOption.min_days * 24 * 60 * 60 * 1000);
                        const maxDate = new Date(Date.now() + selectedOption.max_days * 24 * 60 * 60 * 1000);
                        
                        return `${minDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })} - ${maxDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}`;
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">What's included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.product_url ? (
                          <a 
                            href={item.product_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <p className="font-medium text-sm">{item.name}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>{item.weight || 0}kg</span>
                          <span>•</span>
                          <span>{formatCurrency(item.costprice_origin, quote.customer_currency)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Note */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Shipping tip</p>
                      <p className="text-sm text-blue-700">All items ship together to save costs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quote Options - Shipping, Insurance, Discounts */}
            <QuoteOptionsSelector
              quote={quote}
              breakdown={breakdown}
              onOptionsChange={setQuoteOptions}
              formatCurrency={formatCurrency}
              className="mb-6"
              onQuoteUpdate={refreshQuote}
            />

            {/* Pricing Breakdown */}
            <CustomerBreakdown 
              quote={quote}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="hidden md:block">
            {/* Quote Summary */}
            <Card className="mb-6 sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(
                        quoteOptions.adjustedTotal || quote.total_customer_currency || quote.total_usd, 
                        quote.customer_currency
                      )}
                    </div>
                    {(quoteOptions.adjustedTotal && quoteOptions.adjustedTotal !== (quote.total_customer_currency || quote.total_usd)) && (
                      <div className="text-sm text-muted-foreground line-through">
                        Original: {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}
                      </div>
                    )}
                    {quote.customer_currency !== 'USD' && (
                      <div className="text-sm text-muted-foreground">
                        ≈ {formatCurrency(quoteOptions.adjustedTotal || quote.total_usd, 'USD')}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Benefits */}
                  <div className="space-y-2">
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Free packaging
                    </div>
                    <div className="flex items-center text-green-600 text-sm">
                      <Shield className="w-4 h-4 mr-2" />
                      Insurance included
                    </div>
                    <div className="flex items-center text-green-600 text-sm">
                      <Truck className="w-4 h-4 mr-2" />
                      Express shipping
                    </div>
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      SMS notifications
                    </div>
                  </div>

                  <Separator />

                  {/* Expiry */}
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Valid until</div>
                    <div className="font-medium">
                      {quote.expires_at ? 
                        new Date(quote.expires_at).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) : 'No expiry'
                      }
                    </div>
                    {daysLeft && (
                      <div className="text-sm text-muted-foreground">
                        ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full h-12 text-base font-medium"
                      onClick={() => setApproveModalOpen(true)}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve & Add to Cart
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="destructive" 
                        className="h-12"
                        onClick={() => setRejectModalOpen(true)}
                      >
                        Reject Quote
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-12"
                        onClick={() => setQuestionModalOpen(true)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Ask Question
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" className="h-10">
                        <Heart className="w-4 h-4 mr-2" />
                        Save for Later
                      </Button>
                      <Button variant="ghost" size="sm" className="h-10">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Trust Signals */}
                  <div className="text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center mb-2">
                      <Lock className="w-3 h-3 mr-1" />
                      Secure • Trusted by 50k+ customers
                    </div>
                    <div>⚡ Instant approval</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customer Testimonials */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground mb-2">
                  "Fast approval, great packaging, arrived exactly on time!"
                </p>
                <p className="text-xs font-medium">- Sarah M.</p>
              </div>
              <div className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground mb-2">
                  "Customer service helped me save $200 on shipping!"
                </p>
                <p className="text-xs font-medium">- Mike K.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-green-900 mb-1">
                {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}
              </div>
              <div className="text-sm text-green-700">
                Quote #{quote.quote_number || quote.id.slice(0, 8)}
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <p className="font-medium">By approving this quote:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  You confirm all details and pricing
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  Quote will be added to your cart
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  You can review everything before checkout
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setApproveModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleApprove} className="flex-1">
                <CreditCard className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Help us improve by letting us know why you're rejecting this quote. We'll use this feedback to provide better quotes in the future.
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-2">Main reason for rejection</label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the main reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_too_high">Price is too high</SelectItem>
                  <SelectItem value="shipping_too_slow">Shipping is too slow</SelectItem>
                  <SelectItem value="shipping_too_expensive">Shipping costs too much</SelectItem>
                  <SelectItem value="dont_need_anymore">Don't need the items anymore</SelectItem>
                  <SelectItem value="found_better_deal">Found a better deal elsewhere</SelectItem>
                  <SelectItem value="missing_items">Some items are missing</SelectItem>
                  <SelectItem value="incorrect_calculation">Quote calculation seems incorrect</SelectItem>
                  <SelectItem value="payment_issues">Payment method issues</SelectItem>
                  <SelectItem value="other">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional details (optional)</label>
              <Textarea 
                placeholder="Any additional feedback to help us serve you better..."
                value={rejectDetails}
                onChange={(e) => setRejectDetails(e.target.value)}
                rows={3}
              />
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Rejecting this quote will mark it as declined and create a support ticket for our team to review. You can always request a new quote with different requirements.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject} 
                disabled={!rejectReason}
                className="flex-1"
              >
                Reject Quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Modal */}
      <Dialog open={questionModalOpen} onOpenChange={setQuestionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Modifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Let us know what you'd like to change and we'll get back to you within 24 hours.
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-2">What would you like to modify?</label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pricing">Pricing concerns</SelectItem>
                  <SelectItem value="shipping">Shipping options</SelectItem>
                  <SelectItem value="products">Product modifications</SelectItem>
                  <SelectItem value="delivery">Delivery timeline</SelectItem>
                  <SelectItem value="insurance">Insurance coverage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Please explain in detail</label>
              <Textarea 
                placeholder="The more details you provide, the better we can help..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setQuestionModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitQuestion} 
                disabled={!questionType || !questionText.trim()}
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Sticky Bar */}
      <MobileStickyBar 
        quote={quote}
        onApprove={() => setApproveModalOpen(true)}
        onRequestChanges={() => setQuestionModalOpen(true)}
        onReject={() => setRejectModalOpen(true)}
        formatCurrency={formatCurrency}
        adjustedTotal={quoteOptions.adjustedTotal}
      />
    </div>
  );
};