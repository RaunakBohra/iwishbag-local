import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Package,
  Scale,
  Truck,
  MapPin,
  User,
  AlertTriangle,
  Camera,
  FileText,
  Save,
  X,
  Plus,
} from 'lucide-react';

// Validation schema for package receiving
const packageReceivingSchema = z.object({
  tracking_number: z.string().min(1, 'Tracking number is required'),
  sender_name: z.string().min(1, 'Sender name is required'),
  sender_address: z.string().optional(),
  warehouse_location: z.string().min(1, 'Warehouse location is required'),
  suite_number: z.string().min(1, 'Suite number is required'),
  weight_kg: z.number().min(0.1, 'Weight must be at least 0.1 kg').max(100, 'Weight cannot exceed 100 kg'),
  dimensions_cm: z.object({
    length: z.number().min(1, 'Length required'),
    width: z.number().min(1, 'Width required'),
    height: z.number().min(1, 'Height required'),
  }).optional(),
  package_condition: z.enum(['good', 'damaged', 'opened', 'missing_items']),
  contents_description: z.string().optional(),
  special_instructions: z.string().optional(),
  photos: z.array(z.string()).optional(), // Base64 encoded images
  received_by: z.string().min(1, 'Receiver name is required'),
});

type PackageReceivingFormData = z.infer<typeof packageReceivingSchema>;

interface PackageReceivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteAddressId?: string;
  prefilledData?: Partial<PackageReceivingFormData>;
}

const WAREHOUSE_LOCATIONS = [
  { value: 'usa_primary', label: 'USA Primary (Delaware)' },
  { value: 'usa_secondary', label: 'USA Secondary (Oregon)' },
  { value: 'uk_primary', label: 'UK Primary (London)' },
  { value: 'canada_primary', label: 'Canada Primary (Vancouver)' },
];

const PACKAGE_CONDITIONS = [
  { value: 'good', label: 'Good Condition', color: 'text-green-600' },
  { value: 'damaged', label: 'Damaged', color: 'text-red-600' },
  { value: 'opened', label: 'Package Opened', color: 'text-orange-600' },
  { value: 'missing_items', label: 'Missing Items', color: 'text-red-600' },
];

