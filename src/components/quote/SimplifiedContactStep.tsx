import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Package, MapPin, Clock, AlertCircle, Mail, User, UserPlus, X } from 'lucide-react';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { QuoteRequestContactForm } from './QuoteRequestContactForm';
import ProductSummary from './ProductSummary';
import { useCountryUtils } from '@/lib/countryUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProgressiveAuthModal } from '@/components/auth/ProgressiveAuthModal';

export default function SimplifiedContactStep({
  contactInfo,
  setContactInfo,
  destinationCountry,
  next,
  back,
  products,
  quoteType,
  isSubmitting = false,
  submitError = '',
  clearError = () => {},
}) {
  const { user } = useAuth();
  const { getCountryDisplayName } = useCountryUtils();
  
  // New state for managing the flow
  const [flowChoice, setFlowChoice] = useState(null); // 'guest' | 'member' | null
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  // Get purchase country from first product
  const purchaseCountry = products && products[0]?.country;
  // Use destination country from props
  const shippingCountry = destinationCountry;

  // Origin-Destination Route Display
  const showRoute = purchaseCountry && shippingCountry;

  // Handle guest email submission (email only, no name)
  const handleGuestSubmit = () => {
    if (!guestEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail)) {
      return;
    }
    
    // Update contactInfo with email only for guest
    const updatedContactInfo = {
      email: guestEmail,
      name: '', // No name for guest flow
    };
    
    setContactInfo(updatedContactInfo);
    next({ email: guestEmail, name: '' });
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Reset flow choice to trigger re-render with authenticated user
    setFlowChoice(null);
    // The component will automatically redirect to the signed-in flow
  };

  // Legacy handler for backward compatibility
  const handleContactFormSubmit = (emailData: { email: string; name?: string; useAuth?: boolean }) => {
    const updatedContactInfo = {
      email: emailData.email,
      name: emailData.name || '',
    };
    
    setContactInfo(updatedContactInfo);
    next({ email: emailData.email, name: emailData.name || '' });
  };

  // Auto-populate contact info for authenticated users (only once when user loads)
  useEffect(() => {
    if (user && user.email && !user.is_anonymous) {
      setContactInfo({
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
      });
    }
  }, [user?.id, setContactInfo]); // Only depend on user ID to avoid infinite loops

  // For authenticated (non-anonymous) users, show review page instead of contact form
  if (user && !user.is_anonymous) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Review & Submit</h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            Review your quote request and submit
          </p>
        </div>

        {/* Shipping Route - Compact version */}
        {showRoute && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-start">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  <Package className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {quoteType === 'combined' ? 'Combined Quote' : 'Individual Quotes'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500">From</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {getCountryDisplayName(purchaseCountry) || purchaseCountry}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-xs text-gray-500">To</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {getCountryDisplayName(shippingCountry) || shippingCountry}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">24-48 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

          {/* Enhanced Product Details Display */}
          {products && products.length > 0 && (
            <ProductSummary
              products={products}
              title="Product Details"
              destinationCountry={destinationCountry}
              className="border-0 shadow-none"
            />
          )}

          {/* Submit Button */}
          <div className="space-y-4">
            {submitError && (
              <div className="p-3 border border-red-300 rounded bg-red-50">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{submitError}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => next({ email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.name || '' })}
              disabled={isSubmitting}
              className="w-full h-14 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium text-lg rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting Quote Request...
                </div>
              ) : (
                'Submit Quote Request'
              )}
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <button
            type="button"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            onClick={back}
          >
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  // For non-authenticated users: Show choice screen first, then appropriate flow
  if (!flowChoice) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">How would you like to continue?</h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            Choose the option that works best for you
          </p>
        </div>

        {/* Shipping Route - Compact version */}
        {showRoute && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-start">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  <Package className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {quoteType === 'combined' ? 'Combined Quote' : 'Individual Quotes'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500">From</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {getCountryDisplayName(purchaseCountry) || purchaseCountry}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-xs text-gray-500">To</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {getCountryDisplayName(shippingCountry) || shippingCountry}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">24-48 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Guest Option */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Guest</h3>
              <p className="text-gray-600 text-sm mb-6">
                Quick & easy submission with just your email address
              </p>
              <ul className="text-left text-sm text-gray-500 mb-6 space-y-2">
                <li>✓ Fast quote submission</li>
                <li>✓ Email-only required</li>
                <li>✓ No account needed</li>
              </ul>
              <Button 
                onClick={() => setFlowChoice('guest')}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Continue as Guest
              </Button>
            </div>
          </div>

          {/* Member Option */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Member</h3>
              <p className="text-gray-600 text-sm mb-6">
                Sign in to track quotes and manage your orders
              </p>
              <ul className="text-left text-sm text-gray-500 mb-6 space-y-2">
                <li>✓ Track quote progress</li>
                <li>✓ Order history</li>
                <li>✓ Dashboard access</li>
              </ul>
              <Button 
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Create Account Option */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            New to iwishBag?{' '}
            <button 
              onClick={() => setShowAuthModal(true)}
              className="text-teal-600 hover:text-teal-800 font-medium underline"
            >
              Create Account
            </button>
          </p>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <button
            type="button"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            onClick={back}
          >
            ← Back to Products
          </button>
        </div>

        {/* Auth Modal */}
        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center">Sign In or Create Account</DialogTitle>
            </DialogHeader>
            <ProgressiveAuthModal 
              onSuccess={handleAuthSuccess}
              onBack={() => setShowAuthModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Guest email flow
  if (flowChoice === 'guest') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Almost Done!</h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            Just need your email to send your quote
          </p>
        </div>

        {/* Shipping Route - Compact version */}
        {showRoute && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-start">
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  <Package className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {quoteType === 'combined' ? 'Combined Quote' : 'Individual Quotes'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500">From</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {getCountryDisplayName(purchaseCountry) || purchaseCountry}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-xs text-gray-500">To</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {getCountryDisplayName(shippingCountry) || shippingCountry}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">24-48 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Product Details Display */}
        {products && products.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <ProductSummary
              products={products}
              title="Product Details"
              destinationCountry={destinationCountry}
              className="border-0 shadow-none"
            />
          </div>
        )}

        {/* Email Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="guest-email" className="text-base font-medium text-gray-900">
                Email Address
              </Label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Enter your email address"
                className="mt-2 h-12"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                We'll send your quote to this email address
              </p>
            </div>

            {submitError && (
              <div className="p-3 border border-red-300 rounded bg-red-50">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{submitError}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleGuestSubmit}
              disabled={isSubmitting || !guestEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail)}
              className="w-full h-14 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium text-lg"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting Quote Request...
                </div>
              ) : (
                'Submit Quote Request'
              )}
            </Button>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <button
            type="button"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            onClick={() => setFlowChoice(null)}
          >
            ← Back to Options
          </button>
        </div>
      </div>
    );
  }

  // Fallback to original flow (should not reach here with new design)
  return null;
}