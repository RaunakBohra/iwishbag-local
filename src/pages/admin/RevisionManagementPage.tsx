import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Package,
  MessageCircle,
  Settings,
  Filter,
  Search,
  Download,
  RefreshCw,
  Eye,
  Users,
  Timer
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/types/database';

type ItemRevision = Database['public']['Tables']['item_revisions']['Row'] & {
  order_items?: Database['public']['Tables']['order_items']['Row'] & {
    orders?: Database['public']['Tables']['orders']['Row'] & {
      profiles?: Database['public']['Tables']['profiles']['Row'];
    };
  };
};

export const RevisionManagementPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRevisions, setSelectedRevisions] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState('pending');
  
  const queryClient = useQueryClient();

  // Fetch revisions
  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['item-revisions', selectedStatus, selectedType, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('item_revisions')
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
        query = query.eq('customer_approval_status', selectedStatus);
      }
      
      if (selectedType !== 'all') {
        query = query.eq('change_type', selectedType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.filter(revision => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
          revision.order_items?.product_name?.toLowerCase().includes(searchLower) ||
          revision.order_items?.orders?.order_number?.toLowerCase().includes(searchLower) ||
          revision.order_items?.orders?.profiles?.email?.toLowerCase().includes(searchLower)
        );
      });
    },
  });

  // Approve revision
  const approveRevisionMutation = useMutation({
    mutationFn: async (revisionIds: string[]) => {
      const { error } = await supabase
        .from('item_revisions')
        .update({ 
          customer_approval_status: 'approved',
          admin_approved_at: new Date().toISOString(),
          admin_notes: 'Approved by admin'
        })
        .in('id', revisionIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-revisions'] });
      setSelectedRevisions(new Set());
      toast({ title: 'Revisions approved successfully', variant: 'default' });
    },
  });

  // Reject revision
  const rejectRevisionMutation = useMutation({
    mutationFn: async (revisionIds: string[]) => {
      const { error } = await supabase
        .from('item_revisions')
        .update({ 
          customer_approval_status: 'rejected',
          admin_approved_at: new Date().toISOString(),
          admin_notes: 'Rejected by admin'
        })
        .in('id', revisionIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-revisions'] });
      setSelectedRevisions(new Set());
      toast({ title: 'Revisions rejected', variant: 'default' });
    },
  });

  // Auto-approve revision
  const autoApproveRevisionMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      const { error } = await supabase
        .from('item_revisions')
        .update({ 
          auto_approved: true,
          customer_approval_status: 'auto_approved',
          admin_approved_at: new Date().toISOString(),
          admin_notes: 'Auto-approved within threshold limits'
        })
        .eq('id', revisionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-revisions'] });
      toast({ title: 'Revision auto-approved', variant: 'default' });
    },
  });

  // Get revision statistics
  const revisionStats = React.useMemo(() => {
    const stats = {
      total: revisions.length,
      pending: 0,
      awaiting_customer: 0,
      approved: 0,
      rejected: 0,
      auto_approved: 0,
      totalImpact: 0,
    };

    revisions.forEach(revision => {
      switch (revision.customer_approval_status) {
        case 'pending': stats.pending++; break;
        case 'awaiting_customer_response': stats.awaiting_customer++; break;
        case 'approved': stats.approved++; break;
        case 'rejected': stats.rejected++; break;
        case 'auto_approved': stats.auto_approved++; break;
      }
      
      if (revision.total_cost_impact) {
        stats.totalImpact += revision.total_cost_impact;
      }
    });

    return stats;
  }, [revisions]);

  const getRevisionIcon = (changeType: string) => {
    switch (changeType) {
      case 'price_increase': return TrendingUp;
      case 'price_decrease': return TrendingDown;
      case 'weight_increase': return Package;
      case 'weight_decrease': return Package;
      default: return AlertTriangle;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'auto_approved': return 'default';
      case 'pending':
      case 'awaiting_customer_response': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0) return 'text-red-600';
    if (impact < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const toggleRevisionSelection = (revisionId: string) => {
    const newSelected = new Set(selectedRevisions);
    if (newSelected.has(revisionId)) {
      newSelected.delete(revisionId);
    } else {
      newSelected.add(revisionId);
    }
    setSelectedRevisions(newSelected);
  };

  const selectAllRevisions = () => {
    const filteredRevisions = revisions.filter(r => 
      selectedTab === 'all' || 
      (selectedTab === 'pending' && (r.customer_approval_status === 'pending' || r.customer_approval_status === 'awaiting_customer_response'))
    );
    setSelectedRevisions(new Set(filteredRevisions.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedRevisions(new Set());
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold">Revision Management</h1>
            <p className="text-gray-500">Manage price and weight change approvals</p>
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
            <div className="text-2xl font-bold text-gray-900">{revisionStats.total}</div>
            <div className="text-sm text-gray-500">Total Revisions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{revisionStats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{revisionStats.awaiting_customer}</div>
            <div className="text-sm text-gray-500">Awaiting Customer</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{revisionStats.approved}</div>
            <div className="text-sm text-gray-500">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{revisionStats.rejected}</div>
            <div className="text-sm text-gray-500">Rejected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getImpactColor(revisionStats.totalImpact)}`}>
              {revisionStats.totalImpact > 0 ? '+' : ''}{formatCurrency(revisionStats.totalImpact)}
            </div>
            <div className="text-sm text-gray-500">Total Impact</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({revisionStats.pending + revisionStats.awaiting_customer})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({revisionStats.approved + revisionStats.auto_approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({revisionStats.rejected})</TabsTrigger>
          <TabsTrigger value="all">All Revisions</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center justify-between">
                <div className="flex gap-4 items-center flex-1">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search revisions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Change Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="price_increase">Price Increase</SelectItem>
                      <SelectItem value="price_decrease">Price Decrease</SelectItem>
                      <SelectItem value="weight_increase">Weight Increase</SelectItem>
                      <SelectItem value="weight_decrease">Weight Decrease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {selectedRevisions.size > 0 && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">
                      {selectedRevisions.size} selected
                    </span>
                    <Button
                      size="sm"
                      onClick={() => approveRevisionMutation.mutate(Array.from(selectedRevisions))}
                      disabled={approveRevisionMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectRevisionMutation.mutate(Array.from(selectedRevisions))}
                      disabled={rejectRevisionMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {revisions.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={selectAllRevisions}>
                    Select All Visible
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revisions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Revision Requests
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
              ) : revisions.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No revisions found</h3>
                  <p className="text-gray-500">Revision requests will appear here when price or weight changes occur</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {revisions
                    .filter(revision => {
                      if (selectedTab === 'all') return true;
                      if (selectedTab === 'pending') {
                        return revision.customer_approval_status === 'pending' || 
                               revision.customer_approval_status === 'awaiting_customer_response';
                      }
                      if (selectedTab === 'approved') {
                        return revision.customer_approval_status === 'approved' || 
                               revision.customer_approval_status === 'auto_approved';
                      }
                      if (selectedTab === 'rejected') {
                        return revision.customer_approval_status === 'rejected';
                      }
                      return true;
                    })
                    .map((revision) => {
                      const Icon = getRevisionIcon(revision.change_type || '');
                      const impact = revision.total_cost_impact || 0;
                      const isSelected = selectedRevisions.has(revision.id);
                      
                      return (
                        <div key={revision.id} className={`p-4 border rounded-lg ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRevisionSelection(revision.id)}
                            />
                            
                            <Icon className={`h-5 w-5 mt-0.5 ${getImpactColor(impact)}`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-sm">
                                  {revision.order_items?.product_name || 'Product Item'}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {revision.order_items?.orders?.order_number}
                                </Badge>
                                <Badge variant={getStatusBadgeVariant(revision.customer_approval_status || '')}>
                                  {revision.customer_approval_status?.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                Customer: {revision.order_items?.orders?.profiles?.email}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                                {revision.original_price && revision.new_price && (
                                  <div>
                                    <span className="text-gray-500">Price Change:</span>
                                    <div className="flex items-center gap-2">
                                      <span>${revision.original_price.toFixed(2)}</span>
                                      <span>→</span>
                                      <span className={`font-medium ${getImpactColor(impact)}`}>
                                        ${revision.new_price.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <span className="text-gray-500">Impact:</span>
                                  <div className={`font-medium ${getImpactColor(impact)}`}>
                                    {impact > 0 ? '+' : ''}{formatCurrency(impact)}
                                    {revision.price_change_percentage && (
                                      <span className="text-xs ml-1">
                                        ({revision.price_change_percentage.toFixed(1)}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {revision.change_reason && (
                                <div className="mb-3">
                                  <span className="text-sm text-gray-500">Reason:</span>
                                  <p className="text-sm mt-1">{revision.change_reason}</p>
                                </div>
                              )}

                              {revision.auto_approval_eligible && !revision.auto_approved && (
                                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                  <div className="flex items-center gap-2 text-blue-700">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="font-medium">Auto-approval eligible</span>
                                  </div>
                                  {revision.auto_approval_reason && (
                                    <p className="text-blue-600 mt-1">{revision.auto_approval_reason}</p>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Revision #{revision.revision_number}</span>
                                <span>Created: {new Date(revision.created_at).toLocaleDateString()}</span>
                                {revision.customer_response_deadline && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    Deadline: {new Date(revision.customer_response_deadline).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              {revision.auto_approval_eligible && !revision.auto_approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => autoApproveRevisionMutation.mutate(revision.id)}
                                  disabled={autoApproveRevisionMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Auto-approve
                                </Button>
                              )}
                              
                              {(revision.customer_approval_status === 'pending' || 
                                revision.customer_approval_status === 'awaiting_customer_response') && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => approveRevisionMutation.mutate([revision.id])}
                                    disabled={approveRevisionMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectRevisionMutation.mutate([revision.id])}
                                    disabled={rejectRevisionMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevisionManagementPage;