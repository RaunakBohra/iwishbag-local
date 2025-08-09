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
import { Database } from '@/types/database';
import {
  Package,
  RefreshCw,
  Truck,
  Scale,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Save,
  X,
  Eye,
  PackageCheck,
} from 'lucide-react';

type ReceivedPackage = Database['public']['Tables']['received_packages']['Row'] & {
  warehouse_suite_addresses?: Database['public']['Tables']['warehouse_suite_addresses']['Row'] & {
    profiles?: Database['public']['Tables']['profiles']['Row'];
  };
};

// Validation schema for package processing
const packageProcessingSchema = z.object({
  package_status: z.enum(['received', 'processing', 'ready_for_consolidation', 'shipped', 'damaged', 'missing']),
  processing_notes: z.string().optional(),
  quality_check_passed: z.boolean().optional(),
  consolidation_group_id: z.string().optional(),
  assigned_to: z.string().optional(),
  estimated_processing_time: z.number().min(0).max(48).optional(), // Hours
  priority_level: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  customer_notification_sent: z.boolean().optional(),
  internal_notes: z.string().optional(),
});

type PackageProcessingFormData = z.infer<typeof packageProcessingSchema>;

interface PackageProcessingModalProps {
  package: ReceivedPackage;
  isOpen: boolean;
  onClose: () => void;
}

