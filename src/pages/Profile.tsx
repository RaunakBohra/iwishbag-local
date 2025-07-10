import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAllCountries } from "@/hooks/useAllCountries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Globe, 
  DollarSign, 
  MapPin,
  CheckCircle,
  AlertCircle,
  Shield,
  Bell,
  Languages,
  Palette,
  Mail,
  Phone,
  Save,
  Package,
  FileText,
  Calendar,
  ArrowRight,
  CreditCard,
  Truck,
  HelpCircle,
  Lock,
  LogOut
} from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { AddressList } from "@/components/profile/AddressList";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const profileFormSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email().optional(),
  phone: z.string().min(8, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  preferred_display_currency: z.string().min(1, "Preferred currency is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allCountries } = useAllCountries();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
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
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const [ordersResult, quotesResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: 'exact' })
          .eq("user_id", user.id),
        supabase
          .from("quotes")
          .select("id", { count: 'exact' })
          .eq("user_id", user.id)
      ]);

      return {
        totalOrders: ordersResult.count || 0,
        totalQuotes: quotesResult.count || 0,
        memberSince: user.created_at
      };
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!user) throw new Error("User not authenticated");

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
          .from("profiles")
          .update({
            full_name: values.full_name,
            phone: values.phone,
            country: values.country,
            preferred_display_currency: values.preferred_display_currency,
          })
          .eq("id", user.id);
        if (error) throw new Error(`Error updating profile: ${error.message}`);
      } else {
        // Profile doesn't exist, so insert it
        const { error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: values.full_name,
            phone: values.phone,
            country: values.country,
            preferred_display_currency: values.preferred_display_currency,
          });
        if (error) throw new Error(`Error creating profile: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: "",
      email: user?.email || "",
      phone: "",
      country: "US",
      preferred_display_currency: "USD",
    },
  });

  useEffect(() => {
    if (profile) {
      // Get name from profile, or fallback to user metadata, or email prefix
      const displayName = profile.full_name || 
                         user?.user_metadata?.name || 
                         user?.user_metadata?.full_name || 
                         user?.email?.split('@')[0] || 
                         "";
      
      form.reset({
        full_name: displayName,
        email: user?.email || "",
        phone: profile.phone || "",
        country: profile.country || "US",
        preferred_display_currency: profile.preferred_display_currency || "USD",
      });
    }
  }, [profile, user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Get available currencies for selected country
  const getAvailableCurrencies = (countryCode: string) => {
    if (!allCountries) return [];
    
    const country = allCountries.find(c => c.code === countryCode);
    if (country) {
      return [country.currency].filter(Boolean);
    }
    
    // Fallback currencies
    return ['USD', 'EUR', 'GBP', 'INR', 'NPR'];
  };

  // Get country name by code
  const getCountryName = (countryCode: string) => {
    if (!allCountries) return countryCode;
    const country = allCountries.find(c => c.code === countryCode);
    return country?.name || countryCode;
  };

  // Get currency name by code
  const getCurrencyName = (currencyCode: string) => {
    const currencyNames: Record<string, string> = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'INR': 'Indian Rupee',
      'NPR': 'Nepalese Rupee',
      'CAD': 'Canadian Dollar',
      'AUD': 'Australian Dollar',
      'JPY': 'Japanese Yen',
      'CNY': 'Chinese Yuan',
      'SGD': 'Singapore Dollar',
    };
    return currencyNames[currencyCode] || currencyCode;
  };

  // Profile completion percentage
  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    let completed = 0;
    const fields = ['full_name', 'phone', 'country', 'preferred_display_currency'];
    fields.forEach(field => {
      if (profile[field as keyof typeof profile]) completed++;
    });
    return Math.round((completed / fields.length) * 100);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container py-12">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <Skeleton className="w-24 h-24 mx-auto rounded-full" />
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            <div className="grid gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container py-12">
          <AnimatedSection animation="fadeIn">
            <Card className="max-w-md mx-auto text-center">
              <CardContent className="pt-6">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive">Error loading profile: {error.message}</p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Profile Header */}
          <AnimatedSection animation="fadeInDown">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-bold">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold">
                      {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                    </h1>
                    <p className="text-white/90">{user?.email}</p>
                    {stats?.memberSince && (
                      <p className="text-sm text-white/75 mt-1">
                        Member since {format(new Date(stats.memberSince), 'MMMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold">
                        <AnimatedCounter end={stats?.totalOrders || 0} />
                      </p>
                      <p className="text-sm text-white/75">Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">
                        <AnimatedCounter end={stats?.totalQuotes || 0} />
                      </p>
                      <p className="text-sm text-white/75">Quotes</p>
                    </div>
                  </div>
                </div>
                
                {/* Profile Completion */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/90">Profile Completion</span>
                    <span className="text-sm font-medium">
                      <AnimatedCounter end={calculateProfileCompletion()} suffix="%" />
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500"
                      style={{ width: `${calculateProfileCompletion()}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </AnimatedSection>

          {/* Quick Actions */}
          <AnimatedSection animation="fadeInUp" delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link to="/dashboard/orders" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">View Orders</span>
                  </Link>
                  <Link to="/dashboard/quotes" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">View Quotes</span>
                  </Link>
                  <Link to="/profile/address" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Addresses</span>
                  </Link>
                  <Link to="/help" className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <HelpCircle className="h-6 w-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium">Get Help</span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Personal Information */}
          <AnimatedSection animation="fadeInUp" delay={200}>
            <Card className="hover:shadow-lg transition-shadow">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                        <User className="h-5 w-5" />
                      </div>
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal details and contact information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              Full Name
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} className="hover:border-primary transition-colors" />
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
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+1 234 567 8901" {...field} className="hover:border-primary transition-colors" />
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
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input {...field} disabled className="pl-10" />
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="group"
                    >
                      <Save className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </AnimatedSection>

          {/* Shipping Addresses */}
          <AnimatedSection animation="fadeInUp" delay={300}>
            <AddressList />
          </AnimatedSection>

          {/* Regional & Currency Settings */}
          <AnimatedSection animation="fadeInUp" delay={400}>
            <Card className="hover:shadow-lg transition-shadow">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                        <Globe className="h-5 w-5" />
                      </div>
                      Regional & Currency Settings
                    </CardTitle>
                    <CardDescription>
                      Configure your country and currency preferences for better payment options and pricing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              Country
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={updateProfileMutation.isPending}>
                              <FormControl>
                                <SelectTrigger className="hover:border-primary transition-colors">
                                  <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allCountries?.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{country.name}</span>
                                      {country.currency && (
                                        <Badge variant="outline" className="text-xs">
                                          {country.currency}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferred_display_currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              Preferred Currency
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={updateProfileMutation.isPending}>
                              <FormControl>
                                <SelectTrigger className="hover:border-primary transition-colors">
                                  <SelectValue placeholder="Select your preferred currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getAvailableCurrencies(form.watch('country')).map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    <div className="flex items-center gap-2">
                                      <span>{getCurrencyName(currency)}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {currency}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Current Settings Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Current Settings
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Country</p>
                            <p className="font-medium">{getCountryName(form.watch('country'))}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Currency</p>
                            <p className="font-medium">{getCurrencyName(form.watch('preferred_display_currency'))} ({form.watch('preferred_display_currency')})</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="group"
                    >
                      <Save className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </AnimatedSection>

          {/* Payment Methods */}
          <AnimatedSection animation="fadeInUp" delay={500}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Manage your saved payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  No saved payment methods. Payment methods will be saved when you make your first purchase.
                </p>
                <Link to="/dashboard/orders">
                  <Button variant="outline" className="w-full">
                    View Order History
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Order History Summary */}
          <AnimatedSection animation="fadeInUp" delay={600}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white">
                    <Truck className="h-5 w-5" />
                  </div>
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your recent orders and quotes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Total Orders</p>
                        <p className="text-sm text-gray-600">View all your orders</p>
                      </div>
                    </div>
                    <Link to="/dashboard/orders">
                      <Button variant="ghost" size="sm" className="group">
                        {stats?.totalOrders || 0} orders
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Total Quotes</p>
                        <p className="text-sm text-gray-600">View all your quotes</p>
                      </div>
                    </div>
                    <Link to="/dashboard/quotes">
                      <Button variant="ghost" size="sm" className="group">
                        {stats?.totalQuotes || 0} quotes
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Security & Privacy */}
          <AnimatedSection animation="fadeInUp" delay={700}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  Security & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your account security and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Notification Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      signOut();
                      toast({
                        title: "Signed out successfully",
                        description: "You have been signed out of your account.",
                      });
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Notifications & Communications */}
          <AnimatedSection animation="fadeInUp" delay={800}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
                    <Bell className="h-5 w-5" />
                  </div>
                  Notifications & Communications
                </CardTitle>
                <CardDescription>
                  Manage how we communicate with you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Configure your email preferences and notification settings
                </p>
                <Button variant="outline" className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  Configure Notifications
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Help & Support */}
          <AnimatedSection animation="fadeInUp" delay={900}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  Help & Support
                </CardTitle>
                <CardDescription>
                  Get help with your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Link to="/help" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help Center
                    </Button>
                  </Link>
                  <Button variant="outline" className="justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default Profile;