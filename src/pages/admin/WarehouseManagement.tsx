import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  MapPin,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  BarChart3,
  Activity,
  Archive,
  Camera,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Loader2,
  Package2,
  Scale,
  Ruler,
  DollarSign,
  Warehouse,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Database,
  TestTube,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { R2StorageServiceSimple } from '@/services/R2StorageServiceSimple';
import { PackagePhotoGallery } from '@/components/warehouse/PackagePhotoGallery';
import { storageFeeService, type StorageFeeOverview, type StorageFeeCalculation } from '@/services/StorageFeeService';
import PackageTestDataGenerator from '@/components/admin/PackageTestDataGenerator';
import MinimalPackageTest from '@/components/admin/MinimalPackageTest';
import DirectPackageTest from '@/components/admin/DirectPackageTest';
import PackageManagementPanel from '@/components/admin/PackageManagementPanel';
import ConsolidationProcessingPanel from '@/components/admin/ConsolidationProcessingPanel';
import {
  warehouseManagementService,
  type WarehouseDashboard,
  type WarehouseTask,
  type WarehouseLocation,
  type StaffPerformance,
  type TaskAssignmentData,
} from '@/services/WarehouseManagementService';
import {
  packageForwardingService,
  type ReceivedPackage,
  type ConsolidationGroup,
  type PackageReceivingData,
} from '@/services/PackageForwardingService';

