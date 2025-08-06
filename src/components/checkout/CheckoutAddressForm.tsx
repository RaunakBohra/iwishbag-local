import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Plus, Edit3, User, Phone, Globe, Check } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useAllCountries } from '@/hooks/useAllCountries';
import { isAddressComplete } from '@/lib/addressUtils';

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  destination_country?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

interface ContactFormData {
  email: string;
  phone: string;
}

interface CheckoutAddressFormProps {
  addressFormData: AddressFormData;
  setAddressFormData: (data: AddressFormData) => void;
  guestContact: ContactFormData;
  setGuestContact: (data: ContactFormData) => void;
  isGuestCheckout: boolean;
  shippingCountry: string;
  savedAddresses: Tables<'delivery_addresses'>[];
  onCreateNewAddress: () => void;
  onEditAddress?: (address: Tables<'delivery_addresses'>) => void;
  loading?: boolean;
}

export const CheckoutAddressForm: React.FC<CheckoutAddressFormProps> = ({
  addressFormData,
  setAddressFormData,
  guestContact,
  setGuestContact,
  isGuestCheckout,
  shippingCountry,
  savedAddresses,
  onCreateNewAddress,
  onEditAddress,
  loading = false
}) => {
  const { countries } = useAllCountries();
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('');

  const handleAddressFieldChange = (field: keyof AddressFormData, value: string | boolean) => {
    setAddressFormData({
      ...addressFormData,
      [field]: value,
    });
  };

  const handleContactFieldChange = (field: keyof ContactFormData, value: string) => {
    setGuestContact({
      ...guestContact,
      [field]: value,
    });
  };

  const handleSavedAddressSelect = (addressId: string) => {
    setSelectedSavedAddress(addressId);
    
    if (addressId === 'new') {
      // Reset form for new address
      setAddressFormData({
        address_line1: '',
        address_line2: '',
        city: '',
        state_province_region: '',
        postal_code: '',
        country: shippingCountry || '',
        recipient_name: addressFormData.recipient_name || '',
        phone: addressFormData.phone || '',
        is_default: false,
      });
    } else {
      // Load selected saved address
      const address = savedAddresses.find(addr => addr.id === addressId);
      if (address) {
        setAddressFormData({
          address_line1: address.address_line1 || '',
          address_line2: address.address_line2 || '',
          city: address.city || '',
          state_province_region: address.state_province_region || '',
          postal_code: address.postal_code || '',
          country: address.country || shippingCountry || '',
          recipient_name: address.recipient_name || '',
          phone: address.phone || '',
          is_default: address.is_default || false,
        });
      }
    }
  };

  const isAddressValid = isAddressComplete(addressFormData);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Guest Contact Information */}
      {isGuestCheckout && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Contact Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="guest-email">Email Address *</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestContact.email}
                onChange={(e) => handleContactFieldChange('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                We'll use this to send order updates
              </p>
            </div>

            <div>
              <Label htmlFor="guest-phone">Phone Number</Label>
              <Input
                id="guest-phone"
                type="tel"
                value={guestContact.phone}
                onChange={(e) => handleContactFieldChange('phone', e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Shipping Address</span>
            </div>
            {isAddressValid && (
              <Check className="h-5 w-5 text-green-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saved Addresses Selection (for authenticated users) */}
          {!isGuestCheckout && savedAddresses.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Choose Address</Label>
              <RadioGroup
                value={selectedSavedAddress}
                onValueChange={handleSavedAddressSelect}
                className="mt-2 space-y-2"
              >
                {savedAddresses.map((address) => (
                  <div key={address.id} className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value={address.id} id={address.id} />
                    <div className="flex-1 ml-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{address.recipient_name}</p>
                          <p className="text-sm text-gray-600">
                            {address.address_line1}, {address.city}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.state_province_region}, {address.postal_code}
                          </p>
                          <p className="text-sm text-gray-600">{address.country}</p>
                          {address.phone && (
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />
                              {address.phone}
                            </p>
                          )}
                        </div>
                        {onEditAddress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditAddress(address)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center space-x-2 border rounded-lg p-3 border-dashed">
                  <RadioGroupItem value="new" id="new-address" />
                  <div className="flex items-center space-x-2 ml-3">
                    <Plus className="h-4 w-4" />
                    <span>Add new address</span>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Address Form */}
          {(isGuestCheckout || selectedSavedAddress === 'new' || savedAddresses.length === 0) && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient-name">Full Name *</Label>
                <Input
                  id="recipient-name"
                  value={addressFormData.recipient_name || ''}
                  onChange={(e) => handleAddressFieldChange('recipient_name', e.target.value)}
                  placeholder="Recipient full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={addressFormData.phone || ''}
                  onChange={(e) => handleAddressFieldChange('phone', e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <Label htmlFor="address-line1">Address Line 1 *</Label>
                <Input
                  id="address-line1"
                  value={addressFormData.address_line1}
                  onChange={(e) => handleAddressFieldChange('address_line1', e.target.value)}
                  placeholder="Street address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address-line2">Address Line 2</Label>
                <Input
                  id="address-line2"
                  value={addressFormData.address_line2 || ''}
                  onChange={(e) => handleAddressFieldChange('address_line2', e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={addressFormData.city}
                    onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    value={addressFormData.state_province_region}
                    onChange={(e) => handleAddressFieldChange('state_province_region', e.target.value)}
                    placeholder="State or Province"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal-code">Postal Code *</Label>
                  <Input
                    id="postal-code"
                    value={addressFormData.postal_code}
                    onChange={(e) => handleAddressFieldChange('postal_code', e.target.value)}
                    placeholder="12345"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country *</Label>
                  <select
                    id="country"
                    value={addressFormData.country}
                    onChange={(e) => handleAddressFieldChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.country_code} value={country.country_code}>
                        {country.country_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!isGuestCheckout && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="set-default"
                    checked={addressFormData.is_default}
                    onCheckedChange={(checked) => handleAddressFieldChange('is_default', checked === true)}
                  />
                  <Label htmlFor="set-default" className="text-sm">
                    Set as default address
                  </Label>
                </div>
              )}

              {!isGuestCheckout && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={onCreateNewAddress}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Save Address
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Address Status */}
          <div className="flex items-center space-x-2 text-sm">
            <Globe className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">
              Shipping to: {addressFormData.country || shippingCountry || 'Not selected'}
            </span>
            {isAddressValid && (
              <span className="text-green-600 font-medium">✓ Address complete</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};