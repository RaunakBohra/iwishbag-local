import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Lock, 
  Unlock, 
  History,
  User,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { ShippingAddress, AddressFormData } from '@/types/address';
import { validateAddress, normalizeAddress, compareAddresses, getAddressChangeSummary } from '@/lib/addressValidation';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useAddressHistory } from '@/hooks/useAddressHistory';

// Validation schema for admin address form (allows country changes)
const adminAddressFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be no more than 100 characters'),
  streetAddress: z.string().min(5, 'Street address must be at least 5 characters').max(200, 'Street address must be no more than 200 characters'),
  city: z.string().min(2, 'City must be at least 2 characters').max(100, 'City must be no more than 100 characters'),
  state: z.string().max(100, 'State must be no more than 100 characters').optional(),
  postalCode: z.string().min(3, 'Postal code must be at least 3 characters').max(20, 'Postal code must be no more than 20 characters'),
  country: z.string().length(2, 'Country must be a 2-letter country code'),
  phone: z.string().regex(/^[+]?[1-9]\d{0,15}$/, 'Invalid phone number format').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  changeReason: z.string().min(1, 'Please provide a reason for this change').max(500, 'Reason must be no more than 500 characters'),
});

interface AdminAddressEditorProps {
  quoteId: string;
  currentAddress?: ShippingAddress;
  onSave: (address: ShippingAddress, reason: string) => void;
  onCancel: () => void;
  onUnlock?: (reason?: string) => void;
  isLoading?: boolean;
  isLocked?: boolean;
  lockReason?: string;
}

export const AdminAddressEditor: React.FC<AdminAddressEditorProps> = ({
  quoteId,
  currentAddress,
  onSave,
  onCancel,
  onUnlock,
  isLoading = false,
  isLocked = false,
  lockReason,
}) => {
  const { data: countries } = useAllCountries();
  const { history, formatChangeType, getChangeIcon, hasChanges } = useAddressHistory({ quoteId });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('edit');

  const form = useForm<AddressFormData & { changeReason: string }>({
    resolver: zodResolver(adminAddressFormSchema),
    defaultValues: {
      fullName: currentAddress?.fullName || '',
      streetAddress: currentAddress?.streetAddress || '',
      city: currentAddress?.city || '',
      state: currentAddress?.state || '',
      postalCode: currentAddress?.postalCode || '',
      country: currentAddress?.country || '',
      phone: currentAddress?.phone || '',
      email: currentAddress?.email || '',
      changeReason: '',
    },
  });

  const watchedCountry = form.watch('country');
  const selectedCountry = countries?.find(c => c.code === watchedCountry);

  const handleSubmit = (data: AddressFormData & { changeReason: string }) => {
    // Clear previous validation messages
    setValidationErrors([]);
    setValidationWarnings([]);

    // Normalize and validate address
    const normalizedAddress = normalizeAddress(data);
    const validation = validateAddress(normalizedAddress);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
    }

    // Check for significant changes
    if (currentAddress) {
      const changes = compareAddresses(currentAddress, normalizedAddress);
      const hasCountryChange = changes.some(c => c.field === 'country');
      
      if (hasCountryChange && !data.changeReason.includes('country')) {
        setValidationErrors(['Please provide a specific reason for changing the country as it affects shipping costs and delivery times']);
        return;
      }
    }

    // Call the save function
    onSave(normalizedAddress, data.changeReason);
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  const handleUnlock = () => {
    const reason = form.getValues('changeReason') || 'Address unlocked by admin';
    onUnlock?.(reason);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Admin Address Management
        </CardTitle>
        <CardDescription>
          Manage shipping address with full administrative privileges. All changes are logged for audit purposes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit Address</TabsTrigger>
            <TabsTrigger value="history">Change History</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Address Status */}
                {isLocked && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <Lock className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Address is locked</strong> - {lockReason || 'Cannot be modified by customers'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Street Address */}
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Street Address *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* City and State Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State or Province" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Postal Code and Country Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries?.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Phone and Email Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Change Reason */}
                <FormField
                  control={form.control}
                  name="changeReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Change *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please provide a reason for this address change..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country Information */}
                {selectedCountry && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Shipping to <strong>{selectedCountry.name}</strong> ({selectedCountry.currency})
                    </AlertDescription>
                  </Alert>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <ul className="list-disc list-inside space-y-1">
                        {validationWarnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Update Address'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Address Change History</h3>
                {hasChanges && (
                  <Badge variant="secondary">{history.length} changes</Badge>
                )}
              </div>

              {!hasChanges ? (
                <Alert>
                  <AlertDescription>No address changes recorded yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((change, index) => (
                    <Card key={change.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getChangeIcon(change.changeType)}</span>
                            <div>
                              <p className="font-medium">{formatChangeType(change.changeType)}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(change.changedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {change.hasCountryChange && (
                            <Badge variant="destructive">Country Changed</Badge>
                          )}
                        </div>
                        
                        {change.changeSummary && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Changes:</p>
                            <p className="text-muted-foreground">{change.changeSummary}</p>
                          </div>
                        )}

                        {change.changeReason && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Reason:</p>
                            <p className="text-muted-foreground">{change.changeReason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Actions</h3>
              
              {/* Current Status */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">Current Status</span>
                  </div>
                  <Badge variant={isLocked ? "destructive" : "default"}>
                    {isLocked ? "Locked" : "Unlocked"}
                  </Badge>
                  {isLocked && lockReason && (
                    <p className="text-sm text-muted-foreground mt-1">{lockReason}</p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                {isLocked && onUnlock && (
                  <Button 
                    variant="outline" 
                    onClick={handleUnlock}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock Address
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('edit')}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Address
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('history')}
                  className="w-full"
                >
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 