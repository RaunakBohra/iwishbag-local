import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tables } from "@/integrations/supabase/types";
import { useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const addressSchema = z.object({
<<<<<<< HEAD
  recipient_name: z.string().min(1, "Recipient name is required"),
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state_province_region: z.string().min(1, "State/Province is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country_code: z.string().min(1, "Country is required"),
<<<<<<< HEAD
  phone: z.string().min(1, "Phone number is required"),
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
  is_default: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  address?: Tables<'user_addresses'>;
  onSuccess?: () => void;
}

export function AddressForm({ address, onSuccess }: AddressFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allCountries, isLoading: countriesLoading } = useQuery({
    queryKey: ['country-settings'],
    queryFn: async () => {
        const { data, error } = await supabase.from('country_settings').select('*').order('name');
        if (error) throw new Error(error.message);
        return data || [];
    }
  });

  const countries = useMemo(() => {
    if (!allCountries) return [];
    return allCountries.filter(c => c.shipping_allowed);
  }, [allCountries]);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: address ? {
      ...address,
      country_code: address.country_code || "",
      address_line2: address.address_line2 || "",
<<<<<<< HEAD
      phone: address.phone || "",
      recipient_name: address.recipient_name || "",
    } : {
      recipient_name: "",
=======
    } : {
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
      address_line1: "",
      address_line2: "",
      city: "",
      state_province_region: "",
      postal_code: "",
      country_code: "",
<<<<<<< HEAD
      phone: "",
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
      is_default: false,
    },
  });
  
  const addressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      if (!user) throw new Error("User not authenticated");

      const countryName = countries?.find(c => c.code === values.country_code)?.name;

      const payload = {
<<<<<<< HEAD
        recipient_name: values.recipient_name,
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
        address_line1: values.address_line1,
        address_line2: values.address_line2 || null,
        city: values.city,
        state_province_region: values.state_province_region,
        postal_code: values.postal_code,
        country: countryName || values.country_code, // For backward compatibility
        country_code: values.country_code, // The new standard
<<<<<<< HEAD
        phone: values.phone,
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
        is_default: values.is_default,
      };

      if (address) {
        const { error } = await supabase
          .from("user_addresses")
          .update(payload)
          .eq("id", address.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_addresses").insert({
          ...payload,
          user_id: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_addresses", user?.id] });
      toast({
        title: address ? "Address updated" : "Address added",
        description: `Your address has been successfully ${address ? 'updated' : 'added'}.`,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: `Error ${address ? 'updating' : 'adding'} address`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddressFormValues) => {
    addressMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
<<<<<<< HEAD
        <FormField control={form.control} name="recipient_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Recipient Name</FormLabel>
            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
        <FormField control={form.control} name="address_line1" render={({ field }) => (
          <FormItem>
            <FormLabel>Address Line 1</FormLabel>
            <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address_line2" render={({ field }) => (
          <FormItem>
            <FormLabel>Address Line 2 (Optional)</FormLabel>
            <FormControl><Input placeholder="Apt, suite, etc." {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="Anytown" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="state_province_region" render={({ field }) => (
                <FormItem>
                    <FormLabel>State / Province</FormLabel>
                    <FormControl><Input placeholder="CA" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="postal_code" render={({ field }) => (
                <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl><Input placeholder="12345" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="country_code" render={({ field }) => (
                <FormItem>
                    <FormLabel>Country</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value || ''} disabled={addressMutation.isPending || countriesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a country" />
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
            )} />
        </div>
<<<<<<< HEAD
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
        <FormField
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Set as default address</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={addressMutation.isPending} className="w-full">
          {addressMutation.isPending ? "Saving..." : "Save Address"}
        </Button>
      </form>
    </Form>
  );
}