export const PackageReceivingModal: React.FC<PackageReceivingModalProps> = ({
  isOpen,
  onClose,
  suiteAddressId,
  prefilledData,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [uploading, setUploading] = useState(false);

  // Form setup
  const form = useForm<PackageReceivingFormData>({
    resolver: zodResolver(packageReceivingSchema),
    defaultValues: {
      tracking_number: prefilledData?.tracking_number || '',
      sender_name: prefilledData?.sender_name || '',
      sender_address: prefilledData?.sender_address || '',
      warehouse_location: prefilledData?.warehouse_location || 'usa_primary',
      suite_number: prefilledData?.suite_number || '',
      weight_kg: prefilledData?.weight_kg || 0,
      dimensions_cm: prefilledData?.dimensions_cm || { length: 0, width: 0, height: 0 },
      package_condition: prefilledData?.package_condition || 'good',
      contents_description: prefilledData?.contents_description || '',
      special_instructions: prefilledData?.special_instructions || '',
      photos: prefilledData?.photos || [],
      received_by: prefilledData?.received_by || '',
    },
  });

  // Package creation mutation
  const createPackageMutation = useMutation({
    mutationFn: async (data: PackageReceivingFormData) => {
      // First, get or create the warehouse suite address
      let warehouseSuiteAddressId = suiteAddressId;
      
      if (!warehouseSuiteAddressId) {
        // Look up suite address by suite number
        const { data: suiteAddress, error: suiteError } = await supabase
          .from('warehouse_suite_addresses')
          .select('id')
          .eq('suite_number', data.suite_number)
          .single();

        if (suiteError || !suiteAddress) {
          throw new Error(`Suite address not found for suite number: ${data.suite_number}`);
        }

        warehouseSuiteAddressId = suiteAddress.id;
      }

      // Create the received package record
      const packageData = {
        tracking_number: data.tracking_number,
        sender_name: data.sender_name,
        sender_address: data.sender_address,
        warehouse_location: data.warehouse_location,
        warehouse_suite_address_id: warehouseSuiteAddressId,
        weight_kg: data.weight_kg,
        dimensions_cm: data.dimensions_cm,
        package_status: 'received',
        package_condition: data.package_condition,
        contents_description: data.contents_description,
        special_instructions: data.special_instructions,
        received_at: new Date().toISOString(),
        received_by: data.received_by,
        photos: data.photos || [],
      };

      const { data: newPackage, error: createError } = await supabase
        .from('received_packages')
        .insert(packageData)
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create package record: ${createError.message}`);
      }

      return newPackage;
    },
    onSuccess: (newPackage) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-packages'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-suites'] });
      
      toast({
        title: 'Package received successfully',
        description: `Package ${newPackage.tracking_number} has been recorded in the system.`,
      });
      
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      console.error('Package creation error:', error);
      toast({
        title: 'Failed to receive package',
        description: error.message || 'An error occurred while recording the package.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PackageReceivingFormData) => {
    createPackageMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  // Photo upload handler (simplified - would integrate with actual file upload)
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    
    setUploading(true);
    try {
      // In a real implementation, you'd upload to Supabase Storage or similar
      // For now, just simulate the upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentPhotos = form.getValues('photos') || [];
      const newPhotos = [...currentPhotos, 'placeholder-photo-url'];
      form.setValue('photos', newPhotos);
      
      toast({
        title: 'Photo uploaded',
        description: 'Package photo has been added.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receive New Package
          </DialogTitle>
          <DialogDescription>
            Record details of a new package received at the warehouse. Complete information ensures accurate processing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="physical" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Physical
                </TabsTrigger>
                <TabsTrigger value="condition" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Condition
                </TabsTrigger>
                <TabsTrigger value="documentation" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photos
                </TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tracking_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tracking Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter tracking number"
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
                    name="sender_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sender Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Amazon, eBay, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warehouse_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warehouse Location *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select warehouse" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WAREHOUSE_LOCATIONS.map((location) => (
                              <SelectItem key={location.value} value={location.value}>
                                {location.label}
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
                    name="suite_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suite Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="IWB10001"
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
                    name="received_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received By *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Staff member name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender Address (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Complete sender address if available"
                          {...field}
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Physical Dimensions Tab */}
              <TabsContent value="physical" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Weight & Dimensions
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="weight_kg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="100"
                              placeholder="0.0"
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
                        name="dimensions_cm.length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Length (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="L"
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
                        name="dimensions_cm.width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="W"
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
                        name="dimensions_cm.height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="H"
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
                    <h4 className="font-medium">Contents</h4>
                    
                    <FormField
                      control={form.control}
                      name="contents_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contents Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe package contents if visible/known"
                              {...field}
                              rows={4}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Describe any visible contents or customer-provided information
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Condition Assessment Tab */}
              <TabsContent value="condition" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Package Condition Assessment
                    </h4>

                    <FormField
                      control={form.control}
                      name="package_condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package Condition *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Assess package condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PACKAGE_CONDITIONS.map((condition) => (
                                <SelectItem key={condition.value} value={condition.value}>
                                  <span className={condition.color}>{condition.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Show condition-specific warnings */}
                    {form.watch('package_condition') !== 'good' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-900">Condition Alert</p>
                            <p className="text-amber-700">
                              This package requires special handling. Please document the condition with photos and detailed notes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="special_instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Instructions & Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special handling requirements or observations..."
                              {...field}
                              rows={6}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Document any damage, special handling needs, or customer requirements
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Documentation Tab */}
              <TabsContent value="documentation" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Package Documentation
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Camera className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <h5 className="font-medium mb-2">Upload Package Photos</h5>
                        <p className="text-sm text-gray-500 mb-4">
                          Take photos of the package, especially if damaged
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          disabled={uploading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Add Photos'}
                        </Button>
                      </div>

                      {form.watch('photos')?.length > 0 && (
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium">Uploaded Photos ({form.watch('photos')?.length})</h6>
                          <div className="grid grid-cols-3 gap-2">
                            {form.watch('photos')?.map((photo, index) => (
                              <div key={index} className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                                <Camera className="h-6 w-6 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 mb-2">Photography Guidelines</h5>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Take photos of all sides of the package</li>
                          <li>• Include close-ups of any damage</li>
                          <li>• Capture the shipping label clearly</li>
                          <li>• Document contents if package is opened</li>
                          <li>• Ensure photos are well-lit and clear</li>
                        </ul>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Required for Damaged Packages</h5>
                        <p className="text-sm text-gray-600">
                          Photos are mandatory for packages marked as damaged, opened, or missing items. 
                          These will be shared with the customer and used for insurance claims if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-gray-500">
                Package will be marked as "Received" and available for consolidation processing.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={createPackageMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPackageMutation.isPending || uploading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createPackageMutation.isPending ? 'Recording...' : 'Receive Package'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PackageReceivingModal;