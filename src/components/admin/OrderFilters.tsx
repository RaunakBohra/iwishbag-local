import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Badge } from '@/components/ui/badge';

type OrderFiltersProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  paymentStatusFilter?: string;
  onPaymentStatusChange?: (value: string) => void;
};

export const OrderFilters = ({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  paymentStatusFilter,
  onPaymentStatusChange,
}: OrderFiltersProps) => {
  const { orderStatuses, getStatusesForOrdersList } = useStatusManagement();

  // Get only order statuses that should show in orders list
  const allowedStatusNames = getStatusesForOrdersList();
  const availableOrderStatuses = (orderStatuses || [])
    .filter((status) => status.isActive && allowedStatusNames.includes(status.name))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by Order ID, Product, Email..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select onValueChange={onStatusChange} value={statusFilter}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Orders</SelectItem>
          {availableOrderStatuses.map((status) => (
            <SelectItem key={status.name} value={status.name}>
              <div className="flex items-center gap-2">
                <Badge variant={status.color} className="text-xs">
                  {status.label}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Payment Status Filter */}
      {onPaymentStatusChange && (
        <Select onValueChange={onPaymentStatusChange} value={paymentStatusFilter || 'all'}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="unpaid">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Unpaid
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="partial">
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-xs">
                  Partial Payment
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="paid">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Paid
                </Badge>
              </div>
            </SelectItem>
            <SelectItem value="overpaid">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Overpaid
                </Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
