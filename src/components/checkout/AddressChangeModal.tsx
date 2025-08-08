import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Loader2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { CompactAddressSelector } from '@/components/profile/CompactAddressSelector';
import { useAuth } from '@/contexts/AuthContext';

interface AddressChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAddress: Tables<'delivery_addresses'> | null;
  onAddressChange: (address: Tables<'delivery_addresses'>) => void;
}

export function AddressChangeModal({
  isOpen,
  onClose,
  selectedAddress,
  onAddressChange,
}: AddressChangeModalProps) {
  const { user } = useAuth();
  
  const handleAddressSelect = (address: Tables<'delivery_addresses'>) => {
    onAddressChange(address);
    onClose(); // Close modal after selection
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              Authentication Required
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="text-center py-6 border-2 border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-yellow-600 text-sm">Please log in to manage addresses</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            Choose Delivery Address
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <React.Suspense 
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <span className="ml-2">Loading addresses...</span>
              </div>
            }
          >
            <CompactAddressSelector
              selectedAddressId={selectedAddress?.id || undefined}
              onSelectAddress={handleAddressSelect}
              showAddButton={true}
              autoSelectDefault={false}
              className="space-y-3"
            />
          </React.Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}