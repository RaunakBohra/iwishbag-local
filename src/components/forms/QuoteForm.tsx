import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { GuestEmailField } from "@/components/forms/quote-form-fields/GuestEmailField";
import QuoteItem from "./quote-form-fields/QuoteItem";
import { Plus, Sparkles, ArrowRight, CheckCircle, MapPin, PlusCircle, Edit } from "lucide-react";
import { CountryField } from "./quote-form-fields/CountryField";
import { useQuoteForm } from "@/hooks/useQuoteForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddressForm } from "@/components/profile/AddressForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const QuoteForm = () => {
  const {
    form,
    fields,
    append,
    remove,
    onSubmit,
    loading,
    countryCode,
    user,
  } = useQuoteForm();

  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>();
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  // Fetch user's saved addresses
  const { data: userAddresses, isLoading: addressesLoading } = useQuery({
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

  // Fetch country settings for display
  const { data: allCountrySettings } = useQuery({
    queryKey: ['country-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .order('name');
      
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Auto-select default address when addresses are loaded
  useEffect(() => {
    if (userAddresses && userAddresses.length > 0 && !selectedAddressId) {
      const defaultAddress = userAddresses.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else {
        // If no default, select the first address
        setSelectedAddressId(userAddresses[0].id);
      }
    }
  }, [userAddresses, selectedAddressId]);

  const selectedAddress = userAddresses?.find(addr => addr.id === selectedAddressId);

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
  };

  const handleAddNewAddress = () => {
    setShowAddressDialog(true);
  };

  const handleAddressDialogClose = () => {
    setShowAddressDialog(false);
  };

  const handleAddressFormSuccess = (newAddress?: Tables<'user_addresses'>) => {
    setShowAddressDialog(false);
    // Invalidate and refetch addresses
    queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
    // Auto-select the new address if one was created
    if (newAddress) {
      setSelectedAddressId(newAddress.id);
    }
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    // Include selected address in the submission
    const submissionData = {
      ...data,
      shippingAddress: selectedAddress ? {
        fullName: user?.full_name || '',
        recipientName: selectedAddress.recipient_name,
        streetAddress: selectedAddress.address_line1,
        addressLine2: selectedAddress.address_line2,
        city: selectedAddress.city,
        state: selectedAddress.state_province_region,
        postalCode: selectedAddress.postal_code,
        country: selectedAddress.country,
        countryCode: selectedAddress.destination_country,
        phone: selectedAddress.phone,
      } : undefined,
    };
    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Quick Start Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Quick & Easy</span>
          </div>
          <h3 className="text-2xl font-semibold">Let's Get Started</h3>
          <p className="text-muted-foreground">
            Just a few simple steps to get your international shopping quote
          </p>
        </div>

        {/* Step 1: Purchase Country Selection */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <CardTitle className="text-lg">Where to purchase from?</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This is the country we'll buy your products from.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CountryField control={form.control} isLoading={loading} filter="purchase" label="Purchase Country" />
            {countryCode && (
              <div className="mt-3 flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Selected purchase country: {countryCode}</span>
              </div>
            )}
            
            {/* Origin-Destination Display */}
            {countryCode && selectedAddress && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-800">Where we'll buy from</div>
                    <div className="text-lg font-bold text-blue-900">
                      {(() => {
                        const country = allCountrySettings?.find(c => c.code === countryCode);
                        return country ? `🌍 ${country.name}` : `🌍 ${countryCode}`;
                      })()}
                    </div>
                    <div className="text-xs text-blue-600">Purchase country</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-0.5 bg-blue-300"></div>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                    <div className="w-8 h-0.5 bg-blue-300"></div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-800">Where we'll deliver to</div>
                    <div className="text-lg font-bold text-blue-900">
                      {selectedAddress.country ? `🌍 ${selectedAddress.country}` : 'Not selected'}
                    </div>
                    <div className="text-xs text-blue-600">Your shipping address</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-xs text-blue-600">
                    We'll use the most cost-effective shipping route for this journey
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Quote Type */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <CardTitle className="text-lg">Shopping Request Type</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to receive your shopping quotes
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.watch("quoteType") || "combined"}
              onValueChange={(value) => form.setValue("quoteType", value as "combined" | "separate")}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-primary/30 transition-colors cursor-pointer">
                <RadioGroupItem value="combined" id="combined" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="combined" className="text-base font-medium cursor-pointer">
                    Combined Order
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get one quote for all items together - usually better shipping rates
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Recommended
                  </Badge>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-primary/30 transition-colors cursor-pointer">
                <RadioGroupItem value="separate" id="separate" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="separate" className="text-base font-medium cursor-pointer">
                    Separate Orders
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get individual quotes for each item - more detailed breakdown
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Step 3: Products */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <CardTitle className="text-lg">What do you want to buy?</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add the products you want from international stores
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id}>
                <QuoteItem 
                    index={index}
                    remove={remove}
                    control={form.control}
                  setValue={form.setValue}
                />
                {index < fields.length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            ))}
        
        <Button
          type="button"
              variant="outline"
          onClick={() => append()}
              className="w-full h-12 border-dashed border-2 hover:border-primary/50 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
              Add Another Product
        </Button>
          </CardContent>
        </Card>

        {/* Step 4: Shipping Address */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <CardTitle className="text-lg">Where should we ship your order?</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select from your saved addresses or add a new one
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {addressesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : userAddresses && userAddresses.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select a shipping address:</Label>
                  <Select value={selectedAddressId} onValueChange={handleAddressSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an address" />
                    </SelectTrigger>
                    <SelectContent>
                      {userAddresses.map((address) => (
                        <SelectItem key={address.id} value={address.id}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{address.recipient_name}</span>
                            <span className="font-medium">{address.address_line1}</span>
                            <span className="text-sm text-muted-foreground">
                              {address.city}, {address.state_province_region} {address.postal_code}
                            </span>
                            {address.phone && (
                              <span className="text-sm text-muted-foreground">📞 {address.phone}</span>
                            )}
                            {address.is_default && (
                              <Badge variant="secondary" className="w-fit text-xs mt-1">
                                Default
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAddress && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">Selected Address</h4>
                          <div className="text-sm text-green-700 mt-1">
                            <p><strong>Recipient:</strong> {selectedAddress.recipient_name}</p>
                            <p>{selectedAddress.address_line1}</p>
                            {selectedAddress.address_line2 && <p>{selectedAddress.address_line2}</p>}
                            <p>
                              {selectedAddress.city}, {selectedAddress.state_province_region} {selectedAddress.postal_code}
                            </p>
                            <p>{selectedAddress.country}</p>
                            {selectedAddress.phone && <p>📞 {selectedAddress.phone}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddNewAddress}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add New Address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Add Your First Address</h3>
                  <p className="text-gray-500 mb-4">
                    We need your shipping address to provide accurate delivery information
                  </p>
                  <Button
                    type="button"
                    onClick={handleAddNewAddress}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Add Address
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Contact Info */}
        {!user && (
          <Card className="border-2 border-primary/10 bg-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div>
                  <CardTitle className="text-lg">How can we reach you?</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    We'll send your shopping quotes to this email address
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GuestEmailField control={form.control} setValue={form.setValue} />
            </CardContent>
          </Card>
        )}

        {/* Submit Section */}
        <div className="text-center space-y-4">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full md:w-auto h-12 px-8 text-lg" 
            disabled={loading || !selectedAddress}
          >
            {loading ? (
              "Getting Your Shopping Quote..."
            ) : (
              <>
                Get My Shopping Quote
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          {!selectedAddress && (
            <p className="text-sm text-orange-600">
              Please select a shipping address to continue
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            You'll receive your shopping quote within 24 hours
          </p>
        </div>
      </form>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Shipping Address</DialogTitle>
          </DialogHeader>
          <AddressForm onSuccess={handleAddressFormSuccess} />
        </DialogContent>
      </Dialog>
    </Form>
  );
};

export default QuoteForm;
