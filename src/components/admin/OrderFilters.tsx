import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { Badge } from "@/components/ui/badge";

type OrderFiltersProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
};

export const OrderFilters = ({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
}: OrderFiltersProps) => {
  const { orderStatuses } = useStatusManagement();

  // Get only order statuses for filtering
  const availableOrderStatuses = (orderStatuses || [])
    .filter(status => status.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by Order ID, Product, Email..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select onValueChange={onStatusFilterChange} value={statusFilter}>
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
    </div>
  );
};