const PACKAGE_STATUSES = [
  { value: 'received', label: 'Received', color: 'bg-blue-100 text-blue-800', icon: Package },
  { value: 'processing', label: 'Processing', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  { value: 'ready_for_consolidation', label: 'Ready for Consolidation', color: 'bg-green-100 text-green-800', icon: PackageCheck },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  { value: 'missing', label: 'Missing', color: 'bg-red-100 text-red-800', icon: X },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low Priority', color: 'text-gray-600' },
  { value: 'normal', label: 'Normal', color: 'text-blue-600' },
  { value: 'high', label: 'High Priority', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
];

const STAFF_MEMBERS = [
  { value: 'john_doe', label: 'John Doe' },
  { value: 'jane_smith', label: 'Jane Smith' },
  { value: 'mike_johnson', label: 'Mike Johnson' },
  { value: 'sarah_wilson', label: 'Sarah Wilson' },
];

export const PackageProcessingModal: React.FC<PackageProcessingModalProps> = ({
  package: pkg,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('status');

  // Form setup
  const form = useForm<PackageProcessingFormData>({
    resolver: zodResolver(packageProcessingSchema),
    defaultValues: {
      package_status: pkg.package_status as any,
      processing_notes: pkg.processing_notes || '',
      quality_check_passed: pkg.quality_check_passed || false,
      consolidation_group_id: pkg.consolidation_group_id || '',
      assigned_to: pkg.assigned_to || '',
      estimated_processing_time: pkg.estimated_processing_time || 2,
      priority_level: (pkg.priority_level as any) || 'normal',
      customer_notification_sent: pkg.customer_notification_sent || false,
      internal_notes: pkg.internal_notes || '',
    },
  });

  // Package update mutation
  const updatePackageMutation = useMutation({
    mutationFn: async (data: PackageProcessingFormData) => {
      const updates: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Add status-specific timestamps
      if (data.package_status === 'processing' && pkg.package_status !== 'processing') {
        updates.processing_started_at = new Date().toISOString();
      } else if (data.package_status === 'ready_for_consolidation' && pkg.package_status !== 'ready_for_consolidation') {
        updates.processed_at = new Date().toISOString();
      } else if (data.package_status === 'shipped' && pkg.package_status !== 'shipped') {
        updates.shipped_at = new Date().toISOString();
      }

      const { data: updatedPackage, error } = await supabase
        .from('received_packages')
        .update(updates)
        .eq('id', pkg.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update package: ${error.message}`);
      }

      return updatedPackage;
    },
    onSuccess: (updatedPackage) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-packages'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-suites'] });
      
      const statusLabel = PACKAGE_STATUSES.find(s => s.value === updatedPackage.package_status)?.label || 'Updated';
      
      toast({
        title: 'Package updated successfully',
        description: `Package ${pkg.tracking_number} status changed to ${statusLabel}.`,
      });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Package update error:', error);
      toast({
        title: 'Failed to update package',
        description: error.message || 'An error occurred while updating the package.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PackageProcessingFormData) => {
    updatePackageMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  // Get current status info
  const currentStatus = PACKAGE_STATUSES.find(s => s.value === pkg.package_status);
  const newStatus = PACKAGE_STATUSES.find(s => s.value === form.watch('package_status'));

  // Status transition validation
  const isValidTransition = (fromStatus: string, toStatus: string): boolean => {
    const validTransitions: Record<string, string[]> = {
      'received': ['processing', 'damaged', 'missing'],
      'processing': ['ready_for_consolidation', 'damaged', 'missing'],
      'ready_for_consolidation': ['shipped'],
      'shipped': [], // Terminal state
      'damaged': ['processing'], // Can retry processing
      'missing': [], // Terminal state
    };
    
    return validTransitions[fromStatus]?.includes(toStatus) || fromStatus === toStatus;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Process Package: {pkg.tracking_number}
          </DialogTitle>
          <DialogDescription>
            Update package status and processing details. Changes will be logged and the customer will be notified when appropriate.
          </DialogDescription>
        </DialogHeader>

        {/* Current Package Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Current Package Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Status:</span>
              <Badge className={`ml-2 ${currentStatus?.color}`}>
                {currentStatus?.label}
              </Badge>
            </div>
            <div>
              <span className="text-gray-500">Weight:</span>
              <span className="ml-2 font-medium">{pkg.weight_kg} kg</span>
            </div>
            <div>
              <span className="text-gray-500">Suite:</span>
              <span className="ml-2 font-medium">{pkg.warehouse_suite_addresses?.suite_number}</span>
            </div>
            <div>
              <span className="text-gray-500">Customer:</span>
              <span className="ml-2 font-medium">{pkg.warehouse_suite_addresses?.profiles?.full_name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Received:</span>
              <span className="ml-2">{pkg.received_at ? new Date(pkg.received_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Condition:</span>
              <span className={`ml-2 ${pkg.package_condition === 'good' ? 'text-green-600' : 'text-red-600'}`}>
                {pkg.package_condition}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Warehouse:</span>
              <span className="ml-2">{pkg.warehouse_location}</span>
            </div>
            <div>
              <span className="text-gray-500">Sender:</span>
              <span className="ml-2">{pkg.sender_name}</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Status Update
                </TabsTrigger>
                <TabsTrigger value="processing" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Processing
                </TabsTrigger>
                <TabsTrigger value="consolidation" className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" />
                  Consolidation
                </TabsTrigger>
              </TabsList>

              {/* Status Update Tab */}
              <TabsContent value="status" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Status Management</h4>
                    
                    <FormField
                      control={form.control}
                      name="package_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select new status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PACKAGE_STATUSES.map((status) => {
                                const isValid = isValidTransition(pkg.package_status, status.value);
                                const StatusIcon = status.icon;
                                
                                return (
                                  <SelectItem 
                                    key={status.value} 
                                    value={status.value}
                                    disabled={!isValid}
                                  >
                                    <div className="flex items-center gap-2">
                                      <StatusIcon className="h-4 w-4" />
                                      <span>{status.label}</span>
                                      {!isValid && <span className="text-xs text-gray-400">(Invalid)</span>}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status Change Preview */}
                    {form.watch('package_status') !== pkg.package_status && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="font-medium text-blue-900 mb-2">Status Change Preview</h5>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge className={currentStatus?.color}>
                            {currentStatus?.label}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          <Badge className={newStatus?.color}>
                            {newStatus?.label}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="priority_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Set priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRIORITY_LEVELS.map((priority) => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  <span className={priority.color}>{priority.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="processing_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Processing Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add notes about status change or processing details..."
                              {...field}
                              rows={6}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            These notes will be visible to other warehouse staff and can be shared with the customer
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="customer_notification_sent"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Send customer notification about status change
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Processing Tab */}
              <TabsContent value="processing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Processing Assignment</h4>
                    
                    <FormField
                      control={form.control}
                      name="assigned_to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Staff Member</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STAFF_MEMBERS.map((staff) => (
                                <SelectItem key={staff.value} value={staff.value}>
                                  {staff.label}
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
                      name="estimated_processing_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Processing Time (Hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="48"
                              step="0.5"
                              placeholder="2"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Estimated time to complete processing and prepare for consolidation
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="quality_check_passed"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded border-gray-300"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Package passed quality inspection
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="internal_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Staff Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal notes for warehouse staff only..."
                              {...field}
                              rows={6}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            These notes are only visible to warehouse staff and admins
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Package Contents Info */}
                    {pkg.contents_description && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2">Package Contents</h5>
                        <p className="text-sm text-gray-600">{pkg.contents_description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Consolidation Tab */}
              <TabsContent value="consolidation" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Consolidation Management</h4>
                    
                    <FormField
                      control={form.control}
                      name="consolidation_group_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consolidation Group ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="CON-2024-001"
                              {...field}
                              className="uppercase"
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500">
                            Assign to a consolidation group for combined shipping
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-2">Consolidation Benefits</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Reduced shipping costs for customer</li>
                        <li>• Better protection during transit</li>
                        <li>• Simplified customs clearance</li>
                        <li>• Single tracking number for multiple items</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Customer Consolidation Settings</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Preference:</span>
                          <span className="font-medium">Weekly Consolidation</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Max Wait Time:</span>
                          <span className="font-medium">7 days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Other Packages:</span>
                          <span className="font-medium">2 pending</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h5 className="font-medium text-amber-900 mb-2">Processing Guidelines</h5>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Check for other packages from same customer</li>
                        <li>• Consider consolidation preferences</li>
                        <li>• Verify weight and size limits</li>
                        <li>• Update customer on consolidation status</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-gray-500">
                Changes will be logged and tracked. Customer notifications will be sent based on preferences.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updatePackageMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePackageMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatePackageMutation.isPending ? 'Updating...' : 'Update Package'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PackageProcessingModal;