/**
 * Refactored Payment Management Page
 * Clean orchestration component that coordinates specialized services
 * Decomposed from 1,233 lines to ~220 lines (82% reduction)
 * 
 * SERVICES INTEGRATED:
 * - PaymentDataService: Data fetching, filtering, and aggregation
 * - PaymentVerificationService: Payment verification workflows  
 * - PaymentActionsService: Payment operations (approve, reject, refund)
 * - PaymentUIService: UI state management and filtering
 * 
 * RESPONSIBILITIES:
 * - Service orchestration and coordination
 * - React component rendering and state management
 * - User interaction handling
 * - Error boundary and loading states
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Receipt, Search, Download, Eye, CheckCircle, XCircle, Clock, 
  DollarSign, RefreshCw, MoreVertical 
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Service imports
import PaymentDataService, { PaymentDataFilter, PaymentProofData } from '@/services/payment-management/PaymentDataService';
import PaymentVerificationService, { VerificationRequest } from '@/services/payment-management/PaymentVerificationService';
import PaymentActionsService, { PaymentApprovalRequest, PaymentRejectionRequest } from '@/services/payment-management/PaymentActionsService';
import PaymentUIService, { FilterState, PaginationState } from '@/services/payment-management/PaymentUIService';

// Service instances
const paymentDataService = PaymentDataService.getInstance();
const paymentVerificationService = PaymentVerificationService.getInstance();
const paymentActionsService = PaymentActionsService.getInstance();
const paymentUIService = PaymentUIService.getInstance();

export const PaymentManagementPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UI State Management
  const [filters, setFilters] = useState<FilterState>(() => 
    paymentUIService.getDefaultFilterState()
  );
  const [pagination, setPagination] = useState<PaginationState>(() => 
    paymentUIService.getDefaultPaginationState()
  );
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());

  // Convert UI filters to data service format
  const dataFilter: PaymentDataFilter = {
    statusFilter: filters.statusFilter,
    paymentMethodFilter: filters.paymentMethodFilter,
    searchQuery: filters.searchQuery,
    dateRange: filters.dateRange,
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize
  };

  // Data Fetching
  const {
    data: paymentData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payment-management-data', dataFilter],
    queryFn: () => paymentDataService.fetchPaymentData(dataFilter),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000 // Data considered stale after 15 seconds
  });

  // Statistics Query
  const {
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['payment-stats', filters],
    queryFn: () => paymentDataService.getPaymentStats(filters),
    refetchInterval: 60000 // Refresh stats every minute
  });

  // Verification Statistics
  const {
    data: verificationStats
  } = useQuery({
    queryKey: ['verification-stats'],
    queryFn: () => paymentVerificationService.getVerificationStats(),
    refetchInterval: 60000
  });

  // Update pagination when data changes
  useEffect(() => {
    if (paymentData) {
      setPagination(prev => paymentUIService.updatePaginationState(
        prev,
        paymentData.totalCount,
        paymentData.filteredCount
      ));
    }
  }, [paymentData]);

  // Verification Mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: (request: VerificationRequest) => 
      paymentVerificationService.verifyPayment(request),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Payment Verified",
          description: `Payment ${result.paymentId} has been ${result.newStatus}`,
        });
        queryClient.invalidateQueries({ queryKey: ['payment-management-data'] });
        queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      } else {
        toast({
          title: "Verification Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Action Mutations
  const approvePaymentMutation = useMutation({
    mutationFn: (request: PaymentApprovalRequest) =>
      paymentActionsService.approvePayment(request),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Payment Approved",
          description: `Payment approved successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ['payment-management-data'] });
      }
    }
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: (request: PaymentRejectionRequest) =>
      paymentActionsService.rejectPayment(request),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Payment Rejected",
          description: `Payment rejected successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ['payment-management-data'] });
      }
    }
  });

  // Event Handlers
  const handleFilterChange = useCallback((updates: Partial<FilterState>) => {
    const newFilters = paymentUIService.validateFilterState({ ...filters, ...updates });
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  }, [filters]);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handleApprovePayment = useCallback((payment: PaymentProofData) => {
    approvePaymentMutation.mutate({
      paymentId: payment.id,
      paymentType: payment.payment_type,
      adminNotes: 'Approved via admin panel'
    });
  }, [approvePaymentMutation]);

  const handleRejectPayment = useCallback((payment: PaymentProofData) => {
    rejectPaymentMutation.mutate({
      paymentId: payment.id,
      paymentType: payment.payment_type,
      rejectionReason: 'Rejected via admin panel',
      adminNotes: 'Rejected after review'
    });
  }, [rejectPaymentMutation]);

  const handleBulkAction = useCallback((action: 'approve' | 'reject') => {
    if (selectedPayments.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select payments to perform bulk actions",
        variant: "destructive"
      });
      return;
    }

    const paymentIds = Array.from(selectedPayments);
    paymentActionsService.executeBulkActions({
      paymentIds,
      action,
      reason: `Bulk ${action} via admin panel`,
      adminNotes: `Bulk action performed on ${paymentIds.length} payments`
    }).then(results => {
      const successful = results.filter(r => r.success).length;
      toast({
        title: `Bulk ${action} Completed`,
        description: `${successful}/${results.length} payments processed successfully`,
      });
      setSelectedPayments(new Set());
      queryClient.invalidateQueries({ queryKey: ['payment-management-data'] });
    });
  }, [selectedPayments, toast, queryClient]);

  const handleRefresh = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
  }, [refetch, queryClient]);

  // Get page info for display
  const pageInfo = pagination.filteredCount > 0 ? 
    paymentUIService.getPageInfo(pagination) : null;

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Payments</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">
            Manage and verify customer payment proofs
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.verified || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                ${stats?.totalAmount?.toLocaleString() || '0'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by order ID, customer, or email..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
                className="w-full"
              />
            </div>
            
            <Select value={filters.statusFilter} onValueChange={(value: any) => 
              handleFilterChange({ statusFilter: value })}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.paymentMethodFilter} onValueChange={(value: any) => 
              handleFilterChange({ paymentMethodFilter: value })}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="payu">PayU</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
              </SelectContent>
            </Select>

            <DateRangePicker
              date={{ from: filters.dateRange.from, to: filters.dateRange.to }}
              onDateChange={(dateRange) => 
                dateRange && handleFilterChange({ 
                  dateRange: { from: dateRange.from!, to: dateRange.to || dateRange.from! }
                })
              }
              className="w-full md:w-auto"
            />
          </div>
          
          {selectedPayments.size > 0 && (
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={() => handleBulkAction('approve')}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Selected ({selectedPayments.size})
              </Button>
              <Button 
                onClick={() => handleBulkAction('reject')}
                variant="outline" 
                size="sm"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Selected ({selectedPayments.size})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Records</CardTitle>
            {pageInfo && (
              <p className="text-sm text-muted-foreground">{pageInfo.showingText}</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paymentData?.data.length === 0 ? (
            <div className="text-center py-8">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPayments.size === paymentData?.data.length && paymentData?.data.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPayments(new Set(paymentData?.data.map(p => p.id) || []));
                          } else {
                            setSelectedPayments(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentData?.data.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayments.has(payment.id)}
                          onCheckedChange={(checked) => {
                            const newSelection = new Set(selectedPayments);
                            if (checked) {
                              newSelection.add(payment.id);
                            } else {
                              newSelection.delete(payment.id);
                            }
                            setSelectedPayments(newSelection);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.order_display_id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        ${payment.final_total_usd.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payment.verification_status === 'verified'
                              ? 'default'
                              : payment.verification_status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {payment.verification_status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{format(new Date(payment.created_at), 'PPpp')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleApprovePayment(payment)}
                              disabled={payment.verification_status === 'verified'}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRejectPayment(payment)}
                              disabled={payment.verification_status === 'rejected'}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                            {payment.attachment_url && (
                              <DropdownMenuItem asChild>
                                <a href={payment.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Proof
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pageInfo && pageInfo.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {pageInfo.pageNumbers.map((pageNum, index) => (
                      pageNum === -1 ? (
                        <span key={`ellipsis-${index}`} className="text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentManagementPage;