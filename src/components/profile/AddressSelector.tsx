import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Plus, MapPin, CheckCircle } from 'lucide-react';
import { AddressForm } from './AddressForm';
import { Tables } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface AddressSelectorProps {
  selectedAddressId?: string;
  onSelectAddress: (address: Tables<'delivery_addresses'>) => void;
  showAddButton?: boolean;
  className?: string;
}

export function AddressSelector({
  selectedAddressId,
  onSelectAddress,
  showAddButton = true,
  className = '',
}: AddressSelectorProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['delivery_addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const handleAddressAdded = (newAddress?: Tables<'delivery_addresses'>) => {
    setDialogOpen(false);
    if (newAddress) {
      onSelectAddress(newAddress);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-gray-600 mb-4">No saved addresses yet</p>
        {showAddButton && (
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="border-gray-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
            </DialogHeader>
            <AddressForm onSuccess={handleAddressAdded} />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={className}>
      <RadioGroup
        value={selectedAddressId}
        onValueChange={(value) => {
          const address = addresses.find((a) => a.id === value);
          if (address) onSelectAddress(address);
        }}
        className="space-y-3"
      >
        {addresses.map((address) => (
          <Card
            key={address.id}
            className={`p-4 cursor-pointer transition-colors ${
              selectedAddressId === address.id
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Label
              htmlFor={address.id}
              className="flex items-start space-x-3 cursor-pointer"
            >
              <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {address.recipient_name}
                  </span>
                  {address.is_default && (
                    <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p>
                    {address.city}, {address.state_province_region} {address.postal_code}
                  </p>
                  <p>{address.destination_country}</p>
                  {address.phone && (
                    <p className="text-gray-500">Phone: {address.phone}</p>
                  )}
                </div>
              </div>
            </Label>
          </Card>
        ))}
      </RadioGroup>

      {showAddButton && (
        <Button
          onClick={() => setDialogOpen(true)}
          variant="outline"
          className="w-full mt-4 border-gray-300"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Address
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <AddressForm onSuccess={handleAddressAdded} />
        </DialogContent>
      </Dialog>
    </div>
  );
}