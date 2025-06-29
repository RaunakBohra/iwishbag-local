import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, XCircle, Clock, Zap, DollarSign, Package, ExternalLink, Truck, Route } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AutoQuoteCardProps {
  quote: any;
  onViewDetails: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export const AutoQuoteCard: React.FC<AutoQuoteCardProps> = ({
  quote,
  onViewDetails,
  onApprove,
  onReject
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-1">
                  {quote.productName || 'Product Name Not Available'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Quote ID: {quote.id}
                </p>
                {quote.productUrl && (
                  <a 
                    href={quote.productUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Product
                  </a>
                )}
              </div>
              {getStatusBadge(quote.status)}
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Price:</span>
                <span>{formatCurrency(quote.itemPrice || 0)}</span>
                {quote.originalCurrency && quote.originalCurrency !== 'USD' && (
                  <Badge variant="outline" className="text-xs">
                    {quote.originalCurrency}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Weight:</span>
                <span>{quote.weight || 'N/A'} kg</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Confidence:</span>
                <span className={`font-semibold ${getConfidenceColor(quote.confidence || 0)}`}>
                  {Math.round((quote.confidence || 0) * 100)}%
                </span>
              </div>
            </div>

            {/* User and Countries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">User:</span>
                <span className="ml-2 text-muted-foreground">{quote.userEmail || 'Guest'}</span>
              </div>
              <div>
                <span className="font-medium">Purchase:</span>
                <span className="ml-2 text-muted-foreground">{quote.purchaseCountry || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Shipping:</span>
                <span className="ml-2 text-muted-foreground">{quote.userShippingCountry || 'N/A'}</span>
              </div>
            </div>

            {/* Shipping Route Information */}
            {(quote.shipping_method || quote.shipping_carrier) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Method:</span>
                  <Badge variant={quote.shipping_method === 'route-specific' ? 'default' : 'secondary'} className="text-xs">
                    {quote.shipping_method === 'route-specific' ? 'Route-Specific' : 'Country Settings'}
                  </Badge>
                </div>
                
                {quote.shipping_carrier && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Carrier:</span>
                    <span className="text-muted-foreground">{quote.shipping_carrier}</span>
                  </div>
                )}
                
                {quote.shipping_delivery_days && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Delivery:</span>
                    <span className="text-muted-foreground">{quote.shipping_delivery_days}</span>
                  </div>
                )}
              </div>
            )}

            {/* Total and Timestamp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Total:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(quote.finalTotal || 0)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {quote.createdAt ? formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true }) : 'Unknown time'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Details
            </Button>
            
            {quote.status === 'pending' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onApprove}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onReject}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 