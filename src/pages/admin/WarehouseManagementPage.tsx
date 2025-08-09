import React, { useState, useEffect } from 'react';
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
import PackageReceivingModal from '@/components/warehouse/PackageReceivingModal';
import PackageProcessingModal from '@/components/warehouse/PackageProcessingModal';
import ConsolidationManagementModal from '@/components/warehouse/ConsolidationManagementModal';
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  Warehouse,
  Truck,
  Scale,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  MapPin,
  PackageCheck,
  PackageX,
  ArrowRight,
  Eye,
  Edit,
  MoreHorizontal
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
  TableRow 
} from '@/components/ui/table';

type ReceivedPackage = Database['public']['Tables']['received_packages']['Row'] & {
  warehouse_suite_addresses?: Database['public']['Tables']['warehouse_suite_addresses']['Row'];
  order_items?: (Database['public']['Tables']['order_items']['Row'] & {
    orders?: Database['public']['Tables']['orders']['Row'];
  })[];
};

type WarehouseSuiteAddress = Database['public']['Tables']['warehouse_suite_addresses']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'];
  received_packages?: Database['public']['Tables']['received_packages']['Row'][];
};

const WarehouseManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and tabs
  const [activeTab, setActiveTab] = useState('packages');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');
  
  // Modal states
  const [packageReceivingOpen, setPackageReceivingOpen] = useState(false);
  const [packageProcessingOpen, setPackageProcessingOpen] = useState(false);
  const [consolidationOpen, setConsolidationOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ReceivedPackage | null>(null);

  // Fetch received packages
  const { data: packages, isLoading: packagesLoading, error: packagesError } = useQuery({
    queryKey: ['warehouse-packages', searchTerm, statusFilter, warehouseFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('received_packages')
        .select(`
          *,
          warehouse_suite_addresses (
            *,
            profiles (
              id,
              full_name,
              email,
              country
            )
          ),
          order_items (
            *,
            orders (
              id,
              order_number,
              status,
              customer_id
            )
          )
        `)
        .order('received_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('package_status', statusFilter);
      }
      
      if (warehouseFilter !== 'all') {
        query = query.eq('warehouse_location', warehouseFilter);
      }

      // Apply date filter
      if (dateRange !== 'all') {
        const days = parseInt(dateRange.replace('days', ''));
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        query = query.gte('received_at', dateThreshold.toISOString());
      }

      // Apply search
      if (searchTerm) {
        query = query.or(
          `tracking_number.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%,warehouse_suite_addresses.suite_number.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as ReceivedPackage[];
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch warehouse suite addresses
  const { data: suiteAddresses, isLoading: suitesLoading } = useQuery({
    queryKey: ['warehouse-suites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_suite_addresses')
        .select(`
          *,
          profiles (
            id,
            full_name,
            email,
            country
          ),
          received_packages (
            id,
            package_status,
            received_at
          )
        `)
        .order('suite_number');

      if (error) throw error;
      return data as WarehouseSuiteAddress[];
    },
    staleTime: 60000, // 1 minute
  });

  // Package status update mutation
  const updatePackageStatusMutation = useMutation({
    mutationFn: async ({ packageId, newStatus }: { packageId: string; newStatus: string }) => {
      const updates: any = {
        package_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add processed timestamp for specific statuses
      if (newStatus === 'processed') {
        updates.processed_at = new Date().toISOString();
      } else if (newStatus === 'shipped') {
        updates.shipped_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('received_packages')
        .update(updates)
        .eq('id', packageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-packages'] });
      toast({
        title: 'Package updated',
        description: 'Package status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: `Failed to update package: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Calculate warehouse statistics
  const warehouseStats = React.useMemo(() => {
    if (!packages) return { total: 0, pending: 0, processing: 0, ready: 0, shipped: 0 };
    
    return {
      total: packages.length,
      pending: packages.filter(p => p.package_status === 'received').length,
      processing: packages.filter(p => p.package_status === 'processing').length,
      ready: packages.filter(p => p.package_status === 'ready_for_consolidation').length,
      shipped: packages.filter(p => p.package_status === 'shipped').length,
    };
  }, [packages]);

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'shipped':
        return 'default';
      case 'ready_for_consolidation':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'received':
        return 'outline';
      case 'damaged':
      case 'missing':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleStatusUpdate = (packageId: string, newStatus: string) => {
    updatePackageStatusMutation.mutate({ packageId, newStatus });
  };

  const handleProcessPackage = (pkg: ReceivedPackage) => {
    setSelectedPackage(pkg);
    setPackageProcessingOpen(true);
  };

  const handleViewPackage = (pkg: ReceivedPackage) => {
    // For now, open processing modal in view mode
    setSelectedPackage(pkg);
    setPackageProcessingOpen(true);
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-gray-600">Manage package receiving, consolidation, and shipping operations</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['warehouse-packages'] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setConsolidationOpen(true)}>
            <PackageCheck className="h-4 w-4 mr-2" />
            Create Consolidation
          </Button>
          <Button onClick={() => setPackageReceivingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Packages</p>
                <p className="text-2xl font-bold">{warehouseStats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{warehouseStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{warehouseStats.processing}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ready</p>
                <p className="text-2xl font-bold text-green-600">{warehouseStats.ready}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Shipped</p>
                <p className="text-2xl font-bold text-purple-600">{warehouseStats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-400" />
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
                  placeholder="Search packages by tracking number, sender, or suite..."
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
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready_for_consolidation">Ready for Consolidation</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                <SelectItem value="usa_primary">USA Primary</SelectItem>
                <SelectItem value="usa_secondary">USA Secondary</SelectItem>
                <SelectItem value="uk_primary">UK Primary</SelectItem>
                <SelectItem value="canada_primary">Canada Primary</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1days">Today</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="90days">90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="suites" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Suite Addresses
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Received Packages ({packages?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {packagesLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading packages...</p>
                </div>
              ) : packagesError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">Failed to load packages</p>
                  <Button variant="outline" onClick={() => queryClient.refetchQueries({ queryKey: ['warehouse-packages'] })}>
                    Try Again
                  </Button>
                </div>
              ) : packages?.length ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package Info</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{pkg.tracking_number}</p>
                              <p className="text-sm text-gray-500">{pkg.sender_name}</p>
                              <p className="text-xs text-gray-400">Suite: {pkg.warehouse_suite_addresses?.suite_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{pkg.warehouse_suite_addresses?.profiles?.full_name || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{pkg.warehouse_suite_addresses?.profiles?.email}</p>
                              <p className="text-xs text-gray-400">{pkg.warehouse_suite_addresses?.profiles?.country}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(pkg.package_status)}>
                              {pkg.package_status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Scale className="h-3 w-3 text-gray-400" />
                              <span>{pkg.weight_kg || 'N/A'} kg</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{pkg.warehouse_location}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {pkg.received_at ? new Date(pkg.received_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewPackage(pkg)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleProcessPackage(pkg)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Process Package
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusUpdate(pkg.id, 'processing')}
                                  disabled={pkg.package_status === 'processing'}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Mark Processing
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusUpdate(pkg.id, 'ready_for_consolidation')}
                                  disabled={pkg.package_status === 'ready_for_consolidation'}
                                >
                                  <PackageCheck className="h-4 w-4 mr-2" />
                                  Mark Ready
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusUpdate(pkg.id, 'shipped')}
                                  disabled={pkg.package_status === 'shipped'}
                                >
                                  <Truck className="h-4 w-4 mr-2" />
                                  Mark Shipped
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages found</h3>
                  <p className="text-gray-500 mb-4">No packages match your current filters.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setWarehouseFilter('all');
                      setDateRange('7days');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suite Addresses Tab */}
        <TabsContent value="suites">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Suite Addresses ({suiteAddresses?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {suitesLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">Loading suite addresses...</p>
                </div>
              ) : suiteAddresses?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suiteAddresses.map((suite) => (
                    <Card key={suite.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">Suite {suite.suite_number}</h4>
                            <p className="text-sm text-gray-500">{suite.warehouse_location}</p>
                          </div>
                          <Badge variant={suite.is_active ? 'default' : 'outline'}>
                            {suite.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        {suite.profiles && (
                          <div>
                            <p className="font-medium text-sm">{suite.profiles.full_name}</p>
                            <p className="text-xs text-gray-500">{suite.profiles.email}</p>
                            <p className="text-xs text-gray-500">{suite.profiles.country}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Packages:</span>
                          <span className="font-medium">{suite.received_packages?.length || 0}</span>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          Created: {new Date(suite.created_at).toLocaleDateString()}
                        </div>
                        
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-3 w-3 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Warehouse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No suite addresses</h3>
                  <p className="text-gray-500 mb-4">No warehouse suite addresses have been created yet.</p>
                  <Button onClick={() => setPackageReceivingOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Receive Package
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Package Processing Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Processing Time</span>
                    <span className="font-semibold">2.3 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Packages This Week</span>
                    <span className="font-semibold">{warehouseStats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ready for Consolidation</span>
                    <span className="font-semibold">{warehouseStats.ready}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Efficiency Rate</span>
                    <span className="font-semibold text-green-600">94.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warehouse Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">USA Primary</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-16 h-2 bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-xs">67%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">USA Secondary</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-8 h-2 bg-green-500 rounded"></div>
                      </div>
                      <span className="text-xs">33%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">UK Primary</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-20 h-2 bg-orange-500 rounded"></div>
                      </div>
                      <span className="text-xs">83%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PackageReceivingModal
        isOpen={packageReceivingOpen}
        onClose={() => setPackageReceivingOpen(false)}
      />
      
      <ConsolidationManagementModal
        isOpen={consolidationOpen}
        onClose={() => setConsolidationOpen(false)}
      />
      
      {selectedPackage && (
        <PackageProcessingModal
          package={selectedPackage}
          isOpen={packageProcessingOpen}
          onClose={() => {
            setPackageProcessingOpen(false);
            setSelectedPackage(null);
          }}
        />
      )}
    </div>
  );
};

export default WarehouseManagementPage;