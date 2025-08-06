import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Edit3, CheckCircle, Phone, User } from 'lucide-react';

interface Address {
  id: string;
  recipient_name?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
}

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
  save_to_profile?: boolean;
}

interface CheckoutAddressManagementProps {
  // For logged-in users
  addresses?: Address[];
  selectedAddress: string;
  onSelectedAddressChange: (addressId: string) => void;
  onShowAddressModal: () => void;
  
  // For guest checkout
  isGuestCheckout: boolean;
  addressFormData: AddressFormData;
  onAddressFormDataChange: (data: AddressFormData) => void;
  
  // Countries data
  countries?: Array<{ code: string; name: string }>;
}

export const CheckoutAddressManagement: React.FC<CheckoutAddressManagementProps> = ({
  addresses,
  selectedAddress,
  onSelectedAddressChange,
  onShowAddressModal,
  isGuestCheckout,
  addressFormData,
  onAddressFormDataChange,
  countries
}) => {
  const formatAddressDisplay = (address: Address | AddressFormData) => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state_province_region,
      address.postal_code
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  if (isGuestCheckout) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
            <MapPin className="h-4 w-4 text-gray-600" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recipient Name */}
            <div className="space-y-2">
              <Label htmlFor="recipient-name" className="text-sm font-medium text-gray-700">
                Recipient Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="recipient-name"
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  value={addressFormData.recipient_name || ''}
                  onChange={(e) => onAddressFormDataChange({ 
                    ...addressFormData, 
                    recipient_name: e.target.value 
                  })}
                  placeholder="Full name"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  value={addressFormData.phone || ''}
                  onChange={(e) => onAddressFormDataChange({ 
                    ...addressFormData, 
                    phone: e.target.value 
                  })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
            </div>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="address-line-1" className="text-sm font-medium text-gray-700">
              Street Address
            </Label>
            <input
              id="address-line-1"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              value={addressFormData.address_line1}
              onChange={(e) => onAddressFormDataChange({ 
                ...addressFormData, 
                address_line1: e.target.value 
              })}
              placeholder="123 Main Street"
              required
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="address-line-2" className="text-sm font-medium text-gray-700">
              Apartment, Suite, etc. (Optional)
            </Label>
            <input
              id="address-line-2"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              value={addressFormData.address_line2 || ''}
              onChange={(e) => onAddressFormDataChange({ 
                ...addressFormData, 
                address_line2: e.target.value 
              })}
              placeholder="Apt 4B"
            />
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                City
              </Label>
              <input
                id="city"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                value={addressFormData.city}
                onChange={(e) => onAddressFormDataChange({ 
                  ...addressFormData, 
                  city: e.target.value 
                })}
                placeholder="New York"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                State/Province
              </Label>
              <input
                id="state"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                value={addressFormData.state_province_region}
                onChange={(e) => onAddressFormDataChange({ 
                  ...addressFormData, 
                  state_province_region: e.target.value 
                })}
                placeholder="NY"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal-code" className="text-sm font-medium text-gray-700">
                Postal Code
              </Label>
              <input
                id="postal-code"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                value={addressFormData.postal_code}
                onChange={(e) => onAddressFormDataChange({ 
                  ...addressFormData, 
                  postal_code: e.target.value 
                })}
                placeholder="10001"
                required
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium text-gray-700">
              Country
            </Label>
            <select
              id="country"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              value={addressFormData.country}
              onChange={(e) => onAddressFormDataChange({ 
                ...addressFormData, 
                country: e.target.value 
              })}
              required
            >
              <option value="">Select Country</option>
              {countries?.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Logged-in user address selection
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
          <MapPin className="h-4 w-4 text-gray-600" />
          Shipping Address
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onShowAddressModal}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add New
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses && addresses.length > 0 ? (
          <RadioGroup value={selectedAddress} onValueChange={onSelectedAddressChange}>
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={address.id}
                    id={`address-${address.id}`}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={`address-${address.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="p-3 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {address.recipient_name && (
                              <span className="font-medium text-sm text-gray-900">
                                {address.recipient_name}
                              </span>
                            )}
                            {address.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {formatAddressDisplay(address)}
                          </p>
                          {address.phone && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {address.phone}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            onShowAddressModal();
                          }}
                          className="ml-2 h-8 w-8 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        ) : (
          <div className="text-center py-6">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No addresses saved</h3>
            <p className="text-xs text-gray-500 mb-4">Add a shipping address to continue</p>
            <Button onClick={onShowAddressModal} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Shipping Address
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};