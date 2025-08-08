/**
 * Shipping Address Section for Checkout
 * 
 * Follows Amazon/Shopify pattern:
 * - Shows single selected address prominently
 * - "Change" button opens modal to select other addresses
 * - Clean, focused UX that doesn't overwhelm users
 */

import React, { useState } from 'react';
import { MapPin, Edit2, Plus, Check, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tables } from '@/integrations/supabase/types';
import { useAllCountries } from '@/hooks/useAllCountries';

interface ShippingAddressSectionProps {
  selectedAddress: Tables<'delivery_addresses'> | null;
  addresses: Tables<'delivery_addresses'>[];
  onAddressChange: (address: Tables<'delivery_addresses'>) => void;
  onAddNewAddress: () => void;
  loading?: boolean;
}

export function ShippingAddressSection({
  selectedAddress,
  addresses,
  onAddressChange,
  onAddNewAddress,
  loading = false
}: ShippingAddressSectionProps) {
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const { data: countries } = useAllCountries();

  const handleAddressSelect = (addressId: string) => {
    const address = addresses.find(a => a.id === addressId);
    if (address) {
      onAddressChange(address);
      setChangeModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!selectedAddress) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
        <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 mb-3">No shipping address selected</p>
        <Button onClick={onAddNewAddress} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Selected Address Display */}
      <Card className={`transition-all ${
        selectedAddress.is_default 
          ? 'border-green-300 bg-green-50 shadow-sm' 
          : 'border-gray-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                selectedAddress.is_default 
                  ? 'bg-green-100' 
                  : 'bg-blue-100'
              }`}>
                <Check className={`w-4 h-4 ${
                  selectedAddress.is_default 
                    ? 'text-green-600' 
                    : 'text-blue-600'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${
                    selectedAddress.is_default 
                      ? 'text-green-900' 
                      : 'text-gray-900'
                  }`}>
                    {selectedAddress.recipient_name}
                  </h4>
                  {selectedAddress.is_default && (
                    <Badge className="bg-green-100 text-green-800 border-green-300 text-xs font-medium">
                      <Check className="w-3 h-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>{selectedAddress.address_line1}</p>
                  {selectedAddress.address_line2 && (
                    <p>{selectedAddress.address_line2}</p>
                  )}
                  <p>
                    {selectedAddress.city}, {selectedAddress.state_province_region} {selectedAddress.postal_code}
                  </p>
                  <p>{countries?.find(c => c.code === selectedAddress.destination_country)?.name || selectedAddress.destination_country}</p>
                  
                  {selectedAddress.phone && (
                    <p className="flex items-center gap-1 text-gray-500">
                      <Phone className="w-3 h-3" />
                      {selectedAddress.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Change Address Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-shrink-0 ml-3"
              onClick={() => setChangeModalOpen(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Change
            </Button>

            <StandardModal
              isOpen={changeModalOpen}
              onClose={() => setChangeModalOpen(false)}
              title="Choose shipping address"
              config={{
                size: 'md',
                variant: 'default'
              }}
            >
              <div className="space-y-4">
                  <RadioGroup
                    value={selectedAddress.id}
                    onValueChange={handleAddressSelect}
                  >
                    {addresses.map((address, index) => (
                      <div key={address.id} className="space-y-3">
                        <div 
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedAddress.id === address.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleAddressSelect(address.id)}
                        >
                          <Label className="flex items-start gap-3 cursor-pointer">
                            <RadioGroupItem 
                              value={address.id} 
                              className="mt-1"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {address.recipient_name}
                                </span>
                                {address.is_default && (
                                  <Badge variant="secondary" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-600">
                                <p>{address.address_line1}</p>
                                {address.address_line2 && <p>{address.address_line2}</p>}
                                <p>{address.city}, {address.state_province_region} {address.postal_code}</p>
                                <p>{countries?.find(c => c.code === address.destination_country)?.name || address.destination_country}</p>
                                {address.phone && (
                                  <p className="flex items-center gap-1 mt-1">
                                    <Phone className="w-3 h-3" />
                                    {address.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Label>
                        </div>
                        
                        {index < addresses.length - 1 && <Separator />}
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {/* Add New Address Option */}
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setChangeModalOpen(false);
                        onAddNewAddress();
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add new address
                    </Button>
                  </div>
                </div>
              </div>
            </StandardModal>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick add address link for empty state */}
      {addresses.length === 1 && (
        <Button 
          variant="link" 
          size="sm" 
          onClick={onAddNewAddress}
          className="mt-2 p-0 h-auto text-sm text-blue-600"
        >
          + Add another address
        </Button>
      )}
    </div>
  );
}