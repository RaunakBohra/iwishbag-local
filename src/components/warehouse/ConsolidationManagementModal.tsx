import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Database } from '@/types/database';
import {
  Package,
  PackageCheck,
  Scale,
  Truck,
  User,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Save,
  Combine,
  ShippingBox,
  Calculator,
} from 'lucide-react';

type ReceivedPackage = Database['public']['Tables']['received_packages']['Row'] & {
  warehouse_suite_addresses?: Database['public']['Tables']['warehouse_suite_addresses']['Row'] & {
    profiles?: Database['public']['Tables']['profiles']['Row'];
  };
};

// Validation schema for consolidation
const consolidationSchema = z.object({
  consolidation_group_id: z.string().min(1, 'Consolidation group ID is required'),
  shipping_method: z.string().min(1, 'Shipping method is required'),
  consolidation_notes: z.string().optional(),
  estimated_shipping_cost: z.number().min(0).optional(),
  target_ship_date: z.string().optional(),
  special_handling_instructions: z.string().optional(),
  consolidation_type: z.enum(['standard', 'express', 'fragile', 'oversized']),
  max_weight_kg: z.number().min(0.1).max(500).optional(),
  max_dimensions_cm: z.object({
    length: z.number().min(1),
    width: z.number().min(1), 
    height: z.number().min(1),
  }).optional(),
});

type ConsolidationFormData = z.infer<typeof consolidationSchema>;

interface ConsolidationManagementModalProps {
  customerId?: string;
  existingPackages?: ReceivedPackage[];
  isOpen: boolean;
  onClose: () => void;
}

const SHIPPING_METHODS = [
  { value: 'standard_shipping', label: 'Standard Shipping', estimatedDays: '7-14 days', cost: 15 },
  { value: 'express_shipping', label: 'Express Shipping', estimatedDays: '3-7 days', cost: 25 },
  { value: 'priority_shipping', label: 'Priority Shipping', estimatedDays: '2-5 days', cost: 45 },
  { value: 'air_cargo', label: 'Air Cargo', estimatedDays: '5-10 days', cost: 35 },
  { value: 'sea_cargo', label: 'Sea Cargo', estimatedDays: '30-45 days', cost: 8 },
];

const CONSOLIDATION_TYPES = [
  { value: 'standard', label: 'Standard', description: 'Regular packaging and handling' },
  { value: 'express', label: 'Express', description: 'Priority processing and shipping' },
  { value: 'fragile', label: 'Fragile Items', description: 'Extra protective packaging' },
  { value: 'oversized', label: 'Oversized', description: 'Special handling for large items' },
];

