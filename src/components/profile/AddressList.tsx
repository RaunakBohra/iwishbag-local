import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressForm } from './AddressForm';
import { Tables } from '@/integrations/supabase/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const AddressCard = ({ address, onEdit, onDelete }: { address: Tables<'user_addresses'>, onEdit: () => void, onDelete: () => void }) => (
    <div className="border p-4 rounded-lg">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <p className="font-semibold text-lg">{address.recipient_name}</p>
                <p className="font-medium">{address.address_line1}</p>
                {address.address_line2 && <p className="text-sm text-muted-foreground">{address.address_line2}</p>}
                <p className="text-sm text-muted-foreground">{address.city}, {address.state_province_region} {address.postal_code}</p>
                <p className="text-sm text-muted-foreground">{address.country}</p>
                {address.phone && <p className="text-sm text-muted-foreground">📞 {address.phone}</p>}
            </div>
             <div className="flex items-center gap-2">
                {address.is_default && <Badge>Default</Badge>}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
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
    const [selectedAddress, setSelectedAddress] = useState<Tables<'user_addresses'> | undefined>(undefined);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

    const { data: addresses, isLoading } = useQuery({
        queryKey: ['user_addresses', user?.id],
        queryFn: async () => {
          if (!user) return [];
          const { data, error } = await supabase
            .from('user_addresses')
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
            const { error } = await supabase.from('user_addresses').delete().eq('id', addressId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
            toast({ title: 'Address deleted' });
            setSelectedAddress(undefined);
        },
        onError: (error) => {
            toast({ title: 'Error deleting address', description: error.message, variant: 'destructive' });
        }
    });

    const handleAdd = () => {
        setSelectedAddress(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (address: Tables<'user_addresses'>) => {
        setSelectedAddress(address);
        setDialogOpen(true);
    };

    const handleDelete = (address: Tables<'user_addresses'>) => {
        setSelectedAddress(address);
        setDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (selectedAddress) {
            deleteMutation.mutate(selectedAddress.id);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Shipping Addresses</CardTitle>
                    <CardDescription>Manage your saved shipping addresses.</CardDescription>
                </div>
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Address
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                {addresses && addresses.length > 0 ? (
                    addresses.map(address => (
                        <AddressCard key={address.id} address={address} onEdit={() => handleEdit(address)} onDelete={() => handleDelete(address)} />
                    ))
                ) : (
                    !isLoading && <p className="text-sm text-muted-foreground text-center py-4">You have no saved addresses.</p>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                    </DialogHeader>
                    <AddressForm address={selectedAddress} onSuccess={() => setDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your address.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
