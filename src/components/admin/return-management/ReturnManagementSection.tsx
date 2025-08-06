/**
 * Return Management Section  
 * Handles package returns table, filtering, and operations
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
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Eye,
  Upload,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface PackageReturn {
  id: string;
  rma_number: string;
  quote_id: string;
  quote?: {
    display_id: string;
    user_id: string;
    user?: {
      full_name: string;
      email: string;
    };
  };
  return_reason: string;
  status: string;
  return_type: string;
  customer_notes?: string;
  internal_notes?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  return_label_url?: string;
  pickup_scheduled?: boolean;
  pickup_date?: string;
  received_date?: string;
  condition_assessment?: string;
  created_at: string;
  updated_at: string;
}

interface ReturnManagementSectionProps {
  packageReturns?: PackageReturn[];
  isLoading: boolean;
  searchTerm: string;
  statusFilter: string;
  selectedReturns: string[];
  onSearchChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onSelectionChange: (selected: string[]) => void;
  onViewReturn: (packageReturn: PackageReturn) => void;
  onGenerateLabel?: (packageReturn: PackageReturn) => void;
  onSchedulePickup?: (selectedIds: string[]) => void;
  isGeneratingLabel?: boolean;
  className?: string;
}

const RETURN_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'label_generated', label: 'Label Generated' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received', label: 'Received' },
  { value: 'processed', label: 'Processed' },
  { value: 'completed', label: 'Completed' },
];

export const ReturnManagementSection: React.FC<ReturnManagementSectionProps> = ({
  packageReturns = [],
  isLoading,
  searchTerm,
  statusFilter,
  selectedReturns,
  onSearchChange,
  onStatusFilterChange,
  onSelectionChange,
  onViewReturn,
  onGenerateLabel,
  onSchedulePickup,
  isGeneratingLabel = false,
  className = '',
}) => {
  const getStatusBadge = (status: string) => {
    const badgeMap = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      label_generated: { variant: 'default' as const, icon: Upload, color: 'text-blue-600' },
      in_transit: { variant: 'default' as const, icon: Truck, color: 'text-purple-600' },
      received: { variant: 'default' as const, icon: Package, color: 'text-indigo-600' },
      processed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    };

    const config = badgeMap[status as keyof typeof badgeMap] || badgeMap.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(packageReturns.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectReturn = (returnId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedReturns, returnId]);
    } else {
      onSelectionChange(selectedReturns.filter(id => id !== returnId));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Package Returns
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedReturns.length > 0 && (
              <>
                {onSchedulePickup && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSchedulePickup(selectedReturns)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Truck className="w-4 h-4 mr-1" />
                    Schedule Pickup ({selectedReturns.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search returns by RMA, reason, notes..."
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
                {RETURN_STATUS_OPTIONS.map(option => (
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
            <span>Loading package returns...</span>
          </div>
        ) : packageReturns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No package returns found</p>
            <p className="text-sm mt-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Package returns will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedReturns.length === packageReturns.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>RMA Number</TableHead>
                  <TableHead>Quote ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packageReturns.map((packageReturn) => (
                  <TableRow key={packageReturn.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReturns.includes(packageReturn.id)}
                        onCheckedChange={(checked) => handleSelectReturn(packageReturn.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">
                        {packageReturn.rma_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {packageReturn.quote?.display_id || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {packageReturn.quote?.user?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {packageReturn.quote?.user?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm truncate">
                          {packageReturn.return_reason}
                        </p>
                        {packageReturn.customer_notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {packageReturn.customer_notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(packageReturn.status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {packageReturn.return_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {packageReturn.tracking_number ? (
                          <>
                            <p className="font-mono text-xs">
                              {packageReturn.tracking_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {packageReturn.shipping_carrier}
                            </p>
                          </>
                        ) : packageReturn.pickup_scheduled ? (
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-600">Pickup scheduled</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No tracking</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(packageReturn.created_at), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(packageReturn.created_at), 'HH:mm')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReturn(packageReturn)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onGenerateLabel && packageReturn.status === 'approved' && !packageReturn.return_label_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onGenerateLabel(packageReturn)}
                            disabled={isGeneratingLabel}
                            className="h-8 w-8 p-0"
                          >
                            {isGeneratingLabel ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
              <span>
                Showing {packageReturns.length} package return{packageReturns.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-4">
                <span>
                  Pending: {packageReturns.filter(r => r.status === 'pending').length}
                </span>
                <span>
                  In Transit: {packageReturns.filter(r => r.status === 'in_transit').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};