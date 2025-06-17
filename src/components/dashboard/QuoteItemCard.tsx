import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';
import { Tables } from '@/integrations/supabase/types';

type QuoteItem = Tables<'quote_items'>;

interface QuoteItemCardProps {
  item: QuoteItem;
}

export const QuoteItemCard: React.FC<QuoteItemCardProps> = ({ item }) => {
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <ProductImage 
            imageUrl={item.image_url}
            productName={item.product_name || 'Product'}
            size="md"
          />
          <div>
            <h4 className="font-semibold">{item.product_name || 'Item'}</h4>
            <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
            {item.options && (
              <p className="text-sm text-muted-foreground">Options: {item.options}</p>
            )}
          </div>
        </div>
        {item.product_url && (
          <Button
            variant="destructive"
            size="sm"
            asChild
          >
            <a href={item.product_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Product
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
