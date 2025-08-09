import React from 'react';
import type { UnifiedQuote } from '@/types/unified-quote';
import { Badge } from '@/components/ui/badge';
import { Clock, Mail, Share2 } from 'lucide-react';
import { currencyService } from '@/services/CurrencyService';

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
  // currencyService is already imported as instance
  
  const handleClick = () => {
    if (onQuoteClick && quote.id) {
      onQuoteClick(quote.id);
    }
  };

  // Get the appropriate currency - prefer origin currency for admin view
  const currency = quote.origin_currency || 'USD';
  const amount = quote.origin_total_amount || quote.final_total_origincurrency || 0;

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">
              Quote #{quote.id?.slice(-8) || 'Unknown'}
            </h3>
            {(quote as any).email_sent && (
              <Badge variant="outline" className="text-green-600 text-xs">
                <Mail className="mr-1 h-3 w-3" />
                Sent
              </Badge>
            )}
            {(quote as any).has_share_token && (
              <Badge variant="outline" className="text-blue-600 text-xs">
                <Share2 className="mr-1 h-3 w-3" />
                Shared
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {quote.items?.length || 0} items • {quote.status || 'Unknown status'}
            {quote.items?.some((item: any) => item.customer_notes) && (
              <Badge variant="outline" className="text-xs ml-2">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Has Notes
              </Badge>
            )}
          </p>
          {(quote as any).expiry_status && (
            <div className="mt-2">
              <Badge 
                variant={(quote as any).expiry_status.variant as any}
                className="text-xs"
              >
                <Clock className="mr-1 h-3 w-3" />
                {(quote as any).expiry_status.text}
              </Badge>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">
            {currencyService.formatAmount(amount, currency)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {quote.customer_data?.info?.name || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
};