import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';

type QuoteItem = Tables<'quote_items'>;

interface AdminQuoteItemCardProps {
  item: QuoteItem;
}

export const AdminQuoteItemCard = ({ item }: AdminQuoteItemCardProps) => {
  const [imageUrl, setImageUrl] = useState(item.image_url);

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl(null);
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">Edit Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`item_product_name_${item.id}`}>Product Name</Label>
          <Input
            id={`item_product_name_${item.id}`}
            name={`item_product_name_${item.id}`}
            defaultValue={item.product_name || ''}
            placeholder="Product Name"
          />
        </div>
        <div className="flex gap-4 items-start">
          <div className="w-24 flex-shrink-0">
            <Label>Image</Label>
            <ImageUpload
              currentImageUrl={imageUrl}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
            />
            <input type="hidden" name={`item_image_url_${item.id}`} value={imageUrl || ''} />
          </div>

          <div className="flex-grow space-y-4 text-sm">
            <div>
              <Label htmlFor={`item_product_url_${item.id}`}>URL</Label>
              <Input
                id={`item_product_url_${item.id}`}
                name={`item_product_url_${item.id}`}
                defaultValue={item.product_url || ''}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor={`item_quantity_${item.id}`}>Quantity</Label>
              <Input
                id={`item_quantity_${item.id}`}
                name={`item_quantity_${item.id}`}
                type="number"
                step="1"
                min="1"
                defaultValue={item.quantity}
              />
            </div>
            <div>
              <Label htmlFor={`item_options_${item.id}`}>Options</Label>
              <Input
                id={`item_options_${item.id}`}
                name={`item_options_${item.id}`}
                defaultValue={item.options || ''}
                placeholder="e.g. Size, Color"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`item_price_${item.id}`}>Price</Label>
            <Input
              id={`item_price_${item.id}`}
              name={`item_price_${item.id}`}
              type="number"
              step="0.01"
              defaultValue={item.item_price || 0}
            />
          </div>
          <div>
            <Label htmlFor={`item_weight_${item.id}`}>Weight (kg)</Label>
            <Input
              id={`item_weight_${item.id}`}
              name={`item_weight_${item.id}`}
              type="number"
              step="0.01"
              defaultValue={item.item_weight || 0}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
