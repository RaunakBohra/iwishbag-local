import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreHorizontal,
  Package,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Clock,
  ShoppingCart,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useQuoteTheme } from '@/contexts/QuoteThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UnifiedQuoteCardProps {
  quote: UnifiedQuote;
  viewMode: 'admin' | 'customer' | 'guest';
  layout: 'grid' | 'list' | 'compact';
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onAction?: (action: string, quote: UnifiedQuote) => void;
}

const statusIcons = {
  draft: Info,
  sent: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
  expired: Clock,
  paid: DollarSign,
  ordered: Package,
  shipped: Package,
  completed: CheckCircle,
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  sent: 'bg-blue-100 text-blue-700 border-blue-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  expired: 'bg-orange-100 text-orange-700 border-orange-300',
  paid: 'bg-purple-100 text-purple-700 border-purple-300',
  ordered: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  shipped: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

export const UnifiedQuoteCard = memo(({
  quote,
  viewMode,
  layout,
  isSelected = false,
  onSelect,
  onAction,
}: UnifiedQuoteCardProps) => {
  const { themeColors } = useQuoteTheme();
  const StatusIcon = statusIcons[quote.status] || Info;

  const handleAction = (action: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onAction?.(action, quote);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(quote.id, !isSelected);
  };

  const customerName = quote.customer_data?.name || 'Unknown Customer';
  const displayId = quote.display_id || `#${quote.id.slice(0, 8)}`;
  const itemCount = quote.items?.length || 0;
  const totalAmount = quote.total_usd || 0;

  if (layout === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors',
          isSelected && 'bg-blue-50 border-blue-300'
        )}
      >
        {viewMode === 'admin' && onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(quote.id, !isSelected)}
            onClick={handleSelect}
          />
        )}
        <div className="flex-1 flex items-center gap-4">
          <div className="font-medium">{displayId}</div>
          <Badge variant="outline" className={cn('text-xs', statusColors[quote.status])}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {quote.status}
          </Badge>
          <div className="text-sm text-gray-600">{customerName}</div>
          <div className="text-sm text-gray-600">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </div>
          <div className="font-medium">${totalAmount.toFixed(2)}</div>
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
          </div>
        </div>
        {onAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleAction('view', e)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {viewMode === 'admin' && (
                <>
                  <DropdownMenuItem onClick={(e) => handleAction('edit', e)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => handleAction('delete', e)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-lg cursor-pointer',
        isSelected && 'ring-2 ring-blue-500',
        layout === 'grid' ? 'h-full' : ''
      )}
      onClick={() => onAction?.('view', quote)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {viewMode === 'admin' && onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(quote.id, !isSelected)}
                onClick={handleSelect}
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{displayId}</h3>
                <Badge variant="outline" className={cn('text-xs', statusColors[quote.status])}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {quote.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {customerName}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
          {onAction && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleAction('view', e)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {viewMode === 'admin' && (
                  <>
                    <DropdownMenuItem onClick={(e) => handleAction('edit', e)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleAction('duplicate', e)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => handleAction('delete', e)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                {viewMode === 'customer' && quote.status === 'approved' && (
                  <DropdownMenuItem onClick={(e) => handleAction('add-to-cart', e)}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Items Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="h-4 w-4" />
              <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-600" />
              <span className="text-lg font-semibold">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Info */}
          {quote.destination_country && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>Shipping to {quote.destination_country}</span>
            </div>
          )}

          {/* Priority Badge */}
          {quote.priority && quote.priority !== 'medium' && (
            <Badge
              variant={quote.priority === 'high' || quote.priority === 'urgent' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {quote.priority.charAt(0).toUpperCase() + quote.priority.slice(1)} Priority
            </Badge>
          )}

          {/* Notes Preview */}
          {quote.notes && (
            <p className="text-sm text-gray-600 line-clamp-2">{quote.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

UnifiedQuoteCard.displayName = 'UnifiedQuoteCard';