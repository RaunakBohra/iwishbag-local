/**
 * Return Management Dashboard Component
 * 
 * Admin interface for managing both refund requests and package returns.
 * Provides comprehensive tools for review, approval, and processing.
 * 
 * Features:
 * - Unified view of all return types
 * - Status filtering and search
 * - Bulk operations
 * - Detailed review interface
 * - Return processing workflows
 * - Analytics and metrics
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Package,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Send,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  Truck,
  FileText,
  MessageSquare,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currencyConversion';
import { format } from 'date-fns';
import { refundProcessingService } from '@/services/RefundProcessingService';
import { returnShippingService } from '@/services/ReturnShippingService';
import { SupplierPickupDialog } from './SupplierPickupDialog';

interface RefundRequest {
  id: string;
  quote_id: string;
  quote?: {
    display_id: string;
    user_id: string;
    user?: {
      full_name: string;
      email: string;
    };
  };
  refund_type: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  status: string;
  reason_code: string;
  reason_description: string;
  customer_notes?: string;
  internal_notes?: string;
  refund_method?: string;
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  processed_by?: string;
  processed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface PackageReturn {
  id: string;
  quote_id: string;
  quote?: {
    display_id: string;
    user_id: string;
    destination_country?: string;
    user?: {
      full_name: string;
      email: string;
      phone?: string;
    };
  };
  user_id: string;
  rma_number: string;
  return_type: string;
  return_reason: string;
  customer_notes?: string;
  admin_notes?: string;
  status: string;
  return_all_items: boolean;
  selected_items?: any[];
  shipping_label_url?: string;
  tracking_number?: string;
  carrier?: string;
  return_method?: string;
  pickup_scheduled?: boolean;
  pickup_date?: string;
  pickup_time_slot?: string;
  pickup_confirmation_number?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  shipped_at?: string;
  received_at?: string;
  completed_at?: string;
}

interface ReturnStats {
  total_refunds: number;
  pending_refunds: number;
  total_refund_amount: number;
  total_returns: number;
  pending_returns: number;
  completed_today: number;
}

const REFUND_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

const RETURN_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { value: 'label_sent', label: 'Label Sent' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received', label: 'Received' },
  { value: 'inspecting', label: 'Under Inspection' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

export const ReturnManagementDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'refunds' | 'returns' | 'analytics'>('refunds');
  const [searchTerm, setSearchTerm] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState('all');
  const [returnStatusFilter, setReturnStatusFilter] = useState('all');
  const [selectedRefunds, setSelectedRefunds] = useState<string[]>([]);
  const [selectedReturns, setSelectedReturns] = useState<string[]>([]);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<PackageReturn | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [showPickupDialog, setShowPickupDialog] = useState(false);

  // Fetch return statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['return-stats'],
    queryFn: async (): Promise<ReturnStats> => {
      // Get refund stats
      const { data: refundStats } = await supabase
        .from('refund_requests')
        .select('status, requested_amount')
        .order('created_at', { ascending: false });

      // Get return stats
      const { data: returnStats } = await supabase
        .from('package_returns')
        .select('status, created_at')
        .order('created_at', { ascending: false });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return {
        total_refunds: refundStats?.length || 0,
        pending_refunds: refundStats?.filter(r => r.status === 'pending').length || 0,
        total_refund_amount: refundStats?.reduce((sum, r) => sum + (r.requested_amount || 0), 0) || 0,
        total_returns: returnStats?.length || 0,
        pending_returns: returnStats?.filter(r => r.status === 'pending').length || 0,
        completed_today: 
          (refundStats?.filter(r => new Date(r.created_at) >= today).length || 0) +
          (returnStats?.filter(r => new Date(r.created_at) >= today).length || 0),
      };
    },
  });

  // Fetch refund requests
  const { data: refundRequests, isLoading: refundsLoading } = useQuery({
    queryKey: ['admin-refund-requests', searchTerm, refundStatusFilter],
    queryFn: async (): Promise<RefundRequest[]> => {
      let query = supabase
        .from('refund_requests')
        .select(`
          *,
          quote:quotes(
            display_id,
            user_id,
            user:profiles(full_name, email)
          )
        `)
        .order('requested_at', { ascending: false });

      if (refundStatusFilter !== 'all') {
        query = query.eq('status', refundStatusFilter);
      }

      if (searchTerm) {
        // Search by various fields
        query = query.or(`
          reason_description.ilike.%${searchTerm}%,
          customer_notes.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch package returns
  const { data: packageReturns, isLoading: returnsLoading } = useQuery({
    queryKey: ['admin-package-returns', searchTerm, returnStatusFilter],
    queryFn: async (): Promise<PackageReturn[]> => {
      let query = supabase
        .from('package_returns')
        .select(`
          *,
          quote:quotes(
            display_id,
            user_id,
            user:profiles(full_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (returnStatusFilter !== 'all') {
        query = query.eq('status', returnStatusFilter);
      }

      if (searchTerm) {
        query = query.or(`
          rma_number.ilike.%${searchTerm}%,
          return_reason.ilike.%${searchTerm}%,
          customer_notes.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Update refund status mutation
  const updateRefundMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      approved_amount, 
      internal_notes 
    }: { 
      id: string; 
      status: string; 
      approved_amount?: number; 
      internal_notes?: string;
    }) => {
      const updates: any = {
        status,
        internal_notes,
        updated_at: new Date().toISOString(),
      };

      if (status === 'approved' || status === 'processing') {
        updates.reviewed_by = (await supabase.auth.getUser()).data.user?.id;
        updates.reviewed_at = new Date().toISOString();
        if (approved_amount !== undefined) {
          updates.approved_amount = approved_amount;
        }
      }

      if (status === 'completed') {
        updates.processed_by = (await supabase.auth.getUser()).data.user?.id;
        updates.processed_at = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('refund_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // If status is approved and ready to process, process the refund
      if (status === 'approved' && approved_amount) {
        await processRefund(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] });
      queryClient.invalidateQueries({ queryKey: ['return-stats'] });
      toast({
        title: 'Refund Updated',
        description: 'The refund request has been updated successfully.',
      });
      setShowRefundDialog(false);
      setSelectedRefund(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update package return status mutation
  const updateReturnMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      admin_notes,
      shipping_label_url,
      tracking_number,
      carrier,
    }: { 
      id: string; 
      status: string; 
      admin_notes?: string;
      shipping_label_url?: string;
      tracking_number?: string;
      carrier?: string;
    }) => {
      const updates: any = {
        status,
        admin_notes,
        updated_at: new Date().toISOString(),
      };

      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.reviewed_by = (await supabase.auth.getUser()).data.user?.id;
        updates.reviewed_at = new Date().toISOString();
      }

      if (status === 'label_sent' && shipping_label_url) {
        updates.shipping_label_url = shipping_label_url;
      }

      if (status === 'in_transit' && tracking_number) {
        updates.tracking_number = tracking_number;
        updates.carrier = carrier;
        updates.shipped_at = new Date().toISOString();
      }

      if (status === 'received') {
        updates.received_at = new Date().toISOString();
      }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('package_returns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-package-returns'] });
      queryClient.invalidateQueries({ queryKey: ['return-stats'] });
      toast({
        title: 'Return Updated',
        description: 'The package return has been updated successfully.',
      });
      setShowReturnDialog(false);
      setSelectedReturn(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Process refund through payment gateway
  const processRefund = async (refundId: string) => {
    setIsProcessingRefund(true);
    try {
      const result = await refundProcessingService.processApprovedRefund(refundId);
      
      if (result.success) {
        toast({
          title: 'Refund Processed',
          description: `Refund has been processed successfully. Transaction ID: ${result.transactionId}`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] });
      } else {
        throw new Error(result.error || 'Refund processing failed');
      }
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Generate return shipping label
  const generateShippingLabel = async (returnId: string) => {
    setIsGeneratingLabel(true);
    try {
      const result = await returnShippingService.generateReturnLabel(returnId);
      
      if (result.success) {
        toast({
          title: 'Label Generated',
          description: `Shipping label has been generated. Tracking: ${result.trackingNumber}`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin-package-returns'] });
        // Close dialog to see updated return with label info
        setShowReturnDialog(false);
      } else {
        throw new Error(result.error || 'Label generation failed');
      }
    } catch (error) {
      toast({
        title: 'Label Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  // Bulk update functions
  const handleBulkRefundUpdate = async (status: string) => {
    if (selectedRefunds.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select refunds to update.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await Promise.all(
        selectedRefunds.map(id => 
          updateRefundMutation.mutateAsync({ 
            id, 
            status,
            internal_notes: `Bulk updated to ${status}`,
          })
        )
      );
      setSelectedRefunds([]);
    } catch (error) {
      console.error('Bulk update error:', error);
    }
  };

  const handleBulkReturnUpdate = async (status: string) => {
    if (selectedReturns.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select returns to update.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await Promise.all(
        selectedReturns.map(id => 
          updateReturnMutation.mutateAsync({ 
            id, 
            status,
            admin_notes: `Bulk updated to ${status}`,
          })
        )
      );
      setSelectedReturns([]);
    } catch (error) {
      console.error('Bulk update error:', error);
    }
  };

  const getStatusBadge = (status: string, type: 'refund' | 'return') => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      processing: { color: 'bg-purple-100 text-purple-800', icon: RefreshCw },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      label_sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      pickup_scheduled: { color: 'bg-cyan-100 text-cyan-800', icon: Calendar },
      in_transit: { color: 'bg-purple-100 text-purple-800', icon: Truck },
      received: { color: 'bg-indigo-100 text-indigo-800', icon: Package },
      inspecting: { color: 'bg-orange-100 text-orange-800', icon: Eye },
    };

    const config = configs[status as keyof typeof configs] || { 
      color: 'bg-gray-100 text-gray-800', 
      icon: AlertCircle 
    };
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Return Management</h2>
        <p className="text-muted-foreground">
          Process refund requests and package returns
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold">{stats?.total_refunds || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Refunds</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending_refunds || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Refund Amount</p>
                <p className="text-xl font-bold">${stats?.total_refund_amount || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Returns</p>
                <p className="text-2xl font-bold">{stats?.total_returns || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Returns</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending_returns || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completed_today || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="refunds">Refund Requests</TabsTrigger>
          <TabsTrigger value="returns">Package Returns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Refund Requests</CardTitle>
                <div className="flex gap-2">
                  {selectedRefunds.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkRefundUpdate('approved')}
                      >
                        Approve Selected ({selectedRefunds.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkRefundUpdate('rejected')}
                      >
                        Reject Selected
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search refunds..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Refunds Table */}
              {refundsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              refundRequests?.length > 0 &&
                              selectedRefunds.length === refundRequests.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRefunds(refundRequests?.map(r => r.id) || []);
                              } else {
                                setSelectedRefunds([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Quote ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundRequests?.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRefunds.includes(refund.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRefunds([...selectedRefunds, refund.id]);
                                } else {
                                  setSelectedRefunds(selectedRefunds.filter(id => id !== refund.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono">
                            {refund.quote?.display_id || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{refund.quote?.user?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {refund.quote?.user?.email || 'No email'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">
                                {formatCurrency(refund.requested_amount, refund.currency)}
                              </p>
                              {refund.approved_amount && (
                                <p className="text-sm text-green-600">
                                  Approved: {formatCurrency(refund.approved_amount, refund.currency)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{refund.refund_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate" title={refund.reason_description}>
                              {refund.reason_description}
                            </p>
                          </TableCell>
                          <TableCell>{getStatusBadge(refund.status, 'refund')}</TableCell>
                          <TableCell>
                            {format(new Date(refund.requested_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRefund(refund);
                                  setShowRefundDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {refundRequests?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No refund requests found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Package Returns</CardTitle>
                <div className="flex gap-2">
                  {selectedReturns.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkReturnUpdate('approved')}
                      >
                        Approve Selected ({selectedReturns.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkReturnUpdate('label_sent')}
                      >
                        Send Labels
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search returns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={returnStatusFilter} onValueChange={setReturnStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Returns Table */}
              {returnsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              packageReturns?.length > 0 &&
                              selectedReturns.length === packageReturns.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedReturns(packageReturns?.map(r => r.id) || []);
                              } else {
                                setSelectedReturns([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>RMA Number</TableHead>
                        <TableHead>Quote ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packageReturns?.map((packageReturn) => (
                        <TableRow key={packageReturn.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedReturns.includes(packageReturn.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedReturns([...selectedReturns, packageReturn.id]);
                                } else {
                                  setSelectedReturns(selectedReturns.filter(id => id !== packageReturn.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {packageReturn.rma_number}
                          </TableCell>
                          <TableCell className="font-mono">
                            {packageReturn.quote?.display_id || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{packageReturn.quote?.user?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {packageReturn.quote?.user?.email || 'No email'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{packageReturn.return_type.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate" title={packageReturn.return_reason}>
                              {packageReturn.return_reason}
                            </p>
                          </TableCell>
                          <TableCell>{getStatusBadge(packageReturn.status, 'return')}</TableCell>
                          <TableCell>
                            {format(new Date(packageReturn.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedReturn(packageReturn);
                                  setShowReturnDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {packageReturns?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No package returns found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Return Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm mt-2">
                  Track return trends, processing times, and customer satisfaction
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Details Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refund Request Details</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quote ID</Label>
                  <p className="font-mono">{selectedRefund.quote?.display_id}</p>
                </div>
                <div>
                  <Label>Current Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRefund.status, 'refund')}</div>
                </div>
                <div>
                  <Label>Requested Amount</Label>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedRefund.requested_amount, selectedRefund.currency)}
                  </p>
                </div>
                <div>
                  <Label>Refund Type</Label>
                  <Badge variant="outline">{selectedRefund.refund_type}</Badge>
                </div>
              </div>

              <Separator />

              {/* Reason Details */}
              <div className="space-y-4">
                <div>
                  <Label>Reason Code</Label>
                  <p>{selectedRefund.reason_code.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label>Reason Description</Label>
                  <p className="text-sm">{selectedRefund.reason_description}</p>
                </div>
                {selectedRefund.customer_notes && (
                  <div>
                    <Label>Customer Notes</Label>
                    <p className="text-sm">{selectedRefund.customer_notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Admin Actions */}
              <div className="space-y-4">
                <div>
                  <Label>Update Status</Label>
                  <Select
                    value={selectedRefund.status}
                    onValueChange={(value) => 
                      setSelectedRefund({ ...selectedRefund, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(selectedRefund.status === 'approved' || selectedRefund.status === 'processing') && (
                  <div>
                    <Label>Approved Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedRefund.approved_amount || selectedRefund.requested_amount}
                      onChange={(e) => 
                        setSelectedRefund({ 
                          ...selectedRefund, 
                          approved_amount: parseFloat(e.target.value) 
                        })
                      }
                    />
                  </div>
                )}

                <div>
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={selectedRefund.internal_notes || ''}
                    onChange={(e) => 
                      setSelectedRefund({ ...selectedRefund, internal_notes: e.target.value })
                    }
                    placeholder="Add notes for internal reference..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            {selectedRefund?.status === 'approved' && (
              <Button
                variant="secondary"
                onClick={() => processRefund(selectedRefund.id)}
                disabled={isProcessingRefund}
              >
                {isProcessingRefund ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Refund
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => 
                updateRefundMutation.mutate({
                  id: selectedRefund!.id,
                  status: selectedRefund!.status,
                  approved_amount: selectedRefund!.approved_amount,
                  internal_notes: selectedRefund!.internal_notes,
                })
              }
              disabled={updateRefundMutation.isPending}
            >
              {updateRefundMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Details Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Package Return Details</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>RMA Number</Label>
                  <p className="font-mono font-semibold">{selectedReturn.rma_number}</p>
                </div>
                <div>
                  <Label>Current Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status, 'return')}</div>
                </div>
                <div>
                  <Label>Quote ID</Label>
                  <p className="font-mono">{selectedReturn.quote?.display_id}</p>
                </div>
                <div>
                  <Label>Return Type</Label>
                  <Badge variant="outline">{selectedReturn.return_type.replace(/_/g, ' ')}</Badge>
                </div>
              </div>

              <Separator />
              
              {/* Pickup Details (if scheduled) */}
              {selectedReturn.pickup_scheduled && (
                <>
                  <div className="bg-cyan-50 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Supplier Pickup Scheduled
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs">Pickup Date</Label>
                        <p>{selectedReturn.pickup_date ? format(new Date(selectedReturn.pickup_date), 'PPP') : 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Time Slot</Label>
                        <p>{selectedReturn.pickup_time_slot || 'N/A'}</p>
                      </div>
                      {selectedReturn.pickup_confirmation_number && (
                        <div className="col-span-2">
                          <Label className="text-xs">Confirmation Number</Label>
                          <p className="font-mono">{selectedReturn.pickup_confirmation_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Return Details */}
              <div className="space-y-4">
                <div>
                  <Label>Return Reason</Label>
                  <p className="text-sm">{selectedReturn.return_reason}</p>
                </div>
                {selectedReturn.customer_notes && (
                  <div>
                    <Label>Customer Notes</Label>
                    <p className="text-sm">{selectedReturn.customer_notes}</p>
                  </div>
                )}
                <div>
                  <Label>Items to Return</Label>
                  <p>{selectedReturn.return_all_items ? 'All items' : `${selectedReturn.selected_items?.length || 0} selected items`}</p>
                </div>
              </div>

              <Separator />

              {/* Admin Actions */}
              <div className="space-y-4">
                <div>
                  <Label>Update Status</Label>
                  <Select
                    value={selectedReturn.status}
                    onValueChange={(value) => 
                      setSelectedReturn({ ...selectedReturn, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
                      <SelectItem value="label_sent">Label Sent</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="inspecting">Under Inspection</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedReturn.status === 'label_sent' && (
                  <div>
                    <Label>Shipping Label URL</Label>
                    <Input
                      value={selectedReturn.shipping_label_url || ''}
                      onChange={(e) => 
                        setSelectedReturn({ 
                          ...selectedReturn, 
                          shipping_label_url: e.target.value 
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                )}

                {selectedReturn.status === 'in_transit' && (
                  <>
                    <div>
                      <Label>Tracking Number</Label>
                      <Input
                        value={selectedReturn.tracking_number || ''}
                        onChange={(e) => 
                          setSelectedReturn({ 
                            ...selectedReturn, 
                            tracking_number: e.target.value 
                          })
                        }
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <Label>Carrier</Label>
                      <Input
                        value={selectedReturn.carrier || ''}
                        onChange={(e) => 
                          setSelectedReturn({ 
                            ...selectedReturn, 
                            carrier: e.target.value 
                          })
                        }
                        placeholder="e.g., USPS, FedEx, UPS"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={selectedReturn.admin_notes || ''}
                    onChange={(e) => 
                      setSelectedReturn({ ...selectedReturn, admin_notes: e.target.value })
                    }
                    placeholder="Add notes for internal reference..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancel
            </Button>
            {selectedReturn?.status === 'approved' && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => generateShippingLabel(selectedReturn.id)}
                  disabled={isGeneratingLabel}
                >
                  {isGeneratingLabel ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Label...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Generate Label
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPickupDialog(true);
                    setShowReturnDialog(false);
                  }}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Schedule Pickup
                </Button>
              </>
            )}
            <Button
              onClick={() => 
                updateReturnMutation.mutate({
                  id: selectedReturn!.id,
                  status: selectedReturn!.status,
                  admin_notes: selectedReturn!.admin_notes,
                  shipping_label_url: selectedReturn!.shipping_label_url,
                  tracking_number: selectedReturn!.tracking_number,
                  carrier: selectedReturn!.carrier,
                })
              }
              disabled={updateReturnMutation.isPending}
            >
              {updateReturnMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Return'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Pickup Dialog */}
      {selectedReturn && (
        <SupplierPickupDialog
          isOpen={showPickupDialog}
          onClose={() => {
            setShowPickupDialog(false);
            setShowReturnDialog(true);
          }}
          returnId={selectedReturn.id}
          customerAddress={{
            name: selectedReturn.quote?.user?.full_name || '',
            street1: '', // Would need to fetch from customer_addresses table
            street2: '',
            city: '',
            state: '',
            postalCode: '',
            country: selectedReturn.quote?.destination_country || '',
            phone: selectedReturn.quote?.user?.phone || '',
          }}
        />
      )}
    </div>
  );
};

export default ReturnManagementDashboard;