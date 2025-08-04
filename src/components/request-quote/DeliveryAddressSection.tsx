import React, { useState, useEffect } from 'react';
import { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressForm } from '@/components/profile/AddressForm';
import { AddressCard } from '@/components/profile/AddressCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAllCountries } from '@/hooks/useAllCountries';
import { 
  MapPin, 
  Home, 
  Phone,
  Truck,
  Info,
  Plus,
  CheckCircle,
} from 'lucide-react';

interface DeliveryAddressSectionProps {
  control: Control<any>;
  isGuestUser: boolean;
  onAddressSelect?: (address: any) => void;
}

export function DeliveryAddressSection({ control, isGuestUser, onAddressSelect }: DeliveryAddressSectionProps) {
  const { toast } = useToast();
  const { data: countries } = useAllCountries();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Load existing addresses for logged-in users
  useEffect(() => {
    if (!isGuestUser) {
      loadUserAddresses();
    }
  }, [isGuestUser]);

  const loadUserAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const { data: userAddresses, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading addresses:', error);
      } else {
        setAddresses(userAddresses || []);
        // Auto-select default address if available
        const defaultAddress = userAddresses?.find(addr => addr.is_default);
        if (defaultAddress) {
          handleAddressSelect(defaultAddress);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddressSelect = (address: any) => {
    setSelectedAddressId(address.id);
    
    // Update form with selected address data
    const formAddress = {
      full_name: address.recipient_name || `${address.first_name || ''} ${address.last_name || ''}`.trim() || '',
      address_line_1: address.address_line1 || '',
      address_line_2: address.address_line2 || '',
      city: address.city || '',
      state_province: address.state_province_region || '',
      postal_code: address.postal_code || '',
      country: address.destination_country || address.country || '',
      phone: address.phone || '',
    };

    // Notify parent component
    if (onAddressSelect) {
      onAddressSelect(formAddress);
    }
  };


  // Supported destination countries
  const destinationCountries = [
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  ];

  if (!isGuestUser) {
    // For logged-in users, show existing addresses with option to add new
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-red-600" />
                <span>Delivery Address</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Required</Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddressModal(true)}
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Address</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAddresses ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span className="ml-2 text-gray-600">Loading addresses...</span>
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No addresses found</h4>
                <p className="text-gray-600 mb-4">Add your first delivery address to continue</p>
                <Button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Address</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">Select a delivery address:</p>
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    countries={countries}
                    onSelect={() => handleAddressSelect(address)}
                    onEdit={() => {
                      setEditingAddress(address);
                      setShowAddressModal(true);
                    }}
                    isSelected={selectedAddressId === address.id}
                    showActions={false}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {/* Hidden form fields for validation */}
            <div className="hidden">
              <FormField
                control={control}
                name="delivery_address.full_name"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.address_line_1"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.address_line_2"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.city"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.state_province"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.postal_code"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.country"
                render={({ field }) => <Input {...field} />}
              />
              <FormField
                control={control}
                name="delivery_address.phone"
                render={({ field }) => <Input {...field} />}
              />
            </div>
          </CardContent>
        </Card>

        <Dialog open={showAddressModal} onOpenChange={(open) => {
          if (!open) {
            setEditingAddress(null);
          }
          setShowAddressModal(open);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
            </DialogHeader>
            <AddressForm 
              address={editingAddress}
              onSuccess={(savedAddress) => {
                if (savedAddress) {
                  handleAddressSelect(savedAddress);
                }
                setEditingAddress(null);
                setShowAddressModal(false);
                loadUserAddresses(); // Refresh the address list
              }} 
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // For guest users, show the full address form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-red-600" />
            <span>Delivery Address</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="destructive">Required</Badge>
            <Badge variant="secondary" className="text-xs">Critical</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipient Name */}
        <FormField
          control={control}
          name="delivery_address.full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-1">
                <Home className="h-4 w-4" />
                <span>Recipient Full Name *</span>
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Full name of the person receiving the package"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address Lines */}
        <div className="space-y-3">
          <FormField
            control={control}
            name="delivery_address.address_line_1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="House/Building No., Street Name"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="delivery_address.address_line_2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Apartment, Suite, Floor, etc. 
                  <Badge variant="outline" className="text-xs ml-1">Optional</Badge>
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Apt 4B, Floor 2, Suite 100 (optional)"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* City, State, Postal Code Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="delivery_address.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Mumbai"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="delivery_address.state_province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State/Province *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Maharashtra"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="delivery_address.postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="400001"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Country Selection */}
        <FormField
          control={control}
          name="delivery_address.country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-1">
                <Truck className="h-4 w-4" />
                <span>Country *</span>
              </FormLabel>
              <FormControl>
                <select 
                  {...field}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="">Select delivery country</option>
                  {destinationCountries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500 mt-1">
                We currently deliver to these countries
              </p>
            </FormItem>
          )}
        />

        {/* Optional Phone for Delivery */}
        <FormField
          control={control}
          name="delivery_address.phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>Delivery Contact Phone</span>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </FormLabel>
              <FormControl>
                <Input 
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="h-11 max-w-md"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500 mt-1">
                Local phone number for delivery coordination (recommended)
              </p>
            </FormItem>
          )}
        />

        {/* Delivery Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Delivery Note:</strong> Make sure your address is complete and accurate. 
            Incorrect addresses may result in delivery delays or additional charges for re-routing packages.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}