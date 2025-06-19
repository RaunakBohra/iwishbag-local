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
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-muted border border-border rounded-lg p-2 group-hover:border-border transition-colors">
            <ProductImage 
              imageUrl={item.image_url}
              productName={item.product_name || 'Product'}
              size="md"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                {item.product_url ? (
                  <a 
                    href={item.product_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-semibold hover:underline inline-flex items-center text-base text-foreground hover:text-foreground/80 transition-colors duration-300"
                  >
                    {item.product_name || 'Item'}
                    <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                  </a>
                ) : (
                  <h4 className="font-semibold text-base text-foreground transition-colors duration-300">{item.product_name || 'Item'}</h4>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  {item.options && item.options.trim() !== '' && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Options:</span> {item.options}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
