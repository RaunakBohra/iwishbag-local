import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const statusSteps: Record<string, number> = {
  paid: 25,
  ordered: 50,
  shipped: 75,
  completed: 100,
};

const statusLabels: Record<string, string> = {
    cod_pending: "Awaiting Payment",
    bank_transfer_pending: "Awaiting Payment",
    esewa_pending: "Awaiting Payment",
    paid: "Paid",
    ordered: "Processing",
    shipped: "Shipped",
    completed: "Completed",
    cancelled: "Cancelled"
}

interface OrderStatusProgressProps {
  status: string;
}

export const OrderStatusProgress = ({ status }: OrderStatusProgressProps) => {
  const progressValue = statusSteps[status] || 0;
  const isCancelled = status === 'cancelled';
  const isPendingPayment = status === 'cod_pending' || status === 'bank_transfer_pending' || status === 'esewa_pending';

  if (isCancelled) {
    return <span className="text-sm text-red-600 font-medium">Cancelled</span>
  }
  
  if (isPendingPayment) {
      return <span className="text-sm text-yellow-600 font-medium">{statusLabels[status]}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
       <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
      <Progress value={progressValue} className={cn("h-2 w-24")} />
    </div>
  );
};
