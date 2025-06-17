
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  approvalStatus?: string | null;
};

const statusDetails: Record<string, { label: string; tooltip: string; className: string }> = {
  pending: { label: 'Awaiting Review', tooltip: 'We are reviewing your quote request.', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  approved: { label: 'Approved', tooltip: 'Your quote is approved and ready for checkout.', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  rejected: { label: 'Rejected', tooltip: 'This quote request has been rejected.', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  cod_pending: { label: 'COD Pending', tooltip: 'Awaiting confirmation for Cash on Delivery.', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  bank_transfer_pending: { label: 'Payment Pending', tooltip: 'Awaiting bank transfer payment.', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  paid: { label: 'Payment Confirmed', tooltip: 'Your payment has been received.', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  ordered: { label: 'Order Placed', tooltip: 'Your order has been placed with the merchant.', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  shipped: { label: 'Shipped', tooltip: 'Your order has been shipped.', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' },
  completed: { label: 'Delivered', tooltip: 'Your order has been delivered.', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  cancelled: { label: 'Cancelled', tooltip: 'This quote or order has been cancelled.', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
  default: { label: 'Unknown', tooltip: 'The status is unknown.', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

const approvalStatusDetails: Record<string, { label: string; tooltip: string; className: string }> = {
  approved: { label: 'Admin Approved', tooltip: 'This quote has been approved by an admin.', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  rejected: { label: 'Admin Rejected', tooltip: 'This quote has been rejected by an admin.', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  pending: { label: 'Pending Approval', tooltip: 'This quote is pending admin approval.', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
};


export const StatusBadge = ({ status, approvalStatus }: StatusBadgeProps) => {
  const mainStatusInfo = statusDetails[status] || { ...statusDetails.default, label: status };
  const approvalStatusInfo = approvalStatus ? approvalStatusDetails[approvalStatus] : null;

  const showApprovalBadge = approvalStatus && approvalStatus !== 'pending' && approvalStatus !== status;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tooltip delayDuration={100}>
          <TooltipTrigger>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize", mainStatusInfo.className)}>
              {mainStatusInfo.label}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{mainStatusInfo.tooltip}</p>
          </TooltipContent>
        </Tooltip>
        
        {showApprovalBadge && approvalStatusInfo && (
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize", approvalStatusInfo.className)}>
                {approvalStatusInfo.label}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{approvalStatusInfo.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