interface PackageReceivingFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PackageReceivingForm: React.FC<PackageReceivingFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<PackageReceivingData>>({
    suiteNumber: '',
    carrier: 'ups',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    photos: [],
    receivedByStaffId: user?.id || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPhotoFiles(files);
    }
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photoFiles.length === 0) return [];
    
    setUploadingPhotos(true);
    const r2Service = R2StorageServiceSimple.getInstance();
    const photoUrls: string[] = [];
    
    try {
      for (const file of photoFiles) {
        const result = await r2Service.uploadFile(file, {
          folder: 'package-photos',
          contentType: file.type,
          metadata: {
            suiteNumber: formData.suiteNumber || '',
            uploadedBy: user?.id || ''
          }
        });
        photoUrls.push(result.url);
      }
      return photoUrls;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suiteNumber || !formData.weight || !formData.receivedByStaffId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos first
      const photoUrls = await uploadPhotos();
      
      // Add photo URLs to form data
      const finalFormData = {
        ...formData,
        photos: photoUrls
      } as PackageReceivingData;

      await packageForwardingService.logReceivedPackage(finalFormData);
      toast({
        title: 'Package Received',
        description: 'Package has been successfully logged in the system.',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to Receive Package',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive New Package</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suiteNumber">Suite Number *</Label>
              <Input
                id="suiteNumber"
                value={formData.suiteNumber}
                onChange={(e) => setFormData({ ...formData, suiteNumber: e.target.value })}
                placeholder="IWB12345"
                required
              />
            </div>
            <div>
              <Label htmlFor="carrier">Carrier *</Label>
              <Select
                value={formData.carrier}
                onValueChange={(value) => setFormData({ ...formData, carrier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="usps">USPS</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber || ''}
                onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                placeholder="1Z999AA1234567890"
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Dimensions (cm) *</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Length"
                type="number"
                value={formData.dimensions?.length}
                onChange={(e) => setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions!,
                    length: parseFloat(e.target.value) || 0
                  }
                })}
                required
              />
              <Input
                placeholder="Width"
                type="number"
                value={formData.dimensions?.width}
                onChange={(e) => setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions!,
                    width: parseFloat(e.target.value) || 0
                  }
                })}
                required
              />
              <Input
                placeholder="Height"
                type="number"
                value={formData.dimensions?.height}
                onChange={(e) => setFormData({
                  ...formData,
                  dimensions: {
                    ...formData.dimensions!,
                    height: parseFloat(e.target.value) || 0
                  }
                })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                value={formData.senderName || ''}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="senderStore">Sender Store</Label>
              <Input
                id="senderStore"
                value={formData.senderStore || ''}
                onChange={(e) => setFormData({ ...formData, senderStore: e.target.value })}
                placeholder="Amazon, eBay, Target, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="declaredValue">Declared Value (USD)</Label>
              <Input
                id="declaredValue"
                type="number"
                step="0.01"
                value={formData.declaredValue || ''}
                onChange={(e) => setFormData({ ...formData, declaredValue: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="storageLocation">Storage Location</Label>
              <Input
                id="storageLocation"
                value={formData.storageLocation || ''}
                onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                placeholder="Auto-assigned if empty"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Package Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Electronics, clothing, books, etc."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="photos">Package Photos</Label>
            <div className="space-y-2">
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotosChange}
                disabled={isSubmitting || uploadingPhotos}
              />
              {photoFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {photoFiles.length} photo(s) selected
                </div>
              )}
              {uploadingPhotos && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading photos...
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploadingPhotos}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingPhotos ? 'Uploading Photos...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Receive Package
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TaskCard: React.FC<{
  task: WarehouseTask;
  onComplete: (taskId: string, notes?: string) => void;
  onAssign: (taskId: string, staffId: string) => void;
}> = ({ task, onComplete, onAssign }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{task.description}</h3>
            <p className="text-sm text-muted-foreground capitalize">{task.task_type.replace('_', ' ')}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {task.instructions && (
          <p className="text-sm text-muted-foreground mb-3">{task.instructions}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mb-3">
          <div>
            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span>
              {task.assigned_to ? `Assigned to: ${task.assigned_to}` : 'Unassigned'}
            </span>
          </div>
        </div>

        {task.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(true)}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Button>
            {!task.assigned_to && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssign(task.id, 'current-user')} // Would get actual user ID
              >
                <Users className="h-3 w-3 mr-1" />
                Assign to Me
              </Button>
            )}
          </div>
        )}

        {showNotes && (
          <Dialog open={showNotes} onOpenChange={setShowNotes}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Completion Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add any notes about the task completion..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setShowNotes(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    onComplete(task.id, completionNotes);
                    setShowNotes(false);
                  }}>
                    Complete Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export const WarehouseManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showReceivingForm, setShowReceivingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('');
  const [selectedPackagePhotos, setSelectedPackagePhotos] = useState<{
    photos: string[];
    packageInfo: any;
  } | null>(null);

  // Fetch warehouse dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['warehouse-dashboard'],
    queryFn: (): Promise<WarehouseDashboard> => warehouseManagementService.getDashboardData(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch warehouse tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['warehouse-tasks', taskFilter],
    queryFn: (): Promise<WarehouseTask[]> => 
      warehouseManagementService.getTasks(
        taskFilter ? { status: taskFilter } : undefined
      ),
  });

  // Fetch consolidation groups needing processing
  const { data: pendingConsolidations = [], isLoading: consolidationsLoading } = useQuery({
    queryKey: ['pending-consolidations'],
    queryFn: (): Promise<ConsolidationGroup[]> => 
      packageForwardingService.getPendingConsolidations(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch recent packages
  const { data: recentPackages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['recent-packages'],
    queryFn: (): Promise<ReceivedPackage[]> => 
      packageForwardingService.getRecentPackages(20),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch storage fee overview
  const { data: storageFeeOverview, isLoading: storageFeesLoading } = useQuery({
    queryKey: ['storage-fee-overview'],
    queryFn: (): Promise<StorageFeeOverview> => 
      storageFeeService.getAdminStorageFeeOverview(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, notes }: { taskId: string; notes?: string }) => {
      return await warehouseManagementService.completeTask(taskId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-dashboard'] });
      toast({
        title: 'Task Completed',
        description: 'Task has been marked as completed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Complete Task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, staffId }: { taskId: string; staffId: string }) => {
      return await warehouseManagementService.assignTask(taskId, staffId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-tasks'] });
      toast({
        title: 'Task Assigned',
        description: 'Task has been assigned successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Assign Task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleReceivePackageSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['warehouse-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['recent-packages'] });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || statusFilter === '' || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Access denied. Staff privileges required.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Management</h1>
          <p className="text-muted-foreground">
            Manage packages, tasks, and warehouse operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowReceivingForm(true)}>
            <Package className="h-4 w-4 mr-2" />
            Receive Package
          </Button>
        </div>
      </div>

      {/* Dashboard Overview */}
      {dashboardLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.total_packages}</div>
              <p className="text-xs text-muted-foreground">
                Across all zones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.pending_tasks.total}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.pending_tasks.by_priority.urgent || 0} urgent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location Usage</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.location_utilization.utilization_percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard.location_utilization.occupied_locations} / {dashboard.location_utilization.total_locations} locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consolidation Requests</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.consolidation_requests}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content Tabs - Simplified to 3 Core Tabs */}
      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Package Management
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tasksLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={(taskId, notes) => 
                    completeTaskMutation.mutate({ taskId, notes })
                  }
                  onAssign={(taskId, staffId) => 
                    assignTaskMutation.mutate({ taskId, staffId })
                  }
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter 
                    ? 'Try adjusting your filters.'
                    : 'All tasks are completed or no tasks have been assigned.'
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* Essential Analytics Section */}
          {dashboard && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Quick Analytics</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Package Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(dashboard.packages_by_status).slice(0, 4).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{status.replace('_', ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Task Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(dashboard.pending_tasks.by_priority).map(([priority, count]) => (
                        <div key={priority} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{priority}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Essential metrics overview</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/analytics">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Detailed Analytics
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Tabs defaultValue="packages" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="consolidations">Consolidations</TabsTrigger>
            </TabsList>
            <TabsContent value="packages">
              <PackageManagementPanel />
            </TabsContent>
            <TabsContent value="consolidations">
              <ConsolidationProcessingPanel />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Storage Fee Management</h2>
            <Button
              onClick={async () => {
                try {
                  const result = await storageFeeService.generateStorageFeeRecords();
                  toast({
                    title: 'Storage Fees Updated',
                    description: `Created ${result.created} new fees, updated ${result.updated} existing fees.`,
                  });
                  queryClient.invalidateQueries({ queryKey: ['storage-fee-overview'] });
                } catch (error: any) {
                  toast({
                    title: 'Failed to Update Fees',
                    description: error.message,
                    variant: 'destructive',
                  });
                }
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Update Fee Records
            </Button>
          </div>

          {storageFeesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : storageFeeOverview ? (
            <div className="space-y-6">
              {/* Storage Fee Overview Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{storageFeeOverview.total_packages}</div>
                    <p className="text-xs text-muted-foreground">
                      In storage system
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Free Period</CardTitle>
                    <Clock className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {storageFeeOverview.packages_in_free_period}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Not yet accruing fees
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Accruing Fees</CardTitle>
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {storageFeeOverview.packages_accruing_fees}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Beyond free period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unpaid Fees</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      ${storageFeeOverview.total_unpaid_fees_usd.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting payment
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Collected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ${storageFeeOverview.total_paid_fees_usd.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total fees collected</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Est.</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ${storageFeeOverview.estimated_monthly_revenue_usd.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Based on current packages</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {storageFeeOverview.average_storage_days.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">Days per package</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </TabsContent>

      </Tabs>

      {/* Package Receiving Form */}
      {showReceivingForm && (
        <PackageReceivingForm
          onClose={() => setShowReceivingForm(false)}
          onSuccess={handleReceivePackageSuccess}
        />
      )}

      {/* Package Photo Gallery */}
      {selectedPackagePhotos && (
        <PackagePhotoGallery
          photos={selectedPackagePhotos.photos}
          packageInfo={selectedPackagePhotos.packageInfo}
          open={true}
          onClose={() => setSelectedPackagePhotos(null)}
        />
      )}
      
      {/* Developer Tools Section (Hidden by default) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Developer Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PackageTestDataGenerator />
              <MinimalPackageTest />
              <DirectPackageTest />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};