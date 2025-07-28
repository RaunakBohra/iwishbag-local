/**
 * Enhanced Package Management Panel with Bulk Operations
 * 
 * Provides comprehensive package management with modern bulk selection UI
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  Search,
  Filter,
  Edit,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Clock,
  Scale,
  Ruler,
  User,
  Truck,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { packageForwardingService, type ReceivedPackage } from '@/services/PackageForwardingService';
import { packagePhotoService } from '@/services/PackagePhotoService';
import { PackagePhotoUpload } from './PackagePhotoUpload';
import { BulkSelectionProvider } from './BulkSelectionProvider';
import { BulkSelectionToolbar, createPackageBulkActions } from './BulkSelectionToolbar';
import { SelectableCard } from './SelectableCard';
import { BulkActionsDialog } from './BulkActionsDialog';

interface PackageWithCustomer extends ReceivedPackage {
  customer_addresses: {
    suite_number: string;
    user_id: string;
    profiles?: {
      email: string;
      full_name: string;
    };
  };
  package_photos?: { count: number }[];
}

interface PackageFilters {
  status?: string;
  carrier?: string;
  searchTerm?: string;
  hasPhotos?: boolean;
  hasIssues?: boolean;
}

export const EnhancedPackageManagementPanel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<PackageFilters>({});
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithCustomer | null>(null);
  const [packagePhotos, setPackagePhotos] = useState<any[]>([]);

  // Bulk operation states
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'update-status' | 'add-notes' | 'assign-location' | 'delete-packages'>('update-status');
  const [bulkActionIds, setBulkActionIds] = useState<string[]>([]);

  // Fetch packages with customer data
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['enhanced-admin-packages', filters],
    queryFn: async () => {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            suite_number,
            user_id,
            profiles(email, full_name)
          ),
          package_photos(count)
        `)
        .order('received_date', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.carrier) {
        query = query.eq('carrier', filters.carrier);
      }
      if (filters.searchTerm) {
        query = query.or(`
          tracking_number.ilike.%${filters.searchTerm}%,
          sender_name.ilike.%${filters.searchTerm}%,
          package_description.ilike.%${filters.searchTerm}%,
          customer_addresses.suite_number.ilike.%${filters.searchTerm}%
        `);
      }
      if (filters.hasPhotos !== undefined) {
        if (filters.hasPhotos) {
          query = query.not('photos', 'is', null).neq('photos', '[]');
        } else {
          query = query.or('photos.is.null,photos.eq.[]');
        }
      }
      if (filters.hasIssues) {
        query = query.eq('status', 'issue');
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as PackageWithCustomer[];
    },
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ packageIds, status, notes }: { 
      packageIds: string[]; 
      status: string; 
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      return packageForwardingService.bulkUpdatePackageStatus(
        packageIds, 
        status as ReceivedPackage['status'], 
        notes, 
        user.user.id
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-admin-packages'] });
      toast({
        title: 'Bulk Status Update Completed',
        description: `${result.processed} packages processed. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update package status',
        variant: 'destructive',
      });
    },
  });

  // Bulk add notes mutation
  const bulkAddNotesMutation = useMutation({
    mutationFn: async ({ packageIds, notes, noteType }: { 
      packageIds: string[]; 
      notes: string; 
      noteType: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      return packageForwardingService.bulkAddPackageNotes(
        packageIds, 
        notes, 
        noteType as any, 
        user.user.id
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-admin-packages'] });
      toast({
        title: 'Bulk Notes Added',
        description: `${result.processed} packages updated. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Notes Failed',
        description: error instanceof Error ? error.message : 'Failed to add notes',
        variant: 'destructive',
      });
    },
  });

  // Bulk assign location mutation
  const bulkAssignLocationMutation = useMutation({
    mutationFn: async ({ packageIds, location }: { 
      packageIds: string[]; 
      location: string; 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      return packageForwardingService.bulkAssignStorageLocations(
        packageIds, 
        location, 
        user.user.id
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-admin-packages'] });
      toast({
        title: 'Bulk Location Assignment Completed',
        description: `${result.processed} packages assigned. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Assignment Failed',
        description: error instanceof Error ? error.message : 'Failed to assign locations',
        variant: 'destructive',
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ packageIds, reason }: { 
      packageIds: string[]; 
      reason: string; 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      return packageForwardingService.bulkDeletePackages(
        packageIds, 
        reason, 
        user.user.id
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-admin-packages'] });
      toast({
        title: 'Bulk Deletion Completed',
        description: `${result.processed} packages deleted. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Deletion Failed',
        description: error instanceof Error ? error.message : 'Failed to delete packages',
        variant: 'destructive',
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (packageIds: string[]) => packageForwardingService.exportPackagesData(packageIds),
    onSuccess: (result) => {
      // Create CSV content
      const headers = Object.keys(result.data[0] || {});
      const csvContent = [
        headers.join(','),
        ...result.data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Completed',
        description: `Data exported for ${result.data.length} packages`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      });
    },
  });

  // Bulk action handlers
  const handleBulkUpdateStatus = (selectedIds: string[]) => {
    setBulkActionIds(selectedIds);
    setBulkActionType('update-status');
    setShowBulkDialog(true);
  };

  const handleBulkAddNotes = (selectedIds: string[]) => {
    setBulkActionIds(selectedIds);
    setBulkActionType('add-notes');
    setShowBulkDialog(true);
  };

  const handleBulkAssignLocation = (selectedIds: string[]) => {
    setBulkActionIds(selectedIds);
    setBulkActionType('assign-location');
    setShowBulkDialog(true);
  };

  const handleBulkDelete = (selectedIds: string[]) => {
    setBulkActionIds(selectedIds);
    setBulkActionType('delete-packages');
    setShowBulkDialog(true);
  };

  const handleBulkExport = (selectedIds: string[]) => {
    exportMutation.mutate(selectedIds);
  };

  const handleBulkActionConfirm = async (data: any) => {
    switch (bulkActionType) {
      case 'update-status':
        await bulkUpdateStatusMutation.mutateAsync({
          packageIds: data.selectedIds,
          status: data.status,
          notes: data.notes,
        });
        break;
      case 'add-notes':
        await bulkAddNotesMutation.mutateAsync({
          packageIds: data.selectedIds,
          notes: data.notes,
          noteType: data.noteType || 'general',
        });
        break;
      case 'assign-location':
        await bulkAssignLocationMutation.mutateAsync({
          packageIds: data.selectedIds,
          location: data.location,
        });
        break;
      case 'delete-packages':
        await bulkDeleteMutation.mutateAsync({
          packageIds: data.selectedIds,
          reason: data.reason,
        });
        break;
      default:
        break;
    }
  };

  // Create bulk actions
  const bulkActions = createPackageBulkActions(
    handleBulkUpdateStatus,
    handleBulkAddNotes,
    handleBulkAssignLocation,
    handleBulkExport,
    handleBulkDelete
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      ready_to_ship: 'bg-green-100 text-green-800',
      consolidated: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      issue: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <BulkSelectionProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Package Management</h2>
          <p className="text-muted-foreground">
            Manage received packages with bulk operations
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tracking, suite, sender..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                  <SelectItem value="consolidated">Consolidated</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>

              {/* Carrier Filter */}
              <Select
                value={filters.carrier || 'all'}
                onValueChange={(value) => setFilters({ ...filters, carrier: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="usps">USPS</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Toggle Filters */}
              <div className="flex gap-2">
                <Button
                  variant={filters.hasPhotos ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, hasPhotos: filters.hasPhotos ? undefined : true })}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  variant={filters.hasIssues ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, hasIssues: filters.hasIssues ? undefined : true })}
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Selection Toolbar */}
        <BulkSelectionToolbar
          items={packages.map(pkg => ({ id: pkg.id }))}
          actions={bulkActions}
          title="Select packages for bulk actions"
          description="Use checkboxes to select multiple packages for bulk operations"
        />

        {/* Package List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : packages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Packages Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => (
              <SelectableCard key={pkg.id} id={pkg.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Customer & Package Details */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">Suite {pkg.customer_addresses.suite_number}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {pkg.customer_addresses.profiles?.full_name || pkg.customer_addresses.profiles?.email || 'Unknown Customer'}
                      </p>
                      <p className="text-sm font-medium">{pkg.package_description || 'No description'}</p>
                    </div>

                    {/* Tracking & Carrier */}
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {pkg.tracking_number || 'No Tracking'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <Truck className="h-3 w-3 inline mr-1" />
                        {pkg.carrier} • {pkg.sender_name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pkg.sender_store || 'Unknown Store'}
                      </p>
                    </div>

                    {/* Weight & Dimensions */}
                    <div>
                      <p className="text-sm flex items-center gap-2 mb-1">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        {pkg.weight_kg}kg
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-muted-foreground" />
                        {pkg.dimensions.length}×{pkg.dimensions.width}×{pkg.dimensions.height}cm
                      </p>
                      {pkg.declared_value_usd && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ${pkg.declared_value_usd}
                        </p>
                      )}
                    </div>

                    {/* Status & Location */}
                    <div>
                      <Badge className={getStatusColor(pkg.status)} variant="secondary">
                        {pkg.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(pkg.received_date), 'MMM d, yyyy')}
                      </p>
                      {pkg.storage_location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {pkg.storage_location}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setSelectedPackage(pkg);
                          try {
                            const photos = await packagePhotoService.getPackagePhotos(pkg.id);
                            setPackagePhotos(photos);
                          } catch (error) {
                            console.error('Failed to fetch photos:', error);
                            setPackagePhotos([]);
                          }
                          setShowPhotoDialog(true);
                        }}
                      >
                        <Camera className="h-4 w-4" />
                        {pkg.package_photos && pkg.package_photos[0]?.count > 0 && (
                          <span className="ml-1 text-xs">{pkg.package_photos[0].count}</span>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Condition Notes */}
                  {pkg.condition_notes && (
                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{pkg.condition_notes}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </SelectableCard>
            ))}
          </div>
        )}

        {/* Photo Management Dialog */}
        {showPhotoDialog && selectedPackage && (
          <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Package Photos - Suite {selectedPackage.customer_addresses.suite_number}</DialogTitle>
              </DialogHeader>
              <PackagePhotoUpload
                packageId={selectedPackage.id}
                existingPhotos={packagePhotos}
                onPhotosUpdated={async () => {
                  // Refresh photos
                  try {
                    const photos = await packagePhotoService.getPackagePhotos(selectedPackage.id);
                    setPackagePhotos(photos);
                  } catch (error) {
                    console.error('Failed to refresh photos:', error);
                  }
                  // Refresh package data
                  queryClient.invalidateQueries({ queryKey: ['enhanced-admin-packages'] });
                  toast({
                    title: 'Photos updated',
                    description: 'Package photos have been updated successfully',
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Bulk Actions Dialog */}
        <BulkActionsDialog
          open={showBulkDialog}
          onOpenChange={setShowBulkDialog}
          title={
            bulkActionType === 'update-status' 
              ? 'Bulk Update Package Status'
              : bulkActionType === 'add-notes'
              ? 'Bulk Add Package Notes'
              : bulkActionType === 'assign-location'
              ? 'Bulk Assign Storage Location'
              : bulkActionType === 'delete-packages'
              ? 'Bulk Delete Packages'
              : 'Bulk Action'
          }
          description={
            bulkActionType === 'update-status'
              ? 'Update the status of multiple packages at once'
              : bulkActionType === 'add-notes'
              ? 'Add notes to multiple packages at once'
              : bulkActionType === 'assign-location'
              ? 'Assign storage location to multiple packages'
              : bulkActionType === 'delete-packages'
              ? 'Permanently delete multiple packages and their data'
              : undefined
          }
          actionType={bulkActionType}
          selectedCount={bulkActionIds.length}
          selectedIds={bulkActionIds}
          onConfirm={handleBulkActionConfirm}
          isLoading={
            bulkUpdateStatusMutation.isPending || 
            bulkAddNotesMutation.isPending ||
            bulkAssignLocationMutation.isPending ||
            bulkDeleteMutation.isPending
          }
        />
      </div>
    </BulkSelectionProvider>
  );
};