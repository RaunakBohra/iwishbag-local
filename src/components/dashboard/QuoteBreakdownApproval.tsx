import React from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface QuoteBreakdownApprovalProps {
  canApproveReject: boolean;
  isProcessing: boolean;
  quoteId: string;
  onApprove: (id: string) => void;
  onReject: () => void;
}

export const QuoteBreakdownApproval: React.FC<QuoteBreakdownApprovalProps> = ({
  canApproveReject,
  isProcessing,
  quoteId,
  onApprove,
  onReject,
}) => {
  if (!canApproveReject) return null;
  return (
    <div className="flex space-x-3 pt-4">
      <Button
        onClick={() => onApprove(quoteId)}
        disabled={isProcessing}
        className="flex-1"
      >
        <Check className="h-4 w-4 mr-2" />
        Approve & Add to Cart
      </Button>
      <Button
        variant="outline"
        onClick={onReject}
        disabled={isProcessing}
        className="flex-1"
      >
        <X className="h-4 w-4 mr-2" />
        Reject Quote
      </Button>
    </div>
  );
};
