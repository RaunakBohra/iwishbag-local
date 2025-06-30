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
import { StatusBadge } from '@/components/dashboard/StatusBadge';

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
            <Zap className="h-5 w-5 text-blue-500" />
            Auto Quote Details
          </DialogTitle>
          <DialogDescription>
            Review and manage this automatically generated quote
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Email:</span>
                      <span className="text-sm">{quote.email || 'Guest'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Country:</span>
                      <span className="text-sm">{quote.countryCode || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Created:</span>
                      <span className="text-sm">
                        {quote.createdAt ? formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true }) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Product:</span>
                      <span className="text-sm truncate max-w-[200px]" title={quote.productName}>
                        {quote.productName || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Quantity:</span>
                      <span className="text-sm">{quote.quantity || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Weight:</span>
                      <span className="text-sm">{quote.weight ? `${quote.weight} kg` : 'Not specified'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getConfidenceColor(quote.confidence)}`}>
                      {Math.round(quote.confidence * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Confidence Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {quote.processingTime || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Processing Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {quote.dataSources?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Data Sources</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Final Quote
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={quote.status} />
                    <span className={`text-sm font-medium ${getConfidenceColor(quote.confidence)}`}>
                      {Math.round(quote.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(quote.finalTotal || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {quote.createdAt ? formatDate(quote.createdAt) : 'Unknown time'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Route Information</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Origin:</span>
                          <span>{quote.shippingRoute?.originCountry || 'US'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Destination:</span>
                          <span>{quote.shippingRoute?.destinationCountry || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carrier:</span>
                          <span>{quote.shippingCarrier || 'Standard'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Cost Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Base Shipping:</span>
                          <span>{formatCurrency(quote.shippingCost?.base || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Per KG:</span>
                          <span>{formatCurrency(quote.shippingCost?.perKg || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Customs:</span>
                          <span>{formatCurrency(quote.customsCost || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quote Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">Current Status</h4>
                      <p className="text-sm text-muted-foreground">
                        This quote is currently {quote.status}
                      </p>
                    </div>
                    <StatusBadge status={quote.status} />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Available Actions</h4>
                    
                    {quote.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={onApprove}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Quote
                        </Button>
                        <Button 
                          onClick={onReject}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Quote
                        </Button>
                      </div>
                    )}

                    {quote.status === 'approved' && (
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="font-medium text-green-800">Quote Approved</p>
                        <p className="text-sm text-green-600">This quote has been approved and is ready for processing</p>
                      </div>
                    )}

                    {quote.status === 'rejected' && (
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <p className="font-medium text-red-800">Quote Rejected</p>
                        <p className="text-sm text-red-600">This quote has been rejected and cannot be processed</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}; 