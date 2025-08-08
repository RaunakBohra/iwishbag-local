import React, { useState } from 'react';
import { MapPin, Phone, Edit2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/integrations/supabase/types';
import { AddressChangeModal } from './AddressChangeModal';
import { useAllCountries } from '@/hooks/useAllCountries';

interface CheckoutAddressDisplayProps {
  selectedAddress: Tables<'delivery_addresses'> | null;
  onAddressChange: (address: Tables<'delivery_addresses'>) => void;
  isLoading?: boolean;
  className?: string;
}

export function CheckoutAddressDisplay({
  selectedAddress,
  onAddressChange,
  isLoading = false,
  className = '',
}: CheckoutAddressDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: countries } = useAllCountries();

  const handleAddressSelect = (address: Tables<'delivery_addresses'>) => {
    onAddressChange(address);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!selectedAddress) {
    return (
      <Card className={`border-dashed border-2 border-gray-200 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <MapPin className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No delivery address</h3>
          <p className="text-sm text-gray-500 mb-4">Please add an address to continue</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Add Address
          </Button>
          
          <AddressChangeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAddressSelect={handleAddressSelect}
            selectedAddressId={null}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center mt-0.5">
                <MapPin className="h-4 w-4 text-teal-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Header with name and default badge */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {selectedAddress.recipient_name}
                  </h3>
                  {selectedAddress.is_default && (
                    <Badge 
                      variant="secondary"
                      className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5"
                    >
                      <CheckCircle className="h-2.5 w-2.5 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
                
                {/* Address lines */}
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    {selectedAddress.address_line1}
                    {selectedAddress.address_line2 && (
                      <div>{selectedAddress.address_line2}</div>
                    )}
                  </div>
                  <div>
                    {selectedAddress.city}, {selectedAddress.state_province_region} {selectedAddress.postal_code}
                  </div>
                  <div>
                    {countries?.find(c => c.code === selectedAddress.destination_country)?.name || selectedAddress.destination_country}
                  </div>
                </div>
                
                {/* Phone number if available */}
                {selectedAddress.phone && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                    <Phone className="h-3 w-3" />
                    {selectedAddress.phone}
                  </div>
                )}
              </div>
            </div>
            
            {/* Change button */}
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              size="sm"
              className="ml-3 text-sm px-3 py-1.5 h-auto"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <AddressChangeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddressSelect={handleAddressSelect}
        selectedAddressId={selectedAddress.id}
      />
    </div>
  );
}