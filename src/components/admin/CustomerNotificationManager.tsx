/**
 * Customer Notification Manager Component
 * 
 * Admin interface for managing customer notification preferences
 * and viewing notification statistics.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Search,
  Settings,
  BarChart3,
  Filter,
  Download,
  Loader2,
  AlertCircle,
  Check,
  X,
  Eye,
  Edit,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  customerNotificationPreferencesService,
  type NotificationPreference,
  type NotificationPreferencesProfile,
  type CustomerNotificationSettings,
} from '@/services/CustomerNotificationPreferencesService';

interface CustomerWithPreferences {
  id: string;
  email: string;
  full_name: string;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at: string;
}

export const CustomerNotificationManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithPreferences | null>(null);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [customerSettings, setCustomerSettings] = useState<CustomerNotificationSettings | null>(null);

  // Fetch notification statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['notification-statistics'],
    queryFn: () => customerNotificationPreferencesService.getNotificationStatistics(),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch customers with notification preferences
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-with-preferences', searchTerm, filterChannel],
    queryFn: async () => {
      // Use manual JOIN query since Supabase nested queries have issues with auth.users references
      const baseQuery = `
        SELECT 
          p.id,
          p.email,
          p.full_name,
          p.created_at,
          COALESCE(cnp.email_notifications_enabled, true) as email_notifications_enabled,
          COALESCE(cnp.sms_notifications_enabled, false) as sms_notifications_enabled,
          COALESCE(cnp.push_notifications_enabled, true) as push_notifications_enabled
        FROM profiles p
        LEFT JOIN customer_notification_profiles cnp ON p.id = cnp.user_id
      `;

      let whereClause = '';
      if (searchTerm) {
        whereClause = ` WHERE (p.email ILIKE '%${searchTerm}%' OR p.full_name ILIKE '%${searchTerm}%')`;
      }

      const finalQuery = baseQuery + whereClause + ' ORDER BY p.created_at DESC';

      const { data, error } = await supabase.rpc('execute_sql', { 
        query: finalQuery 
      });

      if (error) {
        // Fallback to simpler query if RPC doesn't work
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        if (profilesError) throw profilesError;

        // Get notification preferences separately
        const { data: preferencesData } = await supabase
          .from('customer_notification_profiles')
          .select('user_id, email_notifications_enabled, sms_notifications_enabled, push_notifications_enabled');

        const preferencesMap = new Map(
          (preferencesData || []).map(pref => [pref.user_id, pref])
        );

        return (profilesData || []).map(customer => ({
          id: customer.id,
          email: customer.email,
          full_name: customer.full_name,
          created_at: customer.created_at,
          email_notifications_enabled: preferencesMap.get(customer.id)?.email_notifications_enabled ?? true,
          sms_notifications_enabled: preferencesMap.get(customer.id)?.sms_notifications_enabled ?? false,
          push_notifications_enabled: preferencesMap.get(customer.id)?.push_notifications_enabled ?? true,
        })) as CustomerWithPreferences[];
      }

      return (data || []).map((customer: any) => ({
        id: customer.id,
        email: customer.email,
        full_name: customer.full_name,
        created_at: customer.created_at,
        email_notifications_enabled: customer.email_notifications_enabled,
        sms_notifications_enabled: customer.sms_notifications_enabled,
        push_notifications_enabled: customer.push_notifications_enabled,
      })) as CustomerWithPreferences[];
    },
  });

  // Load customer preferences when dialog opens
  const loadCustomerPreferences = async (customer: CustomerWithPreferences) => {
    try {
      const settings = await customerNotificationPreferencesService.getCustomerNotificationSettings(customer.id);
      setCustomerSettings(settings);
      setSelectedCustomer(customer);
      setShowPreferencesDialog(true);
    } catch (error) {
      toast({
        title: 'Failed to Load Preferences',
        description: error instanceof Error ? error.message : 'Failed to load customer preferences',
        variant: 'destructive',
      });
    }
  };

  // Update customer preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      preferences, 
      profile 
    }: { 
      userId: string; 
      preferences: Partial<NotificationPreference>[]; 
      profile: Partial<NotificationPreferencesProfile>;
    }) => {
      await Promise.all([
        customerNotificationPreferencesService.updateNotificationPreferences(userId, preferences),
        customerNotificationPreferencesService.updateNotificationProfile(userId, profile)
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-with-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['notification-statistics'] });
      toast({
        title: 'Preferences Updated',
        description: 'Customer notification preferences have been updated successfully.',
      });
      setShowPreferencesDialog(false);
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update preferences',
        variant: 'destructive',
      });
    },
  });

  const filteredCustomers = customers.filter(customer => {
    if (filterChannel === 'email') return customer.email_notifications_enabled;
    if (filterChannel === 'sms') return customer.sms_notifications_enabled;
    if (filterChannel === 'push') return customer.push_notifications_enabled;
    if (filterChannel === 'disabled') return !customer.email_notifications_enabled && !customer.sms_notifications_enabled && !customer.push_notifications_enabled;
    return true;
  });

  const handlePreferenceChange = (
    notificationType: string,
    channel: string,
    enabled: boolean
  ) => {
    if (!customerSettings) return;

    const updatedPreferences = customerSettings.preferences.map(pref => {
      if (pref.notification_type === notificationType && pref.channel === channel) {
        return { ...pref, enabled };
      }
      return pref;
    });

    setCustomerSettings({
      ...customerSettings,
      preferences: updatedPreferences
    });
  };

  const handleProfileChange = (field: keyof NotificationPreferencesProfile, value: any) => {
    if (!customerSettings) return;

    setCustomerSettings({
      ...customerSettings,
      profile: {
        ...customerSettings.profile,
        [field]: value
      }
    });
  };

  const handleSavePreferences = () => {
    if (!selectedCustomer || !customerSettings) return;

    updatePreferencesMutation.mutate({
      userId: selectedCustomer.id,
      preferences: customerSettings.preferences,
      profile: customerSettings.profile
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Customer Notification Manager</h2>
        <p className="text-muted-foreground">
          Manage customer notification preferences and view statistics
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
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
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_customers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Email Enabled</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.email_enabled}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.email_enabled / stats.total_customers) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SMS Enabled</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sms_enabled}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.sms_enabled / stats.total_customers) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Push Enabled</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.push_enabled}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.push_enabled / stats.total_customers) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
                <BellOff className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unsubscribed}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.unsubscribed / stats.total_customers) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={filterChannel}
              onValueChange={setFilterChannel}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="email">Email Enabled</SelectItem>
                <SelectItem value="sms">SMS Enabled</SelectItem>
                <SelectItem value="push">Push Enabled</SelectItem>
                <SelectItem value="disabled">All Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {customersLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Customers Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <h4 className="font-semibold">{customer.full_name || 'Unknown Name'}</h4>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={customer.email_notifications_enabled ? 'default' : 'secondary'}>
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Badge>
                        <Badge variant={customer.sms_notifications_enabled ? 'default' : 'secondary'}>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          SMS
                        </Badge>
                        <Badge variant={customer.push_notifications_enabled ? 'default' : 'secondary'}>
                          <Smartphone className="h-3 w-3 mr-1" />
                          Push
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Joined: {format(new Date(customer.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadCustomerPreferences(customer)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Preferences Dialog */}
      {showPreferencesDialog && selectedCustomer && customerSettings && (
        <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Notification Preferences - {selectedCustomer.full_name || selectedCustomer.email}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="preferences" className="space-y-4">
              <TabsList>
                <TabsTrigger value="preferences">Notification Types</TabsTrigger>
                <TabsTrigger value="channels">Channel Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="preferences" className="space-y-4">
                <div className="space-y-6">
                  {[
                    { 
                      category: 'Package Notifications',
                      types: ['package_received', 'package_ready_to_ship', 'package_shipped']
                    },
                    { 
                      category: 'Storage Fee Notifications',
                      types: ['storage_fee_due', 'storage_fee_waived']
                    },
                    { 
                      category: 'Consolidation Notifications',
                      types: ['consolidation_ready']
                    },
                    { 
                      category: 'General Updates',
                      types: ['general_updates']
                    }
                  ].map(({ category, types }) => (
                    <div key={category}>
                      <h4 className="font-semibold mb-3">{category}</h4>
                      <div className="space-y-3">
                        {types.map(type => {
                          const typePrefs = customerSettings.preferences.filter(p => p.notification_type === type);
                          return (
                            <div key={type} className="border rounded-lg p-4">
                              <h5 className="font-medium mb-2 capitalize">{type.replace('_', ' ')}</h5>
                              <div className="grid grid-cols-4 gap-4">
                                {['email', 'sms', 'in_app', 'push'].map(channel => {
                                  const pref = typePrefs.find(p => p.channel === channel);
                                  return (
                                    <div key={channel} className="flex items-center space-x-2">
                                      <Switch
                                        checked={pref?.enabled || false}
                                        onCheckedChange={(enabled) => handlePreferenceChange(type, channel, enabled)}
                                      />
                                      <Label className="text-sm capitalize">{channel.replace('_', ' ')}</Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="channels" className="space-y-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Channel Settings</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Email Notifications</Label>
                          <Switch
                            checked={customerSettings.profile.email_notifications_enabled}
                            onCheckedChange={(checked) => handleProfileChange('email_notifications_enabled', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>SMS Notifications</Label>
                          <Switch
                            checked={customerSettings.profile.sms_notifications_enabled}
                            onCheckedChange={(checked) => handleProfileChange('sms_notifications_enabled', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Push Notifications</Label>
                          <Switch
                            checked={customerSettings.profile.push_notifications_enabled}
                            onCheckedChange={(checked) => handleProfileChange('push_notifications_enabled', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Marketing Emails</Label>
                          <Switch
                            checked={customerSettings.profile.marketing_emails_enabled}
                            onCheckedChange={(checked) => handleProfileChange('marketing_emails_enabled', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Preferences</h4>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="language">Preferred Language</Label>
                          <Select
                            value={customerSettings.profile.preferred_language}
                            onValueChange={(value) => handleProfileChange('preferred_language', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="hi">Hindi</SelectItem>
                              <SelectItem value="ne">Nepali</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select
                            value={customerSettings.profile.timezone}
                            onValueChange={(value) => handleProfileChange('timezone', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="America/New_York">Eastern Time</SelectItem>
                              <SelectItem value="America/Chicago">Central Time</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                              <SelectItem value="Asia/Kathmandu">Nepal Time</SelectItem>
                              <SelectItem value="Asia/Kolkata">India Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreferencesDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePreferences}
                disabled={updatePreferencesMutation.isPending}
              >
                {updatePreferencesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};