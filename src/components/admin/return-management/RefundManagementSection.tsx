/**
 * Refund Management Section
 * Handles refund requests table, filtering, and bulk operations
 * Extracted from ReturnManagementDashboard for better maintainability
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyConversion';
import { format } from 'date-fns';

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
}

interface RefundManagementSectionProps {
  refundRequests?: RefundRequest[];
  isLoading: boolean;
  searchTerm: string;
  statusFilter: string;
  selectedRefunds: string[];
  onSearchChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onSelectionChange: (selected: string[]) => void;
  onViewRefund: (refund: RefundRequest) => void;
  onBulkApprove?: () => void;
  onBulkReject?: () => void;
  className?: string;
}

const REFUND_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

export const RefundManagementSection: React.FC<RefundManagementSectionProps> = ({
  refundRequests = [],
  isLoading,
  searchTerm,
  statusFilter,
  selectedRefunds,
  onSearchChange,
  onStatusFilterChange,
  onSelectionChange,
  onViewRefund,
  onBulkApprove,
  onBulkReject,
  className = '',
}) => {
  const getStatusBadge = (status: string) => {
    const badgeMap = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      processing: { variant: 'default' as const, icon: Loader2, color: 'text-blue-600' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    };

    const config = badgeMap[status as keyof typeof badgeMap] || badgeMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(refundRequests.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRefund = (refundId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRefunds, refundId]);
    } else {
      onSelectionChange(selectedRefunds.filter(id => id !== refundId));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Refund Requests
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedRefunds.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkApprove}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve ({selectedRefunds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkReject}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject ({selectedRefunds.length})
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search refunds by reason, notes..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
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
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading refund requests...</span>
          </div>
        ) : refundRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No refund requests found</p>
            <p className="text-sm mt-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Refund requests will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRefunds.length === refundRequests.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Quote ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundRequests.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRefunds.includes(refund.id)}
                        onCheckedChange={(checked) => handleSelectRefund(refund.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {refund.quote?.display_id || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {refund.quote?.user?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {refund.quote?.user?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {formatCurrency(refund.requested_amount, refund.currency)}
                        </p>
                        {refund.approved_amount && refund.approved_amount !== refund.requested_amount && (
                          <p className="text-xs text-green-600">
                            Approved: {formatCurrency(refund.approved_amount, refund.currency)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {refund.refund_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(refund.status)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium text-sm">
                          {refund.reason_code.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {refund.reason_description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(refund.requested_at), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(refund.requested_at), 'HH:mm')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRefund(refund)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
              <span>
                Showing {refundRequests.length} refund request{refundRequests.length !== 1 ? 's' : ''}
              </span>
              <span>
                Total value: {formatCurrency(
                  refundRequests.reduce((sum, r) => sum + r.requested_amount, 0),
                  'USD'
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};