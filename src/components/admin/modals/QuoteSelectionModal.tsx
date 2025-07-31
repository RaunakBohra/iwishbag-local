// ============================================================================
// QUOTE SELECTION MODAL - Advanced Quote/Order Selection Interface
// Uses UnifiedQuoteList for rich selection experience with search, filters, etc.
// Replaces simple dropdowns with comprehensive selection modal
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Package,
  CheckCircle,
  X,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Hash,
  Truck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { UnifiedQuoteList } from '@/components/unified/UnifiedQuoteList';
import type { UnifiedQuote } from '@/types/unified-quote';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface QuoteSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: UnifiedQuote[];
  selectedQuoteId?: string | null;
  onSelectQuote: (quote: UnifiedQuote | null) => void;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showClearOption?: boolean;
  viewMode?: 'admin' | 'customer' | 'guest';
  maxHeight?: number;
}

// Quote preview card for selected quote
const SelectedQuotePreview: React.FC<{ 
  quote: UnifiedQuote; 
  onClear: () => void;
  viewMode: 'admin' | 'customer' | 'guest';
}> = ({ 
  quote, 
  onClear, 
  viewMode 
}) => {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-purple-100 text-purple-800 border-purple-200',
      shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const itemCount = quote.items?.length || 0;
  const totalValue = quote.final_total_usd || quote.total_amount_usd || 0;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-blue-900 truncate">
                    {quote.display_id || `Quote ${quote.id.slice(0, 8)}...`}
                  </h3>
                  <Badge className={cn('text-xs border', getStatusColor(quote.status))}>
                    {quote.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{quote.destination_country}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>${totalValue.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-600 text-xs mb-1">Created</div>
                <div className="flex items-center gap-1 text-blue-800">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {quote.customer_data?.info?.name && (
                <div>
                  <div className="text-blue-600 text-xs mb-1">Customer</div>
                  <div className="flex items-center gap-1 text-blue-800">
                    <User className="h-3 w-3" />
                    <span className="truncate">{quote.customer_data.info.name}</span>
                  </div>
                </div>
              )}

              {quote.expires_at && (
                <div>
                  <div className="text-blue-600 text-xs mb-1">Expires</div>
                  <div className="flex items-center gap-1 text-blue-800">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(quote.expires_at), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              )}

              {quote.tracking_status && (
                <div>
                  <div className="text-blue-600 text-xs mb-1">Shipping</div>
                  <div className="flex items-center gap-1 text-blue-800">
                    <Truck className="h-3 w-3" />
                    <span>{quote.tracking_status}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Items Preview */}
            {quote.items && quote.items.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-blue-600 text-xs mb-2">Items</div>
                <div className="text-blue-800 text-sm">
                  {quote.items.slice(0, 3).map((item, index) => (
                    <span key={index}>
                      {item.name}
                      {index < Math.min(quote.items!.length, 3) - 1 && ', '}
                    </span>
                  ))}
                  {quote.items.length > 3 && (
                    <span className="text-blue-600"> and {quote.items.length - 3} more...</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const QuoteSelectionModal: React.FC<QuoteSelectionModalProps> = ({
  isOpen,
  onClose,
  quotes,
  selectedQuoteId,
  onSelectQuote,
  title = "Select Quote/Order",
  description = "Choose a quote or order to associate with this support ticket",
  emptyMessage = "No quotes or orders found",
  showClearOption = true,
  viewMode = 'customer',
  maxHeight = 600,
}) => {
  const [tempSelectedQuote, setTempSelectedQuote] = useState<UnifiedQuote | null>(null);

  // Find the initially selected quote
  const initiallySelectedQuote = useMemo(() => {
    return selectedQuoteId ? quotes.find(q => q.id === selectedQuoteId) || null : null;
  }, [selectedQuoteId, quotes]);

  // Reset temp selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedQuote(initiallySelectedQuote);
    }
  }, [isOpen, initiallySelectedQuote]);

  const handleQuoteAction = useCallback((action: string, quote: UnifiedQuote) => {
    if (action === 'select') {
      setTempSelectedQuote(quote);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onSelectQuote(tempSelectedQuote);
    onClose();
  }, [tempSelectedQuote, onSelectQuote, onClose]);

  const handleCancel = useCallback(() => {
    setTempSelectedQuote(initiallySelectedQuote);
    onClose();
  }, [initiallySelectedQuote, onClose]);

  const handleClearSelection = useCallback(() => {
    setTempSelectedQuote(null);
  }, []);

  const hasChanges = tempSelectedQuote?.id !== initiallySelectedQuote?.id;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            {title}
            <Badge variant="outline" className="text-xs">
              {quotes.length} available
            </Badge>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Selected Quote Preview */}
          {tempSelectedQuote && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Selected Quote/Order:</span>
              </div>
              <SelectedQuotePreview 
                quote={tempSelectedQuote} 
                onClear={handleClearSelection}
                viewMode={viewMode}
              />
            </div>
          )}

          {tempSelectedQuote && <Separator />}

          {/* Quote List */}
          <div className="flex-1 min-h-0">
            {quotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotes Available</h3>
                  <p className="text-gray-600">{emptyMessage}</p>
                </CardContent>
              </Card>
            ) : (
              <UnifiedQuoteList
                quotes={quotes}
                viewMode={viewMode}
                layout="compact"
                height={maxHeight}
                enableSearch={true}
                enableFilters={true}
                enableSorting={true}
                enableSelection={false}
                enableVirtualScrolling={true}
                onItemAction={handleQuoteAction}
                searchPlaceholder="Search quotes by ID, customer, items, or country..."
                emptyStateMessage="No quotes match your search criteria"
                performanceMode="fast"
                className="border-0 shadow-none"
              />
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            {/* Clear Option */}
            {showClearOption && (
              <Button
                variant="ghost"
                onClick={handleClearSelection}
                disabled={!tempSelectedQuote}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            )}

            {/* Status Text */}
            <div className="flex-1 text-center">
              {hasChanges && (
                <div className="text-sm text-amber-600 flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>You have unsaved changes</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!hasChanges && !tempSelectedQuote}
              >
                {tempSelectedQuote ? 'Select Quote' : 'No Selection'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};