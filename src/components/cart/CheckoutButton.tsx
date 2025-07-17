import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserCurrency } from '@/hooks/useUserCurrency';

interface CheckoutButtonProps {
  selectedQuoteIds: string[];
  totalAmount: number;
  disabled?: boolean;
}

export const CheckoutButton = ({
  selectedQuoteIds,
  totalAmount,
  disabled,
}: CheckoutButtonProps) => {
  const navigate = useNavigate();
  const { formatAmount } = useUserCurrency();

  const handleCheckout = () => {
    if (selectedQuoteIds.length === 0) return;

    const params = new URLSearchParams();
    params.set('quotes', selectedQuoteIds.join(','));
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || selectedQuoteIds.length === 0}
      size="lg"
      className="min-w-fit"
      variant="destructive"
    >
      <span className="flex items-center gap-2">
        Proceed to Checkout - {formatAmount(totalAmount)}
      </span>
    </Button>
  );
};