export const ConsolidationManagementModal: React.FC<ConsolidationManagementModalProps> = ({
  customerId,
  existingPackages,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('packages');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  // Fetch available packages for consolidation
  const { data: availablePackages, isLoading: packagesLoading } = useQuery({
    queryKey: ['consolidation-available-packages', customerId],
    queryFn: async () => {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          warehouse_suite_addresses (
            *,
            profiles (
              id,
              full_name,
              email,
              country
            )
          )
        `)
        .eq('package_status', 'ready_for_consolidation')
        .is('consolidation_group_id', null);

      if (customerId) {
        query = query.eq('warehouse_suite_addresses.profiles.id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as ReceivedPackage[];
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  // Form setup
  const form = useForm<ConsolidationFormData>({
    resolver: zodResolver(consolidationSchema),
    defaultValues: {
      consolidation_group_id: `CON-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      shipping_method: 'standard_shipping',
      consolidation_notes: '',
      estimated_shipping_cost: 0,
      target_ship_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      special_handling_instructions: '',
      consolidation_type: 'standard',
      max_weight_kg: 50,
      max_dimensions_cm: { length: 60, width: 40, height: 40 },
    },
  });

  // Consolidation creation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: async (data: ConsolidationFormData & { packageIds: string[] }) => {
      if (data.packageIds.length === 0) {
        throw new Error('No packages selected for consolidation');
      }

      // Create consolidation record first (you'd need to create this table)
      const consolidationData = {
        consolidation_group_id: data.consolidation_group_id,
        customer_id: customerId,
        shipping_method: data.shipping_method,
        consolidation_notes: data.consolidation_notes,
        estimated_shipping_cost: data.estimated_shipping_cost,
        target_ship_date: data.target_ship_date,
        special_handling_instructions: data.special_handling_instructions,
        consolidation_type: data.consolidation_type,
        max_weight_kg: data.max_weight_kg,
        max_dimensions_cm: data.max_dimensions_cm,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Update packages with consolidation group ID
      const { error: updateError } = await supabase
        .from('received_packages')
        .update({
          consolidation_group_id: data.consolidation_group_id,
          package_status: 'consolidating',
          updated_at: new Date().toISOString(),
        })
        .in('id', data.packageIds);

      if (updateError) {
        throw new Error(`Failed to update packages: ${updateError.message}`);
      }

      return { consolidationData, packageCount: data.packageIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-packages'] });
      queryClient.invalidateQueries({ queryKey: ['consolidation-available-packages'] });
      
      toast({
        title: 'Consolidation created successfully',
        description: `Consolidation group ${result.consolidationData.consolidation_group_id} created with ${result.packageCount} packages.`,
      });
      
      form.reset();
      setSelectedPackages([]);
      onClose();
    },
    onError: (error: any) => {
      console.error('Consolidation creation error:', error);
      toast({
        title: 'Failed to create consolidation',
        description: error.message || 'An error occurred while creating the consolidation.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ConsolidationFormData) => {
    createConsolidationMutation.mutate({
      ...data,
      packageIds: selectedPackages,
    });
  };

  const handleCancel = () => {
    form.reset();
    setSelectedPackages([]);
    onClose();
  };

  // Calculate totals for selected packages
  const selectedPackageData = availablePackages?.filter(pkg => selectedPackages.includes(pkg.id)) || [];
  const totalWeight = selectedPackageData.reduce((sum, pkg) => sum + (pkg.weight_kg || 0), 0);
  const totalPackages = selectedPackageData.length;

  // Calculate estimated shipping cost
  const selectedShippingMethod = SHIPPING_METHODS.find(m => m.value === form.watch('shipping_method'));
  const baseShippingCost = selectedShippingMethod?.cost || 0;
  const weightBasedCost = totalWeight * 2.5; // $2.50 per kg
  const estimatedCost = Math.max(baseShippingCost, weightBasedCost);

  // Update estimated cost when shipping method or weight changes
  React.useEffect(() => {
    form.setValue('estimated_shipping_cost', estimatedCost);
  }, [form, estimatedCost]);

  const togglePackageSelection = (packageId: string) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
  };

  const selectAllPackages = () => {
    const allIds = availablePackages?.map(pkg => pkg.id) || [];
    setSelectedPackages(allIds);
  };

  const clearSelection = () => {
    setSelectedPackages([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Create Consolidation Group
          </DialogTitle>
          <DialogDescription>
            Combine multiple packages into a single shipment to reduce costs and improve delivery efficiency.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="packages" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packages ({totalPackages})
                </TabsTrigger>
                <TabsTrigger value="shipping" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping
                </TabsTrigger>
                <TabsTrigger value="consolidation" className="flex items-center gap-2">
                  <Combine className="h-4 w-4" />
                  Consolidation
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Summary
                </TabsTrigger>
              </TabsList>

              {/* Package Selection Tab */}
              <TabsContent value="packages" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Select Packages for Consolidation</h4>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={selectAllPackages}
                      disabled={!availablePackages?.length}
                    >
                      Select All
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={clearSelection}
                      disabled={selectedPackages.length === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>

                {packagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading available packages...</p>
                  </div>
                ) : availablePackages?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availablePackages.map((pkg) => {
                      const isSelected = selectedPackages.includes(pkg.id);
                      
                      return (
                        <div
                          key={pkg.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => togglePackageSelection(pkg.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded"
                              />
                              <Badge variant="outline" className="text-xs">
                                {pkg.tracking_number}
                              </Badge>
                            </div>
                            <Badge variant={pkg.package_condition === 'good' ? 'default' : 'destructive'} className="text-xs">
                              {pkg.package_condition}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Weight:</span>
                              <span className="font-medium">{pkg.weight_kg} kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Sender:</span>
                              <span className="truncate ml-2">{pkg.sender_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Received:</span>
                              <span>{pkg.received_at ? new Date(pkg.received_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Suite:</span>
                              <span className="font-medium">{pkg.warehouse_suite_addresses?.suite_number}</span>
                            </div>
                          </div>
                          
                          {pkg.contents_description && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-600 truncate" title={pkg.contents_description}>
                                {pkg.contents_description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages available</h3>
                    <p className="text-gray-500">No packages are currently ready for consolidation.</p>
                  </div>
                )}
              </TabsContent>

              {/* Shipping Configuration Tab */}
              <TabsContent value="shipping" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Shipping Details</h4>
                    
                    <FormField
                      control={form.control}
                      name="consolidation_group_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consolidation Group ID *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="CON-2024-001"
                              {...field}
                              className="uppercase"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shipping_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shipping method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SHIPPING_METHODS.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  <div className="flex flex-col">
                                    <span>{method.label}</span>
                                    <span className="text-xs text-gray-500">
                                      {method.estimatedDays} • Base cost: ${method.cost}
                                    </span>
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
                      name="target_ship_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Ship Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Cost Estimation</h4>
                    
                    <FormField
                      control={form.control}
                      name="estimated_shipping_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Shipping Cost (USD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Auto-calculated based on weight and shipping method
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-2">Cost Breakdown</h5>
                      <div className="space-y-1 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Base shipping rate:</span>
                          <span>${baseShippingCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Weight-based cost ({totalWeight.toFixed(1)} kg):</span>
                          <span>${weightBasedCost.toFixed(2)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-medium">
                          <span>Estimated total:</span>
                          <span>${estimatedCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Consolidation Settings Tab */}
              <TabsContent value="consolidation" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Consolidation Settings</h4>
                    
                    <FormField
                      control={form.control}
                      name="consolidation_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consolidation Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select consolidation type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONSOLIDATION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex flex-col">
                                    <span>{type.label}</span>
                                    <span className="text-xs text-gray-500">{type.description}</span>
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
                      name="max_weight_kg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Weight Limit (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0.1"
                              max="500"
                              step="0.1"
                              placeholder="50"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="max_dimensions_cm.length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Length (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="60"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_dimensions_cm.width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Width (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="40"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_dimensions_cm.height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Height (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="40"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="consolidation_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consolidation Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notes about this consolidation group..."
                              {...field}
                              rows={4}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            These notes will be visible to warehouse staff and customers
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="special_handling_instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Handling Instructions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special handling requirements..."
                              {...field}
                              rows={4}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Instructions for warehouse staff during consolidation
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Consolidation Summary</h4>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Consolidation ID:</span>
                          <span className="font-medium font-mono text-sm">
                            {form.watch('consolidation_group_id')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Packages:</span>
                          <span className="font-medium">{totalPackages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Weight:</span>
                          <span className="font-medium">{totalWeight.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping Method:</span>
                          <span className="font-medium">
                            {SHIPPING_METHODS.find(m => m.value === form.watch('shipping_method'))?.label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Cost:</span>
                          <span className="font-medium text-green-600">
                            ${form.watch('estimated_shipping_cost')?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Target Ship Date:</span>
                          <span className="font-medium">
                            {form.watch('target_ship_date') 
                              ? new Date(form.watch('target_ship_date')).toLocaleDateString()
                              : 'Not set'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {totalPackages === 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-900">No Packages Selected</p>
                            <p className="text-amber-700">
                              Please select at least one package to create a consolidation group.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Selected Packages</h4>
                    
                    {selectedPackageData.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedPackageData.map((pkg) => (
                          <div key={pkg.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.tracking_number}
                                  </Badge>
                                  <span className="text-xs text-gray-500">{pkg.weight_kg} kg</span>
                                </div>
                                <p className="text-sm font-medium">{pkg.sender_name}</p>
                                <p className="text-xs text-gray-500">
                                  Suite: {pkg.warehouse_suite_addresses?.suite_number}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePackageSelection(pkg.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No packages selected</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-gray-500">
                Consolidation will reduce shipping costs and improve delivery efficiency.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createConsolidationMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createConsolidationMutation.isPending || totalPackages === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createConsolidationMutation.isPending ? 'Creating...' : 'Create Consolidation'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsolidationManagementModal;