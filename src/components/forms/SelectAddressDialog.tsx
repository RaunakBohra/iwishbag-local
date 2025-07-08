import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, User, Phone, Check } from 'lucide-react';
import { ShippingAddress } from '@/types/address';
import { Tables } from '@/integrations/supabase/types';

interface SelectAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: ShippingAddress) => void;
  onAddNewAddress: () => void;
  shippingCountry: string;
  countryName?: string;
}

export const SelectAddressDialog: React.FC<SelectAddressDialogProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  onAddNewAddress,
  shippingCountry,
  countryName,
}) => {
  const { user } = useAuth();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Fetch user's addresses filtered by shipping country
  const { data: addresses, isLoading } = useQuery({
    queryKey: ['user-addresses', user?.id, shippingCountry],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('country_code', shippingCountry)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Tables<'user_addresses'>[];
    },
    enabled: isOpen && !!user?.id,
  });

  // Auto-select logic
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      // If only one address, select it
      if (addresses.length === 1) {
        setSelectedAddressId(addresses[0].id);
      } else {
        // Otherwise, select the default one or the first one
        const defaultAddress = addresses.find(addr => addr.is_default);
        setSelectedAddressId(defaultAddress ? defaultAddress.id : addresses[0].id);
      }
    }
  }, [addresses, selectedAddressId]);

  const handleUseAddress = () => {
    const selected = addresses?.find(addr => addr.id === selectedAddressId);
    if (selected) {
      // Convert to ShippingAddress format
      const shippingAddress: ShippingAddress = {
        fullName: selected.recipient_name,
        streetAddress: selected.address_line1,
        addressLine2: selected.address_line2 || undefined,
        city: selected.city,
        state: selected.state_province_region,
        postalCode: selected.postal_code,
        country: selected.country_code,
        phone: selected.phone || undefined,
      };
      onSelectAddress(shippingAddress);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Shipping Address</DialogTitle>
          <DialogDescription>
            Choose a shipping address for delivery to {countryName || shippingCountry}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : addresses && addresses.length > 0 ? (
            <>
              <RadioGroup value={selectedAddressId || ''} onValueChange={setSelectedAddressId}>
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <Card 
                      key={address.id} 
                      className={`p-4 cursor-pointer transition-all ${
                        selectedAddressId === address.id 
                          ? 'border-primary shadow-md' 
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                        <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold">{address.recipient_name}</span>
                              </div>
                              {address.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-600 mt-0.5" />
                              <div className="text-sm text-gray-700">
                                <p>{address.address_line1}</p>
                                {address.address_line2 && <p>{address.address_line2}</p>}
                                <p>{address.city}, {address.state_province_region} {address.postal_code}</p>
                              </div>
                            </div>
                            {address.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-600" />
                                <span className="text-sm text-gray-700">{address.phone}</span>
                              </div>
                            )}
                          </div>
                        </Label>
                      </div>
                    </Card>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={onAddNewAddress}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Address
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleUseAddress} disabled={!selectedAddressId}>
                    <Check className="mr-2 h-4 w-4" />
                    Use This Address
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No addresses found for {countryName || shippingCountry}
              </h3>
              <p className="text-gray-500 mb-4">
                You don't have any saved addresses for this country. Please add a new address.
              </p>
              <Button onClick={onAddNewAddress}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Address
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};