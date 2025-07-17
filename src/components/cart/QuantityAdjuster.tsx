import { Button } from '@/components/ui/button';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface QuantityAdjusterProps {
  initialQuantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  onQuantityChange: (quantity: number) => void;
  disabled?: boolean;
}

export const QuantityAdjuster = ({
  initialQuantity,
  minQuantity = 1,
  maxQuantity = 99,
  onQuantityChange,
  disabled = false,
}: QuantityAdjusterProps) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isLoading, setIsLoading] = useState(false);

  const handleDecrease = async () => {
    if (quantity <= minQuantity || disabled || isLoading) return;
    setIsLoading(true);
    try {
      const newQuantity = quantity - 1;
      await onQuantityChange(newQuantity);
      setQuantity(newQuantity);
    } catch (_error) {
      // Revert to previous quantity on error
      setQuantity(quantity);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncrease = async () => {
    if (quantity >= maxQuantity || disabled || isLoading) return;
    setIsLoading(true);
    try {
      const newQuantity = quantity + 1;
      await onQuantityChange(newQuantity);
      setQuantity(newQuantity);
    } catch (_error) {
      // Revert to previous quantity on error
      setQuantity(quantity);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrease}
        disabled={quantity <= minQuantity || disabled || isLoading}
        className="h-8 w-8"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
      </Button>
      <span className="w-8 text-center">{quantity}</span>
      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrease}
        disabled={quantity >= maxQuantity || disabled || isLoading}
        className="h-8 w-8"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  );
};
