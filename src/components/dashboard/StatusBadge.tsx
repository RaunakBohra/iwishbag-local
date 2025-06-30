import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStatusManagement } from "@/hooks/useStatusManagement";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const { quoteStatuses, orderStatuses } = useStatusManagement();

  // Helper function to determine if a status is a quote status
  const isQuoteStatus = (status: string): boolean => {
    return ['pending', 'sent', 'approved', 'rejected', 'expired', 'calculated'].includes(status);
  };

  // Helper function to determine if a status is an order status
  const isOrderStatus = (status: string): boolean => {
    return ['cod_pending', 'bank_transfer_pending', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(status);
  };

  // Find status configuration from the management system
  let statusConfig = null;
  
  if (isQuoteStatus(status)) {
    statusConfig = (quoteStatuses || []).find(s => s.name === status);
  } else if (isOrderStatus(status)) {
    statusConfig = (orderStatuses || []).find(s => s.name === status);
  }

  // Fallback to default if status not found in management system
  if (!statusConfig) {
    const fallbackConfig = {
      label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      tooltip: `Status: ${status}`,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    return (
      <Badge
        variant="secondary"
        className={cn(fallbackConfig.className, className)}
        title={fallbackConfig.tooltip}
      >
        {fallbackConfig.label}
      </Badge>
    );
  }

  // Use the status management configuration
  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'default': return 'default';
      case 'secondary': return 'secondary';
      case 'outline': return 'outline';
      case 'destructive': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Badge
      variant={getBadgeVariant(statusConfig.color)}
      className={cn(className)}
      title={statusConfig.description}
    >
      {statusConfig.label}
    </Badge>
  );
};
