import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { formatAmountWithCustomerRounding } from '@/utils/customerFriendlyRounding';

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
  const { currency } = useCurrency('USD');

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
        Proceed to Checkout - {formatAmountWithCustomerRounding(totalAmount, currency)}
      </span>
    </Button>
  );
};
