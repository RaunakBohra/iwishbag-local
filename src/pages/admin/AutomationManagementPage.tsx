import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  BarChart3,
  Filter,
  Search,
  Download,
  Upload,
  Monitor,
  Zap,
  BrainCircuit
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/types/database';

type AutomationTask = Database['public']['Tables']['seller_order_automation']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'];
};

export const AutomationManagementPage: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('tasks');
  
  const queryClient = useQueryClient();

  // Fetch automation tasks
  const { data: automationTasks = [], isLoading, error } = useQuery({
    queryKey: ['automation-tasks', selectedPlatform, selectedStatus, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('seller_order_automation')
        .select(`
          *,
          order_items!inner(
            id,
            product_name,
            seller_platform,
            order_id,
            orders!inner(
              order_number,
              customer_id,
              profiles!inner(full_name, email)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedPlatform !== 'all') {
        query = query.eq('seller_platform', selectedPlatform);
      }
      
      if (selectedStatus !== 'all') {
        query = query.eq('automation_status', selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.filter(task => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
          task.order_items?.product_name?.toLowerCase().includes(searchLower) ||
          task.order_items?.orders?.order_number?.toLowerCase().includes(searchLower) ||
          task.order_items?.orders?.profiles?.email?.toLowerCase().includes(searchLower)
        );
      });
    },
  });

  // Retry automation task
  const retryAutomationMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('seller_order_automation')
        .update({ 
          automation_status: 'queued',
          retry_count: 0,
          error_message: null,
          scheduled_for: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-tasks'] });
      toast({ title: 'Task queued for retry', variant: 'default' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to retry task', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    },
  });

  // Pause automation task
  const pauseAutomationMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('seller_order_automation')
        .update({ automation_status: 'paused' })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-tasks'] });
      toast({ title: 'Task paused', variant: 'default' });
    },
  });

  // Resume automation task
  const resumeAutomationMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('seller_order_automation')
        .update({ 
          automation_status: 'queued',
          scheduled_for: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-tasks'] });
      toast({ title: 'Task resumed', variant: 'default' });
    },
  });

  // Get task statistics
  const taskStats = React.useMemo(() => {
    const stats = {
      total: automationTasks.length,
      completed: 0,
      running: 0,
      failed: 0,
      queued: 0,
      paused: 0,
    };

    automationTasks.forEach(task => {
      switch (task.automation_status) {
        case 'completed': stats.completed++; break;
        case 'running': 
        case 'in_progress': stats.running++; break;
        case 'failed':
        case 'error': stats.failed++; break;
        case 'queued':
        case 'pending': stats.queued++; break;
        case 'paused': stats.paused++; break;
      }
    });

    return stats;
  }, [automationTasks]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'running':
      case 'in_progress': return RefreshCw;
      case 'failed':
      case 'error': return AlertTriangle;
      case 'paused': return Pause;
      case 'queued':
      case 'pending': return Clock;
      default: return Bot;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'running':
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'paused': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'queued':
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Automation Tasks</h3>
            <p className="text-gray-500">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Automation Management</h1>
            <p className="text-gray-500">Monitor and control Brightdata seller automation tasks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{taskStats.total}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{taskStats.running}</div>
            <div className="text-sm text-gray-500">Running</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{taskStats.failed}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{taskStats.queued}</div>
            <div className="text-sm text-gray-500">Queued</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{taskStats.paused}</div>
            <div className="text-sm text-gray-500">Paused</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks, orders, or customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="alibaba">Alibaba</SelectItem>
                    <SelectItem value="flipkart">Flipkart</SelectItem>
                    <SelectItem value="ebay">eBay</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Automation Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {automationTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No automation tasks found</h3>
                      <p className="text-gray-500">Tasks will appear here when orders are processed</p>
                    </div>
                  ) : (
                    automationTasks.map((task) => {
                      const StatusIcon = getStatusIcon(task.automation_status || 'pending');
                      
                      return (
                        <div key={task.id} className={`p-4 border rounded-lg ${getStatusColor(task.automation_status || 'pending')}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <StatusIcon 
                                className={`h-5 w-5 ${
                                  task.automation_status === 'running' || task.automation_status === 'in_progress' 
                                    ? 'animate-spin' 
                                    : ''
                                }`} 
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">
                                    {task.order_items?.product_name || 'Product Item'}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {task.seller_platform}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {task.order_items?.orders?.order_number}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-2">
                                  Customer: {task.order_items?.orders?.profiles?.email}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {task.retry_count !== undefined && task.max_retries && (
                                    <span>Retries: {task.retry_count}/{task.max_retries}</span>
                                  )}
                                  {task.execution_time_seconds && (
                                    <span>Duration: {task.execution_time_seconds}s</span>
                                  )}
                                  {task.completed_at && (
                                    <span>
                                      Completed: {new Date(task.completed_at).toLocaleString()}
                                    </span>
                                  )}
                                  {task.scheduled_for && task.automation_status === 'queued' && (
                                    <span>
                                      Scheduled: {new Date(task.scheduled_for).toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                {task.error_message && (
                                  <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                                    <strong>Error:</strong> {task.error_message}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant={
                                task.automation_status === 'completed' ? 'default' :
                                task.automation_status === 'failed' ? 'destructive' :
                                task.automation_status === 'running' ? 'secondary' : 'outline'
                              }>
                                {task.automation_status || 'pending'}
                              </Badge>
                              
                              <div className="flex gap-1">
                                {task.automation_status === 'failed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => retryAutomationMutation.mutate(task.id)}
                                    disabled={retryAutomationMutation.isPending}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {task.automation_status === 'running' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => pauseAutomationMutation.mutate(task.id)}
                                    disabled={pauseAutomationMutation.isPending}
                                  >
                                    <Pause className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {task.automation_status === 'paused' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => resumeAutomationMutation.mutate(task.id)}
                                    disabled={resumeAutomationMutation.isPending}
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Brightdata Sessions</h3>
              <p className="text-gray-500">Live session monitoring coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Automation Analytics</h3>
              <p className="text-gray-500">Performance analytics coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Automation Settings</h3>
              <p className="text-gray-500">Configuration settings coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationManagementPage;