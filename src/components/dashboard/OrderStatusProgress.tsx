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
  const isPendingPayment = status === 'cod_pending' || status === 'bank_transfer_pending';

  if (isCancelled) {
    return (
      <div className="backdrop-blur-xl bg-red-50/50 border border-red-200/50 rounded-lg p-3">
        <span className="text-sm text-red-600 font-medium">Cancelled</span>
      </div>
    );
  }
  
  if (isPendingPayment) {
    return (
      <div className="backdrop-blur-xl bg-yellow-50/50 border border-yellow-200/50 rounded-lg p-3">
        <span className="text-sm text-yellow-600 font-medium">{statusLabels[status]}</span>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-lg p-4 space-y-2">
      <span className="text-xs text-muted-foreground font-medium">{statusLabels[status]}</span>
      <Progress 
        value={progressValue} 
        className={cn("h-3 w-full bg-white/30")} 
      />
    </div>
  );
};
