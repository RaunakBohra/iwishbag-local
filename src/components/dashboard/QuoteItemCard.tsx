import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';
import { Tables } from '@/integrations/supabase/types';

type QuoteItem = Tables<'quote_items'>;

interface QuoteItemCardProps {
  item: QuoteItem;
}

export const QuoteItemCard: React.FC<QuoteItemCardProps> = ({ item }) => {
  return (
    <Card className="bg-card border border-border hover:bg-muted/50 hover:border-border transition-colors group">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="bg-muted border border-border rounded-lg p-1.5 sm:p-2 group-hover:border-border transition-colors flex-shrink-0">
            <ProductImage 
              imageUrl={item.image_url}
              productName={item.product_name || 'Product'}
              size="sm"
            />
          </div>
          <div className="flex-1 min-w-0">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm sm:text-base text-foreground transition-colors duration-300">{item.product_name || 'Item'}</h4>
                <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  {item.options && item.options.trim() !== '' && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                      <span className="font-medium">Options:</span> {item.options}
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
