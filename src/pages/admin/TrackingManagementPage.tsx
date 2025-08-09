import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/database';
import TrackingStatusUpdateModal from '@/components/tracking/TrackingStatusUpdateModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Search,
  RefreshCw,
  Truck,
  MapPin,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Eye,
  Edit,
  MoreHorizontal,
  Plus,
  Filter,
  Download,
  Bell,
  Send,
  Navigation,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TrackingRecord = {
  id: string;
  tracking_id: string;
  tracking_type: 'package' | 'consolidation' | 'shipment';
  current_status: string;
  origin_location: string;
  destination_location: string;
  estimated_delivery: string;
  customer_id: string;
  order_id?: string;
  package_ids?: string[];
  consolidation_id?: string;
  created_at: string;
  updated_at: string;
  status_history: TrackingStatus[];
  customer_info?: {
    name: string;
    email: string;
    country: string;
  };
};

type TrackingStatus = {
  status: string;
  location: string;
  timestamp: string;
  description: string;
  updated_by?: string;
};

const TrackingManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for filters and search
  const [activeTab, setActiveTab] = useState('all-tracking');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  // Modal states
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [selectedTrackingRecord, setSelectedTrackingRecord] = useState<TrackingRecord | null>(null);
  
  // Bulk operations states
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);

  // Fetch tracking data (mock data for now - would integrate with actual tracking API)
  const { data: trackingRecords, isLoading: trackingLoading, error: trackingError } = useQuery({
    queryKey: ['admin-tracking', searchTerm, statusFilter, typeFilter, locationFilter],
    queryFn: async () => {
      // Mock tracking data - in production this would query the actual tracking system
      const mockTrackingData: TrackingRecord[] = [
        {
          id: '1',
          tracking_id: 'IWB20240001',
          tracking_type: 'package',
          current_status: 'in_transit',
          origin_location: 'USA Warehouse - Delaware',
          destination_location: 'New Delhi, India',
          estimated_delivery: '2024-01-15',
          customer_id: 'customer-1',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T14:30:00Z',
          status_history: [
            {
              status: 'package_received',
              location: 'USA Warehouse - Delaware',
              timestamp: '2024-01-08T10:00:00Z',
              description: 'Package received at warehouse'
            },
            {
              status: 'processing',
              location: 'USA Warehouse - Delaware', 
              timestamp: '2024-01-09T09:15:00Z',
              description: 'Package processing for consolidation'
            },
            {
              status: 'in_transit',
              location: 'JFK Airport, NY',
              timestamp: '2024-01-10T14:30:00Z',
              description: 'Package dispatched via air cargo'
            }
          ],
          customer_info: {
            name: 'Raj Kumar',
            email: 'raj@example.com',
            country: 'IN'
          }
        },
        {
          id: '2',
          tracking_id: 'IWB20240002',
          tracking_type: 'consolidation',
          current_status: 'consolidating',
          origin_location: 'USA Warehouse - Delaware',
          destination_location: 'Mumbai, India',
          estimated_delivery: '2024-01-20',
          customer_id: 'customer-2',
          consolidation_id: 'CON-2024-001',
          package_ids: ['pkg-1', 'pkg-2', 'pkg-3'],
          created_at: '2024-01-05T08:00:00Z',
          updated_at: '2024-01-10T11:00:00Z',
          status_history: [
            {
              status: 'consolidation_created',
              location: 'USA Warehouse - Delaware',
              timestamp: '2024-01-05T08:00:00Z',
              description: 'Consolidation group created with 3 packages'
            },
            {
              status: 'consolidating',
              location: 'USA Warehouse - Delaware',
              timestamp: '2024-01-10T11:00:00Z',
              description: 'Packages being consolidated for shipment'
            }
          ],
          customer_info: {
            name: 'Priya Sharma',
            email: 'priya@example.com',
            country: 'IN'
          }
        },
        {
          id: '3',
          tracking_id: 'IWB20240003',
          tracking_type: 'shipment',
          current_status: 'delivered',
          origin_location: 'USA Warehouse - Oregon',
          destination_location: 'Kathmandu, Nepal',
          estimated_delivery: '2024-01-12',
          customer_id: 'customer-3',
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-12T16:45:00Z',
          status_history: [
            {
              status: 'shipped',
              location: 'USA Warehouse - Oregon',
              timestamp: '2024-01-01T12:00:00Z',
              description: 'Shipment dispatched'
            },
            {
              status: 'customs_clearance',
              location: 'Tribhuvan Airport, Nepal',
              timestamp: '2024-01-08T10:30:00Z',
              description: 'Customs clearance in progress'
            },
            {
              status: 'out_for_delivery',
              location: 'Kathmandu Distribution Center',
              timestamp: '2024-01-12T09:00:00Z',
              description: 'Out for delivery'
            },
            {
              status: 'delivered',
              location: 'Kathmandu, Nepal',
              timestamp: '2024-01-12T16:45:00Z',
              description: 'Package delivered successfully'
            }
          ],
          customer_info: {
            name: 'Sanjay Adhikari',
            email: 'sanjay@example.com',
            country: 'NP'
          }
        }
      ];

      // Apply filters
      let filteredData = mockTrackingData;

      if (searchTerm) {
        filteredData = filteredData.filter(record =>
          record.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.customer_info?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.customer_info?.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(record => record.current_status === statusFilter);
      }

      if (typeFilter !== 'all') {
        filteredData = filteredData.filter(record => record.tracking_type === typeFilter);
      }

      return filteredData;
    },
    staleTime: 30000,
  });

  // Calculate tracking statistics
  const trackingStats = React.useMemo(() => {
    if (!trackingRecords) return { total: 0, inTransit: 0, delivered: 0, delayed: 0, processing: 0 };

    return {
      total: trackingRecords.length,
      inTransit: trackingRecords.filter(r => ['in_transit', 'shipped'].includes(r.current_status)).length,
      delivered: trackingRecords.filter(r => r.current_status === 'delivered').length,
      delayed: trackingRecords.filter(r => {
        const estimated = new Date(r.estimated_delivery);
        const now = new Date();
        return r.current_status !== 'delivered' && estimated < now;
      }).length,
      processing: trackingRecords.filter(r => ['processing', 'consolidating'].includes(r.current_status)).length,
    };
  }, [trackingRecords]);

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'in_transit':
      case 'shipped':
        return 'secondary';
      case 'processing':
      case 'consolidating':
        return 'outline';
      case 'delayed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get tracking type icon
  const getTrackingTypeIcon = (type: string) => {
    switch (type) {
      case 'package':
        return Package;
      case 'consolidation':
        return CheckCircle;
      case 'shipment':
        return Truck;
      default:
        return Package;
    }
  };

  // Bulk operations handlers
  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === trackingRecords?.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(trackingRecords?.map(record => record.id) || []);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string, description: string) => {
    if (selectedRecords.length === 0) return;
    
    try {
      // In a real implementation, this would be a bulk API call
      for (const recordId of selectedRecords) {
        console.log(`Updating record ${recordId} to status: ${newStatus}`);
      }
      
      toast({
        title: 'Bulk update successful',
        description: `Updated ${selectedRecords.length} tracking records to "${newStatus}".`,
      });
      
      setSelectedRecords([]);
      queryClient.invalidateQueries({ queryKey: ['admin-tracking'] });
    } catch (error) {
      toast({
        title: 'Bulk update failed',
        description: 'Failed to update selected tracking records.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tracking Management</h1>
          <p className="text-gray-600">Monitor and manage all shipment tracking across the 3-tier system</p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedRecords.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">
                {selectedRecords.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActionOpen(true)}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Bulk Actions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRecords([])}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-tracking'] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Manual Tracking
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tracking</p>
                <p className="text-2xl font-bold">{trackingStats.total}</p>
              </div>
              <Navigation className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">{trackingStats.inTransit}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-orange-600">{trackingStats.processing}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{trackingStats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Delayed</p>
                <p className="text-2xl font-bold text-red-600">{trackingStats.delayed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by tracking ID, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="consolidating">Consolidating</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="package">Package</SelectItem>
                <SelectItem value="consolidation">Consolidation</SelectItem>
                <SelectItem value="shipment">Shipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all-tracking" className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            All Tracking ({trackingStats.total})
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="consolidations" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Consolidations
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* All Tracking Tab */}
        <TabsContent value="all-tracking">
          <Card>
            <CardHeader>
              <CardTitle>All Tracking Records ({trackingRecords?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {trackingLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading tracking data...</p>
                </div>
              ) : trackingError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">Failed to load tracking data</p>
                  <Button variant="outline" onClick={() => queryClient.refetchQueries({ queryKey: ['admin-tracking'] })}>
                    Try Again
                  </Button>
                </div>
              ) : trackingRecords?.length ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedRecords.length === trackingRecords?.length && trackingRecords.length > 0}
                            onChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Tracking Info</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Est. Delivery</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackingRecords.map((record) => {
                        const TypeIcon = getTrackingTypeIcon(record.tracking_type);
                        const isDelayed = record.current_status !== 'delivered' && 
                                         new Date(record.estimated_delivery) < new Date();
                        
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                checked={selectedRecords.includes(record.id)}
                                onChange={() => handleSelectRecord(record.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{record.tracking_id}</p>
                                <p className="text-sm text-gray-500">
                                  Created: {new Date(record.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-gray-500" />
                                <span className="capitalize">{record.tracking_type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{record.customer_info?.name}</p>
                                <p className="text-sm text-gray-500">{record.customer_info?.email}</p>
                                <Badge variant="outline" className="text-xs">
                                  {record.customer_info?.country}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={getStatusBadgeVariant(isDelayed ? 'delayed' : record.current_status)}
                                className="capitalize"
                              >
                                {isDelayed ? 'Delayed' : record.current_status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">{record.origin_location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-600">{record.destination_location}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className={`text-sm ${isDelayed ? 'text-red-600 font-medium' : ''}`}>
                                  {new Date(record.estimated_delivery).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrackingRecord(record);
                                      setStatusUpdateOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Update Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrackingRecord(record);
                                      setStatusUpdateOpen(true);
                                    }}
                                  >
                                    <Bell className="h-4 w-4 mr-2" />
                                    Notify Customer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTrackingRecord(record);
                                      setStatusUpdateOpen(true);
                                    }}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Update
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tracking records found</h3>
                  <p className="text-gray-500 mb-4">No tracking records match your current filters.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Package Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Individual package tracking records will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consolidations Tab */}
        <TabsContent value="consolidations">
          <Card>
            <CardHeader>
              <CardTitle>Consolidation Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Consolidated shipment tracking will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">On-time Delivery Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">94.2%</span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Transit Time</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">8.5 days</span>
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">4.7/5</span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">India</span>
                    <span className="font-semibold">65%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Nepal</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bangladesh</span>
                    <span className="font-semibold">8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Other</span>
                    <span className="font-semibold">2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Update Modal */}
      {selectedTrackingRecord && (
        <TrackingStatusUpdateModal
          trackingRecord={selectedTrackingRecord}
          isOpen={statusUpdateOpen}
          onClose={() => {
            setStatusUpdateOpen(false);
            setSelectedTrackingRecord(null);
          }}
        />
      )}

      {/* Bulk Actions Modal */}
      <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bulk Actions ({selectedRecords.length} selected)
            </DialogTitle>
            <DialogDescription>
              Apply actions to multiple tracking records at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Bulk Status Update */}
            <div>
              <h4 className="font-medium mb-3">Status Updates</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('in_transit', 'Bulk status update to in transit')}
                  className="justify-start"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Mark In Transit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('delivered', 'Bulk status update to delivered')}
                  className="justify-start"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Delivered
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('exception', 'Bulk status update to exception')}
                  className="justify-start"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark Exception
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('processing', 'Bulk status update to processing')}
                  className="justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Processing
                </Button>
              </div>
            </div>

            <Separator />

            {/* Bulk Notifications */}
            <div>
              <h4 className="font-medium mb-3">Customer Notifications</h4>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log(`Sending notifications to ${selectedRecords.length} customers`);
                    toast({
                      title: 'Notifications sent',
                      description: `Status update notifications sent to ${selectedRecords.length} customers.`,
                    });
                    setBulkActionOpen(false);
                  }}
                  className="justify-start"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Status Notifications
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log(`Sending delivery updates to ${selectedRecords.length} customers`);
                    toast({
                      title: 'Delivery updates sent',
                      description: `Delivery updates sent to ${selectedRecords.length} customers.`,
                    });
                    setBulkActionOpen(false);
                  }}
                  className="justify-start"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Delivery Updates
                </Button>
              </div>
            </div>

            <Separator />

            {/* Bulk Assignment */}
            <div>
              <h4 className="font-medium mb-3">Assignment Actions</h4>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log(`Assigning ${selectedRecords.length} records to carrier`);
                    toast({
                      title: 'Carrier assigned',
                      description: `${selectedRecords.length} tracking records assigned to carrier.`,
                    });
                    setBulkActionOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Assign to Carrier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log(`Creating consolidation for ${selectedRecords.length} packages`);
                    toast({
                      title: 'Consolidation created',
                      description: `Consolidation group created with ${selectedRecords.length} packages.`,
                    });
                    setBulkActionOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Create Consolidation
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrackingManagementPage;