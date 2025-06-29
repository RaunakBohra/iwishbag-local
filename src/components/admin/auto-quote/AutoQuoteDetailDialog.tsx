import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  DollarSign, 
  Package, 
  Globe, 
  User,
  Settings,
  BarChart3,
  ExternalLink,
  Truck,
  Route
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AutoQuoteDetailDialogProps {
  quote: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

export const AutoQuoteDetailDialog: React.FC<AutoQuoteDetailDialogProps> = ({
  quote,
  open,
  onOpenChange,
  onApprove,
  onReject
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Auto Quote Details
            {getStatusBadge(quote.status)}
          </DialogTitle>
          <DialogDescription>
            Quote ID: {quote.id} • Created {quote.createdAt ? formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true }) : 'Unknown time'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Price Breakdown</TabsTrigger>
            <TabsTrigger value="rules">Applied Rules</TabsTrigger>
            <TabsTrigger value="scraped">Scraped Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                    <p className="text-lg font-semibold">{quote.productName || 'N/A'}</p>
                    {quote.productUrl && (
                      <a 
                        href={quote.productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Product
                      </a>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Original Price</label>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">
                        {quote.scrapedData?.originalPrice ? 
                          `${quote.scrapedData.originalPrice} ${quote.originalCurrency || 'USD'}` : 
                          formatCurrency(quote.itemPrice || 0)
                        }
                      </p>
                      {quote.originalCurrency && quote.originalCurrency !== 'USD' && (
                        <Badge variant="outline" className="text-xs">
                          Converted to USD: {formatCurrency(quote.itemPrice || 0)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Weight</label>
                    <p className="text-lg font-semibold">{quote.scrapedData?.originalWeight || quote.weight || 'N/A'} kg</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-lg font-semibold">{quote.scrapedData?.category || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Confidence Score</label>
                    <p className={`text-lg font-semibold ${getConfidenceColor(quote.confidence || 0)}`}>
                      {Math.round((quote.confidence || 0) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User and Countries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User & Countries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User Email</label>
                    <p className="text-lg font-semibold">{quote.userEmail || 'Guest User'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Purchase Country</label>
                    <p className="text-lg font-semibold">{quote.purchaseCountry || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Where product is purchased from</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Shipping Country</label>
                    <p className="text-lg font-semibold">{quote.userShippingCountry || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Where product will be shipped to</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Final Total */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Final Quote
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(quote.finalTotal || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            {/* Shipping Route Information */}
            {(quote.shipping_method || quote.shipping_carrier) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Shipping Route Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Shipping Method</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={quote.shipping_method === 'route-specific' ? 'default' : 'secondary'}>
                          {quote.shipping_method === 'route-specific' ? 'Route-Specific' : 'Country Settings'}
                        </Badge>
                      </div>
                    </div>
                    
                    {quote.shipping_carrier && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Carrier</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{quote.shipping_carrier}</span>
                        </div>
                      </div>
                    )}
                    
                    {quote.shipping_delivery_days && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Delivery Time</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{quote.shipping_delivery_days}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {quote.shipping_route_id && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <label className="text-sm font-medium text-muted-foreground">Route ID</label>
                      <p className="text-sm font-mono">{quote.shipping_route_id}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Price Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Product Price</span>
                    <span>{formatCurrency(quote.itemPrice || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>International Shipping</span>
                    <span>{formatCurrency(quote.internationalShipping || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customs & Duties</span>
                    <span>{formatCurrency(quote.customsAndECS || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handling Charge</span>
                    <span>{formatCurrency(quote.handlingCharge || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance</span>
                    <span>{formatCurrency(quote.insuranceAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Gateway Fee</span>
                    <span>{formatCurrency(quote.paymentGatewayFee || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>{formatCurrency(quote.vat || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(quote.finalTotal || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Applied Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quote.appliedRules ? (
                  <div className="space-y-4">
                    {Object.entries(quote.appliedRules).map(([ruleType, ruleData]: [string, any]) => (
                      <div key={ruleType} className="border rounded-lg p-4">
                        <h4 className="font-semibold capitalize mb-2">{ruleType} Rules</h4>
                        <pre className="text-sm bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(ruleData, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No rules data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scraped" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Scraped Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quote.scrapedData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Original URL</label>
                        <p className="text-sm break-all">{quote.scrapedData.url || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Website</label>
                        <p className="text-sm">{quote.scrapedData.website || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Raw Scraped Data</label>
                      <pre className="text-sm bg-muted p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(quote.scrapedData, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No scraped data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {quote.status === 'pending' && (
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject Quote
            </Button>
            <Button
              onClick={onApprove}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Quote
            </Button>
          </div>
        )}

        {quote.status !== 'pending' && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 