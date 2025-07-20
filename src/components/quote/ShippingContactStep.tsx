// =========================
// IMPORTANT DEVELOPER NOTE
// =========================
//
// When setting the shipping address for a quote, ALWAYS set BOTH:
//   - country:      the 2-letter country code (e.g., 'IN', 'US')
//   - destination_country: the 2-letter country code (same as above)
//
// This is required because all admin, shipping route, and calculation logic expects
// both fields to be present and to contain the 2-letter code. If either is missing
// or contains a country name, calculations and admin features will break or show errors.
//
// DO NOT use country names in these fields. If you need to display the name, use a
// separate field or convert the code to a name at display time.
//
// See also: useQuoteCalculation.ts, AdminQuoteDetailPage.tsx, and unified-shipping-calculator.ts
// =========================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Package, MapPin, User, Mail, Phone, Clock } from 'lucide-react';
import { AddressForm } from '@/components/profile/AddressForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCountryUtils } from '@/lib/countryUtils';
import { useAllCountries } from '@/hooks/useAllCountries';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { QuoteRequestContactForm } from './QuoteRequestContactForm';
import ProductSummary from './ProductSummary';

function validateEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export default function ShippingContactStep({
  shippingContact,
  setShippingContact,
  next,
  back,
  products,
  quoteType,
  isSubmitting = false,
  submitError = '',
  clearError = () => {},
}) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { countries, getCountryDisplayName } = useCountryUtils();
  const { isLoading: countriesLoading, error: countriesError } = useAllCountries();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailError, setEmailError] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);

  // Fetch user addresses if logged in
  const {
    data: addresses,
    isLoading: addressesLoading,
    refetch,
  } = useQuery({
    queryKey: ['user_addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  // Get purchase country from first product
  const purchaseCountry = products && products[0]?.country;
  // Get shipping country from address or form
  let shippingCountry = '';
  let shippingCity = '';
  let shippingAddressSummary = '';
  let address = null;
  if (user && addresses && addresses.length > 0) {
    address = selectedAddressId ? addresses.find((a) => a.id === selectedAddressId) : addresses[0];
    if (address) {
      shippingCountry = address.destination_country || '';
      shippingCity = address.city;
      shippingAddressSummary = `${address.address_line1}, ${address.city}`;
    }
  } else if (shippingContact && shippingContact.country) {
    shippingCountry = shippingContact.country;
    shippingCity = shippingContact.city;
    shippingAddressSummary = `${shippingContact.address}, ${shippingContact.city}`;
  }

  // Origin-Destination Route Display
  const showRoute = purchaseCountry && shippingCountry;

  const handleChange = (field, value) => {
    setShippingContact({ ...shippingContact, [field]: value });
    
    // Real-time validation for email
    if (field === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }
    
    // Clear field errors when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    // For authenticated users with addresses, we don't need to validate form fields
    if (user && addresses && addresses.length > 0 && address) {
      return true;
    }

    // For guests, only validate email (simplified form)
    const newFieldErrors = {};
    
    if (!shippingContact.email) newFieldErrors.email = 'Email is required';
    else if (!validateEmail(shippingContact.email)) newFieldErrors.email = 'Please enter a valid email address';
    
    setFieldErrors(newFieldErrors);
    
    return Object.keys(newFieldErrors).length === 0;
  };

  const handleSubmit = () => {
    const isValid = validate();
    if (isValid) next();
  };

  const handleContactFormSubmit = (emailData: { email: string; name?: string; useAuth?: boolean }) => {
    // Update shippingContact with the provided data
    const updatedShippingContact = {
      ...shippingContact,
      email: emailData.email,
      name: emailData.name || '',
    };
    
    setShippingContact(updatedShippingContact);
    
    // Proceed to submission with the updated data passed directly
    next({ email: emailData.email, name: emailData.name || '' });
  };

  // NEW: Auto-populate shippingContact from address on initial load
  useEffect(() => {
    if (
      user &&
      addresses &&
      addresses.length > 0 &&
      address &&
      (!shippingContact || !shippingContact.country)
    ) {
      setShippingContact({
        name: address.recipient_name || '',
        email: profile?.email || '',
        whatsapp: address.phone || '',
        address: address.address_line1 || '',
        country: address.destination_country || '',
        destination_country: address.destination_country || '',
        state: address.state_province_region || '',
        city: address.city || '',
        zip: address.postal_code || '',
      });
    }
  }, [user, addresses, address, profile, setShippingContact]);

  // Update shippingContact when user selects a different address
  useEffect(() => {
    if (user && addresses && addresses.length > 0 && selectedAddressId) {
      const selectedAddr = addresses.find((addr) => addr.id === selectedAddressId);
      if (selectedAddr) {
        setShippingContact({
          name: selectedAddr.recipient_name || '',
          email: profile?.email || '',
          whatsapp: selectedAddr.phone || '',
          address: selectedAddr.address_line1 || '',
          country: selectedAddr.country || '',
          destination_country: selectedAddr.destination_country || selectedAddr.country || '',
          state: selectedAddr.state_province_region || '',
          city: selectedAddr.city || '',
          zip: selectedAddr.postal_code || '',
        });
      }
    }
  }, [selectedAddressId, addresses, profile, setShippingContact]);

  // If logged in and has addresses, show summary card
  if (user && addresses && addresses.length > 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Review & Submit</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Confirm your shipping details and we'll send your quote within 24-48 hours
          </p>
        </div>

        {showRoute && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Shipping Route</h3>
            </div>
            <div className="flex items-center justify-center">
              <ShippingRouteDisplay
                origin={purchaseCountry}
                destination={shippingCountry}
                showIcon={true}
                variant="compact"
                className="text-xl font-medium"
              />
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-lg">
                ✓ Optimized for cost & speed
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-teal-600" />
            <h3 className="text-xl font-semibold text-gray-900">Shipping Address</h3>
          </div>
          
          {address ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{address.recipient_name}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="text-gray-700 leading-relaxed">
                    <div>{address.address_line1}</div>
                    {address.address_line2 && <div>{address.address_line2}</div>}
                    <div>
                      {address.city}, {address.state_province_region} {address.postal_code}
                    </div>
                    <div className="font-medium text-gray-900 mt-1">{address.destination_country}</div>
                  </div>
                </div>
                {address.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-teal-600 font-medium">{address.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-gray-700 text-sm">Loading address...</div>
            </div>
          )}

          {addresses.length > 1 && address && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Or choose a different address:
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                value={address.id}
                onChange={(e) => setSelectedAddressId(e.target.value)}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.recipient_name}, {a.address_line1}, {a.city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              onClick={() => {
                setAddressToEdit(address);
                setAddressModalOpen(true);
              }}
              disabled={!address}
            >
              Edit Address
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
              onClick={() => {
                setAddressToEdit(null);
                setAddressModalOpen(true);
              }}
            >
              + Add New Address
            </button>
          </div>
        </div>

        <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{addressToEdit ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            </DialogHeader>
            <AddressForm
              address={addressToEdit}
              onSuccess={(newAddress) => {
                setAddressModalOpen(false);
                refetch();
                // Update shippingContact if this is a new address or editing current address
                if (newAddress && (!addressToEdit || addressToEdit.id === address?.id)) {
                  setShippingContact({
                    name: newAddress.recipient_name || '',
                    email: profile?.email || '',
                    whatsapp: newAddress.phone || '',
                    address: newAddress.address_line1 || '',
                    country: newAddress.country || '',
                    destination_country: newAddress.destination_country || newAddress.country || '',
                    state: newAddress.state_province_region || '',
                    city: newAddress.city || '',
                    zip: newAddress.postal_code || '',
                  });
                  // Update selected address ID to the new address
                  if (!addressToEdit) {
                    setSelectedAddressId(newAddress.id);
                  }
                }
              }}
            />
          </DialogContent>
        </Dialog>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            onClick={back}
          >
            ← Back to Products
          </button>
          <button
            type="button"
            className={`flex-1 py-4 rounded-lg font-medium text-lg transition-all duration-200 ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-sm'
            }`}
            onClick={() => {
              // Always set shipping contact from the selected address
              if (address) {
                const emailToUse = profile?.email || user?.email || '';
                const nameToUse = address.recipient_name || '';
                
                setShippingContact({
                  name: nameToUse,
                  email: emailToUse,
                  whatsapp: address.phone || '',
                  address: address.address_line1 || '',
                  country: address.destination_country || '',
                  destination_country: address.destination_country || '',
                  state: address.state_province_region || '',
                  city: address.city || '',
                  zip: address.postal_code || '',
                });
                
                // Pass the data directly to avoid state timing issues
                next({ email: emailToUse, name: nameToUse });
              } else {
                next();
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting Quote...
              </div>
            ) : (
              'Submit Quote Request'
            )}
          </button>
        </div>
      </div>
    );
  }

  // For authenticated users without addresses, show a message to add address first
  if (user && (!addresses || addresses.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Shipping Address Required</h2>
          <p className="text-gray-600">
            Please add a shipping address to continue with your quote request
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="mb-4">
            <MapPin className="h-12 w-12 text-teal-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shipping Address Found</h3>
            <p className="text-gray-600 mb-6">
              To request a quote, you need to add a shipping address to your profile first.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              type="button"
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 font-medium"
              onClick={() => {
                setAddressToEdit(null);
                setAddressModalOpen(true);
              }}
            >
              + Add Shipping Address
            </button>
            <button
              type="button"
              className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              onClick={() => (window.location.href = '/profile/address')}
            >
              Manage Addresses
            </button>
          </div>
        </div>

        <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
            </DialogHeader>
            <AddressForm
              address={addressToEdit}
              onSuccess={(newAddress) => {
                setAddressModalOpen(false);
                refetch();
                // Update shippingContact with the new address
                if (newAddress) {
                  setShippingContact({
                    name: newAddress.recipient_name || '',
                    email: profile?.email || '',
                    whatsapp: newAddress.phone || '',
                    address: newAddress.address_line1 || '',
                    country: newAddress.country || '',
                    destination_country: newAddress.destination_country || newAddress.country || '',
                    state: newAddress.state_province_region || '',
                    city: newAddress.city || '',
                    zip: newAddress.postal_code || '',
                  });
                  // This will trigger the first useEffect to set selectedAddressId
                  setSelectedAddressId(newAddress.id);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // For guests, show the enhanced contact form with OAuth options
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Almost There!</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Just need your contact details to send your quote
        </p>
        <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg max-w-lg mx-auto">
          <p className="text-sm text-teal-700">
            💡 <strong>Good news:</strong> We only need your destination country for calculations, so no full address required for quotes!
          </p>
        </div>
      </div>

      {/* Show shipping route confirmation */}
      {purchaseCountry && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-gray-900">Shipping Route</h3>
          </div>
          <div className="flex items-center justify-center">
            <ShippingRouteDisplay
              origin={purchaseCountry}
              destination={shippingCountry}
              showIcon={true}
              variant="compact"
              className="text-xl font-medium"
            />
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-lg">
              Full shipping address will be collected at checkout
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Center Column - Contact Form */}
        <div className="lg:col-span-2">
          <QuoteRequestContactForm
            onSubmit={handleContactFormSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
            clearError={clearError}
          />
        </div>

        {/* Right Column - Quote Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <Package className="h-5 w-5 text-teal-600" />
              <h3 className="text-xl font-semibold text-gray-900">Quote Summary</h3>
            </div>

            <div className="space-y-5">
              <div className="border-b border-gray-200 pb-4">
                <div className="text-sm text-gray-600 mb-2">Quote Type</div>
                <div className="font-semibold text-gray-900">
                  {quoteType === 'combined' ? 'Single Combined Quote' : 'Individual Quotes per Product'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {quoteType === 'combined' 
                    ? 'One quote for all products together' 
                    : 'Separate quote for each product'}
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="text-sm text-gray-600 mb-2">Products</div>
                <div className="font-semibold text-gray-900">
                  {products?.length} item{products?.length !== 1 ? 's' : ''}
                </div>
              </div>

              {purchaseCountry && shippingCountry && (
                <div className="border-b border-gray-200 pb-4">
                  <div className="text-sm text-gray-600 mb-2">Shipping Route</div>
                  <div className="font-semibold text-gray-900">
                    <ShippingRouteDisplay
                      origin={purchaseCountry}
                      destination={shippingCountry}
                      showIcon={false}
                    />
                  </div>
                </div>
              )}

              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <div className="text-sm text-teal-700 space-y-3">
                  <p className="font-semibold">Your quote will include:</p>
                  <ul className="text-sm space-y-1 ml-2">
                    <li>• Product cost + tax</li>
                    <li>• International shipping</li>
                    <li>• Customs & duties</li>
                    <li>• Local delivery</li>
                    <li>• All handling fees</li>
                  </ul>
                  <div className="flex items-center gap-2 pt-2 border-t border-teal-200">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm font-medium">Delivered within 24-48 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-center pt-6">
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
