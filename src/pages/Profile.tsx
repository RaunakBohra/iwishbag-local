import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAllCountries } from '@/hooks/useAllCountries';
import { usePhoneCollection } from '@/hooks/usePhoneCollection';
import { getDestinationCurrency } from '@/utils/originCurrency';
import { PhoneCollectionModal } from '@/components/auth/PhoneCollectionModal';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { ChangeEmailModal } from '@/components/auth/ChangeEmailModal';
import { ChangePhoneModal } from '@/components/auth/ChangePhoneModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton, SkeletonForm } from '@/components/ui/skeleton';
import { ConditionalSkeleton } from '@/components/ui/skeleton-loader';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Globe,
  MapPin,
  AlertCircle,
  Shield,
  Save,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Settings,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { currencyService, type Currency } from '@/services/CurrencyService';
import { H1, Body, BodySmall } from '@/components/ui/typography';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { detectCountryFromNumber, getDialCode, parsePhoneInput } from '@/lib/phoneFormatUtils';

const profileFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional(),
  phone: z.string().min(8, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  preferred_display_currency: z.string().min(1, 'Preferred currency is required'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allCountries, isLoading: countriesLoading, error: countriesError } = useAllCountries();
  
  // Debug countries loading
  useEffect(() => {
    console.log('[Profile] Countries data changed:', {
      allCountries: Array.isArray(allCountries) ? allCountries.length : 'not an array',
      isLoading: countriesLoading,
      error: countriesError,
      isArray: Array.isArray(allCountries),
      first5: Array.isArray(allCountries) ? allCountries.slice(0, 5) : allCountries
    });
  }, [allCountries, countriesLoading, countriesError]);
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const phoneCollection = usePhoneCollection();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showChangePhoneModal, setShowChangePhoneModal] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);

  // Helper functions for user avatar
  const getUserAvatarUrl = () => {
    // Check profile avatar_url first (stored in database)
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    // Check user metadata for OAuth profile pictures
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    if (user?.user_metadata?.picture) {
      return user.user_metadata.picture;
    }
    return null;
  };

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user,
  });

  // Get customer display data using the utility (filter out default "User" name)
  const customerData = customerDisplayUtils.getCustomerDisplayData(
    {
      user: user,
      profiles: profile,
      customer_data: {
        name: (user?.user_metadata?.name !== 'User' ? user?.user_metadata?.name : null) || 
              (user?.user_metadata?.full_name !== 'User' ? user?.user_metadata?.full_name : null),
        email: user?.email,
        phone: user?.phone
      }
    },
    profile
  );

  const getUserInitials = () => {
    return customerData.initials;
  };

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [ordersResult, quotesResult] = await Promise.all([
        supabase
          .from('quotes_v2')
          .select('id', { count: 'exact' })
          .eq('customer_id', user.id)
          .eq('status', 'completed'),
        supabase.from('quotes_v2').select('id', { count: 'exact' }).eq('customer_id', user.id),
      ]);

      return {
        totalOrders: ordersResult.count || 0,
        totalQuotes: quotesResult.count || 0,
        memberSince: user.created_at,
      };
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!user) throw new Error('User not authenticated');

      // Update phone in auth.users table
      // Ensure phone is in E.164 format (no spaces)
      const e164Phone = values.phone.replace(/\s+/g, '');
      const { error: authError } = await supabase.auth.updateUser({
        phone: e164Phone,
      });
      if (authError) throw new Error(`Error updating phone: ${authError.message}`);

      // Check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(`Error checking profile: ${selectError.message}`);
      }

      if (existingProfile) {
        // Profile exists, so update it (without phone)
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: values.full_name,
            country: values.country,
            preferred_display_currency: values.preferred_display_currency,
          })
          .eq('id', user.id);
        if (error) throw new Error(`Error updating profile: ${error.message}`);
      } else {
        // Profile doesn't exist, so insert it (without phone)
        const { error } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: values.full_name,
          country: values.country,
          preferred_display_currency: values.preferred_display_currency,
        });
        if (error) throw new Error(`Error creating profile: ${error.message}`);
      }
    },
    onSuccess: (_, variables) => {
      // Update the cache with the new values immediately to prevent flicker
      queryClient.setQueryData(['profile', user?.id], (oldData: any) => ({
        ...oldData,
        full_name: variables.full_name,
        country: variables.country,
        preferred_display_currency: variables.preferred_display_currency,
      }));
      
      // Then invalidate to fetch fresh data from server
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      email: (user?.email && !user.email.includes('@phone.iwishbag.com')) ? user.email : '',
      phone: '',
      country: 'US',
      preferred_display_currency: 'USD',
    },
  });
  
  // Track if initial data has been loaded to prevent multiple resets
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // Load available currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setCurrencyLoading(true);
        const currencies = await currencyService.getAllCurrencies();
        setAvailableCurrencies(currencies);
      } catch (error) {
        console.error('[Profile] Error loading currencies:', error);
      } finally {
        setCurrencyLoading(false);
      }
    };
    loadCurrencies();
  }, []);

  useEffect(() => {
    // Only reset form once when all initial data is loaded
    if (isInitialDataLoaded) return;
    
    // Wait for both countries and currencies to be loaded before resetting form
    if (!allCountries || allCountries.length === 0 || availableCurrencies.length === 0) {
      return;
    }
    
    // Also wait for profile query to settle (either with data or null)
    if (isLoading) return;

    // Always get display name, even if no profile exists yet (don't use "User" as default)
    const displayName =
      (profile?.full_name && profile.full_name !== 'User' ? profile.full_name : '') ||
      (user?.user_metadata?.name && user.user_metadata.name !== 'User' ? user.user_metadata.name : '') ||
      (user?.user_metadata?.full_name && user.user_metadata.full_name !== 'User' ? user.user_metadata.full_name : '') ||
      (user?.email && !user.email.includes('@phone.iwishbag.com') ? user.email.split('@')[0] : '') ||
      '';

    // Get phone from auth.users.phone instead of profiles.phone
    const userPhone = user?.phone || user?.user_metadata?.phone || '';
    
    // Detect country from phone number if available
    if (userPhone && !phoneCountry) {
      const detectedCountry = detectCountryFromNumber(userPhone);
      if (detectedCountry) {
        setPhoneCountry(detectedCountry);
      }
    }

    // Parse phone number to remove country code for the input
    let phoneForInput = userPhone;
    if (userPhone && userPhone.startsWith('+')) {
      // If we have a detected country, remove its dial code
      if (phoneCountry) {
        const dialCode = getDialCode(phoneCountry);
        if (userPhone.startsWith(dialCode)) {
          phoneForInput = userPhone.substring(dialCode.length).trim();
        }
      } else {
        // Try to parse and get national number
        try {
          const parsed = parsePhoneInput(userPhone);
          if (parsed.digits) {
            phoneForInput = parsed.digits;
          }
        } catch {
          // Keep original if parsing fails
        }
      }
    }

    // Set form values whether profile exists or not
    form.reset({
      full_name: displayName,
      email: (user?.email && !user.email.includes('@phone.iwishbag.com')) ? user.email : '',
      phone: phoneForInput,
      country: profile?.country || phoneCountry || 'US',
      preferred_display_currency: profile?.preferred_display_currency || getDestinationCurrency(profile?.country || phoneCountry || 'US'),
    });
    
    // Mark as loaded to prevent future resets
    setIsInitialDataLoaded(true);
  }, [profile, user, allCountries, availableCurrencies, isLoading, isInitialDataLoaded]); // Added isLoading and isInitialDataLoaded

  const onSubmit = async (data: ProfileFormValues) => {
    // Check if there's a phone validation error
    if (phoneError) {
      toast({
        title: 'Please fix form errors',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }
    
    // Optimistically update the form to prevent flicker
    // The form will maintain the user's input values
    try {
      await updateProfileMutation.mutateAsync(data);
      // Form values are already what the user submitted, no need to reset
    } catch (error) {
      // On error, the form keeps the attempted values so user can retry
      console.error('Profile update error:', error);
    }
  };

  // No auto-switching - user controls both country and currency independently



  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <Body className="text-red-600">Error loading profile: {error.message}</Body>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ConditionalSkeleton
      conditions={[
        { data: profile, isLoading },
        { data: allCountries, isLoading: countriesLoading },
        { data: availableCurrencies, isLoading: currencyLoading }
      ]}
      minimumLoadTime={400}
      skeleton={
        <div className="min-h-screen bg-white">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="space-y-8">
              {/* Header skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center space-y-2">
                    <Skeleton className="h-8 w-8 mx-auto" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="text-center space-y-2">
                    <Skeleton className="h-8 w-8 mx-auto" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
              
              {/* Quick actions skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              
              {/* Form skeleton */}
              <Card className="border-gray-200">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                  <SkeletonForm fields={6} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getUserAvatarUrl() && (
                  <Avatar className="w-16 h-16">
                    <AvatarImage
                      src={getUserAvatarUrl()}
                      alt={customerData.displayName}
                    />
                  </Avatar>
                )}
                <div>
                  <H1 className="text-2xl mb-1">
                    {customerData.displayName || (
                      <span className="text-gray-400">Add your name</span>
                    )}
                  </H1>
                  <BodySmall className="text-gray-600">
                    {user?.email && !user.email.includes('@phone.iwishbag.com') 
                      ? user.email 
                      : user?.phone 
                        ? `Phone: ${user.phone}` 
                        : 'No email provided'
                    }
                  </BodySmall>
                  {stats?.memberSince && (
                    <BodySmall className="text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      Member since {format(new Date(stats.memberSince), 'MMM yyyy')}
                    </BodySmall>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats?.totalOrders || 0}
                  </div>
                  <BodySmall className="text-gray-500">Orders</BodySmall>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats?.totalQuotes || 0}
                  </div>
                  <BodySmall className="text-gray-500">Quotes</BodySmall>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            to="/dashboard/quotes"
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Quotes</span>
          </Link>
          <Link
            to="/profile/address"
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Addresses</span>
          </Link>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Change Password</span>
          </button>
          <Link
            to="/help"
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Get Help</span>
          </Link>
        </div>

        {/* Profile Settings Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Update your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Full Name Field */}
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          {...field}
                          className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number Field */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Phone Number
                        </FormLabel>
                        {user?.phone && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowChangePhoneModal(true)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 -mr-2"
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Change
                          </Button>
                        )}
                      </div>
                      <FormControl>
                        <div className="space-y-2">
                          {user?.phone ? (
                            // Show verified phone as read-only text (like WhatsApp/Apple)
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-900 font-medium">{user.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Verified</span>
                              </div>
                            </div>
                          ) : (
                            // Show input only for users without phone
                            <div className="[&_.text-green-500]:hidden [&_.border-green-300]:border-gray-300 [&_.ring-green-200]:ring-0 [&_.focus-within\\:border-blue-500]:focus-within:border-teal-500 [&_.focus-within\\:ring-blue-200]:focus-within:ring-teal-500/20">
                              <WorldClassPhoneInput
                                countries={Array.isArray(allCountries) ? allCountries : []}
                                value={field.value}
                                onChange={(newPhoneValue) => {
                                  field.onChange(newPhoneValue);
                                }}
                                onValidationChange={(_, error) => {
                                  setPhoneError(error || '');
                                  if (error) {
                                    form.setError('phone', { message: error });
                                  } else {
                                    form.clearErrors('phone');
                                  }
                                }}
                                initialCountry={phoneCountry || profile?.country || 'US'}
                                currentCountry={phoneCountry || profile?.country || undefined}
                                disabled={updateProfileMutation.isPending}
                                required={true}
                                error={form.formState.errors.phone?.message}
                                placeholder="Enter phone number"
                              />
                            </div>
                          )}
                          <BodySmall className="text-gray-500">
                            {user?.phone 
                              ? 'Update your phone number with secure verification.'
                              : 'Add your phone number for order updates and notifications.'
                            }
                          </BodySmall>
                        </div>
                      </FormControl>
                      {!phoneError && <FormMessage />}
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Email
                        </FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEmailModal(true)}
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 -mr-2"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Change
                        </Button>
                      </div>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="relative">
                            <Input 
                              {...field} 
                              readOnly 
                              placeholder={!field.value ? "No email address" : undefined}
                              className="pl-10 bg-gray-50 text-gray-700 cursor-default" 
                            />
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            {user?.app_metadata?.provider && user.app_metadata.provider !== 'email' && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-200 px-2 py-1 rounded">
                                {user.app_metadata.provider}
                              </span>
                            )}
                            {!field.value && user?.phone && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Phone User
                              </span>
                            )}
                          </div>
                          <BodySmall className="text-gray-500">
                            {!field.value && user?.phone 
                              ? 'You signed up with phone. You can add an email address for additional login options.'
                              : user?.app_metadata?.provider && user.app_metadata.provider !== 'email' 
                                ? `Your ${user.app_metadata.provider} email. You can add email/password login.`
                                : 'Update your email address with verification.'
                            }
                          </BodySmall>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Regional & Currency Settings */}
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-gray-600" />
                  Regional & Currency Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Choose your preferred currency for displaying prices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="preferred_display_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Preferred Currency
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={updateProfileMutation.isPending || currencyLoading}
                          key={`currency-${field.value}-${availableCurrencies.length}`}
                        >
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                              <SelectValue placeholder="Select your preferred currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCurrencies.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span>{currency.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {currency.code}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <BodySmall className="text-gray-500 mt-1">
                          Select your preferred currency for displaying prices and payments.
                        </BodySmall>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Country
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={updateProfileMutation.isPending || countriesLoading}
                          key={`country-${field.value}-${allCountries?.length}`}
                        >
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(() => {
                              if (countriesLoading) {
                                return <SelectItem key="loading" value="loading" disabled>Loading countries...</SelectItem>;
                              }
                              
                              if (countriesError) {
                                return <SelectItem key="error" value="error" disabled>Error loading countries</SelectItem>;
                              }
                              
                              if (!allCountries || !Array.isArray(allCountries) || allCountries.length === 0) {
                                return <SelectItem key="empty" value="empty" disabled>No countries available</SelectItem>;
                              }
                              
                              return allCountries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <div className="flex items-center gap-2">
                                    <span>{country.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {country.code}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        <BodySmall className="text-gray-500 mt-1">
                          Select your country for shipping and regional settings.
                        </BodySmall>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600"
                onClick={() => {
                  signOut();
                  toast({
                    title: 'Signed out successfully',
                    description: 'You have been signed out of your account.',
                  });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || currencyLoading}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending
                  ? 'Saving...'
                  : currencyLoading
                    ? 'Loading...'
                    : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Phone Collection Banner for Facebook Users */}
        {phoneCollection.needsPhoneCollection && !user?.phone && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-orange-900">Phone Number Needed</h3>
                    <p className="text-sm text-orange-700">
                      Add your phone number to receive order updates and enable all features.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPhoneModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Add Phone Number
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Phone Collection Modal */}
      <PhoneCollectionModal
        open={showPhoneModal}
        onOpenChange={setShowPhoneModal}
        onPhoneAdded={() => {
          phoneCollection.markPhoneCollected();
          setShowPhoneModal(false);
          // Refresh the user data to get the new phone number
          queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
        }}
        title="Add Your Phone Number"
        description="Complete your profile to unlock all features:"
        benefits={[
          "Real-time SMS updates for your orders",
          "Direct coordination with delivery partners",
          "Enhanced account security",
          "Priority customer support",
          "Exclusive deals and notifications"
        ]}
        showBenefits={true}
        useGradientStyling={true}
        skipOption={{
          text: "Maybe Later",
          subtext: "You can always add it from your profile settings"
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
      />

      {/* Change Email Modal */}
      <ChangeEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
      />

      {/* Change Phone Modal */}
      <ChangePhoneModal
        open={showChangePhoneModal}
        onOpenChange={setShowChangePhoneModal}
        initialCountry={profile?.country || 'US'}
        onPhoneChanged={(newPhone) => {
          // Update the form with the new phone number
          form.setValue('phone', newPhone);
          
          // Refresh the user data
          queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
          
          // Refresh auth session to get updated user object
          supabase.auth.refreshSession();
          
          // Close the modal
          setShowChangePhoneModal(false);
        }}
      />
    </div>
    </ConditionalSkeleton>
  );
};

export default Profile;
