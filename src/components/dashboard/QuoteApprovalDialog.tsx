import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserCurrency } from '@/hooks/useUserCurrency';

interface QuoteApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  quoteTotal: number;
  isProcessing: boolean;
}

export const QuoteApprovalDialog: React.FC<QuoteApprovalDialogProps> = ({
  isOpen,
  onClose,
  onApprove,
  quoteTotal,
  isProcessing,
}) => {
  const { formatAmount } = useUserCurrency();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Quote Approval</DialogTitle>
          <DialogDescription>
            Please review the quote total of {formatAmount(quoteTotal)} before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            By approving this quote, you agree to add these items to your cart and proceed with the
            purchase.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={onApprove} disabled={isProcessing}>
            Approve & Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
