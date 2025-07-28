/**
 * Enhanced Package Management Panel for Admin
 * 
 * Provides comprehensive package management capabilities including:
 * - Status updates
 * - Photo management
 * - Bulk actions
 * - Advanced search and filtering
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Search,
  Filter,
  Edit,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  Truck,
  Archive,
  MapPin,
  Clock,
  DollarSign,
  Scale,
  Ruler,
  ScanLine,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { R2StorageServiceSimple } from '@/services/R2StorageServiceSimple';
import type { ReceivedPackage } from '@/services/PackageForwardingService';

interface PackageWithCustomer extends ReceivedPackage {
  customer_addresses: {
    suite_number: string;
    user_id: string;
    profiles?: {
      email: string;
      full_name: string;
    };
  };
}

interface PackageFilters {
  status?: string;
  carrier?: string;
  dateRange?: { from: Date; to: Date };
  weightRange?: { min: number; max: number };
  searchTerm?: string;
  hasPhotos?: boolean;
  hasIssues?: boolean;
}

export const PackageManagementPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [filters, setFilters] = useState<PackageFilters>({});
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithCustomer | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Fetch packages with customer data
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['admin-packages', filters],
    queryFn: async () => {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          customer_addresses!inner(
            suite_number,
            user_id
          )
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

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately for each unique user
      const userIds = [...new Set((data || []).map(pkg => pkg.customer_addresses.user_id))];
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        profiles = profileData || [];
      }

      // Map profiles to packages
      const packagesWithProfiles = (data || []).map(pkg => {
        const profile = profiles?.find(p => p.id === pkg.customer_addresses.user_id);
        return {
          ...pkg,
          customer_addresses: {
            ...pkg.customer_addresses,
            profiles: profile || undefined
          }
        };
      });

      return packagesWithProfiles as PackageWithCustomer[];
    },
  });

  // Update package status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ packageIds, status, notes }: { 
      packageIds: string[]; 
      status: string; 
      notes?: string;
    }) => {
      if (packageIds.length === 0) {
        throw new Error('No packages selected');
      }

      // Update all packages at once
      const { error } = await supabase
        .from('received_packages')
        .update({
          status,
          condition_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .in('id', packageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      toast({
        title: 'Status Updated',
        description: `Successfully updated ${selectedPackages.length} package(s)`,
      });
      setSelectedPackages([]);
      setShowStatusDialog(false);
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Photo upload handler
  const handlePhotoUpload = async (files: File[]) => {
    if (!selectedPackage) return;

    setUploadingPhotos(true);
    try {
      const r2Service = R2StorageServiceSimple.getInstance();
      const photoUrls: string[] = [];

      for (const file of files) {
        const key = `packages/${selectedPackage.id}/${Date.now()}-${file.name}`;
        const url = await r2Service.uploadFile(file, key);
        photoUrls.push(url);
      }

      // Update package with new photos
      const currentPhotos = selectedPackage.photos || [];
      const newPhotos = [
        ...currentPhotos,
        ...photoUrls.map(url => ({
          url,
          type: 'admin',
          uploaded_at: new Date().toISOString(),
          description: 'Admin uploaded photo',
        })),
      ];

      await supabase
        .from('received_packages')
        .update({ photos: newPhotos })
        .eq('id', selectedPackage.id);

      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      toast({
        title: 'Photos Uploaded',
        description: `Successfully uploaded ${files.length} photo(s)`,
      });
      setShowPhotoDialog(false);
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload photos',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Bulk action handler
  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'update_status':
        setShowStatusDialog(true);
        break;
      case 'mark_issue':
        updateStatusMutation.mutate({
          packageIds: selectedPackages,
          status: 'issue',
          notes: 'Marked as issue - requires attention',
        });
        break;
      case 'export':
        exportSelectedPackages();
        break;
    }
  };

  // Export packages to CSV
  const exportSelectedPackages = () => {
    const selected = packages.filter(p => selectedPackages.includes(p.id));
    const csv = [
      ['Suite', 'Tracking', 'Carrier', 'Sender', 'Weight(kg)', 'Status', 'Received Date'],
      ...selected.map(p => [
        p.customer_addresses.suite_number,
        p.tracking_number || '',
        p.carrier || '',
        p.sender_name || '',
        p.weight_kg.toString(),
        p.status,
        format(new Date(p.received_date), 'yyyy-MM-dd'),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packages-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

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
    <div className="space-y-6">
      {/* Filters and Actions Bar */}
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

            {/* Additional Filters */}
            <div className="flex gap-2">
              <Button
                variant={filters.hasPhotos ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, hasPhotos: !filters.hasPhotos })}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button
                variant={filters.hasIssues ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, hasIssues: !filters.hasIssues })}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPackages.length > 0 && (
            <div className="mt-4 flex items-center gap-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedPackages.length} package(s) selected
              </span>
              <Separator orientation="vertical" className="h-4" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('update_status')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Status
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('mark_issue')}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Mark as Issue
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('export')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPackages([])}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
        <div className="space-y-2">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Selection Checkbox */}
                  <Checkbox
                    checked={selectedPackages.includes(pkg.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPackages([...selectedPackages, pkg.id]);
                      } else {
                        setSelectedPackages(selectedPackages.filter(id => id !== pkg.id));
                      }
                    }}
                  />

                  {/* Package Info */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Customer & Package Details */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">Suite {pkg.customer_addresses.suite_number}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pkg.customer_addresses.profiles?.full_name || pkg.customer_addresses.profiles?.email || 'Unknown Customer'}
                      </p>
                      <p className="text-sm mt-1">{pkg.package_description}</p>
                    </div>

                    {/* Tracking & Carrier */}
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {pkg.tracking_number || 'No Tracking'}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize mt-1">
                        {pkg.carrier} • {pkg.sender_name}
                      </p>
                    </div>

                    {/* Weight & Dimensions */}
                    <div>
                      <p className="text-sm flex items-center gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        {pkg.weight_kg}kg
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pkg.dimensions.length}×{pkg.dimensions.width}×{pkg.dimensions.height}cm
                      </p>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className={getStatusColor(pkg.status)}>
                          {pkg.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(pkg.received_date), 'MMM d, yyyy')}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setNewStatus(pkg.status);
                            setShowStatusDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setShowPhotoDialog(true);
                          }}
                        >
                          <Camera className="h-4 w-4" />
                          {pkg.photos && pkg.photos.length > 0 && (
                            <span className="ml-1 text-xs">{pkg.photos.length}</span>
                          )}
                        </Button>
                      </div>
                    </div>
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
            </Card>
          ))}
        </div>
      )}

      {/* Status Update Dialog */}
      {showStatusDialog && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent aria-describedby="status-update-description">
            <DialogHeader>
              <DialogTitle>Update Package Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" id="status-update-description">
              <p className="text-sm text-muted-foreground">Update the status of selected packages.</p>
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                    <SelectItem value="consolidated">Consolidated</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add any relevant notes..."
                />
              </div>
              {selectedPackage ? (
                <Alert>
                  <AlertDescription>
                    Updating status for Suite {selectedPackage.customer_addresses.suite_number}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    Updating status for {selectedPackages.length} selected package(s)
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const ids = selectedPackage ? [selectedPackage.id] : selectedPackages;
                  updateStatusMutation.mutate({
                    packageIds: ids,
                    status: newStatus,
                    notes: statusNotes,
                  });
                }}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Management Dialog */}
      {showPhotoDialog && selectedPackage && (
        <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
          <DialogContent className="max-w-2xl" aria-describedby="photo-management-description">
            <DialogHeader>
              <DialogTitle>Package Photos - Suite {selectedPackage.customer_addresses.suite_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4" id="photo-management-description">
              <p className="text-sm text-muted-foreground">View and manage photos for this package.</p>
              {/* Existing Photos */}
              {selectedPackage.photos && selectedPackage.photos.length > 0 && (
                <div>
                  <Label>Existing Photos</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedPackage.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo.url}
                        alt={`Package photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Photos */}
              <div>
                <Label>Upload New Photos</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handlePhotoUpload(files);
                    }
                  }}
                  disabled={uploadingPhotos}
                />
              </div>

              {uploadingPhotos && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading photos...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PackageManagementPanel;