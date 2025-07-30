import React from 'react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface CompactQuoteListItemProps {
  quote: UnifiedQuote;
  onQuoteClick?: (quoteId: string) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export const CompactQuoteListItem: React.FC<CompactQuoteListItemProps> = ({
  quote,
  onQuoteClick,
  isSelected,
  showActions = true,
}) => {
  const handleClick = () => {
    if (onQuoteClick && quote.id) {
      onQuoteClick(quote.id);
    }
  };

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">
            Quote #{quote.id?.slice(-8) || 'Unknown'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {quote.items?.length || 0} items • {quote.status || 'Unknown status'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">
            ${(quote.final_total_usd || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};