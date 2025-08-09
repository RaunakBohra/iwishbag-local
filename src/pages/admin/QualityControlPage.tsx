import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Upload,
  Eye,
  FileImage,
  Award,
  Clock,
  Users,
  Settings,
  Filter,
  Search,
  Download,
  Clipboard,
  Star,
  Shield,
  Target
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Database } from '@/types/database';

type QualityCheckItem = {
  id: string;
  order_item_id: string;
  product_name: string;
  order_number: string;
  customer_email: string;
  quality_check_status: string;
  quality_check_priority: string;
  quality_check_notes: string;
  inspector_assigned: string;
  photos_taken: number;
  quality_standards: string[];
  created_at: string;
  completed_at?: string;
  warehouse: string;
};

export const QualityControlPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedItem, setSelectedItem] = useState<QualityCheckItem | null>(null);
  const [qualityNotes, setQualityNotes] = useState('');
  const [selectedStandards, setSelectedStandards] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  // Quality check standards
  const qualityStandards = [
    { id: 'packaging_intact', label: 'Packaging Intact', category: 'packaging' },
    { id: 'no_damage', label: 'No Physical Damage', category: 'condition' },
    { id: 'authentic_product', label: 'Authentic Product', category: 'authenticity' },
    { id: 'complete_accessories', label: 'All Accessories Present', category: 'completeness' },
    { id: 'correct_quantity', label: 'Correct Quantity', category: 'quantity' },
    { id: 'correct_model', label: 'Correct Model/Variant', category: 'specification' },
    { id: 'functional_test', label: 'Functional Test Passed', category: 'functionality' },
    { id: 'clean_condition', label: 'Clean Condition', category: 'cleanliness' },
    { id: 'warranty_valid', label: 'Warranty Information Present', category: 'warranty' },
    { id: 'documentation_complete', label: 'Documentation Complete', category: 'documentation' },
  ];

  // Fetch quality check items (mock data for demonstration)
  const { data: qualityItems = [], isLoading } = useQuery({
    queryKey: ['quality-checks', selectedStatus, selectedWarehouse, selectedPriority, searchQuery],
    queryFn: async () => {
      // This would fetch from order_items with quality_check_requested = true
      // For now, returning mock data structure
      const mockItems: QualityCheckItem[] = [
        {
          id: '1',
          order_item_id: 'item-1',
          product_name: 'iPhone 15 Pro 128GB',
          order_number: 'ORD-202501-1001',
          customer_email: 'priya.sharma@testmail.com',
          quality_check_status: 'pending',
          quality_check_priority: 'electronics',
          quality_check_notes: '',
          inspector_assigned: '',
          photos_taken: 0,
          quality_standards: [],
          created_at: new Date().toISOString(),
          warehouse: 'india_warehouse'
        },
        {
          id: '2',
          order_item_id: 'item-2',
          product_name: 'MacBook Air M2 Laptop Stand',
          order_number: 'ORD-202501-1001',
          customer_email: 'priya.sharma@testmail.com',
          quality_check_status: 'in_progress',
          quality_check_priority: 'electronics',
          quality_check_notes: 'Initial inspection started',
          inspector_assigned: 'Inspector A',
          photos_taken: 3,
          quality_standards: ['packaging_intact', 'no_damage'],
          created_at: new Date(Date.now() - 3600000).toISOString(),
          warehouse: 'india_warehouse'
        },
        {
          id: '3',
          order_item_id: 'item-3',
          product_name: 'Professional DSLR Camera Kit',
          order_number: 'ORD-202501-1002',
          customer_email: 'john.smith@testmail.com',
          quality_check_status: 'passed',
          quality_check_priority: 'electronics',
          quality_check_notes: 'All checks passed. Camera functioning properly, all accessories present.',
          inspector_assigned: 'Inspector B',
          photos_taken: 8,
          quality_standards: ['packaging_intact', 'no_damage', 'authentic_product', 'complete_accessories', 'functional_test'],
          created_at: new Date(Date.now() - 7200000).toISOString(),
          completed_at: new Date(Date.now() - 1800000).toISOString(),
          warehouse: 'us_warehouse'
        },
      ];

      // Filter based on selections
      return mockItems.filter(item => {
        if (selectedStatus !== 'all' && item.quality_check_status !== selectedStatus) return false;
        if (selectedWarehouse !== 'all' && item.warehouse !== selectedWarehouse) return false;
        if (selectedPriority !== 'all' && item.quality_check_priority !== selectedPriority) return false;
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          return (
            item.product_name.toLowerCase().includes(searchLower) ||
            item.order_number.toLowerCase().includes(searchLower) ||
            item.customer_email.toLowerCase().includes(searchLower)
          );
        }
        return true;
      });
    },
  });

  // Complete quality check
  const completeQualityCheckMutation = useMutation({
    mutationFn: async ({ itemId, status, notes, standards }: { 
      itemId: string; 
      status: 'passed' | 'failed'; 
      notes: string; 
      standards: string[] 
    }) => {
      // Mock implementation - would update order_items table
      console.log('Completing QC:', { itemId, status, notes, standards });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-checks'] });
      setSelectedItem(null);
      setQualityNotes('');
      setSelectedStandards(new Set());
      toast({ title: 'Quality check completed successfully', variant: 'default' });
    },
  });

  // Assign inspector
  const assignInspectorMutation = useMutation({
    mutationFn: async ({ itemId, inspector }: { itemId: string; inspector: string }) => {
      console.log('Assigning inspector:', { itemId, inspector });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-checks'] });
      toast({ title: 'Inspector assigned successfully', variant: 'default' });
    },
  });

  // Get quality check statistics
  const qcStats = React.useMemo(() => {
    const stats = {
      total: qualityItems.length,
      pending: 0,
      in_progress: 0,
      passed: 0,
      failed: 0,
      electronics: 0,
      standard: 0,
      urgent: 0,
      avgPhotos: 0,
    };

    let totalPhotos = 0;
    qualityItems.forEach(item => {
      // Status counts
      switch (item.quality_check_status) {
        case 'pending': stats.pending++; break;
        case 'in_progress': stats.in_progress++; break;
        case 'passed': stats.passed++; break;
        case 'failed': stats.failed++; break;
      }
      
      // Priority counts
      switch (item.quality_check_priority) {
        case 'electronics': stats.electronics++; break;
        case 'standard': stats.standard++; break;
        case 'urgent': stats.urgent++; break;
      }
      
      totalPhotos += item.photos_taken;
    });

    stats.avgPhotos = qualityItems.length > 0 ? Math.round(totalPhotos / qualityItems.length) : 0;
    return stats;
  }, [qualityItems]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed': return 'default';
      case 'failed': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'electronics': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'standard': return 'text-gray-600 bg-gray-50 border-gray-200';
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

  const toggleStandard = (standardId: string) => {
    const newSelected = new Set(selectedStandards);
    if (newSelected.has(standardId)) {
      newSelected.delete(standardId);
    } else {
      newSelected.add(standardId);
    }
    setSelectedStandards(newSelected);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold">Quality Control</h1>
            <p className="text-gray-500">Manage quality inspections and photo documentation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export QC Report
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            QC Standards
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{qcStats.total}</div>
            <div className="text-sm text-gray-500">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{qcStats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{qcStats.in_progress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{qcStats.passed}</div>
            <div className="text-sm text-gray-500">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{qcStats.failed}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{qcStats.avgPhotos}</div>
            <div className="text-sm text-gray-500">Avg Photos</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({qcStats.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({qcStats.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({qcStats.passed + qcStats.failed})</TabsTrigger>
          <TabsTrigger value="all">All Items</TabsTrigger>
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
                      placeholder="Search items for quality check..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    <SelectItem value="india_warehouse">India Warehouse</SelectItem>
                    <SelectItem value="china_warehouse">China Warehouse</SelectItem>
                    <SelectItem value="us_warehouse">US Warehouse</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quality Check Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clipboard className="h-5 w-5" />
                    Quality Check Queue
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
                  ) : qualityItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No items for quality check</h3>
                      <p className="text-gray-500">Items requiring quality control will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {qualityItems
                        .filter(item => {
                          if (selectedTab === 'all') return true;
                          if (selectedTab === 'pending') return item.quality_check_status === 'pending';
                          if (selectedTab === 'in_progress') return item.quality_check_status === 'in_progress';
                          if (selectedTab === 'completed') return ['passed', 'failed'].includes(item.quality_check_status);
                          return true;
                        })
                        .map((item) => {
                          const isSelected = selectedItem?.id === item.id;
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'border-blue-300 bg-blue-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              } ${getPriorityColor(item.quality_check_priority)}`}
                              onClick={() => setSelectedItem(item)}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Package className="h-5 w-5" />
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm">{item.product_name}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {item.order_number}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      Customer: {item.customer_email}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant={getStatusBadgeVariant(item.quality_check_status)}>
                                    {item.quality_check_status.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {item.quality_check_priority}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                <span>Warehouse: {item.warehouse.replace('_', ' ')}</span>
                                <span>{formatTimeAgo(item.created_at)}</span>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {item.inspector_assigned && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>Inspector: {item.inspector_assigned}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Camera className="h-3 w-3" />
                                  <span>{item.photos_taken} photos</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  <span>{item.quality_standards.length} standards checked</span>
                                </div>
                              </div>

                              {item.quality_check_notes && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <strong>Notes:</strong> {item.quality_check_notes}
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

            {/* Quality Check Panel */}
            <div className="space-y-4">
              {selectedItem ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quality Inspection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Product</label>
                        <p className="text-sm font-medium">{selectedItem.product_name}</p>
                        <p className="text-xs text-gray-500">{selectedItem.order_number}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Current Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusBadgeVariant(selectedItem.quality_check_status)}>
                            {selectedItem.quality_check_status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedItem.quality_check_priority}
                          </Badge>
                        </div>
                      </div>

                      {!selectedItem.inspector_assigned && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Assign Inspector</label>
                          <Select onValueChange={(inspector) => assignInspectorMutation.mutate({ 
                            itemId: selectedItem.id, 
                            inspector 
                          })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose inspector" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inspector A">Inspector A</SelectItem>
                              <SelectItem value="Inspector B">Inspector B</SelectItem>
                              <SelectItem value="Inspector C">Inspector C</SelectItem>
                              <SelectItem value="QC Manager">QC Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Photo Documentation</label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Take Photos ({selectedItem.photos_taken})
                          </Button>
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quality Standards</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {qualityStandards.map((standard) => (
                        <div key={standard.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={standard.id}
                            checked={selectedStandards.has(standard.id)}
                            onCheckedChange={() => toggleStandard(standard.id)}
                          />
                          <label
                            htmlFor={standard.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {standard.label}
                          </label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quality Check Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Inspection Notes</label>
                        <Textarea
                          placeholder="Enter quality check observations..."
                          value={qualityNotes}
                          onChange={(e) => setQualityNotes(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => completeQualityCheckMutation.mutate({
                            itemId: selectedItem.id,
                            status: 'passed',
                            notes: qualityNotes,
                            standards: Array.from(selectedStandards)
                          })}
                          disabled={completeQualityCheckMutation.isPending || selectedStandards.size === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Pass Quality Check
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() => completeQualityCheckMutation.mutate({
                            itemId: selectedItem.id,
                            status: 'failed',
                            notes: qualityNotes,
                            standards: Array.from(selectedStandards)
                          })}
                          disabled={completeQualityCheckMutation.isPending || !qualityNotes.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Fail Quality Check
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            // Mark as in progress
                            console.log('Starting quality check for:', selectedItem.id);
                          }}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Start Inspection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Item</h3>
                    <p className="text-gray-500">Choose an item from the queue to begin quality inspection</p>
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

export default QualityControlPage;