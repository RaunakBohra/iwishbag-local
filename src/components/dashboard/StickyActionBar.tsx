import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ShoppingCart, Clock } from 'lucide-react';
import { QuoteExpirationTimer } from './QuoteExpirationTimer';

import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Quote } from '@/types/quote';

interface StickyActionBarProps {
  quote: Quote;
  isOwner: boolean;
  isUpdating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onAddToCart: () => void;
  onRenewed?: () => void;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  quote,
  isOwner,
  isUpdating,
  onApprove,
  onReject,
  onAddToCart,
  onRenewed,
}) => {
  // Cart functionality has been removed
  // const cartItems = useCartStore((state) => state.items);
  const { getStatusConfig } = useStatusManagement();

  if (!isOwner) return null;

  // Helper function to check if this quote is in cart
  const isQuoteInCart = (quoteId: string) => {
    // Cart functionality removed - check database flag instead
    return quote.in_cart || false;
  };

  // Get dynamic status configuration
  const statusConfig = getStatusConfig(quote.status, 'quote');

  const renderActions = () => {
    // DYNAMIC: Use status configuration instead of hardcoded switch
    if (!statusConfig) return null;

    // Show approval/rejection buttons for statuses that allow these actions
    if (statusConfig.allowApproval && statusConfig.allowRejection) {
      return (
        <div className="flex gap-2">
          <Button
            className="flex-1 hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
            onClick={onApprove}
            disabled={isUpdating}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1 hover:scale-105 transition-all duration-200 border-red-200 text-red-600 hover:bg-red-50"
            onClick={onReject}
            disabled={isUpdating}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      );
    }

    // Show re-approval button for rejected/cancelled statuses
    if (statusConfig.allowApproval && !statusConfig.allowRejection) {
      return (
        <Button
          className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
          onClick={onApprove}
          disabled={isUpdating}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Re-Approve
        </Button>
      );
    }

    // Show cart actions for approved quotes
    if (statusConfig.allowCartActions) {
      if (!isQuoteInCart(quote.id)) {
        return (
          <Button
            className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
            onClick={onAddToCart}
            disabled={isUpdating}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        );
      } else {
        return (
          <Button 
            disabled 
            className="w-full opacity-50 cursor-not-allowed bg-gradient-to-r from-slate-600 to-gray-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart (Coming Soon)
          </Button>
        );
      }
    }

    // Show renewal button for expired quotes
    if (statusConfig.allowRenewal && quote.renewal_count < 1) {
      return (
        <Button
          className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl"
          onClick={onRenewed}
          disabled={isUpdating}
        >
          <Clock className="h-4 w-4 mr-2" />
          Renew Quote
        </Button>
      );
    }

    return null;
  };

  const renderExpirationTimer = () => {
    // DYNAMIC: Show expiration timer based on status config
    if (statusConfig?.showExpiration && quote.expires_at) {
      return (
        <div className="flex items-center justify-center p-2 mb-2 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
          <QuoteExpirationTimer
            expiresAt={quote.expires_at}
            compact={true}
            className="text-center text-red-700 text-sm"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      <div className="px-4 py-3 max-w-md mx-auto">
        {renderExpirationTimer()}
        {renderActions()}
      </div>
    </div>
  );
};
