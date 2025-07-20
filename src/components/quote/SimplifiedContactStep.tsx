import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Package, MapPin, Clock } from 'lucide-react';
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

  // Auto-populate contact info for authenticated users
  useEffect(() => {
    if (user && (!contactInfo.email || !contactInfo.name)) {
      setContactInfo({
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
      });
    }
  }, [user, contactInfo, setContactInfo]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
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
                      <ShippingRouteDisplay
                        originCountry={purchaseCountry}
                        destinationCountry={shippingCountry}
                        className="text-sm"
                      />
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