import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Search, 
  Download, 
  RefreshCw, 
  User, 
  Clock, 
  Activity,
  FileText,
  CreditCard,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AuditLog {
  id: number;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  action_category: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  old_data: any;
  new_data: any;
  metadata: any;
}

interface AdminActivity {
  user_email: string;
  user_role: string;
  action_count: number;
  categories: Record<string, number>;
  last_action: string;
}

const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');

  // Fetch recent audit logs
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', selectedCategory, selectedTimeRange, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('action_category', selectedCategory);
      }

      // Apply time range filter
      const now = new Date();
      let startDate = new Date();
      switch (selectedTimeRange) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      query = query.gte('created_at', startDate.toISOString());

      // Apply search filter
      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%,resource_id.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) {
        logger.error('Error fetching audit logs:', error);
        throw error;
      }
      return data as AuditLog[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch admin activity summary
  const { data: adminActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-activity', selectedTimeRange],
    queryFn: async () => {
      const startDate = new Date();
      switch (selectedTimeRange) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const { data, error } = await supabase.rpc('get_admin_activity_summary', {
        p_start_date: startDate.toISOString(),
        p_end_date: new Date().toISOString()
      });

      if (error) {
        logger.error('Error fetching admin activity:', error);
        throw error;
      }
      return data as AdminActivity[];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Get icon for action category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Shield className="h-4 w-4" />;
      case 'user_management':
        return <User className="h-4 w-4" />;
      case 'quote':
        return <FileText className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      case 'security':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Get badge variant for action
  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    if (action.includes('create') || action.includes('add')) return 'default';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    return 'outline';
  };

  // Format changes for display
  const formatChanges = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;

    if (!oldData) {
      return (
        <div className="text-sm">
          <Badge variant="default" className="mb-2">Created</Badge>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(newData, null, 2)}
          </pre>
        </div>
      );
    }

    if (!newData) {
      return (
        <div className="text-sm">
          <Badge variant="destructive" className="mb-2">Deleted</Badge>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(oldData, null, 2)}
          </pre>
        </div>
      );
    }

    // Show changes
    const changes: any = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    });

    if (Object.keys(changes).length === 0) return null;

    return (
      <div className="text-sm">
        <Badge variant="secondary" className="mb-2">Changed Fields</Badge>
        <div className="space-y-2">
          {Object.entries(changes).map(([field, values]: [string, any]) => (
            <div key={field} className="bg-muted p-2 rounded">
              <div className="font-medium">{field}:</div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="text-red-600">
                  <span className="text-xs text-muted-foreground">Old: </span>
                  {JSON.stringify(values.old)}
                </div>
                <div className="text-green-600">
                  <span className="text-xs text-muted-foreground">New: </span>
                  {JSON.stringify(values.new)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Export audit logs
  const exportLogs = () => {
    if (!auditLogs) return;

    const csv = [
      ['Date', 'User', 'Role', 'Action', 'Category', 'Resource', 'IP Address'].join(','),
      ...auditLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email,
        log.user_role,
        log.action,
        log.action_category,
        `${log.resource_type}:${log.resource_id}`,
        log.ip_address
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Logs Exported',
      description: `Exported ${auditLogs.length} audit log entries`,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all admin actions and system changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchLogs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportLogs} disabled={!auditLogs || auditLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, users, or IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="user_management">User Management</SelectItem>
                <SelectItem value="quote">Quotes</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Recent Activity</TabsTrigger>
          <TabsTrigger value="summary">Admin Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Logs</CardTitle>
              <CardDescription>
                {auditLogs?.length || 0} entries found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {logsLoading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : auditLogs?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No audit logs found</p>
                  ) : (
                    auditLogs?.map((log) => (
                      <Card key={log.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {getCategoryIcon(log.action_category)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={getActionBadgeVariant(log.action)}>
                                    {log.action}
                                  </Badge>
                                  <Badge variant="outline">
                                    {log.action_category}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  by <span className="font-medium">{log.user_email}</span>
                                  {log.user_role && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {log.user_role}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'HH:mm:ss')}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>

                          {log.resource_type && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Resource:</span>
                              <code className="bg-muted px-2 py-1 rounded">
                                {log.resource_type}:{log.resource_id}
                              </code>
                            </div>
                          )}

                          {(log.old_data || log.new_data) && (
                            <div className="border-t pt-3">
                              {formatChanges(log.old_data, log.new_data)}
                            </div>
                          )}

                          {log.metadata && (
                            <div className="border-t pt-3">
                              <details className="cursor-pointer">
                                <summary className="text-sm font-medium">Metadata</summary>
                                <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              IP: {log.ip_address || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Activity Summary</CardTitle>
              <CardDescription>
                Activity breakdown by admin user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : adminActivity?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No admin activity found</p>
                ) : (
                  adminActivity?.map((activity) => (
                    <Card key={activity.user_email} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{activity.user_email}</div>
                          <Badge variant="outline" className="mt-1">
                            {activity.user_role}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{activity.action_count}</div>
                          <div className="text-sm text-muted-foreground">Total Actions</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(activity.categories).map(([category, count]) => (
                          <div key={category} className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            <span className="text-sm">
                              {category}: {count}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Last action: {formatDistanceToNow(new Date(activity.last_action), { addSuffix: true })}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditLogsPage;