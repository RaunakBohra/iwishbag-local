// ============================================================================
// HSN MANAGEMENT INTERFACE - Admin HSN Code Management System
// Features: HSN code CRUD, bulk operations, classification testing, analytics
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HSNCreationModal } from '@/components/admin/HSNCreationModal';
import {
  Tags,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Upload,
  TestTube,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  DollarSign,
  Scale,
  Globe,
  Zap,
  FileText,
  Eye,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import type { HSNMasterRecord } from '@/services/UnifiedDataEngine';
import { autoProductClassifier } from '@/services/AutoProductClassifier';
import { HSNImportExport } from '@/components/admin/HSNImportExport';
import { supabase } from '@/integrations/supabase/client';

interface HSNManagementInterfaceProps {
  className?: string;
}

interface HSNFormData {
  hsn_code: string;
  description: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  minimum_valuation_usd?: number;
  requires_currency_conversion: boolean;
  weight_data: any;
  tax_data: any;
  classification_data: any;
  is_active: boolean;
}

export const HSNManagementInterface: React.FC<HSNManagementInterfaceProps> = ({ className }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('browse');
  const [hsnRecords, setHsnRecords] = useState<HSNMasterRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HSNMasterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HSNMasterRecord | null>(null);
  const [testProductName, setTestProductName] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  // Category management state
  const [categories, setCategories] = useState<Array<{value: string, label: string}>>([]);
  const [showCategoryCreateModal, setShowCategoryCreateModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<any>(null);
  // Pending requests state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false);

  // Helper function to get empty form data
  const getEmptyFormData = (): HSNFormData => ({
    hsn_code: '',
    description: '',
    category: '',
    subcategory: '',
    keywords: [],
    minimum_valuation_usd: undefined,
    requires_currency_conversion: false,
    weight_data: {
      typical_weights: {
        per_unit: { min: 0, max: 0, average: 0 },
        packaging: { additional_weight: 0 },
      },
    },
    tax_data: {
      typical_rates: {
        customs: { common: 0 },
        gst: { standard: 0 },
        vat: { common: 0 },
        sales_tax: { state: 0, local: 0 },
        pst: { provincial: 0 },
        excise_tax: { federal: 0 },
        import_duty: { standard: 0 },
        service_tax: { standard: 0 },
        cess: { additional: 0 },
      },
    },
    classification_data: {
      auto_classification: { confidence: 0.8 },
    },
    is_active: true,
  });

  // Form state for creating/editing HSN records
  const [formData, setFormData] = useState<HSNFormData>(getEmptyFormData());

  // Load HSN records
  useEffect(() => {
    loadHSNRecords();
    loadPendingRequests();
  }, []);

  // Filter records based on search and category
  useEffect(() => {
    let filtered = hsnRecords;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.hsn_code.toLowerCase().includes(query) ||
          record.description.toLowerCase().includes(query) ||
          record.category.toLowerCase().includes(query) ||
          record.keywords.some((keyword) => keyword.toLowerCase().includes(query)),
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((record) => record.category === selectedCategory);
    }

    setFilteredRecords(filtered);
  }, [hsnRecords, searchQuery, selectedCategory]);

  const loadHSNRecords = async () => {
    setIsLoading(true);
    try {
      // Load all HSN records from database
      const allRecords = await unifiedDataEngine.getAllHSNRecords(200);
      console.log(`✅ Loaded ${allRecords.length} HSN records from database`);
      setHsnRecords(allRecords);
      
      // Also load categories dynamically
      const loadedCategories = await unifiedDataEngine.getAllCategories();
      console.log(`✅ Loaded ${loadedCategories.length} categories from database`);
      setCategories(loadedCategories);
      
    } catch (error) {
      console.error('Failed to load HSN records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load HSN records from database',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    setPendingRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_hsn_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending requests:', error);
        throw error;
      }
      
      console.log('Loaded pending requests:', data);
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending HSN requests',
        variant: 'destructive',
      });
    } finally {
      setPendingRequestsLoading(false);
    }
  };

  const handleCreateRecord = async () => {
    try {
      // Here we would call a create API endpoint
      // For now, we'll just show success and reload
      toast({
        title: 'HSN Record Created',
        description: `HSN ${formData.hsn_code} has been created successfully`,
      });
      setShowCreateDialog(false);
      resetForm();
      loadHSNRecords();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create HSN record',
        variant: 'destructive',
      });
    }
  };

  const handleEditRecord = (record: HSNMasterRecord) => {
    setEditingRecord(record);
    setFormData({
      hsn_code: record.hsn_code,
      description: record.description,
      category: record.category,
      subcategory: record.subcategory,
      keywords: record.keywords,
      minimum_valuation_usd: record.minimum_valuation_usd,
      requires_currency_conversion: record.requires_currency_conversion,
      weight_data: record.weight_data,
      tax_data: record.tax_data,
      classification_data: record.classification_data,
      is_active: record.is_active,
    });
    setShowEditDialog(true);
  };

  const handleUpdateRecord = async () => {
    try {
      // Here we would call an update API endpoint
      toast({
        title: 'HSN Record Updated',
        description: `HSN ${formData.hsn_code} has been updated successfully`,
      });
      setShowEditDialog(false);
      setEditingRecord(null);
      resetForm();
      loadHSNRecords();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update HSN record',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRecord = async (record: HSNMasterRecord) => {
    if (!confirm(`Are you sure you want to delete HSN ${record.hsn_code}?\n\nThis action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .rpc('delete_hsn_master_record', { p_hsn_code: record.hsn_code });

      if (error) throw error;

      toast({
        title: 'HSN Record Deleted',
        description: `HSN ${record.hsn_code} has been permanently deleted`,
      });
      
      // Clear cache and reload
      unifiedDataEngine.clearAllCache();
      loadHSNRecords();
    } catch (error: any) {
      console.error('Failed to delete HSN record:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete HSN record',
        variant: 'destructive',
      });
    }
  };

  const handleTestClassification = async () => {
    if (!testProductName.trim()) return;

    setIsTesting(true);
    try {
      const result = await autoProductClassifier.classifyProduct({
        productName: testProductName,
        productUrl: '',
        category: '',
      });

      setTestResults(result);
      toast({
        title: 'Classification Test Complete',
        description: `Found HSN: ${result.hsnCode} (${(result.confidence * 100).toFixed(1)}% confidence)`,
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to test product classification',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const resetForm = () => {
    setFormData(getEmptyFormData());
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .rpc('approve_hsn_request', { request_id: requestId });

      if (error) throw error;

      toast({
        title: 'Request Approved',
        description: 'HSN code has been added to the database',
      });

      // Reload data
      loadPendingRequests();
      loadHSNRecords();
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve HSN request',
        variant: 'destructive',
      });
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .rpc('reject_hsn_request', { 
          request_id: requestId,
          reason: reason
        });

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'HSN request has been rejected',
      });

      loadPendingRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject HSN request',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to permanently delete this HSN request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .rpc('delete_hsn_request', { request_id: requestId });

      if (error) throw error;

      toast({
        title: 'Request Deleted',
        description: 'HSN request has been permanently deleted',
      });

      loadPendingRequests();
    } catch (error) {
      console.error('Failed to delete request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete HSN request',
        variant: 'destructive',
      });
    }
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(hsnRecords.map((record) => record.category))];
    return categories.sort();
  };

  const getAnalytics = () => {
    const totalRecords = hsnRecords.length;
    const activeRecords = hsnRecords.filter((r) => r.is_active).length;
    const recordsWithMinValuation = hsnRecords.filter((r) => r.minimum_valuation_usd).length;
    const recordsRequiringConversion = hsnRecords.filter(
      (r) => r.requires_currency_conversion,
    ).length;
    const recordsWithWeightData = hsnRecords.filter(
      (r) =>
        r.weight_data?.typical_weights?.per_unit?.average &&
        r.weight_data.typical_weights.per_unit.average > 0,
    ).length;
    const categoryCounts = hsnRecords.reduce(
      (acc, record) => {
        acc[record.category] = (acc[record.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalRecords,
      activeRecords,
      recordsWithMinValuation,
      recordsRequiringConversion,
      recordsWithWeightData,
      categoryCounts,
    };
  };

  const analytics = getAnalytics();

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HSN Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage HSN codes, tax rates, and product classifications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadHSNRecords} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => {
              setFormData(getEmptyFormData());
              setShowCreateDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add HSN Code
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tags className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total HSN Codes</p>
                <p className="text-2xl font-bold">{analytics.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Records</p>
                <p className="text-2xl font-bold">{analytics.activeRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm text-gray-600">Min. Valuations</p>
                <p className="text-2xl font-bold">{analytics.recordsWithMinValuation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">With Weight Data</p>
                <p className="text-2xl font-bold">{analytics.recordsWithWeightData}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="browse">Browse HSN Codes</TabsTrigger>
          <TabsTrigger value="requests">Pending Requests</TabsTrigger>
          <TabsTrigger value="test">Test Classification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search HSN codes, descriptions, or keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* HSN Records Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading HSN records...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Avg Weight</TableHead>
                      <TableHead>Min. Valuation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.hsn_code}>
                        <TableCell>
                          <div className="font-mono font-medium">{record.hsn_code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={record.description}>
                            {record.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.category.charAt(0).toUpperCase() + record.category.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.weight_data?.typical_weights?.per_unit?.average ? (
                            <div className="flex items-center space-x-1">
                              <Scale className="w-3 h-3 text-blue-600" />
                              <span>{record.weight_data.typical_weights.per_unit.average}kg</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No data</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.minimum_valuation_usd ? (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span>${record.minimum_valuation_usd}</span>
                              {record.requires_currency_conversion && (
                                <Scale className="w-3 h-3 text-purple-600" />
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.is_active ? 'default' : 'secondary'}>
                            {record.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRecord(record)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(record)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {/* Pending Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Pending HSN Requests</span>
                  {pendingRequests.length > 0 && (
                    <Badge variant="secondary">{pendingRequests.length}</Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPendingRequests}
                  disabled={pendingRequestsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${pendingRequestsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Review and approve user-submitted HSN code requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequestsLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Loading pending requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No pending HSN requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-mono font-medium">{request.hsn_code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={request.description}>
                            {request.description}
                          </div>
                          {request.product_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              Product: {request.product_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            User
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRecord({
                                  hsn_code: request.hsn_code,
                                  description: request.description,
                                  category: request.category,
                                  subcategory: request.subcategory,
                                  keywords: request.keywords,
                                  weight_data: request.weight_data,
                                  tax_data: request.tax_data,
                                  minimum_valuation_usd: request.minimum_valuation_usd,
                                  requires_currency_conversion: request.requires_currency_conversion,
                                  is_active: true,
                                } as HSNMasterRecord);
                                setShowEditDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApproveRequest(request.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const reason = prompt('Rejection reason:');
                                if (reason) {
                                  handleRejectRequest(request.id, reason);
                                }
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRequest(request.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="w-5 h-5" />
                <span>Test Product Classification</span>
              </CardTitle>
              <CardDescription>
                Test the automatic HSN classification system with product names
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Enter product name to test classification..."
                    value={testProductName}
                    onChange={(e) => setTestProductName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTestClassification()}
                  />
                </div>
                <Button
                  onClick={handleTestClassification}
                  disabled={isTesting || !testProductName.trim()}
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test
                </Button>
              </div>

              {testResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Classification Results:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Product:</span>
                      <span className="font-medium">{testProductName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">HSN Code:</span>
                      <Badge variant="outline">{testResults.hsnCode || 'Not found'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={testResults.confidence * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">
                          {(testResults.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="font-medium">{testResults.category || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Category Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.categoryCounts).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{category}</span>
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={(count / analytics.totalRecords) * 100}
                          className="w-20 h-2"
                        />
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Records:</span>
                    <Badge variant="default">
                      {((analytics.activeRecords / analytics.totalRecords) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">With Min. Valuations:</span>
                    <Badge variant="secondary">
                      {((analytics.recordsWithMinValuation / analytics.totalRecords) * 100).toFixed(
                        1,
                      )}
                      %
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">With Weight Data:</span>
                    <Badge variant="outline">
                      {((analytics.recordsWithWeightData / analytics.totalRecords) * 100).toFixed(
                        1,
                      )}
                      %
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <HSNImportExport />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Advanced HSN system settings will be available in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Category Creation Modal */}
      <Dialog open={showCategoryCreateModal} onOpenChange={setShowCategoryCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5" />
              Add New Category
            </DialogTitle>
            <DialogDescription>
              Create a new product category. This will be added to the category list for future use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category_name">Category Name</Label>
              <Input 
                id="category_name"
                value={newCategoryData?.name || ''}
                onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})}
                placeholder="e.g., Automotive, Pet Supplies"
              />
            </div>
            
            <div>
              <Label htmlFor="category_description">Description (Optional)</Label>
              <Input 
                id="category_description"
                value={newCategoryData?.description || ''}
                onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})}
                placeholder="Brief description of this category"
              />
            </div>
            
            <div>
              <Label htmlFor="category_keywords">Keywords (Optional)</Label>
              <Input 
                id="category_keywords"
                value={newCategoryData?.keywords?.join(', ') || ''}
                onChange={(e) => {
                  const keywordsList = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                  setNewCategoryData({...newCategoryData, keywords: keywordsList});
                }}
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords to help classify products
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!newCategoryData?.name?.trim()) {
                toast({
                  title: 'Category name required',
                  description: 'Please enter a name for the category.',
                  variant: 'destructive'
                });
                return;
              }
              
              // Create category value from name
              const categoryValue = newCategoryData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
              
              // Add to categories list
              const newCategory = {
                value: categoryValue,
                label: newCategoryData.name
              };
              setCategories([...categories, newCategory]);
              
              // Auto-select the new category in form if form is open
              if (showCreateDialog || showEditDialog) {
                setFormData({...formData, category: categoryValue});
              }
              
              toast({
                title: 'Category Added',
                description: `"${newCategoryData.name}" has been added to the category list.`,
                variant: 'default'
              });
              
              setShowCategoryCreateModal(false);
              setNewCategoryData(null);
            }}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HSN Creation Modal */}
      <HSNCreationModal
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={async () => {
          toast({
            title: 'Success',
            description: 'HSN code has been created successfully',
          });
          loadHSNRecords();
        }}
      />

      {/* HSN Edit Modal */}
      <HSNCreationModal
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        mode="edit"
        editingHSN={editingRecord}
        onSuccess={async () => {
          toast({
            title: 'Success',
            description: 'HSN code has been updated successfully',
          });
          setEditingRecord(null);
          loadHSNRecords();
        }}
      />
    </div>
  );
};

// HSN Record Form Component
interface HSNRecordFormProps {
  formData: HSNFormData;
  setFormData: (data: HSNFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  categories: Array<{value: string, label: string}>;
  onAddCategory: () => void;
}

const HSNRecordForm: React.FC<HSNRecordFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing,
  categories,
  onAddCategory,
}) => {
  const [keywordInput, setKeywordInput] = useState('');

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keyword),
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hsn_code">HSN Code *</Label>
          <Input
            id="hsn_code"
            value={formData.hsn_code}
            onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
            placeholder="e.g., 620442"
            disabled={isEditing}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  className="w-full px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 rounded"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddCategory();
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Add New Category
                </button>
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed description of products covered by this HSN code"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="subcategory">Subcategory</Label>
        <Input
          id="subcategory"
          value={formData.subcategory || ''}
          onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
          placeholder="Optional subcategory"
        />
      </div>

      {/* Keywords */}
      <div>
        <Label>Keywords for Classification</Label>
        <div className="flex items-center space-x-2 mt-2">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Add keyword"
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
          />
          <Button type="button" onClick={addKeyword} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.keywords.map((keyword) => (
            <Badge
              key={keyword}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeKeyword(keyword)}
            >
              {keyword} ×
            </Badge>
          ))}
        </div>
      </div>

      {/* Minimum Valuation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minimum_valuation">Minimum Valuation (USD)</Label>
          <Input
            id="minimum_valuation"
            type="number"
            step="0.01"
            value={formData.minimum_valuation_usd || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                minimum_valuation_usd: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="Optional minimum valuation"
          />
        </div>
        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.requires_currency_conversion}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  requires_currency_conversion: checked,
                })
              }
            />
            <Label className="text-sm">Requires currency conversion</Label>
          </div>
        </div>
      </div>

      {/* Tax Rates */}
      <div>
        <Label>Tax Rates (%)</Label>
        <div className="mt-2 space-y-4">
          {/* Core Tax Types */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Core Taxes</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customs_rate" className="text-xs">
                  Customs Duty
                </Label>
                <Input
                  id="customs_rate"
                  type="number"
                  step="0.1"
                  placeholder="10.0"
                  value={formData.tax_data.typical_rates.customs.common}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          customs: { common: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="import_duty_rate" className="text-xs">
                  Import Duty
                </Label>
                <Input
                  id="import_duty_rate"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={formData.tax_data.typical_rates.import_duty.standard}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          import_duty: { standard: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="excise_tax_rate" className="text-xs">
                  Excise Tax
                </Label>
                <Input
                  id="excise_tax_rate"
                  type="number"
                  step="0.1"
                  placeholder="3.0"
                  value={formData.tax_data.typical_rates.excise_tax.federal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          excise_tax: { federal: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Regional Tax Types */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Regional Taxes</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gst_rate" className="text-xs">
                  GST (India)
                </Label>
                <Input
                  id="gst_rate"
                  type="number"
                  step="0.1"
                  placeholder="18.0"
                  value={formData.tax_data.typical_rates.gst.standard}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          gst: { standard: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="vat_rate" className="text-xs">
                  VAT (Europe/Nepal)
                </Label>
                <Input
                  id="vat_rate"
                  type="number"
                  step="0.1"
                  placeholder="13.0"
                  value={formData.tax_data.typical_rates.vat.common}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          vat: { common: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* US Tax Types */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">US Taxes</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state_tax_rate" className="text-xs">
                  State Sales Tax
                </Label>
                <Input
                  id="state_tax_rate"
                  type="number"
                  step="0.1"
                  placeholder="6.5"
                  value={formData.tax_data.typical_rates.sales_tax.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          sales_tax: {
                            ...formData.tax_data.typical_rates.sales_tax,
                            state: Number(e.target.value),
                          },
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="local_tax_rate" className="text-xs">
                  Local Sales Tax
                </Label>
                <Input
                  id="local_tax_rate"
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={formData.tax_data.typical_rates.sales_tax.local}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          sales_tax: {
                            ...formData.tax_data.typical_rates.sales_tax,
                            local: Number(e.target.value),
                          },
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Additional Tax Types */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Additional Taxes</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pst_rate" className="text-xs">
                  PST (Canada)
                </Label>
                <Input
                  id="pst_rate"
                  type="number"
                  step="0.1"
                  placeholder="7.0"
                  value={formData.tax_data.typical_rates.pst.provincial}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          pst: { provincial: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="service_tax_rate" className="text-xs">
                  Service Tax
                </Label>
                <Input
                  id="service_tax_rate"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={formData.tax_data.typical_rates.service_tax.standard}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          service_tax: { standard: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="cess_rate" className="text-xs">
                  CESS (India)
                </Label>
                <Input
                  id="cess_rate"
                  type="number"
                  step="0.1"
                  placeholder="1.0"
                  value={formData.tax_data.typical_rates.cess.additional}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_data: {
                        ...formData.tax_data,
                        typical_rates: {
                          ...formData.tax_data.typical_rates,
                          cess: { additional: Number(e.target.value) },
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Enter tax rates as percentages. Only fill in rates applicable to your target markets.
          Leave others at 0.
        </div>
      </div>

      {/* Weight Data */}
      <div>
        <Label>Typical Weight Information (kg)</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-3">
            <div>
              <Label htmlFor="min_weight" className="text-xs">
                Minimum Weight
              </Label>
              <Input
                id="min_weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.05"
                value={formData.weight_data.typical_weights?.per_unit?.min || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : 0;
                  setFormData({
                    ...formData,
                    weight_data: {
                      ...formData.weight_data,
                      typical_weights: {
                        ...formData.weight_data.typical_weights,
                        per_unit: {
                          ...formData.weight_data.typical_weights?.per_unit,
                          min: value,
                        },
                      },
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label htmlFor="max_weight" className="text-xs">
                Maximum Weight
              </Label>
              <Input
                id="max_weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="2.5"
                value={formData.weight_data.typical_weights?.per_unit?.max || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : 0;
                  setFormData({
                    ...formData,
                    weight_data: {
                      ...formData.weight_data,
                      typical_weights: {
                        ...formData.weight_data.typical_weights,
                        per_unit: {
                          ...formData.weight_data.typical_weights?.per_unit,
                          max: value,
                        },
                      },
                    },
                  });
                }}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="avg_weight" className="text-xs">
                Average Weight
              </Label>
              <Input
                id="avg_weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.5"
                value={formData.weight_data.typical_weights?.per_unit?.average || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : 0;
                  setFormData({
                    ...formData,
                    weight_data: {
                      ...formData.weight_data,
                      typical_weights: {
                        ...formData.weight_data.typical_weights,
                        per_unit: {
                          ...formData.weight_data.typical_weights?.per_unit,
                          average: value,
                        },
                      },
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label htmlFor="packaging_weight" className="text-xs">
                Packaging Weight
              </Label>
              <Input
                id="packaging_weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.1"
                value={formData.weight_data.typical_weights?.packaging?.additional_weight || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : 0;
                  setFormData({
                    ...formData,
                    weight_data: {
                      ...formData.weight_data,
                      typical_weights: {
                        ...formData.weight_data.typical_weights,
                        packaging: {
                          additional_weight: value,
                        },
                      },
                    },
                  });
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Weight data helps estimate shipping costs and validate customer entries. Leave empty if
          not applicable.
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>Active</Label>
      </div>

      {/* Actions */}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>{isEditing ? 'Update' : 'Create'} HSN Record</Button>
      </DialogFooter>
    </div>
  );
};

export default HSNManagementInterface;
