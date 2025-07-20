import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Package, MapPin, Clock, AlertCircle } from 'lucide-react';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { QuoteRequestContactForm } from './QuoteRequestContactForm';
import ProductSummary from './ProductSummary';
import { useCountryUtils } from '@/lib/countryUtils';

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

  // Get purchase country from first product
  const purchaseCountry = products && products[0]?.country;
  // Use destination country from props
  const shippingCountry = destinationCountry;

  // Origin-Destination Route Display
  const showRoute = purchaseCountry && shippingCountry;

  const handleContactFormSubmit = (emailData: { email: string; name?: string; useAuth?: boolean }) => {
    // Update contactInfo with the provided data
    const updatedContactInfo = {
      email: emailData.email,
      name: emailData.name || '',
    };
    
    setContactInfo(updatedContactInfo);
    
    // Proceed to submission with the updated data passed directly
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header - For Anonymous Users */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Almost Done!</h2>
        <p className="text-lg text-gray-600">
          Just need your contact details to send your quote
        </p>
      </div>

      {/* Quick Summary + Contact Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {/* Compact Summary */}
        <div className="mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-gray-600">Quote for</div>
                <div className="font-semibold text-gray-900">
                  {products?.length || 0} {products?.length === 1 ? 'Product' : 'Products'}
                </div>
              </div>
              
              {showRoute && (
                <>
                  <div className="text-gray-300">→</div>
                  <div>
                    <div className="text-sm text-gray-600">Shipping</div>
                    <div className="font-medium text-gray-900 text-sm">
                      {getCountryDisplayName(purchaseCountry)} → {getCountryDisplayName(shippingCountry)}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-600">Response time</div>
              <div className="font-semibold text-teal-600">24-48 hours</div>
            </div>
          </div>
        </div>

        {/* Enhanced Product Details Display for Anonymous Users */}
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

        {/* Contact Form */}
        <QuoteRequestContactForm
          onSubmit={handleContactFormSubmit}
          isSubmitting={isSubmitting}
          submitError={submitError}
          clearError={clearError}
        />
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