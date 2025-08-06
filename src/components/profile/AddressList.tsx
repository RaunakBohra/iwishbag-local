import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAllCountries } from '@/hooks/useAllCountries';
import { StateProvinceService } from '@/services/StateProvinceService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MoreVertical, MapPin, Phone, CheckCircle, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressForm } from './AddressForm';
import { Tables } from '@/integrations/supabase/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Body, BodySmall } from '@/components/ui/typography';

const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  countries,
}: {
  address: Tables<'delivery_addresses'>;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: (address: Tables<'delivery_addresses'>) => void;
  countries?: Array<{ code: string; name: string }>;
}) => {
  
  const handleSetDefault = (addr: Tables<'delivery_addresses'>) => {
    onSetDefault(addr);
  };
  // Get country name from code
  const countryName = countries?.find(c => c.code === address.destination_country)?.name || address.destination_country;
  
  // Get state/province name from code
  const stateName = StateProvinceService.getStateName(address.destination_country, address.state_province_region) || address.state_province_region;
  
  // Check if this is a Nepal address
  const isNepal = address.destination_country === 'NP';
  
  return (
  <div className="border border-gray-200 p-6 rounded-lg hover:border-gray-300 transition-colors h-full flex flex-col w-full">
    {/* Header with name */}
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-teal-600"></div>
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Body className="font-semibold text-gray-900 truncate">{address.recipient_name}</Body>
        {address.is_default && (
          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs flex-shrink-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Default
          </Badge>
        )}
      </div>
    </div>

    {/* Address content - takes up remaining space */}
    <div className="flex-1 mb-4">
      <div className="space-y-1">
          {isNepal ? (
            <>
              {/* Nepal address format: Street → Ward → Municipality → District → Province */}
              {(() => {
                const addressParts = address.address_line1?.split(',') || [];
                const municipality = addressParts[0]?.trim();
                const streetAndRest = addressParts.slice(1);
                
                const cleanStreetParts = streetAndRest
                  .map(part => part.trim())
                  .filter((part, index, arr) => {
                    return part.length > 0 && arr.indexOf(part) === index;
                  });
                
                return (
                  <>
                    {/* Street/Area and Ward first */}
                    {cleanStreetParts.length > 0 && (
                      <BodySmall className="text-gray-700 font-medium">
                        {cleanStreetParts.join(', ')}
                      </BodySmall>
                    )}
                    
                    {/* Municipality second */}
                    {municipality && (
                      <BodySmall className="text-gray-600">
                        {municipality}
                      </BodySmall>
                    )}
                    
                    {/* Additional address line */}
                    {address.address_line2 && (
                      <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
                    )}
                    
                    {/* District and Province */}
                    <BodySmall className="text-gray-600">
                      {address.city} District, {stateName}
                    </BodySmall>
                    
                    {/* Country and Postal Code */}
                    <BodySmall className="text-gray-600">
                      {countryName} {address.postal_code && `- ${address.postal_code}`}
                    </BodySmall>
                  </>
                );
              })()}
            </>
          ) : address.destination_country === 'IN' ? (
            <>
              {/* India address format: Street → Area → City PIN → State → Country */}
              <BodySmall className="text-gray-700 font-medium">{address.address_line1}</BodySmall>
              {address.address_line2 && (
                <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
              )}
              <BodySmall className="text-gray-600">
                {address.city} {address.postal_code}
              </BodySmall>
              <BodySmall className="text-gray-600">{stateName}</BodySmall>
              <BodySmall className="text-gray-600">{countryName}</BodySmall>
            </>
          ) : (
            <>
              {/* International address format: Street → City, State PostalCode → Country */}
              <BodySmall className="text-gray-700 font-medium">{address.address_line1}</BodySmall>
              {address.address_line2 && (
                <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
              )}
              <BodySmall className="text-gray-600">
                {address.city}, {stateName} {address.postal_code}
              </BodySmall>
              <BodySmall className="text-gray-600">{countryName}</BodySmall>
            </>
          )}
          {address.phone && (
            <BodySmall className="text-gray-600 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {address.phone}
            </BodySmall>
          )}
      </div>
    </div>

    {/* Actions at bottom */}
    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        <Edit className="h-4 w-4 mr-1" />
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!address.is_default && (
            <DropdownMenuItem 
              onSelect={() => handleSetDefault(address)} 
              className="text-green-600 focus:text-green-600"
            >
              <Star className="mr-2 h-4 w-4" />
              <span>Set as Default</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onDelete} className="text-red-600 focus:text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
  );
};

export function AddressList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: countries } = useAllCountries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Tables<'delivery_addresses'> | undefined>(
    undefined,
  );
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase.from('delivery_addresses').delete().eq('id', addressId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses', user?.id] });
      toast({ title: 'Address deleted' });
      setSelectedAddress(undefined);
    },
    onError: (error) => {
      toast({
        title: 'Error deleting address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      // First, unset all default flags for this user
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      // Then set the selected address as default
      const { error } = await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses', user?.id] });
      toast({ 
        title: 'Default address updated',
        description: 'This address is now your default shipping address.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error setting default address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAdd = () => {
    setSelectedAddress(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (address: Tables<'delivery_addresses'>) => {
    setSelectedAddress(address);
    setDialogOpen(true);
  };

  const handleDelete = (address: Tables<'delivery_addresses'>) => {
    setSelectedAddress(address);
    setDeleteAlertOpen(true);
  };

  const handleSetDefault = (address: Tables<'delivery_addresses'>) => {
    setDefaultMutation.mutate(address.id);
  };

  const confirmDelete = () => {
    if (selectedAddress) {
      deleteMutation.mutate(selectedAddress.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BodySmall className="text-gray-600">
            {addresses?.length || 0} saved {addresses?.length === 1 ? 'address' : 'addresses'}
          </BodySmall>
        </div>
        {(!addresses || addresses.length < 10) && (
          <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        )}
        {addresses && addresses.length >= 10 && (
          <BodySmall className="text-gray-500">
            Maximum 10 addresses allowed
          </BodySmall>
        )}
      </div>

      {/* Address List */}
      <div>
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        )}
        {addresses && addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" style={{ gridAutoRows: '1fr' }}>
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => handleEdit(address)}
                onDelete={() => handleDelete(address)}
                onSetDefault={handleSetDefault}
                countries={countries}
              />
            ))}
          </div>
        ) : !isLoading ? (
          <div className="text-center py-12 col-span-full">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            </div>
            <Body className="text-gray-600 mb-2">No addresses saved yet</Body>
            <BodySmall className="text-gray-500 mb-4">
              Add your first shipping address to get started
            </BodySmall>
            <Button
              onClick={handleAdd}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Address
            </Button>
          </div>
        ) : null}
      </div>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {selectedAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <AddressForm address={selectedAddress} onSuccess={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900">
              Delete Address?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. This will permanently delete your address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
