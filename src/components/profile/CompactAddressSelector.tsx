import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MapPin, CheckCircle, Edit, Phone } from 'lucide-react';
import { AddressForm } from './AddressForm';
import { Tables } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CompactAddressSelectorProps {
  selectedAddressId?: string;
  onSelectAddress: (address: Tables<'delivery_addresses'>) => void;
  showAddButton?: boolean;
  className?: string;
  autoSelectDefault?: boolean;
}

export function CompactAddressSelector({
  selectedAddressId,
  onSelectAddress,
  showAddButton = true,
  className = '',
  autoSelectDefault = true,
}: CompactAddressSelectorProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Tables<'delivery_addresses'> | undefined>(undefined);

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
    setEditingAddress(undefined);
    if (newAddress) {
      onSelectAddress(newAddress);
    }
  };

  const handleEditAddress = (address: Tables<'delivery_addresses'>) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  // Auto-select default address if no address is selected and autoSelectDefault is true
  useEffect(() => {
    if (autoSelectDefault && !selectedAddressId && addresses && addresses.length > 0) {
      // Find default address or use the first one
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      onSelectAddress(defaultAddress);
    }
  }, [addresses, selectedAddressId, autoSelectDefault, onSelectAddress]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-gray-600 mb-3 text-sm">No saved addresses yet</p>
        {showAddButton && (
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            size="sm"
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
        className="space-y-2"
      >
        {addresses.map((address) => (
          <div
            key={address.id}
            className={`border rounded-lg p-3 transition-colors ${
              selectedAddressId === address.id
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Label
              htmlFor={address.id}
              className="flex items-start justify-between cursor-pointer"
            >
              <div className="flex items-start space-x-3 flex-1">
                <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  {/* Header row with name and badges */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {address.recipient_name}
                    </span>
                    {address.is_default && (
                      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  
                  {/* Compact address in single line */}
                  <div className="text-xs text-gray-600 truncate">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {address.city}, {address.state_province_region} {address.postal_code}
                  </div>
                  
                  {/* Phone on separate line if exists */}
                  {address.phone && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="h-2.5 w-2.5" />
                      {address.phone}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Edit button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditAddress(address);
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {showAddButton && (
        <Button
          onClick={() => {
            setEditingAddress(undefined);
            setDialogOpen(true);
          }}
          variant="outline"
          size="sm"
          className="w-full mt-3 border-gray-300 text-sm h-8"
        >
          <Plus className="mr-2 h-3 w-3" />
          Add New Address
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <AddressForm 
            address={editingAddress} 
            onSuccess={handleAddressAdded} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}