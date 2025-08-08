/**
 * CompactAddressDisplay - Single-line address display for checkout
 * 
 * Features:
 * - Amazon/Shopify-style single-line format
 * - "Name - Address, City, Country [Change]" pattern
 * - Modal-based address selection
 * - Space-efficient design
 */

import React, { useState } from 'react';
import { MapPin, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // Format address as single line: "Name - Address, City, Country"
  const formatCompactAddress = (address: Tables<'delivery_addresses'>) => {
    const parts = [
      address.recipient_name,
      '-',
      address.address_line1,
      address.address_line2 && `, ${address.address_line2}`,
      `, ${address.city}`,
      `, ${address.state_province_region || ''}`,
      ` ${address.postal_code || ''}`,
      `, ${address.destination_country}`
    ].filter(Boolean);
    
    return parts.join('').replace(/,\s*,/g, ','); // Clean up double commas
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
      selectedAddress.is_default 
        ? 'border-green-300 bg-green-50' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
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
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 truncate">
              {formatCompactAddress(selectedAddress)}
            </span>
            {selectedAddress.is_default && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">
                <Check className="w-3 h-3 mr-1" />
                Primary
              </Badge>
            )}
          </div>
          
          {selectedAddress.phone && (
            <p className="text-xs text-gray-500">
              Phone: {selectedAddress.phone}
            </p>
          )}
        </div>
      </div>

      {/* Change Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-shrink-0 ml-3"
        onClick={() => setIsChangeModalOpen(true)}
      >
        <Edit2 className="w-4 h-4 mr-2" />
        Change
      </Button>

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