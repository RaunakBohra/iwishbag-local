import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTempAccount } from '@/hooks/useTempAccount';
import { ShoppingCart, UserPlus, CheckCircle, ArrowRight } from 'lucide-react';

interface GuestCartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  guestEmail: string;
  onSuccess: () => void;
}

export const GuestCartDialog: React.FC<GuestCartDialogProps> = ({
  isOpen,
  onClose,
  quoteId,
  guestEmail,
  onSuccess,
}) => {
  const [isCreated, setIsCreated] = useState(false);
  const { createTempAccountForCart, isCreatingTempAccount } = useTempAccount();
  const { toast } = useToast();

  const handleCreateTempAccount = async () => {
    try {
      const tempAccount = await createTempAccountForCart(guestEmail, quoteId);
      
      if (tempAccount) {
        setIsCreated(true);
        // Give user a moment to see success message
        setTimeout(() => {
          onSuccess();
          onClose();
          setIsCreated(false);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error in handleCreateTempAccount:', error);
    }
  };

  if (isCreated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Account Created!
            </DialogTitle>
            <DialogDescription>
              Your secure account has been created and the quote has been added to your cart.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Successfully added to cart!</p>
                  <p className="text-xs text-green-700 mt-1">
                    Account: {guestEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
              <strong>What's next?</strong>
              <ul className="mt-1 space-y-1">
                <li>• You'll be redirected to your cart</li>
                <li>• Complete checkout with shipping details</li>
                <li>• Set your password during checkout</li>
                <li>• Your account will be ready for future orders</li>
              </ul>
            </div>

            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Redirecting to cart...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </DialogTitle>
          <DialogDescription>
            To add this quote to your cart, we'll create a secure account for you.
            You can set your password during checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UserPlus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Account Creation</p>
                <p className="text-xs text-blue-700 mt-1">
                  We'll create a secure account with: <strong>{guestEmail}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <strong>How it works:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Secure account created instantly</li>
              <li>• Quote transferred to your account</li>
              <li>• Full cart functionality enabled</li>
              <li>• Set password during checkout</li>
              <li>• Account ready for future orders</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreatingTempAccount}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTempAccount}
              disabled={isCreatingTempAccount}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingTempAccount ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Account & Add to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};