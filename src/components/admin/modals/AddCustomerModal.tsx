// ============================================================================
// ADD CUSTOMER MODAL - Professional Customer Creation Interface
// Features: Complete customer profile creation with validation
// ============================================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, CreditCard, FileText } from 'lucide-react';

const addCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  codEnabled: z.boolean().default(true),
  internalNotes: z.string().optional(),
  // Address fields (optional)
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

type AddCustomerFormData = z.infer<typeof addCustomerSchema>;

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddCustomerFormData>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      codEnabled: true,
    },
  });

  const codEnabled = watch('codEnabled');

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (data: AddCustomerFormData) => {
      setIsSubmitting(true);

      // First, create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
        },
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          cod_enabled: data.codEnabled,
          internal_notes: data.internalNotes || null,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Add address
      const { error: addressError } = await supabase.from('delivery_addresses').insert({
        user_id: userId,
        address_line1: data.addressLine1,
        address_line2: data.addressLine2 || null,
        city: data.city,
        country: data.country,
        postal_code: data.postalCode,
        is_default: true,
      });

      if (addressError) throw addressError;

      return { userId, email: data.email, fullName: data.fullName };
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: 'Customer Added Successfully',
        description: `${data.fullName} (${data.email}) has been added to your customer base.`,
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: 'Failed to Add Customer',
        description: error.message || 'An error occurred while creating the customer.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AddCustomerFormData) => {
    addCustomerMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <span>Add New Customer</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <User className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" placeholder="John Doe" {...register('fullName')} />
                {errors.fullName && (
                  <p className="text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="pl-10"
                  {...register('phone')}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <MapPin className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Address Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Street Address *</Label>
              <Input
                id="addressLine1"
                placeholder="123 Main Street"
                {...register('addressLine1')}
              />
              {errors.addressLine1 && (
                <p className="text-sm text-red-600">{errors.addressLine1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Apartment, Suite, etc.</Label>
              <Input
                id="addressLine2"
                placeholder="Apt 4B (optional)"
                {...register('addressLine2')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="New York" {...register('city')} />
                {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input id="country" placeholder="United States" {...register('country')} />
                {errors.country && <p className="text-sm text-red-600">{errors.country.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input id="postalCode" placeholder="10001" {...register('postalCode')} />
                {errors.postalCode && (
                  <p className="text-sm text-red-600">{errors.postalCode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <CreditCard className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Account Settings</h3>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Cash on Delivery (COD)</Label>
                <p className="text-xs text-gray-600">
                  Allow this customer to use COD payment method
                </p>
              </div>
              <Switch
                checked={codEnabled}
                onCheckedChange={(checked) => setValue('codEnabled', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="internalNotes"
                  placeholder="VIP customer, prefers express shipping, etc."
                  className="pl-10 min-h-[80px]"
                  {...register('internalNotes')}
                />
              </div>
              <p className="text-xs text-gray-500">
                Internal notes are only visible to admin users
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? 'Creating Customer...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
