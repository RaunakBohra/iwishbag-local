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
import { PaymentMethodDebug } from "@/components/profile/PaymentMethodDebug";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Globe, 
  DollarSign, 
  MapPin,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const profileFormSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email().optional(),
  phone: z.string().min(8, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  preferred_display_currency: z.string().min(1, "Preferred currency is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const Profile = () => {
  const { user } = useAuth();
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
  
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/5" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/5" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-24" />
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12">
        <p className="text-destructive">Error loading profile: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal details and contact information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
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
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+1 234 567 8901" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Regional Settings
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
                              <MapPin className="h-4 w-4" />
                              Country
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={updateProfileMutation.isPending}>
                              <FormControl>
                                <SelectTrigger>
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
                              <DollarSign className="h-4 w-4" />
                              Preferred Currency
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={updateProfileMutation.isPending}>
                              <FormControl>
                                <SelectTrigger>
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
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm">Current Settings</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Country:</span> {getCountryName(form.watch('country'))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Currency:</span> {getCurrencyName(form.watch('preferred_display_currency'))} ({form.watch('preferred_display_currency')})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Debug Component */}
                    <PaymentMethodDebug 
                      country={form.watch('country')} 
                      currency={form.watch('preferred_display_currency')} 
                    />
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
export default Profile;
