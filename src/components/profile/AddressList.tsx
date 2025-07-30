import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MoreVertical, MapPin, Phone, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressFormCompact } from './AddressFormCompact';
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
}: {
  address: Tables<'delivery_addresses'>;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="border border-gray-200 p-6 rounded-lg hover:border-gray-300 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-teal-600" />
          </div>
          <div className="flex items-center gap-2">
            <Body className="font-semibold text-gray-900">{address.recipient_name}</Body>
            {address.is_default && (
              <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-1 ml-10">
          <BodySmall className="text-gray-700 font-medium">{address.address_line1}</BodySmall>
          {address.address_line2 && (
            <BodySmall className="text-gray-600">{address.address_line2}</BodySmall>
          )}
          <BodySmall className="text-gray-600">
            {address.city}, {address.state_province_region} {address.postal_code}
          </BodySmall>
          <BodySmall className="text-gray-600">{address.destination_country}</BodySmall>
          {address.phone && (
            <BodySmall className="text-gray-600 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {address.phone}
            </BodySmall>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
            <DropdownMenuItem onSelect={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
);

export function AddressList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
        <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Address
        </Button>
      </div>

      {/* Address List */}
      <div className="space-y-4">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        {addresses && addresses.length > 0
          ? addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => handleEdit(address)}
                onDelete={() => handleDelete(address)}
              />
            ))
          : !isLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-gray-400" />
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
            )}
      </div>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {selectedAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <AddressFormCompact address={selectedAddress} onSuccess={() => setDialogOpen(false)} />
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
