/**
 * Package Notifications List - Customer Dashboard
 * 
 * Shows customer's submitted package notifications and their status
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  customerPackageNotificationService,
  type CustomerPackageNotification,
} from '@/services/CustomerPackageNotificationService';
import { PackageNotificationForm } from './PackageNotificationForm';

export const PackageNotificationsList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<CustomerPackageNotification | null>(null);

  // Fetch customer notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['customer-package-notifications', user?.id],
    queryFn: () => user ? customerPackageNotificationService.getCustomerNotifications(user.id) : [],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Cancel notification mutation
  const cancelNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => 
      customerPackageNotificationService.cancelPackageNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-package-notifications'] });
      toast({
        title: 'Notification Cancelled',
        description: 'Your package notification has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Cancellation Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel notification',
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
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting for warehouse acknowledgment';
      case 'acknowledged':
        return 'Warehouse is aware and watching for your package';
      case 'received':
        return 'Package received at warehouse';
      case 'not_received':
        return 'Package not received within expected timeframe';
      case 'cancelled':
        return 'Notification cancelled';
      default:
        return 'Unknown status';
    }
  };

  const handleEditNotification = (notification: CustomerPackageNotification) => {
    setEditingNotification(notification);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNotification(null);
  };

  const canEdit = (notification: CustomerPackageNotification) => {
    return ['pending', 'acknowledged'].includes(notification.notification_status);
  };

  const canCancel = (notification: CustomerPackageNotification) => {
    return ['pending', 'acknowledged'].includes(notification.notification_status);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Package Notifications</h2>
          <p className="text-muted-foreground">
            Notify our warehouse about incoming packages
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Notify Warehouse
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Why notify us?</strong> When you let us know about incoming packages, 
          we can better prepare for receipt, reduce processing time, and ensure accurate handling.
        </AlertDescription>
      </Alert>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Package Notifications</h3>
            <p className="text-muted-foreground mb-4">
              You haven't submitted any package notifications yet.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Your First Notification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification: any) => (
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

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {getStatusDescription(notification.notification_status)}
                  </p>
                  {notification.warehouse_notes && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Warehouse Notes:</p>
                      <p className="text-sm text-blue-800">{notification.warehouse_notes}</p>
                    </div>
                  )}
                  {notification.sender_name && (
                    <p className="text-xs text-muted-foreground mt-2">
                      From: {notification.sender_name}
                      {notification.sender_store && ` (${notification.sender_store})`}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Submitted: {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  <div className="flex items-center gap-2">
                    {canEdit(notification) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditNotification(notification)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canCancel(notification) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelNotificationMutation.mutate(notification.id)}
                        disabled={cancelNotificationMutation.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Package Notification Form */}
      <PackageNotificationForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editingNotification={editingNotification}
      />
    </div>
  );
};