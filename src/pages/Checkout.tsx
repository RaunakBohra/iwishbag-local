/**
 * Checkout Page - Complete checkout flow integration
 * 
 * Features:
 * - Multi-step checkout process
 * - Integration with existing payment system
 * - Cart validation and totals calculation
 * - Address management
 * - Payment method selection
 * - Order creation and tracking
 * - Error handling and recovery
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  CheckCircle, 
  ArrowLeft,
  AlertCircle,
  Loader2,
  Plus,
  Package,
  Truck,
  Shield
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent } from '@/components/ui/tabs';

import { useCart } from '@/hooks/useCart';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { CheckoutService } from '@/services/CheckoutService';
import { currencyService } from '@/services/CurrencyService';

// Import existing payment components
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';

// Types
interface CheckoutStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

interface OrderSummary {
  itemsTotal: number;
  shippingTotal: number;
  taxesTotal: number;
  serviceFeesTotal: number;
  finalTotal: number;
  currency: string;
  savings?: number;
}

type CheckoutStepId = 'cart' | 'address' | 'payment' | 'review' | 'complete';

// Helper component for quote prices (need conversion from origin to display currency)
const QuotePrice: React.FC<{ amount: number; quote: any }> = ({ amount, quote }) => {
  const { formatAmountWithConversion, getSourceCurrency } = useDisplayCurrency(quote);
  const [formattedAmount, setFormattedAmount] = useState<string>('...');

  React.useEffect(() => {
    const updatePrice = async () => {
      try {
        const sourceCurrency = getSourceCurrency(quote);
        const formatted = await formatAmountWithConversion(amount, sourceCurrency);
        setFormattedAmount(formatted);
      } catch (error) {
        logger.error('Failed to format quote price', { amount, quote: quote.id, error });
        const sourceCurrency = getSourceCurrency(quote);
        setFormattedAmount(currencyService.formatAmount(amount, sourceCurrency));
      }
    };

    updatePrice();
  }, [amount, quote, formatAmountWithConversion, getSourceCurrency]);

  return <>{formattedAmount}</>;
};

// Helper component for already-converted amounts (just format, no conversion)
const FormattedPrice: React.FC<{ amount: number; currency: string }> = ({ amount, currency }) => {
  return <>{currencyService.formatAmount(amount, currency)}</>;
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { displayCurrency } = useDisplayCurrency();
  
  // State management
  const [currentStep, setCurrentStep] = useState<CheckoutStepId>('cart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  
  // Services
  const checkoutService = useMemo(() => CheckoutService.getInstance(), []);

  // Steps configuration
  const steps: CheckoutStep[] = useMemo(() => [
    {
      id: 'cart',
      title: 'Review Cart',
      description: 'Verify your items and quantities',
      completed: currentStep !== 'cart',
      active: currentStep === 'cart'
    },
    {
      id: 'address',
      title: 'Delivery Address',
      description: 'Where should we deliver?',
      completed: ['payment', 'review', 'complete'].includes(currentStep),
      active: currentStep === 'address'
    },
    {
      id: 'payment',
      title: 'Payment Method',
      description: 'How would you like to pay?',
      completed: ['review', 'complete'].includes(currentStep),
      active: currentStep === 'payment'
    },
    {
      id: 'review',
      title: 'Review Order',
      description: 'Final check before placing order',
      completed: currentStep === 'complete',
      active: currentStep === 'review'
    },
    {
      id: 'complete',
      title: 'Order Placed',
      description: 'Your order has been created',
      completed: false,
      active: currentStep === 'complete'
    }
  ], [currentStep]);

  // Calculate order summary
  useEffect(() => {
    const calculateOrderSummary = async () => {
      if (items.length === 0) return;
      
      try {
        setLoading(true);
        // Get destination country from first cart item if user profile doesn't have it
        const destinationCountry = user?.profile?.country || 
          (items.length > 0 ? items[0].quote.destination_country : 'US');
        const summary = await checkoutService.calculateOrderSummary(items, destinationCountry);
        setOrderSummary(summary);
      } catch (error) {
        logger.error('Failed to calculate order summary:', error);
        setError('Failed to calculate order total. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    calculateOrderSummary();
  }, [items, checkoutService, user]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!loading && items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, loading, navigate]);

  // Step navigation handlers
  const handleNextStep = useCallback(async () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const nextStep = steps[currentIndex + 1];
    
    if (!nextStep) return;

    // Validate current step before proceeding
    try {
      setLoading(true);
      setError(null);
      
      switch (currentStep) {
        case 'cart': {
          // Validate cart items are still available and approved
          const isValid = await checkoutService.validateCartItems(items);
          if (!isValid) {
            throw new Error('Some items in your cart are no longer available');
          }
          break;
        }
          
        case 'address':
          // Validate address is selected
          if (!selectedAddress) {
            throw new Error('Please select a delivery address');
          }
          break;
          
        case 'payment':
          // Validate payment method is selected
          if (!selectedPaymentMethod) {
            throw new Error('Please select a payment method');
          }
          break;
          
        case 'review': {
          // Process the order
          const order = await checkoutService.createOrder({
            items,
            address: selectedAddress,
            paymentMethod: selectedPaymentMethod,
            orderSummary: orderSummary!,
            userId: user!.id
          });
          setOrderData(order);
          break;
        }
      }
      
      setCurrentStep(nextStep.id as CheckoutStepId);
    } catch (error) {
      logger.error('Step validation failed:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentStep, steps, checkoutService, items, selectedAddress, selectedPaymentMethod, orderSummary, user]);

  const handlePreviousStep = useCallback(() => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const previousStep = steps[currentIndex - 1];
    
    if (previousStep) {
      setCurrentStep(previousStep.id as CheckoutStepId);
      setError(null);
    }
  }, [currentStep, steps]);

  // Handle order completion
  const handleCompleteOrder = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear cart after successful order
      await clearCart();
      
      // Navigate to order confirmation
      if (orderData) {
        navigate(`/order-confirmation/${orderData.id}`, { replace: true });
      } else {
        navigate('/dashboard/orders', { replace: true });
      }
    } catch (error) {
      logger.error('Failed to complete order:', error);
      setError('Failed to complete order. Please check your order status in your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [clearCart, navigate, orderData]);

  // Progress calculation
  const progress = useMemo(() => {
    const currentIndex = steps.findIndex(step => step.active);
    return ((currentIndex + 1) / steps.length) * 100;
  }, [steps]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/cart')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cart
              </Button>
              
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-teal-600" />
                <div>
                  <h1 className="text-2xl font-bold">Checkout</h1>
                  <p className="text-sm text-gray-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-4">
              <div className="w-32">
                <Progress value={progress} className="h-2" />
              </div>
              <span className="text-sm text-gray-500">
                Step {steps.findIndex(s => s.active) + 1} of {steps.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step Navigation */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 
                        ${step.completed ? 'bg-green-500 border-green-500 text-white' :
                          step.active ? 'bg-teal-500 border-teal-500 text-white' :
                          'bg-gray-100 border-gray-300 text-gray-400'}
                      `}>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      
                      {index < steps.length - 1 && (
                        <div className={`
                          w-16 h-0.5 ml-4
                          ${step.completed ? 'bg-green-500' : 'bg-gray-300'}
                        `} />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">{steps.find(s => s.active)?.title}</h3>
                  <p className="text-sm text-gray-600">{steps.find(s => s.active)?.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Step Content */}
            <Tabs value={currentStep} className="w-full">
              {/* Cart Review Step */}
              <TabsContent value="cart">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Review Your Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="font-medium">Quote #{item.quote.display_id || item.quote.id.slice(0, 8)}</h4>
                              <p className="text-sm text-gray-600">
                                {item.quote.items?.length || 0} items • {item.quote.origin_country} → {item.quote.destination_country}
                              </p>
                              <Badge variant={item.quote.status === 'approved' ? 'success' : 'secondary'}>
                                {item.quote.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              <QuotePrice 
                                amount={item.quote.final_total_origincurrency || 0}
                                quote={item.quote}
                              />
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Address Selection Step */}
              <TabsContent value="address">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Address selection would go here */}
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Address selection component will be integrated with existing address management system.
                        </AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedAddress({ id: 'default', address: 'Default Address' })}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Use Default Address
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Method Step */}
              <TabsContent value="payment">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodSelector
                      selectedMethod={selectedPaymentMethod}
                      onMethodSelect={setSelectedPaymentMethod}
                      totalAmount={orderSummary?.finalTotal || 0}
                      currency={displayCurrency}
                      country={user?.profile?.country || 
                        (items.length > 0 ? items[0].quote.destination_country : 'US')}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Review Step */}
              <TabsContent value="review">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Review Your Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Order Summary */}
                      <div>
                        <h4 className="font-medium mb-3">Order Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Items ({items.length})</span>
                            <span>
                              <FormattedPrice 
                                amount={orderSummary?.itemsTotal || 0}
                                currency={orderSummary?.currency || displayCurrency}
                              />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping & Handling</span>
                            <span>
                              <FormattedPrice 
                                amount={orderSummary?.shippingTotal || 0}
                                currency={orderSummary?.currency || displayCurrency}
                              />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxes & Duties</span>
                            <span>
                              <FormattedPrice 
                                amount={orderSummary?.taxesTotal || 0}
                                currency={orderSummary?.currency || displayCurrency}
                              />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service Fees</span>
                            <span>
                              <FormattedPrice 
                                amount={orderSummary?.serviceFeesTotal || 0}
                                currency={orderSummary?.currency || displayCurrency}
                              />
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>
                              <FormattedPrice 
                                amount={orderSummary?.finalTotal || 0}
                                currency={orderSummary?.currency || displayCurrency}
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Selected Options */}
                      <Separator />
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm text-gray-700">Delivery Address</h5>
                          <p className="text-sm">{selectedAddress?.address || 'Default Address'}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-gray-700">Payment Method</h5>
                          <p className="text-sm capitalize">{selectedPaymentMethod?.replace('_', ' ') || 'Not selected'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Complete Step */}
              <TabsContent value="complete">
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">Order Placed Successfully!</h3>
                      <p className="text-gray-600">
                        Your order has been created and is being processed.
                      </p>
                    </div>
                    
                    {orderData && (
                      <div className="mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Order Number</p>
                          <p className="font-mono font-semibold text-lg">{orderData.orderNumber}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <Button onClick={handleCompleteOrder} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        View Order Details
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        Back to Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Navigation Buttons */}
            {currentStep !== 'complete' && (
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentStep === 'cart' || loading}
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="min-w-24"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentStep === 'review' ? (
                    'Place Order'
                  ) : (
                    'Next'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : orderSummary ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Items ({items.length})</span>
                      <span>
                        <FormattedPrice 
                          amount={orderSummary.itemsTotal}
                          currency={orderSummary.currency}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Shipping
                      </span>
                      <span>
                        <FormattedPrice 
                          amount={orderSummary.shippingTotal}
                          currency={orderSummary.currency}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxes & Duties</span>
                      <span>
                        <FormattedPrice 
                          amount={orderSummary.taxesTotal}
                          currency={orderSummary.currency}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Service Fees
                      </span>
                      <span>
                        <FormattedPrice 
                          amount={orderSummary.serviceFeesTotal}
                          currency={orderSummary.currency}
                        />
                      </span>
                    </div>
                    
                    {orderSummary.savings && orderSummary.savings > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Savings</span>
                        <span>
                          -<FormattedPrice 
                            amount={orderSummary.savings}
                            currency={orderSummary.currency}
                          />
                        </span>
                      </div>
                    )}
                    
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>
                        <FormattedPrice 
                          amount={orderSummary.finalTotal}
                          currency={orderSummary.currency}
                        />
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Calculating totals...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;