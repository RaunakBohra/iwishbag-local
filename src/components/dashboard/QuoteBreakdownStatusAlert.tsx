
import React from "react";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Info } from "lucide-react";

interface QuoteBreakdownStatusAlertProps {
  approval_status: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason?: string | null;
  rejection_details?: string | null;
}

export const QuoteBreakdownStatusAlert: React.FC<QuoteBreakdownStatusAlertProps> = ({
  approval_status,
  approved_at,
  rejected_at,
  rejection_reason,
  rejection_details,
}) => {
  if (approval_status === "approved") {
    return (
      <Alert className="border-green-300 bg-green-50 text-green-800">
        <CheckCircle className="h-4 w-4 !text-green-800" />
        <AlertTitle>Quote Approved</AlertTitle>
        <AlertDescription className="text-green-700">
          You approved this quote on {approved_at ? format(new Date(approved_at), 'MMM d, yyyy') : 'N/A'}.
          You can now proceed to payment.
        </AlertDescription>
      </Alert>
    );
  }
  if (approval_status === "rejected") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Thank You for Your Feedback</AlertTitle>
        <AlertDescription>
          <p>
            You rejected this quote on {rejected_at ? format(new Date(rejected_at), 'MMM d, yyyy') : 'N/A'}.
            This quote has now been cancelled.
          </p>
          {(rejection_reason || rejection_details) && (
            <div className="mt-2 pt-2 border-t border-border">
                <p className="font-semibold">Here is the reason you provided:</p>
                {rejection_reason && (
                <p className="mt-1">
                    <strong>Reason:</strong> {rejection_reason}
                </p>
                )}
                {rejection_details && (
                    <p className="mt-1">
                        <strong>Details:</strong> {rejection_details}
                    </p>
                )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
};
