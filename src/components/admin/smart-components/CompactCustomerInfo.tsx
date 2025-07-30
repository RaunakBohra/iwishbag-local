// ============================================================================
// COMPACT CUSTOMER INFO - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Tabbed interface, horizontal layout, smart collapsing, inline editing
// ============================================================================

import React, { useState, useEffect } from 'react';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { QuoteMessageThreadRefactored as QuoteMessageThread } from '@/components/messaging/QuoteMessageThreadRefactored';
import { quoteMessageService } from '@/services/QuoteMessageService';

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
  editMode = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('addresses');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressToDelete, setAddressToDelete] = useState<any>(null);
  const { user } = useAuth(); // Get current auth context for fallback
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const customerInfo = quote.customer_data?.info || {};
  const shippingAddress = quote.customer_data?.shipping_address || {};
  const isAnonymous = quote.is_anonymous;

  // Fetch user's saved addresses from delivery_addresses table
  const { data: savedAddresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['delivery_addresses', quote.user_id],
    queryFn: async () => {
      if (!quote.user_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', quote.user_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    },
    enabled: !!quote.user_id && !isAnonymous,
  });

  // Fetch unread message count for this quote
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-messages', quote.id],
    queryFn: () => quoteMessageService.getUnreadMessageCount(quote.id),
    refetchInterval: 30000, // Refresh every 30 seconds
    initialData: 0,
  });

  // Fetch total message count for this quote
  const {
    data: totalCount,
    isLoading: totalCountLoading,
    isError: totalCountError,
  } = useQuery({
    queryKey: ['total-messages', quote.id],
    queryFn: async () => {
      const result = await quoteMessageService.getTotalMessageCount(quote.id);
      return result;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for testing (same as unread)
    staleTime: 0, // Always consider stale (force fresh data)
    cacheTime: 30000, // Cache for 30 seconds
    retry: 2, // Retry failed requests
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch on mount
  });

  // Manual cache invalidation effect for debugging
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['total-messages', quote.id] });
  }, []); // Only run once on mount

  // Set up real-time subscription for message updates
  useEffect(() => {
    const subscription = supabase
      .channel(`quote-messages-${quote.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'messages',
          filter: `quote_id=eq.${quote.id}`,
        },
        (payload) => {
          // Invalidate both message count queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['unread-messages', quote.id] });
          queryClient.invalidateQueries({ queryKey: ['total-messages', quote.id] });
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [quote.id, queryClient]);

  // Only log when addresses are found/loaded (reduce console spam)
  if (savedAddresses && savedAddresses.length > 0 && !addressesLoading) {
  }

  // Admin address management mutations
  const addAddressMutation = useMutation({
    mutationFn: async (addressData: any) => {
      const { data, error } = await supabase
        .from('delivery_addresses')
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
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses', quote.user_id] });
      toast({
        title: 'Address Added',
        description: 'Customer address has been added successfully.',
      });
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
        .from('delivery_addresses')
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
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses', quote.user_id] });
      toast({
        title: 'Address Updated',
        description: 'Customer address has been updated successfully.',
      });
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
      const { error } = await supabase.from('delivery_addresses').delete().eq('id', addressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses', quote.user_id] });
      toast({
        title: 'Address Deleted',
        description: 'Customer address has been deleted successfully.',
      });
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

  // Handle confirmed address deletion
  const handleConfirmDeleteAddress = () => {
    if (addressToDelete) {
      deleteAddressMutation.mutate(addressToDelete.id);
      setAddressToDelete(null);
    }
  };

  const formatAddress = (address: typeof shippingAddress) => {
    if (!address?.line1) return null;

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

  // Use unified customer display system
  const customerDisplayData = customerDisplayUtils.getCustomerDisplayData(quote, null);
  const customerTypeLabel = customerDisplayData.type || 'Guest';

  // Helper functions using unified system
  const getCustomerName = () => customerDisplayData.name;
  const getCustomerEmail = () => customerDisplayData.email || 'No email provided';
  const getCustomerPhone = () => customerDisplayData.phone || 'No phone provided';

  const getCustomerInitials = () => {
    const name = customerDisplayData.name;
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">{getCustomerName()}</div>
              {customerDisplayData.isGuest && (
                <Badge variant="secondary" className="text-xs">
                  Guest
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {customerTypeLabel}
              </Badge>
            </div>
            <div className="text-xs text-gray-500">{quote.quote_source || 'Unknown'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 relative"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              setIsExpanded(true);
              setActiveTab('messages');
            }}
            title="Open messages"
          >
            <MessageSquare className="w-4 h-4" />

            {/* Modern unread message indicator */}
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center font-medium shadow-lg border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}

            {/* Blue dot indicator for conversations with messages (when no unread) */}
            {(!unreadCount || unreadCount === 0) && totalCount > 0 && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full border-2 border-white shadow-sm"
                title={`${totalCount} message${totalCount > 1 ? 's' : ''} in conversation`}
              />
            )}

            {/* Subtle total count indicator at bottom-right when messages exist */}
            {totalCount > 0 && (
              <div
                className="absolute -bottom-0.5 -right-0.5 text-xs text-gray-400 bg-white rounded px-1 leading-none"
                style={{ fontSize: '10px' }}
                title={`Total: ${totalCount} message${totalCount > 1 ? 's' : ''}`}
              >
                {totalCount > 99 ? '99+' : totalCount}
              </div>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              // Always open customer management page - it has good search functionality
              const customerEmail = getCustomerEmail();
              if (customerEmail && customerEmail !== 'No email provided') {
                // Open customer management page in new tab for admin to search by email
                // The customer management page supports searching by email and name
                window.open('/admin/customers', '_blank');
              }
            }}
            title="Open customer management (search by email/name)"
            disabled={!getCustomerEmail() || getCustomerEmail() === 'No email provided'}
          >
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
                <span>
                  {savedAddresses.length} saved address{savedAddresses.length > 1 ? 'es' : ''}
                </span>
                {savedAddresses.find((addr) => addr.is_default) && (
                  <Badge
                    variant="outline"
                    className="text-xs h-4 px-1 ml-1 text-green-700 border-green-300"
                  >
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              setIsExpanded(!isExpanded);
            }}
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
        <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
          <TabsTrigger value="addresses" className="text-xs">
            Addresses {savedAddresses && savedAddresses.length > 0 && `(${savedAddresses.length})`}
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs">
            Actions
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs">
            Messages
            {/* Modern unread messages indicator */}
            {unreadCount > 0 && (
              <span className="ml-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs h-4 px-2 rounded-full flex items-center justify-center font-medium shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {/* Gray total count indicator */}
            {totalCount > 0 && (
              <span className="ml-1 text-xs text-gray-500">
                ({totalCount > 99 ? '99+' : totalCount})
              </span>
            )}
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
                              onClick={() => setAddressToDelete(address)}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-blue-600"
                      onClick={handleAddAddress}
                    >
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
                  <div className="text-xs text-gray-600">Quote has shipping address</div>
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

        <TabsContent value="messages" className="p-4 pt-3">
          <QuoteMessageThread
            quoteId={quote.id}
            compact={true}
            maxHeight="200px"
            showComposer={true}
            className="space-y-2"
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden transition-all duration-200">
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
                <Button type="button" variant="outline" onClick={() => setShowAddressModal(false)}>
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

      {/* Address Delete Confirmation Dialog */}
      <AlertDialog open={!!addressToDelete} onOpenChange={() => setAddressToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the address for{' '}
              <span className="font-medium">{addressToDelete?.recipient_name}</span>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAddress}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
