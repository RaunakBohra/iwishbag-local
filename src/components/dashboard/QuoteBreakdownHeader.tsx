import React from 'react';
import { CardHeader } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { Hash, Calendar, MapPin } from 'lucide-react';

// Removed unused Quote type
type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

interface QuoteBreakdownHeaderProps {
  quote: QuoteWithItems;
  _isItemsExpanded: boolean;
  _onToggleItems: () => void;
}

export const QuoteBreakdownHeader: React.FC<QuoteBreakdownHeaderProps> = ({
  quote,
  _isItemsExpanded,
  _onToggleItems,
}) => {
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <CardHeader className="flex flex-col space-y-1.5 p-4 sm:p-6 bg-card border border-border rounded-lg">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-lg sm:text-xl font-semibold tracking-tight mb-3 sm:mb-4 text-foreground">
          Quote Details
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1 bg-muted border border-border rounded-lg px-2 sm:px-3 py-1">
            <Hash className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{quote.display_id || `QT-${quote.id.toString().padStart(7, '0')}`}</span>
          </div>
          <span className="hidden md:inline text-muted-foreground">•</span>
          <div className="flex items-center gap-1 bg-muted border border-border rounded-lg px-2 sm:px-3 py-1">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Requested: {formatDate(quote.created_at)}</span>
          </div>
          <span className="hidden md:inline text-muted-foreground">•</span>
          <div className="flex items-center gap-1 bg-muted border border-border rounded-lg px-2 sm:px-3 py-1">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Shipping from: {quote.destination_country}</span>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};
