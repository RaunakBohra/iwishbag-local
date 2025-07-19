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
import { ArrowRight, Package, MapPin, User, Mail, Phone } from 'lucide-react';
import { AddressForm } from '@/components/profile/AddressForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCountryUtils } from '@/lib/countryUtils';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
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
}) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { countries, getCountryDisplayName } = useCountryUtils();
  const [error, setError] = useState('');
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

  const handleChange = (field, value) => setShippingContact({ ...shippingContact, [field]: value });

  const validate = () => {
    // For authenticated users with addresses, we don't need to validate form fields
    if (user && addresses && addresses.length > 0 && address) {
      return '';
    }

    // For guests or users without addresses, validate all fields
    if (!shippingContact.address) return 'Address is required.';
    if (!shippingContact.country) return 'Country is required.';
    if (!shippingContact.state) return 'State is required.';
    if (!shippingContact.city) return 'City is required.';
    if (!shippingContact.zip) return 'ZIP code is required.';
    if (!shippingContact.name) return 'Name is required.';
    if (!shippingContact.email) return 'Email is required.';
    if (!validateEmail(shippingContact.email)) return 'Please enter a valid email address.';
    return '';
  };

  const handleSubmit = () => {
    const err = validate();
    setError(err);
    if (!err) next();
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Shipping & Contact Information</h2>
          <p className="text-gray-600">
            Review your shipping details and submit your quote request
          </p>
        </div>

        {showRoute && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-1">Purchase Country</div>
                <div className="text-xl font-semibold text-gray-900">
                  🌍 {getCountryDisplayName(purchaseCountry)}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <ArrowRight className="h-5 w-5 text-gray-500" />
                <div className="w-12 h-0.5 bg-gray-300"></div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-1">Delivery Address</div>
                <div className="text-xl font-semibold text-gray-900">
                  🌍 {getCountryDisplayName(shippingCountry)}
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg inline-block">
                We'll find the most cost-effective shipping route for you
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping Address</h3>
            {address ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="font-medium">{address.recipient_name}</div>
                  <div>{address.address_line1}</div>
                  {address.address_line2 && <div>{address.address_line2}</div>}
                  <div>
                    {address.city}, {address.state_province_region} {address.postal_code}
                  </div>
                  <div className="font-medium">{address.destination_country}</div>
                  {address.phone && <div className="text-teal-600">📞 {address.phone}</div>}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-gray-700 text-sm">Loading address...</div>
              </div>
            )}
          </div>

          {addresses.length > 1 && address && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose another address:
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 py-2 px-4 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
              className="flex-1 py-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 font-medium"
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

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            onClick={back}
          >
            Back to Products
          </button>
          <button
            type="button"
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 font-medium shadow-sm"
            onClick={() => {
              // Always set shipping contact from the selected address
              if (address) {
                setShippingContact({
                  name: address.recipient_name || '',
                  email: profile?.email || user?.email || '',
                  whatsapp: address.phone || '',
                  address: address.address_line1 || '',
                  country: address.destination_country || '',
                  destination_country: address.destination_country || '',
                  state: address.state_province_region || '',
                  city: address.city || '',
                  zip: address.postal_code || '',
                });
              }
              next();
            }}
          >
            Submit Quote Request
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

  // For guests, keep address form and email field (no WhatsApp, no name)
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Shipping & Contact Information</h2>
        <p className="text-gray-600">Enter your shipping details and submit your quote request</p>
        <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm text-teal-700">
            💡 <strong>Tip:</strong> Sign up for an account to save your addresses and get a faster
            quote experience!
          </p>
        </div>
      </div>

      {showRoute && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-center space-x-6">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-1">Purchase Country</div>
              <div className="text-xl font-semibold text-gray-900">
                🌍 {getCountryDisplayName(purchaseCountry)}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <div className="w-12 h-0.5 bg-gray-300"></div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-1">Delivery Address</div>
              <div className="text-xl font-semibold text-gray-900">
                🌍 {getCountryDisplayName(shippingCountry)}
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg inline-block">
              We'll find the most cost-effective shipping route for you
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
              <User className="h-5 w-5 mr-2 text-teal-600" />
              Contact Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  value={shippingContact.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
              <MapPin className="h-5 w-5 mr-2 text-teal-600" />
              Shipping Address
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                <input
                  className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  value={shippingContact.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street address, apartment, suite, etc."
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={shippingContact.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={shippingContact.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="State/Province"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={shippingContact.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={shippingContact.zip}
                    onChange={(e) => handleChange('zip', e.target.value)}
                    placeholder="ZIP/Postal code"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
              <Package className="h-5 w-5 mr-2 text-teal-600" />
              Quote Summary
            </h3>

            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <div className="text-sm text-gray-600 mb-1">Quote Type</div>
                <div className="font-medium text-gray-900">
                  {quoteType === 'combined' ? 'Combined Quote' : 'Separate Quotes'}
                </div>
              </div>

              <div className="border-b border-gray-200 pb-3">
                <div className="text-sm text-gray-600 mb-1">Shipping Route</div>
                <div className="font-medium text-gray-900">
                  <ShippingRouteDisplay
                    origin={purchaseCountry}
                    destination={shippingCountry}
                    showIcon={false}
                  />
                </div>
              </div>

              <div className="bg-teal-50 rounded-lg p-3">
                <div className="text-sm text-teal-700">
                  We'll calculate shipping costs, customs duties, and provide you with a detailed
                  quote within 24-48 hours.
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 text-sm font-medium">{error}</div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              className="flex-1 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              onClick={back}
            >
              Back to Products
            </button>
            <button
              type="button"
              className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 font-medium shadow-sm"
              onClick={handleSubmit}
            >
              Submit Quote Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
