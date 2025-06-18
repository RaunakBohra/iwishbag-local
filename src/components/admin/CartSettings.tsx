import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CartSettings = {
  id: string;
  bulk_discount_threshold: number;
  bulk_discount_percentage: number;
  member_discount_percentage: number;
  seasonal_discount_percentage: number;
  seasonal_discount_start_month: number;
  seasonal_discount_end_month: number;
  free_shipping_threshold: number;
  shipping_rate_percentage: number;
  tax_rate_percentage: number;
  is_seasonal_discount_active: boolean;
  created_at: string;
  updated_at: string;
};

export const CartSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['cart-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data as CartSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<CartSettings>) => {
      const { data, error } = await supabase
        .from('cart_settings')
        .update(newSettings)
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from update');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart-settings'] });
      toast({
        title: "Settings Updated",
        description: "Cart settings have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating cart settings:', error);
      toast({
        title: "Error",
        description: "Failed to update cart settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync({
        bulk_discount_threshold: Number(settings?.bulk_discount_threshold),
        bulk_discount_percentage: Number(settings?.bulk_discount_percentage),
        member_discount_percentage: Number(settings?.member_discount_percentage),
        seasonal_discount_percentage: Number(settings?.seasonal_discount_percentage),
        seasonal_discount_start_month: Number(settings?.seasonal_discount_start_month),
        seasonal_discount_end_month: Number(settings?.seasonal_discount_end_month),
        free_shipping_threshold: Number(settings?.free_shipping_threshold),
        shipping_rate_percentage: Number(settings?.shipping_rate_percentage),
        tax_rate_percentage: Number(settings?.tax_rate_percentage),
        is_seasonal_discount_active: settings?.is_seasonal_discount_active,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Validation logic
  const validate = (field: string, value: number | boolean) => {
    let error = '';
    if (typeof value === 'number') {
      if (value < 0) error = 'Value cannot be negative.';
      if (field.includes('percentage') && (value < 0 || value > 100)) error = 'Percentage must be between 0 and 100.';
      if (field.includes('threshold') && value > 1000000) error = 'Threshold is too high.';
      if (field.includes('month') && (value < 1 || value > 12)) error = 'Month must be between 1 and 12.';
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cart Settings</h1>
            <p className="text-muted-foreground">
              Manage cart analytics, discounts, and shipping settings
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="discounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & Taxes</TabsTrigger>
            <TabsTrigger value="seasonal">Seasonal Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="discounts">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Discount</CardTitle>
                  <CardDescription>
                    Set the threshold and percentage for bulk purchase discounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-threshold">
                        Item Threshold
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Number of items required to activate bulk discount.</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="bulk-threshold"
                        type="number"
                        value={settings?.bulk_discount_threshold}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (validate('bulk_discount_threshold', value)) {
                            const newSettings = { ...settings, bulk_discount_threshold: value };
                            updateSettings.mutate(newSettings);
                          }
                        }}
                      />
                      {errors.bulk_discount_threshold && (
                        <span className="text-red-500 text-xs">{errors.bulk_discount_threshold}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-percentage">
                        Discount Percentage
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Percentage discount applied when threshold is met (0-100).</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="bulk-percentage"
                        type="number"
                        value={settings?.bulk_discount_percentage}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (validate('bulk_discount_percentage', value)) {
                            const newSettings = { ...settings, bulk_discount_percentage: value };
                            updateSettings.mutate(newSettings);
                          }
                        }}
                      />
                      {errors.bulk_discount_percentage && (
                        <span className="text-red-500 text-xs">{errors.bulk_discount_percentage}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Member Discount</CardTitle>
                  <CardDescription>
                    Set the discount percentage for member purchases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="member-percentage">
                      Discount Percentage
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>Percentage discount applied for members (0-100).</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="member-percentage"
                      type="number"
                      value={settings?.member_discount_percentage}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (validate('member_discount_percentage', value)) {
                          const newSettings = { ...settings, member_discount_percentage: value };
                          updateSettings.mutate(newSettings);
                        }
                      }}
                    />
                    {errors.member_discount_percentage && (
                      <span className="text-red-500 text-xs">{errors.member_discount_percentage}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shipping">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping & Tax Settings</CardTitle>
                  <CardDescription>
                    Configure shipping and tax rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="free-shipping-threshold">
                        Free Shipping Threshold
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Order amount required for free shipping.</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="free-shipping-threshold"
                        type="number"
                        value={settings?.free_shipping_threshold}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (validate('free_shipping_threshold', value)) {
                            const newSettings = { ...settings, free_shipping_threshold: value };
                            updateSettings.mutate(newSettings);
                          }
                        }}
                      />
                      {errors.free_shipping_threshold && (
                        <span className="text-red-500 text-xs">{errors.free_shipping_threshold}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-rate">
                        Shipping Rate Percentage
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Percentage applied to order for shipping (0-100).</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="shipping-rate"
                        type="number"
                        value={settings?.shipping_rate_percentage}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (validate('shipping_rate_percentage', value)) {
                            const newSettings = { ...settings, shipping_rate_percentage: value };
                            updateSettings.mutate(newSettings);
                          }
                        }}
                      />
                      {errors.shipping_rate_percentage && (
                        <span className="text-red-500 text-xs">{errors.shipping_rate_percentage}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">
                      Tax Rate Percentage
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>Percentage applied to order for tax (0-100).</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      value={settings?.tax_rate_percentage}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (validate('tax_rate_percentage', value)) {
                          const newSettings = { ...settings, tax_rate_percentage: value };
                          updateSettings.mutate(newSettings);
                        }
                      }}
                    />
                    {errors.tax_rate_percentage && (
                      <span className="text-red-500 text-xs">{errors.tax_rate_percentage}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="seasonal">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Discount</CardTitle>
                  <CardDescription>
                    Configure seasonal discount settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seasonal-start-month">
                        Start Month
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Month when seasonal discount starts (1-12).</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="seasonal-start-month"
                        type="number"
                        value={settings?.seasonal_discount_start_month}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (validate('seasonal_discount_start_month', value)) {
                            const newSettings = { ...settings, seasonal_discount_start_month: value };
                            updateSettings.mutate(newSettings);
                          }
                        }}
                      />
                      {errors.seasonal_discount_start_month && (
                        <span className="text-red-500 text-xs">{errors.seasonal_discount_start_month}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seasonal-end-month">
                        End Month
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>Month when seasonal discount ends (1-12).</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="seasonal-end-month"
                        type="number"
                        value={settings?.seasonal_discount_end_month}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (validate('seasonal_discount_end_month', value)) {
                            const newSettings = { ...settings, seasonal_discount_end_month: value };
                            updateSettings.mutate(newSettings);
                          }
                        }}
                      />
                      {errors.seasonal_discount_end_month && (
                        <span className="text-red-500 text-xs">{errors.seasonal_discount_end_month}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seasonal-percentage">
                      Seasonal Discount Percentage
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="inline ml-1 h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>Percentage discount applied during seasonal period (0-100).</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="seasonal-percentage"
                      type="number"
                      value={settings?.seasonal_discount_percentage}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (validate('seasonal_discount_percentage', value)) {
                          const newSettings = { ...settings, seasonal_discount_percentage: value };
                          updateSettings.mutate(newSettings);
                        }
                      }}
                    />
                    {errors.seasonal_discount_percentage && (
                      <span className="text-red-500 text-xs">{errors.seasonal_discount_percentage}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="seasonal-active"
                      checked={settings?.is_seasonal_discount_active}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...settings, is_seasonal_discount_active: checked };
                        updateSettings.mutate(newSettings);
                      }}
                    />
                    <Label htmlFor="seasonal-active">Enable Seasonal Discount</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}; 