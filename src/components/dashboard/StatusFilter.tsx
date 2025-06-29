
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilterProps = {
  onStatusChange: (value: string) => void;
};

export const StatusFilter = ({ onStatusChange }: StatusFilterProps) => {
  return (
    <Select onValueChange={onStatusChange} defaultValue="all">
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="cod_pending">COD Pending</SelectItem>
        <SelectItem value="bank_transfer_pending">Bank Transfer Pending</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="approved">Approved</SelectItem>
        <SelectItem value="ordered">Ordered</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
};
