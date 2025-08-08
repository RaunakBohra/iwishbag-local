import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { CompactAddressSelector } from '@/components/profile/CompactAddressSelector';

interface AddressChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (address: Tables<'delivery_addresses'>) => void;
  selectedAddressId?: string | null;
}

export function AddressChangeModal({
  isOpen,
  onClose,
  onAddressSelect,
  selectedAddressId,
}: AddressChangeModalProps) {
  const handleAddressSelect = (address: Tables<'delivery_addresses'>) => {
    onAddressSelect(address);
  };

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
          <CompactAddressSelector
            selectedAddressId={selectedAddressId || undefined}
            onSelectAddress={handleAddressSelect}
            showAddButton={true}
            autoSelectDefault={false}
            className="space-y-3"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}