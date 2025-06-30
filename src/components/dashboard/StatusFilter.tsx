import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { Badge } from "@/components/ui/badge";

interface StatusFilterProps {
  onStatusChange: (status: string) => void;
}

export const StatusFilter = ({ onStatusChange }: StatusFilterProps) => {
  const { quoteStatuses } = useStatusManagement();

  // Get only quote statuses for filtering
  const availableQuoteStatuses = (quoteStatuses || [])
    .filter(status => status.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <Select onValueChange={onStatusChange} defaultValue="all">
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        {availableQuoteStatuses.map((status) => (
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
  );
};
