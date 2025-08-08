/**
 * CompactAddressDisplay - Multiline address display for checkout
 * 
 * Features:
 * - Amazon/Shopify-style multiline format (no truncation)
 * - Clear hierarchy: Name, Street, City/State/Zip, Country
 * - Modal-based address selection
 * - Space-efficient but complete address visibility
 */

import React, { useState } from 'react';
import { MapPin, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressChangeModal } from '@/components/checkout/AddressChangeModal';
import { Tables } from '@/integrations/supabase/types';

interface CompactAddressDisplayProps {
  selectedAddress: Tables<'delivery_addresses'> | null;
  onAddressChange: (address: Tables<'delivery_addresses'>) => void;
  isLoading?: boolean;
}

export function CompactAddressDisplay({ 
  selectedAddress, 
  onAddressChange, 
  isLoading = false 
}: CompactAddressDisplayProps) {
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!selectedAddress) {
    return (
      <div className="flex items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
        <div className="text-center">
          <MapPin className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">No delivery address selected</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsChangeModalOpen(true)}
          >
            Select Address
          </Button>
        </div>
      </div>
    );
  }

  // Format address as multiline for clear readability
  const formatMultilineAddress = (address: Tables<'delivery_addresses'>) => {
    // Street address line (combine address_line1 and address_line2)
    const streetAddress = [
      address.address_line1,
      address.address_line2
    ].filter(Boolean).join(', ');
    
    // City, state, postal code line
    const cityStateZip = [
      address.city,
      address.state_province_region,
      address.postal_code
    ].filter(Boolean).join(', ');
    
    return {
      name: address.recipient_name,
      street: streetAddress,
      cityStateZip,
      country: address.destination_country,
      phone: address.phone
    };
  };

  const addressLines = formatMultilineAddress(selectedAddress);

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      selectedAddress.is_default 
        ? 'border-green-300 bg-green-50' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      {/* Name and Edit Button Row */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">
          {addressLines.name}
        </h4>
        
        {/* Change Button - Pencil Icon Only */}
        <Button 
          variant="outline" 
          size="sm" 
          className="px-2 py-1 h-auto"
          onClick={() => setIsChangeModalOpen(true)}
          title="Change address"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Address Lines */}
      <div className="text-sm text-gray-700 space-y-1">
        <p>{addressLines.street}</p>
        <p>{addressLines.cityStateZip}</p>
        <p className="font-medium">{addressLines.country}</p>
        {addressLines.phone && (
          <p className="text-xs text-gray-500 mt-2">
            Phone: {addressLines.phone}
          </p>
        )}
      </div>

      {/* Address Change Modal */}
      <AddressChangeModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        selectedAddress={selectedAddress}
        onAddressChange={(address) => {
          onAddressChange(address);
          setIsChangeModalOpen(false);
        }}
      />
    </div>
  );
}