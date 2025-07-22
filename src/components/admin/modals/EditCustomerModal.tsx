// ============================================================================
// EDIT CUSTOMER MODAL - Professional Customer Edit Interface
// Features: Edit customer information with form validation
// ============================================================================

import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Save, User, Mail, Phone, MapPin } from 'lucide-react';
import { Customer } from '../CustomerTable';

const editCustomerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  cod_enabled: z.boolean(),
  internal_notes: z.string().optional(),
});

type EditCustomerFormData = z.infer<typeof editCustomerSchema>;

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  open,
  onOpenChange,
  customer,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EditCustomerFormData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      full_name: customer.full_name || '',
      email: customer.email,
      phone: customer.phone || '',
      cod_enabled: customer.cod_enabled,
      internal_notes: customer.internal_notes || '',
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    reset({
      full_name: customer.full_name || '',
      email: customer.email,
      phone: customer.phone || '',
      cod_enabled: customer.cod_enabled,
      internal_notes: customer.internal_notes || '',
    });
  }, [customer, reset]);

  const codEnabled = watch('cod_enabled');

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: EditCustomerFormData) => {
      setIsSubmitting(true);
      
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          cod_enabled: data.cod_enabled,
          internal_notes: data.internal_notes || null,
        })
        .eq('id', customer.id);

      if (profileError) throw profileError;

      // If email changed, we need to update auth user (this requires admin privileges)
      if (data.email !== customer.email) {
        // Note: In a real app, you'd need to handle email updates carefully
        // as they require email verification. For now, we'll just update the profile
        console.log('Email change requested:', data.email);
        toast({
          title: 'Note',
          description: 'Email changes require additional verification. Contact system admin.',
          variant: 'destructive',
        });
      }

      return data;
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['customer-profile', customer.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      
      toast({
        title: 'Customer Updated',
        description: `${data.full_name}'s profile has been updated successfully.`,
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: 'Failed to Update Customer',
        description: error.message || 'An error occurred while updating the customer.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditCustomerFormData) => {
    updateCustomerMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Get primary address for display
  const primaryAddress = customer.user_addresses?.find(addr => addr.is_primary) || customer.user_addresses?.[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Edit className="h-4 w-4 text-blue-600" />
            </div>
            <span>Edit Customer</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Info Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Customer ID: {customer.id.slice(0, 8)}</p>
                <p className="text-sm text-gray-600">
                  Member since {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Full Name *</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Enter customer's full name"
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address *</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              {...register('email')}
              disabled // Email changes are complex, disable for now
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Email changes require additional verification. Contact system admin if needed.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Phone Number</span>
            </Label>
            <Input
              id="phone"
              placeholder="Enter phone number (optional)"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Address Display (Read-only) */}
          {primaryAddress && (
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Primary Address</span>
              </Label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-900">
                  {primaryAddress.street_address}
                </p>
                <p className="text-sm text-gray-600">
                  {primaryAddress.city}, {primaryAddress.state} {primaryAddress.postal_code}
                </p>
                <p className="text-sm text-gray-600">{primaryAddress.country}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Address management is handled in the customer's profile page
                </p>
              </div>
            </div>
          )}

          {/* COD Enabled */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cod_enabled"
                checked={codEnabled}
                onCheckedChange={(checked) => setValue('cod_enabled', checked as boolean, { shouldDirty: true })}
              />
              <Label htmlFor="cod_enabled" className="text-sm font-medium">
                Enable Cash on Delivery (COD)
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              Allow this customer to pay via Cash on Delivery
            </p>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <Textarea
              id="internal_notes"
              placeholder="Add internal notes about this customer (visible only to admins)"
              className="min-h-[80px]"
              {...register('internal_notes')}
            />
            {errors.internal_notes && (
              <p className="text-sm text-red-600">{errors.internal_notes.message}</p>
            )}
            <p className="text-xs text-gray-500">
              These notes are only visible to admin users and can include tags, preferences, etc.
            </p>
          </div>

          {/* Form Status */}
          {!isDirty && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Make changes to the form fields above to update the customer profile.
              </p>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || !isDirty}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};