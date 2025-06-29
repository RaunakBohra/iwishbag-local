import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Minus, Pencil, Edit2, Save, XCircle, ExternalLink, Package } from "lucide-react";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { MultiCurrencyDisplay } from "@/components/admin/MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { useCartMutations } from "@/hooks/useCartMutations";
import { useQuoteMutations } from "@/hooks/useQuoteMutations";
import { useToast } from "@/hooks/use-toast";
import { ProductImage } from "@/components/ui/product-image";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Tables } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';

type QuoteItem = Tables<'quote_items'>;

interface CartItemProps {
  item: QuoteItem;
  quoteId: string;
  onRemove: (quoteId: string) => void;
  onSaveForLater?: () => void;
  onMoveToCart?: () => void;
  onQuantityChange?: (quantity: number) => void;
  onSaveNotes?: (notes: string) => void;
  selected?: boolean;
  onSelect?: () => void;
  viewMode?: 'list' | 'grid';
}

export function CartItem({
  item,
  quoteId,
  onRemove,
  onSaveForLater,
  onMoveToCart,
  onQuantityChange,
  onSaveNotes,
  selected,
  onSelect,
  viewMode = 'list'
}: CartItemProps) {
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [notes, setNotes] = useState(item.options || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const { formatAmount } = useUserCurrency();
  const { formatMultiCurrency } = useAdminCurrencyDisplay();
  const { removeFromCart, isRemovingFromCart } = useCartMutations();
  const { updateQuoteItem } = useQuoteMutations(quoteId);
  const { toast } = useToast();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      setQuantity(newQuantity);
      onQuantityChange?.(newQuantity);
    }
  };

  const handleSaveNotes = () => {
    onSaveNotes?.(notes);
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotes(item.options || '');
    setIsEditingNotes(false);
  };

  const itemCurrencies = item.item_price ? formatMultiCurrency({
    usdAmount: item.item_price * quantity,
<<<<<<< HEAD
    quoteCurrency: 'USD',
=======
    quoteCurrency: item.item_currency,
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
    showAllVariations: false
  }) : [];

  if (viewMode === 'grid') {
    return (
      <Link to={`/quote/${quoteId}`} className="block">
        <div className={`relative p-4 border rounded-lg ${selected ? 'border-primary' : 'border-border'}`}>
          {onSelect && (
            <div className="absolute top-2 right-2">
              <Checkbox
                checked={selected}
                onCheckedChange={onSelect}
              />
            </div>
          )}
          <div className="aspect-square mb-2">
            <img
              src={item.image_url || '/placeholder.png'}
              alt={item.product_name || 'Product'}
              className="w-full h-full object-cover rounded-md"
            />
          </div>
          <h3 className="font-medium truncate">{item.product_name}</h3>
          <p className="text-sm text-muted-foreground">
            {item.item_price ? `$${item.item_price.toFixed(2)}` : 'Price not available'}
          </p>
          <div className="mt-2 space-y-2">
            {onQuantityChange && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(quantity - 1)}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                  className="w-16 text-center"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  +
                </Button>
              </div>
            )}
            <div className="flex space-x-2">
              {onSaveForLater && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveForLater}
                  className="flex-1"
                >
                  Save
                </Button>
              )}
              {onMoveToCart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMoveToCart}
                  className="flex-1"
                >
                  Move to Cart
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemove(quoteId)}
                className="flex-1"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/quote/${quoteId}`} className="block">
      <div className={`flex items-start space-x-4 p-4 border rounded-lg ${selected ? 'border-primary' : 'border-border'}`}>
        {onSelect && (
          <div className="pt-2">
            <Checkbox
              checked={selected}
              onCheckedChange={onSelect}
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium">{item.product_name}</h3>
              <p className="text-sm text-muted-foreground">
                {item.item_price ? `$${item.item_price.toFixed(2)}` : 'Price not available'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {onQuantityChange && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity - 1)}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                    className="w-16 text-center"
                    min={1}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              )}
              {onSaveForLater && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSaveForLater}
                >
                  Save for Later
                </Button>
              )}
              {onMoveToCart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMoveToCart}
                >
                  Move to Cart
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemove(quoteId)}
              >
                Remove
              </Button>
            </div>
          </div>
          {onSaveNotes && (
            <div className="mt-2">
              {isEditingNotes ? (
                <div className="flex space-x-2">
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveNotes}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelNotes}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    {notes || 'No notes'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {notes ? 'Edit' : 'Add'} Notes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
} 