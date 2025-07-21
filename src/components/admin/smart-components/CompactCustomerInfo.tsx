// ============================================================================
// COMPACT CUSTOMER INFO - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Tabbed interface, horizontal layout, smart collapsing, inline editing
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Send,
  CreditCard,
  Target,
  Home,
  Building2,
  Plus,
  X,
} from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface CompactCustomerInfoProps {
  quote: UnifiedQuote;
  onUpdateQuote: () => void;
  compact?: boolean;
  editMode?: boolean;
}

export const CompactCustomerInfo: React.FC<CompactCustomerInfoProps> = ({
  quote,
  onUpdateQuote,
  compact = true,
  editMode = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('addresses');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const { user } = useAuth(); // Get current auth context for fallback
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const customerInfo = quote.customer_data?.info || {};
  // Check both customer_data.shipping_address and direct quote.shipping_address
  const shippingAddress = quote.customer_data?.shipping_address || quote.shipping_address || {};
  const isAnonymous = quote.is_anonymous;

  // Fetch user's saved addresses from user_addresses table
  const { data: savedAddresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['user_addresses', quote.user_id],
    queryFn: async () => {
      if (!quote.user_id) {
        console.log('🔍 [DEBUG] No user_id for quote:', quote.id);
        return [];
      }
      console.log('🔍 [DEBUG] Fetching addresses for user:', quote.user_id);
      
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', quote.user_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [DEBUG] Error fetching saved addresses:', error);
        return [];
      }
      
      console.log('✅ [DEBUG] Found addresses:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!quote.user_id && !isAnonymous,
  });
  
  // Only log when addresses are found/loaded (reduce console spam)
  if (savedAddresses && savedAddresses.length > 0 && !addressesLoading) {
    console.log('✅ [DEBUG] Addresses loaded successfully:', savedAddresses.length);
  }

  // Admin address management mutations
  const addAddressMutation = useMutation({
    mutationFn: async (addressData: any) => {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: quote.user_id,
          recipient_name: addressData.recipient_name,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2 || null,
          city: addressData.city,
          state_province_region: addressData.state_province_region,
          postal_code: addressData.postal_code,
          destination_country: addressData.destination_country,
          phone: addressData.phone || null,
          is_default: addressData.is_default || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', quote.user_id] });
      toast({ title: 'Address Added', description: 'Customer address has been added successfully.' });
      setShowAddressModal(false);
      setEditingAddress(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error Adding Address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async (addressData: any) => {
      const { data, error } = await supabase
        .from('user_addresses')
        .update({
          recipient_name: addressData.recipient_name,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2 || null,
          city: addressData.city,
          state_province_region: addressData.state_province_region,
          postal_code: addressData.postal_code,
          destination_country: addressData.destination_country,
          phone: addressData.phone || null,
          is_default: addressData.is_default || false,
        })
        .eq('id', editingAddress.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', quote.user_id] });
      toast({ title: 'Address Updated', description: 'Customer address has been updated successfully.' });
      setShowAddressModal(false);
      setEditingAddress(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error Updating Address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', quote.user_id] });
      toast({ title: 'Address Deleted', description: 'Customer address has been deleted successfully.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Deleting Address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle address form submission
  const handleAddressSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const addressData = {
      recipient_name: formData.get('recipient_name') as string,
      address_line1: formData.get('address_line1') as string,
      address_line2: formData.get('address_line2') as string,
      city: formData.get('city') as string,
      state_province_region: formData.get('state_province_region') as string,
      postal_code: formData.get('postal_code') as string,
      destination_country: formData.get('destination_country') as string,
      phone: formData.get('phone') as string,
      is_default: formData.get('is_default') === 'on',
    };

    if (editingAddress) {
      await updateAddressMutation.mutateAsync(addressData);
    } else {
      await addAddressMutation.mutateAsync(addressData);
    }
  };

  // Handle opening edit modal
  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  // Handle opening add modal
  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const formatAddress = (address: typeof shippingAddress) => {
    if (!address.line1) return null;

    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  };

  const formattedAddress = formatAddress(shippingAddress);

  // Helper functions for customer avatar
  const getCustomerAvatarUrl = () => {
    // First check stored profile avatar (includes OAuth fallback from UnifiedDataEngine)
    if (quote.customer_data?.profile?.avatar_url) {
      return quote.customer_data.profile.avatar_url;
    }

    // If quote belongs to current user and no stored avatar, use auth context
    if (user && quote.user_id === user.id) {
      // Check OAuth profile pictures from auth metadata
      if (user.user_metadata?.avatar_url) {
        return user.user_metadata.avatar_url;
      }
      if (user.user_metadata?.picture) {
        return user.user_metadata.picture;
      }
    }

    return null;
  };

  // Helper to get customer name from multiple possible sources
  const getCustomerName = () => {
    // First check stored quote data
    const storedName =
      customerInfo?.name || quote.customer_name || quote.customer_data?.customer_name;

    if (storedName) return storedName;

    // If quote belongs to current user and no stored name, use auth context
    if (user && quote.user_id === user.id) {
      const authName = user.user_metadata?.name || user.user_metadata?.full_name;
      if (authName) return authName;

      // Fallback to email prefix for OAuth users
      if (user.email) return user.email.split('@')[0];
    }

    return 'Anonymous Customer';
  };

  const getCustomerInitials = () => {
    // Use the enhanced name getter that includes auth context fallback
    const name = getCustomerName();
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to get customer email from multiple possible sources
  const getCustomerEmail = () => {
    // First check stored quote data
    const storedEmail = customerInfo?.email || quote.email || quote.customer_data?.email;

    if (storedEmail) return storedEmail;

    // If quote belongs to current user, use auth context
    if (user && quote.user_id === user.id && user.email) {
      return user.email;
    }

    return 'No email provided';
  };

  // Helper to get customer phone from multiple possible sources
  const getCustomerPhone = () => {
    // First check stored quote data
    const storedPhone =
      customerInfo?.phone || quote.customer_phone || quote.customer_data?.customer_phone;

    if (storedPhone) return storedPhone;

    // If quote belongs to current user, use auth context
    if (user && quote.user_id === user.id) {
      // Check both direct phone field and user_metadata (auth.users.phone is primary)
      const authPhone = user.phone || user.user_metadata?.phone || user.user_metadata?.phone_number;
      if (authPhone) return authPhone;
    }

    return 'No phone provided';
  };

  // Debug logging to understand the data structure
  console.log('🔍 [DEBUG] CompactCustomerInfo data:', {
    quote_id: quote.id,
    quote_user_id: quote.user_id,
    current_user_id: user?.id,
    is_current_user: user && quote.user_id === user.id,
    editMode: editMode,
    customer_data: quote.customer_data,
    customerInfo,
    auth_context: user
      ? {
          name: user.user_metadata?.name,
          full_name: user.user_metadata?.full_name,
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          picture: user.user_metadata?.picture,
          phone: user.phone,
          phone_metadata: user.user_metadata?.phone,
        }
      : null,
    resolved_data: {
      name: getCustomerName(),
      email: getCustomerEmail(),
      phone: getCustomerPhone(),
      avatar: getCustomerAvatarUrl(),
    },
    shipping_address: shippingAddress,
    is_anonymous: isAnonymous,
    saved_addresses: {
      count: savedAddresses?.length || 0,
      has_default: savedAddresses?.some(addr => addr.is_default) || false,
      loading: addressesLoading,
    },
  });

  // Compact Header View (Always Visible)
  const CompactHeader = () => (
    <div className="p-4">
      {/* Top Row: Customer Name & Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={getCustomerAvatarUrl() || undefined} alt={getCustomerName()} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
              {getCustomerInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">{getCustomerName()}</div>
            <div className="text-xs text-gray-500">
              {quote.quote_source || 'Unknown'} • {isAnonymous ? 'Guest' : 'Registered'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contact Information Row */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center min-w-0 flex-1">
            <Mail className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-gray-900 truncate" title={getCustomerEmail()}>
              {getCustomerEmail()}
            </span>
          </div>
          <div className="flex items-center min-w-0 flex-1">
            <Phone className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-gray-900 truncate" title={getCustomerPhone()}>
              {getCustomerPhone()}
            </span>
          </div>
        </div>

        {/* Address Indicators Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Saved Addresses Indicator */}
            {!addressesLoading && savedAddresses && savedAddresses.length > 0 && (
              <div className="flex items-center text-blue-600">
                <Home className="w-3 h-3 mr-1" />
                <span>{savedAddresses.length} saved address{savedAddresses.length > 1 ? 'es' : ''}</span>
                {savedAddresses.find(addr => addr.is_default) && (
                  <Badge variant="outline" className="text-xs h-4 px-1 ml-1 text-green-700 border-green-300">
                    Default
                  </Badge>
                )}
              </div>
            )}
            {/* Quote-specific address indicator */}
            {formattedAddress && (
              <div className="flex items-center text-purple-600">
                <MapPin className="w-3 h-3 mr-1" />
                Quote address
              </div>
            )}
            {shippingAddress.locked && (
              <div className="flex items-center text-orange-600">
                <Shield className="w-3 h-3 mr-1" />
                Locked
              </div>
            )}
            {/* Communication method badges */}
            {getCustomerEmail() !== 'No email provided' && (
              <Badge variant="outline" className="text-xs h-4 px-1 text-blue-700 border-blue-300">
                Email
              </Badge>
            )}
            {getCustomerPhone() !== 'No phone provided' && (
              <Badge variant="outline" className="text-xs h-4 px-1 text-blue-700 border-blue-300">
                SMS
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-xs"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );

  // Expandable Detail Tabs (Shown when expanded)
  const DetailTabs = () => (
    <div className="border-t border-gray-100">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
          <TabsTrigger value="addresses" className="text-xs">
            Addresses {savedAddresses && savedAddresses.length > 0 && `(${savedAddresses.length})`}
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="addresses" className="p-4 pt-3">
          {addressesLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          ) : savedAddresses && savedAddresses.length > 0 ? (
            <div className="space-y-3">
              {/* Display up to 2 addresses in compact view */}
              {savedAddresses.slice(0, 2).map((address) => (
                <div key={address.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {/* Use generic home icon since label field doesn't exist in schema */}
                          <Home className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-medium text-gray-900">
                            {address.recipient_name}
                          </span>
                          {address.is_default && (
                            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs h-4 px-1">
                              Default
                            </Badge>
                          )}
                        </div>
                        {/* Admin Action Buttons - Only in Edit Mode */}
                        {editMode && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAddress(address)}
                              className="h-5 w-5 p-0 hover:bg-blue-100"
                              title="Edit address"
                            >
                              <Edit3 className="w-3 h-3 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAddressMutation.mutate(address.id)}
                              className="h-5 w-5 p-0 hover:bg-red-100"
                              title="Delete address"
                            >
                              <X className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-700 leading-relaxed ml-5">
                        <div>{address.address_line1}</div>
                        {address.address_line2 && <div>{address.address_line2}</div>}
                        <div>
                          {address.city}, {address.state_province_region} {address.postal_code}
                        </div>
                        <div>{address.destination_country}</div>
                        {address.phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {address.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Admin Actions Row - Only in Edit Mode */}
              {editMode && (
                <div className="text-center pt-2 border-t border-gray-200">
                  <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600" onClick={handleAddAddress}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add New
                    </Button>
                    {savedAddresses.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600">
                        View all {savedAddresses.length}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Quote-specific address if different from saved */}
              {formattedAddress && (
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-purple-600" />
                    Quote Shipping Address
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs text-gray-900 leading-relaxed">{formattedAddress}</div>
                    {shippingAddress.locked && (
                      <div className="flex items-center text-orange-600 text-xs mt-2">
                        <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span>Locked after payment</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Home className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-xs mb-2">No saved addresses</p>
              <div className="space-y-2">
                {editMode && (
                  <Button size="sm" className="h-7 px-3 text-xs" onClick={handleAddAddress}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Address
                  </Button>
                )}
                {formattedAddress && (
                  <div className="text-xs text-gray-600">
                    Quote has shipping address
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="p-4 pt-3">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Button size="sm" className="h-8 text-xs justify-start">
                <Send className="w-3 h-3 mr-2" />
                Send Quote
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs justify-start">
                <CreditCard className="w-3 h-3 mr-2" />
                Request Payment
              </Button>
              {!formattedAddress && (
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start">
                  <Target className="w-3 h-3 mr-2" />
                  Request Address
                </Button>
              )}
            </div>

            {/* Quick Communication */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-2">Quick Communication</div>
              <div className="flex gap-2">
                {getCustomerEmail() !== 'No email provided' && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Button>
                )}
                {getCustomerPhone() !== 'No phone provided' && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Phone className="w-3 h-3 mr-1" />
                    SMS
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden">
      <CompactHeader />
      {isExpanded && <DetailTabs />}
      
      {/* Address Management Modal - Only in Edit Mode */}
      {editMode && (
        <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Customer Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="recipient_name">Recipient Name *</Label>
                <Input
                  id="recipient_name"
                  name="recipient_name"
                  defaultValue={editingAddress?.recipient_name || ''}
                  placeholder="Full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  name="address_line1"
                  defaultValue={editingAddress?.address_line1 || ''}
                  placeholder="Street address"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  name="address_line2"
                  defaultValue={editingAddress?.address_line2 || ''}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={editingAddress?.city || ''}
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code *</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    defaultValue={editingAddress?.postal_code || ''}
                    placeholder="ZIP/Postal"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="state_province_region">State/Province *</Label>
                <Input
                  id="state_province_region"
                  name="state_province_region"
                  defaultValue={editingAddress?.state_province_region || ''}
                  placeholder="State or province"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="destination_country">Country *</Label>
                <Input
                  id="destination_country"
                  name="destination_country"
                  defaultValue={editingAddress?.destination_country || ''}
                  placeholder="Country"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingAddress?.phone || ''}
                  placeholder="Phone number"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  name="is_default"
                  defaultChecked={editingAddress?.is_default || false}
                />
                <Label htmlFor="is_default">Set as default address</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddressModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addAddressMutation.isPending || updateAddressMutation.isPending}
              >
                {addAddressMutation.isPending || updateAddressMutation.isPending
                  ? 'Saving...'
                  : editingAddress
                  ? 'Update Address'
                  : 'Add Address'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </Card>
  );
};
