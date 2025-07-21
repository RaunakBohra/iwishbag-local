import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  CreditCard,
  HelpCircle,
  Lock,
  LogOut,
  Settings,
  Calendar,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { currencyService, type Currency } from '@/services/CurrencyService';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { H1, Body, BodySmall } from '@/components/ui/typography';

const profileFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional(),
  phone: z.string().min(8, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  preferred_display_currency: z.string().min(1, 'Preferred currency is required'),
  preferred_payment_gateway: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allCountries } = useAllCountries();
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const { getAvailablePaymentMethods, methodsLoading } = usePaymentGateways();

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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        supabase.from('quotes').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'completed'),
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
        // Profile exists, so update it
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: values.full_name,
            phone: values.phone,
            country: values.country,
            preferred_display_currency: values.preferred_display_currency,
            preferred_payment_gateway:
              values.preferred_payment_gateway === 'auto' ? null : values.preferred_payment_gateway,
          })
          .eq('id', user.id);
        if (error) throw new Error(`Error updating profile: ${error.message}`);
      } else {
        // Profile doesn't exist, so insert it
        const { error } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: values.full_name,
          phone: values.phone,
          country: values.country,
          preferred_display_currency: values.preferred_display_currency,
          preferred_payment_gateway:
            values.preferred_payment_gateway === 'auto' ? null : values.preferred_payment_gateway,
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
      preferred_payment_gateway: 'auto',
    },
  });

  // Load available currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setCurrencyLoading(true);
        const currencies = await currencyService.getAllCurrencies();
        setAvailableCurrencies(currencies);
      } catch (error) {
        console.error('Error loading currencies:', error);
      } finally {
        setCurrencyLoading(false);
      }
    };
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (profile) {
      // Get name from profile, or fallback to user metadata, or email prefix
      const displayName =
        profile.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        '';

      form.reset({
        full_name: displayName,
        email: user?.email || '',
        phone: profile.phone || '',
        country: profile.country || 'US',
        preferred_display_currency: profile.preferred_display_currency || 'USD',
        preferred_payment_gateway: (profile as any).preferred_payment_gateway || 'auto',
      });
    }
  }, [profile, user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle currency selection - automatically set country when currency is selected
  const handleCurrencyChange = async (currencyCode: string) => {
    try {
      // Get the country associated with this currency
      const countryCode = await currencyService.getCountryForCurrency(currencyCode);
      
      // Update country in the form (currency is already updated by field.onChange)
      if (countryCode) {
        form.setValue('country', countryCode);
      }
    } catch (error) {
      console.error('Error updating country for currency:', error);
      // If error, currency is still updated by field.onChange
    }
  };

  // Get country name by code
  const getCountryName = (countryCode: string) => {
    if (!allCountries) return countryCode;
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


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid gap-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={getUserAvatarUrl() || undefined} alt={profile?.full_name || 'User'} />
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
            to="/dashboard/orders"
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Orders</span>
          </Link>
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
          <Link
            to="/help"
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Help</span>
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
                          <Input
                            type="tel"
                            placeholder="+1 234 567 8901"
                            {...field}
                            className="border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Email
                      </FormLabel>
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
                  Choose your preferred currency and payment method.
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleCurrencyChange(value);
                          }}
                          value={field.value}
                          disabled={updateProfileMutation.isPending}
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
                          Your country will be automatically set based on your currency selection.
                        </BodySmall>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hidden country field */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={() => (
                      <input type="hidden" {...form.register('country')} />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferred_payment_gateway"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Preferred Payment Method
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={updateProfileMutation.isPending || methodsLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                              <SelectValue placeholder="Choose preferred payment method (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="auto">
                              <div className="flex items-center gap-2">
                                <span>Auto-select best method</span>
                                <Badge variant="secondary" className="text-xs">
                                  Recommended
                                </Badge>
                              </div>
                            </SelectItem>
                            {getAvailablePaymentMethods().map((method) => (
                              <SelectItem key={method.code} value={method.code}>
                                <div className="flex items-center gap-2">
                                  <span>{method.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {method.fees}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <BodySmall className="text-gray-500 mt-1">
                          {field.value === 'auto' || !field.value
                            ? "We'll automatically select the best payment method for your location and order."
                            : `You've chosen ${getAvailablePaymentMethods().find((m) => m.code === field.value)?.name} as your preferred payment method.`}
                        </BodySmall>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Current Settings Summary */}
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-900">Current Settings</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-teal-600" />
                      <div>
                        <BodySmall className="text-teal-800 font-medium">
                          {getCurrencyName(form.watch('preferred_display_currency'))} ({form.watch('preferred_display_currency')})
                        </BodySmall>
                        <BodySmall className="text-teal-600">
                          {getCountryName(form.watch('country'))}
                        </BodySmall>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-teal-600" />
                      <div>
                        <BodySmall className="text-teal-800 font-medium">
                          {form.watch('preferred_payment_gateway') === 'auto' ||
                          !form.watch('preferred_payment_gateway')
                            ? 'Auto-select'
                            : getAvailablePaymentMethods().find(
                                (m) => m.code === form.watch('preferred_payment_gateway'),
                              )?.name || 'Unknown'}
                        </BodySmall>
                        <BodySmall className="text-teal-600">Payment method</BodySmall>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
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

        {/* Additional Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Shipping Addresses */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-600" />
                Shipping Addresses
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage your delivery addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Manage addresses</span>
                  </div>
                  <Link to="/profile/address">
                    <Button variant="outline" size="sm" className="text-xs">
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-600" />
                Activity Summary
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your recent activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-gray-700">{stats?.totalOrders || 0} orders</span>
                  </div>
                  <Link to="/dashboard/orders">
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">{stats?.totalQuotes || 0} quotes</span>
                  </div>
                  <Link to="/dashboard/quotes">
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security & Account Actions */}
        <Card className="border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-600" />
              Security & Account
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage your account security and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button variant="outline" className="justify-start border-gray-300 text-gray-700">
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" className="justify-start border-gray-300 text-gray-700">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Link to="/help" className="contents">
                <Button variant="outline" className="justify-start border-gray-300 text-gray-700">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center
                </Button>
              </Link>
              <Button
                variant="outline"
                className="justify-start border-red-300 text-red-600 hover:bg-red-50"
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
