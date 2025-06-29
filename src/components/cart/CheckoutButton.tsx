import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { MultiCurrencyDisplay } from "@/components/admin/MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { useUserProfile } from "@/hooks/useUserProfile";

interface CheckoutButtonProps {
  selectedQuoteIds: string[];
  totalAmount: number;
  disabled?: boolean;
}

export const CheckoutButton = ({ selectedQuoteIds, totalAmount, disabled }: CheckoutButtonProps) => {
  const navigate = useNavigate();
  const { formatAmount } = useUserCurrency();
  const { formatMultiCurrency } = useAdminCurrencyDisplay();
  const { data: userProfile } = useUserProfile();

  const handleCheckout = () => {
    if (selectedQuoteIds.length === 0) return;
    
    const params = new URLSearchParams();
    params.set('quotes', selectedQuoteIds.join(','));
    navigate(`/checkout?${params.toString()}`);
  };

  const totalCurrencies = totalAmount > 0 ? formatMultiCurrency({
    usdAmount: totalAmount,
    customerPreferredCurrency: userProfile?.preferred_display_currency,
    showAllVariations: false // Keep it simple for button
  }) : [];

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={disabled || selectedQuoteIds.length === 0}
      size="lg"
      className="min-w-fit"
      variant="destructive"
    >
      <span className="flex items-center gap-2">
        Proceed to Checkout - 
        {totalCurrencies.length > 0 ? (
          <MultiCurrencyDisplay 
            currencies={totalCurrencies}
            orientation="horizontal"
            showLabels={false}
            compact={true}
          />
        ) : (
          formatAmount(totalAmount)
        )}
      </span>
    </Button>
  );
};
