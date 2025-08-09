import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  MessageCircle,
  Package,
  TruckIcon,
  CreditCard,
  Settings,
  Filter,
  Search,
  Download,
  Eye,
  User,
  ShoppingCart,
  AlertCircle,
  FileText,
  Send
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/types/database';

type OrderException = Database['public']['Tables']['order_exceptions']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'] & {
    orders?: Database['public']['Tables']['orders']['Row'] & {
      profiles?: Database['public']['Tables']['profiles']['Row'];
    };
  };
};

export const ExceptionManagementPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('open');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('open');
  const [selectedException, setSelectedException] = useState<OrderException | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch exceptions
  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ['order-exceptions', selectedStatus, selectedType, selectedPriority, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('order_exceptions')
        .select(`
          *,
          order_items!inner(
            id,
            product_name,
            seller_platform,
            orders!inner(
              id,
              order_number,
              customer_id,
              profiles!inner(full_name, email)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('exception_status', selectedStatus);
      }
      
      if (selectedType !== 'all') {
        query = query.eq('exception_type', selectedType);
      }

      if (selectedPriority !== 'all') {
        query = query.eq('priority', selectedPriority);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.filter(exception => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
          exception.order_items?.product_name?.toLowerCase().includes(searchLower) ||
          exception.order_items?.orders?.order_number?.toLowerCase().includes(searchLower) ||
          exception.order_items?.orders?.profiles?.email?.toLowerCase().includes(searchLower) ||
          exception.exception_description?.toLowerCase().includes(searchLower)
        );
      });
    },
  });

  // Resolve exception
  const resolveExceptionMutation = useMutation({
    mutationFn: async ({ exceptionId, resolution, notes }: { exceptionId: string; resolution: string; notes: string }) => {
      const { error } = await supabase
        .from('order_exceptions')
        .update({ 
          exception_status: 'resolved',
          resolution_action: resolution,
          admin_resolution_notes: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: 'admin' // TODO: Get actual admin user ID
        })
        .eq('id', exceptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-exceptions'] });
      setSelectedException(null);
      setResolutionNotes('');
      toast({ title: 'Exception resolved successfully', variant: 'default' });
    },
  });

  // Escalate exception
  const escalateExceptionMutation = useMutation({
    mutationFn: async ({ exceptionId, notes }: { exceptionId: string; notes: string }) => {
      const { error } = await supabase
        .from('order_exceptions')
        .update({ 
          exception_status: 'escalated',
          priority: 'critical',
          admin_resolution_notes: notes,
          escalated_at: new Date().toISOString()
        })
        .eq('id', exceptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-exceptions'] });
      setSelectedException(null);
      setResolutionNotes('');
      toast({ title: 'Exception escalated', variant: 'default' });
    },
  });

  // Contact customer
  const contactCustomerMutation = useMutation({
    mutationFn: async ({ exceptionId, message }: { exceptionId: string; message: string }) => {
      // TODO: Implement actual customer communication
      const { error } = await supabase
        .from('order_exceptions')
        .update({ 
          customer_contacted: true,
          customer_contact_message: message,
          customer_contact_at: new Date().toISOString()
        })
        .eq('id', exceptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-exceptions'] });
      toast({ title: 'Customer contacted successfully', variant: 'default' });
    },
  });

  // Get exception statistics
  const exceptionStats = React.useMemo(() => {
    const stats = {
      total: exceptions.length,
      open: 0,
      in_progress: 0,
      resolved: 0,
      escalated: 0,
      awaiting_customer: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    exceptions.forEach(exception => {
      // Status counts
      switch (exception.exception_status) {
        case 'open': stats.open++; break;
        case 'in_progress': stats.in_progress++; break;
        case 'resolved': stats.resolved++; break;
        case 'escalated': stats.escalated++; break;
        case 'awaiting_customer_response': stats.awaiting_customer++; break;
      }
      
      // Priority counts
      switch (exception.priority) {
        case 'critical': stats.critical++; break;
        case 'high': stats.high++; break;
        case 'medium': stats.medium++; break;
        case 'low': stats.low++; break;
      }
    });

    return stats;
  }, [exceptions]);

  const getExceptionIcon = (exceptionType: string) => {
    switch (exceptionType) {
      case 'out_of_stock': return Package;
      case 'price_change': return CreditCard;
      case 'shipping_delay': return TruckIcon;
      case 'quality_issue': return AlertTriangle;
      case 'seller_issue': return User;
      case 'payment_issue': return CreditCard;
      default: return AlertCircle;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'escalated': return 'destructive';
      case 'awaiting_customer_response': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than 1 hour ago';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold">Exception Management</h1>
            <p className="text-gray-500">Handle order exceptions and customer issues</p>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{exceptionStats.total}</div>
            <div className="text-sm text-gray-500">Total Exceptions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{exceptionStats.open + exceptionStats.escalated}</div>
            <div className="text-sm text-gray-500">Urgent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{exceptionStats.in_progress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{exceptionStats.awaiting_customer}</div>
            <div className="text-sm text-gray-500">Awaiting Customer</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{exceptionStats.resolved}</div>
            <div className="text-sm text-gray-500">Resolved</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="open">Open ({exceptionStats.open})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({exceptionStats.in_progress})</TabsTrigger>
          <TabsTrigger value="escalated">Escalated ({exceptionStats.escalated})</TabsTrigger>
          <TabsTrigger value="all">All Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search exceptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Exception Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="price_change">Price Change</SelectItem>
                    <SelectItem value="shipping_delay">Shipping Delay</SelectItem>
                    <SelectItem value="quality_issue">Quality Issue</SelectItem>
                    <SelectItem value="seller_issue">Seller Issue</SelectItem>
                    <SelectItem value="payment_issue">Payment Issue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Exceptions List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Exceptions List */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Exception Queue
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
                  ) : exceptions.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No exceptions found</h3>
                      <p className="text-gray-500">Exception tickets will appear here when issues arise</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exceptions
                        .filter(exception => {
                          if (selectedTab === 'all') return true;
                          if (selectedTab === 'open') return exception.exception_status === 'open';
                          if (selectedTab === 'in_progress') return exception.exception_status === 'in_progress';
                          if (selectedTab === 'escalated') return exception.exception_status === 'escalated';
                          return true;
                        })
                        .map((exception) => {
                          const Icon = getExceptionIcon(exception.exception_type || '');
                          
                          return (
                            <div 
                              key={exception.id} 
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedException?.id === exception.id 
                                  ? 'border-blue-300 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              } ${getPriorityColor(exception.priority || 'medium')}`}
                              onClick={() => setSelectedException(exception)}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Icon className="h-5 w-5" />
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm">
                                        {exception.order_items?.product_name || 'Product Item'}
                                      </h4>
                                      <Badge variant="outline" className="text-xs">
                                        {exception.order_items?.orders?.order_number}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      {exception.exception_description}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant={getStatusBadgeVariant(exception.exception_status || '')}>
                                    {exception.exception_status?.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {exception.priority}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Customer: {exception.order_items?.orders?.profiles?.email}</span>
                                <span>{formatTimeAgo(exception.created_at)}</span>
                              </div>

                              {exception.customer_choice_required && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                  <div className="flex items-center gap-2 text-yellow-700">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">Customer response required</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Exception Detail Panel */}
            <div className="space-y-4">
              {selectedException ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exception Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Type</label>
                        <p className="text-sm capitalize">{selectedException.exception_type?.replace('_', ' ')}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <p className="text-sm">{selectedException.exception_description}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Priority</label>
                        <Badge variant="outline" className="text-xs">
                          {selectedException.priority}
                        </Badge>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Customer Impact</label>
                        <p className="text-sm">{selectedException.customer_impact_level}</p>
                      </div>

                      {selectedException.expected_resolution_time && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Expected Resolution</label>
                          <p className="text-sm">
                            {new Date(selectedException.expected_resolution_time).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {selectedException.customer_choice_options && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Customer Options</label>
                          <div className="text-sm space-y-1">
                            {JSON.parse(selectedException.customer_choice_options).map((option: string, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution Notes</label>
                        <Textarea
                          placeholder="Enter resolution details..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => resolveExceptionMutation.mutate({
                            exceptionId: selectedException.id,
                            resolution: 'resolved',
                            notes: resolutionNotes
                          })}
                          disabled={resolveExceptionMutation.isPending || !resolutionNotes.trim()}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolve Exception
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => escalateExceptionMutation.mutate({
                            exceptionId: selectedException.id,
                            notes: resolutionNotes || 'Escalated for management review'
                          })}
                          disabled={escalateExceptionMutation.isPending}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Escalate
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => contactCustomerMutation.mutate({
                            exceptionId: selectedException.id,
                            message: resolutionNotes || 'We are working on resolving your order issue'
                          })}
                          disabled={contactCustomerMutation.isPending}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Contact Customer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Exception</h3>
                    <p className="text-gray-500">Choose an exception from the list to view details and take action</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExceptionManagementPage;