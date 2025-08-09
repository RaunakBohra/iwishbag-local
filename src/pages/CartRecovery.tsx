/**
 * Cart Recovery Landing Page
 * 
 * Optimized landing page for users returning from abandonment recovery emails/notifications.
 * Features: Social proof, urgency elements, trust badges, mobile-optimized design.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { cartAbandonmentService } from '@/services/CartAbandonmentService';
import { analytics } from '@/utils/analytics';
import { logger } from '@/utils/logger';

const CartRecovery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, isLoading } = useCart();
  const { user } = useAuth();
  
  // Recovery parameters
  const hasDiscount = searchParams.get('discount') === 'SAVE5NOW';
  const hasFreeShipping = searchParams.get('shipping') === 'free';
  const recoverySource = searchParams.get('source') || 'email';
  
  // State
  const [showUrgencyBanner, setShowUrgencyBanner] = useState(true);
  const [customersToday] = useState(Math.floor(Math.random() * 50) + 15); // Dynamic social proof
  
  // Track recovery page visit
  useEffect(() => {
    analytics.trackEngagement({
      event_name: 'recovery_page_visited',
      user_type: user ? 'returning' : 'guest',
    });

    // Track recovery source
    if (recoverySource) {
      analytics.trackEngagement({
        event_name: 'recovery_source_tracked',
        page_title: recoverySource,
        user_type: user ? 'returning' : 'guest',
      });
    }

    // Mark as returned from recovery attempt
    cartAbandonmentService.markCartRecovered(user?.id, recoverySource);
  }, [user, recoverySource]);

  // Auto-hide urgency banner after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowUrgencyBanner(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  // Redirect to cart if no recovery context
  useEffect(() => {
    if (!searchParams.get('recovery') && !searchParams.get('discount') && !searchParams.get('shipping')) {
      navigate('/cart', { replace: true });
    }
  }, [searchParams, navigate]);

  const totalValue = items.reduce((sum, item) => sum + (item.quote.total_quote_origincurrency || 0), 0);
  const savings = hasDiscount ? totalValue * 0.05 : hasFreeShipping ? 1500 : 0;

  const handleProceedToCheckout = () => {
    analytics.trackEngagement({
      event_name: 'recovery_checkout_clicked',
      quote_value: totalValue,
      user_type: user ? 'returning' : 'guest',
    });
    
    let checkoutUrl = '/checkout';
    if (hasDiscount) checkoutUrl += '?discount=SAVE5NOW';
    if (hasFreeShipping) checkoutUrl += '?shipping=free';
    
    navigate(checkoutUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {/* Urgency Banner */}
      {showUrgencyBanner && (hasDiscount || hasFreeShipping) && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 px-4 text-center relative">
          <div className="flex items-center justify-center gap-2">
            <OptimizedIcon name="Clock" className="w-4 h-4 animate-pulse" />
            <span className="font-semibold">
              {hasDiscount && '5% OFF expires in 2 days'}
              {hasFreeShipping && 'FREE SHIPPING expires in 24 hours'}
            </span>
            <OptimizedIcon name="Zap" className="w-4 h-4 animate-bounce" />
          </div>
          <button 
            onClick={() => setShowUrgencyBanner(false)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-lg mb-4">
            <OptimizedIcon name="ShoppingBag" className="w-6 h-6 text-teal-600" />
            <span className="font-bold text-xl">iwishBag</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome back! 👋
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your international shopping cart is waiting for you
          </p>
        </div>

        {/* Offer Highlights */}
        {(hasDiscount || hasFreeShipping) && (
          <div className="max-w-4xl mx-auto mb-8">
            <Card className="border-2 border-teal-200 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-2 rounded-full text-lg font-bold mb-4">
                    <OptimizedIcon name="Gift" className="w-5 h-5" />
                    {hasDiscount && 'EXCLUSIVE 5% OFF'}
                    {hasFreeShipping && 'FREE SHIPPING INCLUDED'}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 text-left">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Your Special Offer:</h3>
                      {hasDiscount && (
                        <div className="flex items-center gap-2">
                          <OptimizedIcon name="Percent" className="w-5 h-5 text-green-600" />
                          <span>5% OFF your entire order</span>
                          <Badge variant="secondary">SAVE5NOW</Badge>
                        </div>
                      )}
                      {hasFreeShipping && (
                        <div className="flex items-center gap-2">
                          <OptimizedIcon name="Truck" className="w-5 h-5 text-green-600" />
                          <span>FREE international shipping</span>
                          <Badge variant="secondary">No minimum</Badge>
                        </div>
                      )}
                      <div className="text-green-600 font-semibold text-lg">
                        You save: ₹{savings.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Why Complete Today:</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <OptimizedIcon name="Check" className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Items reserved for you</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <OptimizedIcon name="Check" className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Best exchange rates locked</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <OptimizedIcon name="Check" className="w-4 h-4 text-green-600 mt-0.5" />
                          <span>Priority processing</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Social Proof */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>{customersToday} people ordered today</span>
              </div>
              <div className="flex items-center gap-2">
                <OptimizedIcon name="Star" className="w-4 h-4 text-yellow-500 fill-current" />
                <span>4.9/5 customer rating</span>
              </div>
              <div className="flex items-center gap-2">
                <OptimizedIcon name="Shield" className="w-4 h-4 text-green-600" />
                <span>100% secure checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cart Summary */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Your Cart ({items.length} {items.length === 1 ? 'item' : 'items'})</h2>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-600">
                    ₹{totalValue.toLocaleString()}
                  </div>
                  {savings > 0 && (
                    <div className="text-green-600 font-semibold">
                      Save ₹{savings.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Items Preview */}
              <div className="space-y-4 mb-8">
                {items.slice(0, 3).map((item) => (
                  <div key={item.quote.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <OptimizedIcon name="Package" className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {item.quote.customer_data?.description || `International Product`}
                      </h3>
                      <p className="text-sm text-gray-600">From {item.quote.destination_country === 'NP' ? 'US to Nepal' : 'US to India'}</p>
                    </div>
                    <div className="text-lg font-semibold">
                      ₹{item.quote.total_quote_origincurrency?.toLocaleString()}
                    </div>
                  </div>
                ))}
                
                {items.length > 3 && (
                  <div className="text-center text-gray-600">
                    + {items.length - 3} more {items.length - 3 === 1 ? 'item' : 'items'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white py-4 text-lg font-semibold shadow-lg"
                  size="lg"
                >
                  <OptimizedIcon name="CreditCard" className="w-5 h-5 mr-2" />
                  {hasDiscount || hasFreeShipping ? 'Apply Offer & Checkout' : 'Complete Order'}
                  {savings > 0 && ` (Save ₹${savings.toLocaleString()})`}
                </Button>
                
                <Button
                  onClick={() => navigate('/cart')}
                  variant="outline"
                  className="w-full py-3"
                  size="lg"
                >
                  <OptimizedIcon name="Edit" className="w-4 h-4 mr-2" />
                  Review & Edit Cart
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 pt-6 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <OptimizedIcon name="Lock" className="w-6 h-6 text-green-600" />
                    <span>SSL Secure</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <OptimizedIcon name="CreditCard" className="w-6 h-6 text-blue-600" />
                    <span>PayU & Stripe</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <OptimizedIcon name="Truck" className="w-6 h-6 text-purple-600" />
                    <span>Fast Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <OptimizedIcon name="HeadphonesIcon" className="w-6 h-6 text-teal-600" />
                    <span>24/7 Support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <h3 className="text-xl font-bold text-center mb-6">Still have questions?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold mb-2">🔒 Is my payment secure?</h4>
              <p className="text-sm text-gray-600">Yes! We use industry-standard SSL encryption and trusted payment gateways PayU and Stripe.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold mb-2">🚚 How fast is delivery?</h4>
              <p className="text-sm text-gray-600">International shipping typically takes 7-14 days with full tracking and insurance included.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartRecovery;