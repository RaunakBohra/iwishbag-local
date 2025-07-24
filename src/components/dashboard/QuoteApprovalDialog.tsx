import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, DollarSign, Package, Truck, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuoteApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  quoteTotal: number;
  isProcessing?: boolean;
}

export const QuoteApprovalDialog: React.FC<QuoteApprovalDialogProps> = ({
  isOpen,
  onClose,
  onApprove,
  quoteTotal,
  isProcessing = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Approve Quote
          </DialogTitle>
          <DialogDescription>
            You're about to approve this quote. Please review the details below before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quote Total */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-primary mr-2" />
                <span className="font-medium text-gray-900">Total Amount</span>
              </div>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(quoteTotal)}
              </span>
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">What happens next:</h4>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">Quote will be marked as approved</span>
                <Badge variant="outline" className="text-xs">Step 1</Badge>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <span className="text-gray-700">You can proceed to payment</span>
                <Badge variant="outline" className="text-xs">Step 2</Badge>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <Truck className="h-4 w-4 text-green-600" />
                <span className="text-gray-700">Items will be ordered and shipped</span>
                <Badge variant="outline" className="text-xs">Step 3</Badge>
              </div>
            </div>
          </div>

          {/* Important note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> By approving this quote, you agree to the total amount and 
              terms. You can add this quote to your cart and proceed with payment when ready.
            </p>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={onApprove}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Quote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};