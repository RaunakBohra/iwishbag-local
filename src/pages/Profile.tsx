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
import { PhoneCollectionModal } from '@/components/auth/PhoneCollectionModal';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
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
import { Skeleton, SkeletonForm, SkeletonText, SkeletonButton } from '@/components/ui/skeleton';
import { ConditionalSkeleton, SkeletonLoader } from '@/components/ui/skeleton-loader';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Globe,
  DollarSign,
  MapPin,
  CheckCircle,
  AlertCircle,
  Shield,
  Bell,
  Save,
  Package,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Settings,
  Calendar,
  Target,
  Phone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { currencyService, type Currency } from '@/services/CurrencyService';
import { H1, Body, BodySmall } from '@/components/ui/typography';
import { WorldClassPhoneInput } from '@/components/ui/WorldClassPhoneInput';

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
  const [phoneError, setPhoneError] = useState<string>('');

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

  const getUserInitials = () => {
    const name = profile?.full_name || user?.email || 'User';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [ordersResult, quotesResult] = await Promise.all([
        supabase
          .from('quotes')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        supabase.from('quotes').select('id', { count: 'exact' }).eq('user_id', user.id),
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
    onSuccess: () => {
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
      email: user?.email || '',
      phone: '',
      country: 'US',
      preferred_display_currency: 'USD',
    },
  });

  // Load available currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setCurrencyLoading(true);
        console.log('[Profile] Loading currencies...');
        const currencies = await currencyService.getAllCurrencies();
        console.log('[Profile] Received currencies:', currencies);
        console.log('[Profile] Currency count:', currencies?.length);
        console.log('[Profile] First 5 currencies:', currencies?.slice(0, 5));
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
    // Wait for both countries and currencies to be loaded before resetting form
    if (!allCountries || allCountries.length === 0 || availableCurrencies.length === 0) {
      console.log('[Profile] Waiting for data to load before resetting form...');
      return;
    }

    // Always get display name, even if no profile exists yet
    const displayName =
      profile?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      '';

    // Get phone from auth.users.phone instead of profiles.phone
    const userPhone = user?.phone || user?.user_metadata?.phone || '';

    // Set form values whether profile exists or not
    console.log('[Profile] Resetting form with values:', {
      country: profile?.country || 'US',
      preferred_display_currency: profile?.preferred_display_currency || 'USD'
    });
    
    form.reset({
      full_name: displayName,
      email: user?.email || '',
      phone: userPhone,
      country: profile?.country || 'US',
      preferred_display_currency: profile?.preferred_display_currency || 'USD',
    });
  }, [profile, user, form, allCountries, availableCurrencies]);

  const onSubmit = (data: ProfileFormValues) => {
    // Check if there's a phone validation error
    if (phoneError) {
      toast({
        title: 'Please fix form errors',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }
    updateProfileMutation.mutate(data);
  };

  // No auto-switching - user controls both country and currency independently

  // Get country name by code
  const getCountryName = (countryCode: string) => {
    if (!allCountries || !Array.isArray(allCountries)) return countryCode;
    const country = allCountries.find((c) => c.code === countryCode);
    return country?.name || countryCode;
  };

  // Get currency name by code
  const getCurrencyName = (currencyCode: string) => {
    // Try to get from loaded currencies first
    const currency = availableCurrencies.find((c) => c.code === currencyCode);
    if (currency) {
      return currency.name;
    }

    // Use CurrencyService fallback instead of hardcoded values
    try {
      return currencyService.getCurrencyName(currencyCode);
    } catch (error) {
      console.warn('Failed to get currency name from service:', error);
      return currencyCode;
    }
  };

  // Determine if we should show skeleton
  const showSkeleton = isLoading || countriesLoading || currencyLoading || !allCountries || availableCurrencies.length === 0;

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
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
          <div className="max-w-4xl mx-auto px-4 py-8">
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
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={getUserAvatarUrl() || undefined}
                    alt={profile?.full_name || 'User'}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xl font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <H1 className="text-2xl mb-1">
                    {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                  </H1>
                  <BodySmall className="text-gray-600">{user?.email}</BodySmall>
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
      <div className="max-w-4xl mx-auto px-4 py-8">
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
                <div className="grid gap-6 md:grid-cols-2">
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
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <div className="[&_.text-green-500]:hidden [&_.border-green-300]:border-gray-300 [&_.ring-green-200]:ring-0 [&_.focus-within\\:border-blue-500]:focus-within:border-teal-500 [&_.focus-within\\:ring-blue-200]:focus-within:ring-teal-500/20">
                            <WorldClassPhoneInput
                              countries={allCountries || []}
                              value={field.value}
                              onChange={(newPhoneValue) => {
                                field.onChange(newPhoneValue);
                              }}
                              onValidationChange={(isValid, error) => {
                                setPhoneError(error || '');
                                if (error) {
                                  form.setError('phone', { message: error });
                                } else {
                                  form.clearErrors('phone');
                                }
                              }}
                              initialCountry={profile?.country || 'US'}
                              currentCountry={form.watch('country')}
                              disabled={updateProfileMutation.isPending}
                              required={true}
                              error={form.formState.errors.phone?.message}
                              placeholder="Enter phone number"
                            />
                          </div>
                        </FormControl>
                        {!phoneError && <FormMessage />}
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} disabled className="pl-10 bg-gray-50 text-gray-500" />
                          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </FormControl>
                      <BodySmall className="text-gray-500 mt-1">
                        Your email address is managed by your account and cannot be changed here.
                      </BodySmall>
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
                              console.log('[Profile] Rendering country dropdown:', {
                                allCountriesExists: !!allCountries,
                                isArray: Array.isArray(allCountries),
                                length: allCountries?.length,
                                countriesLoading,
                                countriesError
                              });
                              
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
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
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
    </div>
    </ConditionalSkeleton>
  );
};

export default Profile;
