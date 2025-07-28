import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  TrendingUp,
  Calendar,
  Loader2,
  RefreshCw,
  Ban,
  Plus,
  Info,
  Download,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  storageFeeAutomationService,
  type StorageFeeConfig,
  type PackageWithFees,
} from '@/services/StorageFeeAutomationService';
import { supabase } from '@/integrations/supabase/client';
import { BulkSelectionProvider } from './BulkSelectionProvider';
import { BulkSelectionToolbar, createStorageFeeBulkActions } from './BulkSelectionToolbar';
import { SelectableCard } from './SelectableCard';
import { BulkActionsDialog } from './BulkActionsDialog';

interface StorageFeeAnalytics {
  totalRevenue: number;
  unpaidFees: number;
  averageDaysStored: number;
  packageCount: number;
  feesByType: Record<string, number>;
}

export const StorageFeeManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageWithFees | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [extensionDays, setExtensionDays] = useState(30);
  const [extensionReason, setExtensionReason] = useState('');

  // Bulk operation states
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'waive-fees' | 'extend-exemptions' | 'export'>('waive-fees');
  const [bulkActionIds, setBulkActionIds] = useState<string[]>([]);

  // Fetch configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['storage-fee-config'],
    queryFn: () => storageFeeAutomationService.getConfiguration(),
  });

  // Fetch packages approaching fees
  const { data: approachingPackages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['packages-approaching-fees'],
    queryFn: () => storageFeeAutomationService.getPackagesApproachingFees(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['storage-fee-analytics'],
    queryFn: () => storageFeeAutomationService.getStorageFeeAnalytics(),
  });

  // Calculate fees mutation
  const calculateFeesMutation = useMutation({
    mutationFn: () => storageFeeAutomationService.calculateDailyStorageFees(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['storage-fee-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['packages-approaching-fees'] });
      
      toast({
        title: 'Storage fees calculated',
        description: `Processed ${result.processed} packages, created ${result.newFees} new fees`,
      });
      
      if (result.errors.length > 0) {
        console.error('Storage fee calculation errors:', result.errors);
      }
    },
    onError: (error) => {
      toast({
        title: 'Calculation failed',
        description: error instanceof Error ? error.message : 'Failed to calculate storage fees',
        variant: 'destructive',
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: (updates: Partial<StorageFeeConfig>) =>
      storageFeeAutomationService.updateConfiguration(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-fee-config'] });
      setShowConfigDialog(false);
      toast({
        title: 'Configuration updated',
        description: 'Storage fee settings have been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update configuration',
        variant: 'destructive',
      });
    },
  });

  // Waive fees mutation
  const waiveFeesMutation = useMutation({
    mutationFn: async ({ packageId, reason }: { packageId: string; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      return storageFeeAutomationService.waiveStorageFees(packageId, reason, user.user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-fee-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['packages-approaching-fees'] });
      setShowWaiveDialog(false);
      setSelectedPackage(null);
      setWaiveReason('');
      
      toast({
        title: 'Fees waived',
        description: 'Storage fees have been waived for this package',
      });
    },
    onError: (error) => {
      toast({
        title: 'Waive failed',
        description: error instanceof Error ? error.message : 'Failed to waive fees',
        variant: 'destructive',
      });
    },
  });

  // Extend exemption mutation
  const extendExemptionMutation = useMutation({
    mutationFn: async ({ 
      packageId, 
      days, 
      reason 
    }: { 
      packageId: string; 
      days: number; 
      reason: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('extend_storage_exemption', {
        p_package_id: packageId,
        p_additional_days: days,
        p_reason: reason,
        p_admin_id: user.user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (newDate) => {
      queryClient.invalidateQueries({ queryKey: ['packages-approaching-fees'] });
      setShowExtendDialog(false);
      setSelectedPackage(null);
      setExtensionDays(30);
      setExtensionReason('');
      
      toast({
        title: 'Exemption extended',
        description: `Storage fees exempted until ${format(new Date(newDate), 'PP')}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Extension failed',
        description: error instanceof Error ? error.message : 'Failed to extend exemption',
        variant: 'destructive',
      });
    },
  });

  // Bulk waive fees mutation
  const bulkWaiveFeesMutation = useMutation({
    mutationFn: async ({ packageIds, reason }: { packageIds: string[]; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      return storageFeeAutomationService.bulkWaiveStorageFees(packageIds, reason, user.user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['storage-fee-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['packages-approaching-fees'] });
      
      toast({
        title: 'Bulk Waive Completed',
        description: `${result.processed} packages processed. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Waive Failed',
        description: error instanceof Error ? error.message : 'Failed to waive storage fees',
        variant: 'destructive',
      });
    },
  });

  // Bulk extend exemptions mutation
  const bulkExtendExemptionsMutation = useMutation({
    mutationFn: async ({ 
      packageIds, 
      days, 
      reason 
    }: { 
      packageIds: string[]; 
      days: number; 
      reason: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      return storageFeeAutomationService.bulkExtendStorageExemptions(packageIds, days, reason, user.user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['packages-approaching-fees'] });
      
      toast({
        title: 'Bulk Extension Completed',
        description: `${result.processed} packages processed. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Extension Failed',
        description: error instanceof Error ? error.message : 'Failed to extend exemptions',
        variant: 'destructive',
      });
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: (packageIds: string[]) => storageFeeAutomationService.exportStorageFeeData(packageIds),
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
  const handleBulkWaiveFees = (selectedIds: string[]) => {
    setBulkActionIds(selectedIds);
    setBulkActionType('waive-fees');
    setShowBulkDialog(true);
  };

  const handleBulkExtendExemptions = (selectedIds: string[]) => {
    setBulkActionIds(selectedIds);
    setBulkActionType('extend-exemptions');
    setShowBulkDialog(true);
  };

  const handleBulkExport = (selectedIds: string[]) => {
    exportDataMutation.mutate(selectedIds);
  };

  const handleBulkActionConfirm = async (data: any) => {
    switch (bulkActionType) {
      case 'waive-fees':
        await bulkWaiveFeesMutation.mutateAsync({
          packageIds: data.selectedIds,
          reason: data.reason,
        });
        break;
      case 'extend-exemptions':
        await bulkExtendExemptionsMutation.mutateAsync({
          packageIds: data.selectedIds,
          days: data.days,
          reason: data.reason,
        });
        break;
      default:
        break;
    }
  };

  const handleConfigUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateConfigMutation.mutate({
      freeDays: Number(formData.get('freeDays')),
      dailyRateUSD: Number(formData.get('dailyRateUSD')),
      warningDaysBeforeFees: Number(formData.get('warningDaysBeforeFees')),
      lateFeeThresholdDays: Number(formData.get('lateFeeThresholdDays')),
      lateFeeRateUSD: Number(formData.get('lateFeeRateUSD')),
    });
  };

  // Create bulk actions
  const bulkActions = createStorageFeeBulkActions(
    handleBulkWaiveFees,
    handleBulkExtendExemptions,
    handleBulkExport
  );

  return (
    <BulkSelectionProvider>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Storage Fee Management</h2>
          <p className="text-muted-foreground">
            Manage automated storage fees and exemptions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => calculateFeesMutation.mutate()}
            disabled={calculateFeesMutation.isPending}
          >
            {calculateFeesMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Daily Calculation
          </Button>
          
          <Button onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid Fees</p>
                  <p className="text-2xl font-bold">${analytics.unpaidFees.toFixed(2)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Days Stored</p>
                  <p className="text-2xl font-bold">{analytics.averageDaysStored.toFixed(1)}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Packages w/ Fees</p>
                  <p className="text-2xl font-bold">{analytics.packageCount}</p>
                </div>
                <Package className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Free Days</p>
                <p className="font-medium">{config.freeDays} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Daily Rate</p>
                <p className="font-medium">${config.dailyRateUSD}/day</p>
              </div>
              <div>
                <p className="text-muted-foreground">Warning Period</p>
                <p className="font-medium">{config.warningDaysBeforeFees} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Late Fee After</p>
                <p className="font-medium">{config.lateFeeThresholdDays} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Late Fee Rate</p>
                <p className="font-medium">${config.lateFeeRateUSD}/day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Selection Toolbar */}
      <BulkSelectionToolbar
        items={approachingPackages.map(pkg => ({ id: pkg.id }))}
        actions={bulkActions}
        title="Select packages for bulk actions"
        description="Use checkboxes to select multiple packages for bulk operations"
      />

      {/* Packages Approaching Fees */}
      <div className="space-y-4">
        {packagesLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded"></div>
            ))}
          </div>
        ) : approachingPackages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No packages approaching storage fees</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {approachingPackages.map((pkg) => (
              <SelectableCard key={pkg.id} id={pkg.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                        <p className="text-sm text-muted-foreground">{pkg.sender_name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pkg.days_in_storage} days</p>
                        <p className="text-xs text-muted-foreground">in storage</p>
                      </div>
                      <div>
                        <Badge 
                          variant={pkg.days_until_fees <= 3 ? 'destructive' : 'secondary'}
                          className="font-mono"
                        >
                          {pkg.days_until_fees} days
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">until fees</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          ${pkg.current_storage_fee?.toFixed(2) || config?.dailyRateUSD || '1.00'}
                        </p>
                        <p className="text-xs text-muted-foreground">daily fee</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackage(pkg);
                            setShowExtendDialog(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Extend
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackage(pkg);
                            setShowWaiveDialog(true);
                          }}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Waive
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </SelectableCard>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Storage Fee Configuration</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleConfigUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="freeDays">Free Storage Days</Label>
                <Input
                  id="freeDays"
                  name="freeDays"
                  type="number"
                  defaultValue={config?.freeDays}
                  min={0}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="dailyRateUSD">Daily Rate (USD)</Label>
                <Input
                  id="dailyRateUSD"
                  name="dailyRateUSD"
                  type="number"
                  step="0.01"
                  defaultValue={config?.dailyRateUSD}
                  min={0}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="warningDaysBeforeFees">Warning Days Before Fees</Label>
                <Input
                  id="warningDaysBeforeFees"
                  name="warningDaysBeforeFees"
                  type="number"
                  defaultValue={config?.warningDaysBeforeFees}
                  min={1}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="lateFeeThresholdDays">Late Fee After (Days)</Label>
                <Input
                  id="lateFeeThresholdDays"
                  name="lateFeeThresholdDays"
                  type="number"
                  defaultValue={config?.lateFeeThresholdDays}
                  min={1}
                  required
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="lateFeeRateUSD">Late Fee Rate (USD/day)</Label>
                <Input
                  id="lateFeeRateUSD"
                  name="lateFeeRateUSD"
                  type="number"
                  step="0.01"
                  defaultValue={config?.lateFeeRateUSD}
                  min={0}
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowConfigDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateConfigMutation.isPending}>
                {updateConfigMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Waive Fees Dialog */}
      <Dialog open={showWaiveDialog} onOpenChange={setShowWaiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Storage Fees</DialogTitle>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This will waive all unpaid storage fees for package {selectedPackage.tracking_number}
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="waiveReason">Reason for Waiving</Label>
                <Textarea
                  id="waiveReason"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Enter reason for waiving fees..."
                  required
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowWaiveDialog(false);
                    setWaiveReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (waiveReason.trim()) {
                      waiveFeesMutation.mutate({
                        packageId: selectedPackage.id,
                        reason: waiveReason,
                      });
                    }
                  }}
                  disabled={!waiveReason.trim() || waiveFeesMutation.isPending}
                >
                  {waiveFeesMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Waive Fees
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Extend Exemption Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Storage Fee Exemption</DialogTitle>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Extending exemption for package {selectedPackage.tracking_number}
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="extensionDays">Additional Days</Label>
                <Input
                  id="extensionDays"
                  type="number"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="extensionReason">Reason for Extension</Label>
                <Textarea
                  id="extensionReason"
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Enter reason for extending exemption..."
                  required
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowExtendDialog(false);
                    setExtensionDays(30);
                    setExtensionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (extensionReason.trim() && extensionDays > 0) {
                      extendExemptionMutation.mutate({
                        packageId: selectedPackage.id,
                        days: extensionDays,
                        reason: extensionReason,
                      });
                    }
                  }}
                  disabled={!extensionReason.trim() || extensionDays <= 0 || extendExemptionMutation.isPending}
                >
                  {extendExemptionMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Extend Exemption
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        title={
          bulkActionType === 'waive-fees' 
            ? 'Bulk Waive Storage Fees'
            : bulkActionType === 'extend-exemptions'
            ? 'Bulk Extend Storage Exemptions'
            : 'Bulk Action'
        }
        description={
          bulkActionType === 'waive-fees'
            ? 'Waive storage fees for multiple packages at once'
            : bulkActionType === 'extend-exemptions'
            ? 'Extend storage fee exemptions for multiple packages'
            : undefined
        }
        actionType={bulkActionType}
        selectedCount={bulkActionIds.length}
        selectedIds={bulkActionIds}
        onConfirm={handleBulkActionConfirm}
        isLoading={
          bulkWaiveFeesMutation.isPending || 
          bulkExtendExemptionsMutation.isPending
        }
      />
      </div>
    </BulkSelectionProvider>
  );
};