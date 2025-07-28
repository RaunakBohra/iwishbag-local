/**
 * Package Notification Manager - Admin Interface
 * 
 * Allows warehouse staff to view and manage customer package notifications
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Truck,
  Calendar,
  Scale,
  DollarSign,
  MapPin,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Edit,
  Loader2,
  Eye,
  Search,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  customerPackageNotificationService,
  type CustomerPackageNotification,
} from '@/services/CustomerPackageNotificationService';

export const PackageNotificationManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<CustomerPackageNotification | null>(null);
  const [showAcknowledgeDialog, setShowAcknowledgeDialog] = useState(false);
  const [warehouseNotes, setWarehouseNotes] = useState('');

  // Fetch notification statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['package-notification-statistics'],
    queryFn: () => customerPackageNotificationService.getNotificationStatistics(),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch pending notifications
  const { data: pendingNotifications = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-package-notifications'],
    queryFn: () => customerPackageNotificationService.getPendingNotifications(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch overdue notifications
  const { data: overdueNotifications = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-package-notifications'],
    queryFn: () => customerPackageNotificationService.getOverdueNotifications(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Search notifications by tracking number
  const { data: searchResults = [], refetch: searchNotifications } = useQuery({
    queryKey: ['search-package-notifications', searchTerm],
    queryFn: () => searchTerm ? customerPackageNotificationService.searchByTrackingNumber(searchTerm) : [],
    enabled: false, // Manual trigger
  });

  // Acknowledge notification mutation
  const acknowledgeNotificationMutation = useMutation({
    mutationFn: async ({ notificationId, notes }: { notificationId: string; notes?: string }) => {
      if (!user) throw new Error('User not authenticated');
      return customerPackageNotificationService.acknowledgeNotification(notificationId, user.id, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-package-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['package-notification-statistics'] });
      toast({
        title: 'Notification Acknowledged',
        description: 'The package notification has been acknowledged.',
      });
      setShowAcknowledgeDialog(false);
      setSelectedNotification(null);
      setWarehouseNotes('');
    },
    onError: (error) => {
      toast({
        title: 'Acknowledgment Failed',
        description: error instanceof Error ? error.message : 'Failed to acknowledge notification',
        variant: 'destructive',
      });
    },
  });

  // Mark as received mutation
  const markReceivedMutation = useMutation({
    mutationFn: (notificationId: string) => 
      customerPackageNotificationService.markAsReceived(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-package-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-package-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['package-notification-statistics'] });
      toast({
        title: 'Marked as Received',
        description: 'The package notification has been marked as received.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to mark as received',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      acknowledged: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      not_received: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'acknowledged':
        return <Eye className="h-4 w-4" />;
      case 'received':
        return <CheckCircle className="h-4 w-4" />;
      case 'not_received':
        return <AlertTriangle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleAcknowledge = (notification: CustomerPackageNotification) => {
    setSelectedNotification(notification);
    setShowAcknowledgeDialog(true);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchNotifications();
    }
  };

  const filteredNotifications = pendingNotifications.filter((notification: any) => {
    if (statusFilter !== 'all' && notification.notification_status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Package Notification Manager</h2>
        <p className="text-muted-foreground">
          Manage customer package notifications and warehouse acknowledgments
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_notifications}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.acknowledged}</div>
                <p className="text-xs text-muted-foreground">Being watched</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Received</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.received}</div>
                <p className="text-xs text-muted-foreground">Successfully processed</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tracking number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pending ({stats?.pending || 0})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueNotifications.length})</TabsTrigger>
          <TabsTrigger value="search">Search Results ({searchResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  No pending package notifications at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification: any) => (
                <Card key={notification.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {notification.package_description || 'Package Notification'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {notification.profiles?.full_name || notification.profiles?.email} - 
                            Suite {notification.customer_addresses?.suite_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(notification.notification_status)} variant="secondary">
                          {getStatusIcon(notification.notification_status)}
                          <span className="ml-1 capitalize">
                            {notification.notification_status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{notification.carrier}</span>
                      </div>
                      {notification.tracking_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-xs">{notification.tracking_number}</span>
                        </div>
                      )}
                      {notification.expected_delivery_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(notification.expected_delivery_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {notification.estimated_weight_kg && (
                        <div className="flex items-center gap-2 text-sm">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <span>{notification.estimated_weight_kg}kg</span>
                        </div>
                      )}
                    </div>

                    {notification.special_instructions && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm font-medium text-amber-900 mb-1">Special Instructions:</p>
                        <p className="text-sm text-amber-800">{notification.special_instructions}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Submitted: {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      <div className="flex items-center gap-2">
                        {notification.notification_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(notification)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {notification.notification_status === 'acknowledged' && (
                          <Button
                            size="sm"
                            onClick={() => markReceivedMutation.mutate(notification.id)}
                            disabled={markReceivedMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Received
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {overdueNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Overdue Notifications</h3>
                <p className="text-muted-foreground">
                  All notifications are on track or have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {overdueNotifications.map((notification: any) => (
                <Card key={notification.id} className="border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {notification.package_description || 'Package Notification'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {notification.profiles?.full_name || notification.profiles?.email} - 
                            Suite {notification.customer_addresses?.suite_number}
                          </p>
                          <p className="text-sm text-red-600">
                            Expected: {format(new Date(notification.expected_delivery_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-red-100 text-red-800" variant="secondary">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Overdue
                      </Badge>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markReceivedMutation.mutate(notification.id)}
                        disabled={markReceivedMutation.isPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Received
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          {searchResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search Results</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No notifications found for this tracking number.' : 'Enter a tracking number to search.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {searchResults.map((notification: any) => (
                <Card key={notification.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {notification.package_description || 'Package Notification'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {notification.profiles?.full_name || notification.profiles?.email} - 
                            Suite {notification.customer_addresses?.suite_number}
                          </p>
                          <p className="text-sm font-mono text-blue-600">{notification.tracking_number}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(notification.notification_status)} variant="secondary">
                        {getStatusIcon(notification.notification_status)}
                        <span className="ml-1 capitalize">
                          {notification.notification_status.replace('_', ' ')}
                        </span>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Acknowledge Dialog */}
      {showAcknowledgeDialog && selectedNotification && (
        <Dialog open={showAcknowledgeDialog} onOpenChange={setShowAcknowledgeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Acknowledge Package Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{selectedNotification.package_description}</h4>
                <p className="text-sm text-muted-foreground">
                  Suite {selectedNotification.customer_addresses?.suite_number}
                </p>
              </div>
              <div>
                <Label htmlFor="warehouse-notes">Warehouse Notes (Optional)</Label>
                <Textarea
                  id="warehouse-notes"
                  value={warehouseNotes}
                  onChange={(e) => setWarehouseNotes(e.target.value)}
                  placeholder="Add any notes about this notification..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAcknowledgeDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => acknowledgeNotificationMutation.mutate({ 
                  notificationId: selectedNotification.id, 
                  notes: warehouseNotes 
                })}
                disabled={acknowledgeNotificationMutation.isPending}
              >
                {acknowledgeNotificationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Acknowledging...
                  </>
                ) : (
                  'Acknowledge'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};