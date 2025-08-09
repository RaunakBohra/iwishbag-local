import React, { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { 
  Package, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Share2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { QuoteExportButton } from '@/components/quotes-v2/QuoteExportControls';
import { AvailableDiscounts } from '@/components/quotes-v2/AvailableDiscounts';
import { getDestinationCurrency } from '@/utils/originCurrency';
import { useCurrency } from '@/hooks/unified';

// Currency display component with proper conversion
const CurrencyDisplay = memo<{ amount: number; quote: any; fallback?: string }>(({ amount, quote, fallback }) => {
  const { formatAmountWithConversion, getSourceCurrency } = useCurrency({ quote });
  const [displayAmount, setDisplayAmount] = useState(fallback || '...');

  useEffect(() => {
    const updateAmount = async () => {
      try {
        const sourceCurrency = getSourceCurrency(quote);
        const formatted = await formatAmountWithConversion(amount, sourceCurrency);
        setDisplayAmount(formatted);
      } catch (error) {
        console.error('Currency conversion failed:', error);
        const targetCurrency = quote.customer_currency || getDestinationCurrency(quote.destination_country);
        setDisplayAmount(formatCurrency(amount, targetCurrency));
      }
    };

    updateAmount();
  }, [amount, quote, formatAmountWithConversion, getSourceCurrency]);

  return <span>{displayAmount}</span>;
});

interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  unit_price_origin: number;
  weight: number;
  url?: string;
  image?: string;
}

export default function PublicQuoteView() {
  const { token, shareToken } = useParams<{ token: string; shareToken: string }>();
  const navigate = useNavigate();
  const actualToken = token || shareToken; // Support both route param names
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [actualToken]);

  const fetchQuote = async () => {
    if (!actualToken) {
      setError('No quote token provided');
      setLoading(false);
      return;
    }

    try {
      // Fetch quote using share token from V2 table
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('share_token', actualToken)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Quote not found or invalid share link');
        } else {
          setError('Failed to load quote');
        }
        setLoading(false);
        return;
      }

      if (!quote) {
        setError('Quote not found');
        setLoading(false);
        return;
      }

      // Check if quote is expired
      if (quote.expires_at) {
        const now = new Date();
        const expiry = new Date(quote.expires_at);
        setIsExpired(now > expiry);
      }

      // Track that the quote was viewed
      if (!quote.viewed_at) {
        await supabase
          .from('quotes_v2')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', quote.id);
      }

      setQuote(quote);
    } catch (error) {
      console.error('Error fetching quote:', error);
      setError('Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      sent: { label: 'Sent', variant: 'default' as const },
      viewed: { label: 'Viewed', variant: 'default' as const },
      approved: { label: 'Approved', variant: 'success' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const },
      expired: { label: 'Expired', variant: 'destructive' as const },
    };

    const config = statusConfig[status] || { label: status, variant: 'default' as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleApprove = () => {
    // Navigate to checkout or contact page
    navigate(`/contact?quote=${quote.id}`);
  };

  const handleReject = () => {
    // Could implement a rejection flow here
    navigate('/contact');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = quote.items || [];
  const breakdown = quote.calculation_data?.breakdown || {};
  const expiryDate = quote.expires_at ? new Date(quote.expires_at) : null;
  const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Expiry Warning Banner */}
        {!isExpired && expiryDate && (() => {
          const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 3) {
            return (
              <Card className={`mb-4 border-l-4 ${daysLeft <= 1 ? 'border-l-red-500 bg-red-50' : 'border-l-orange-500 bg-orange-50'}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${daysLeft <= 1 ? 'text-red-600' : 'text-orange-600'}`} />
                    <div>
                      <p className="font-medium text-sm">
                        {daysLeft <= 1 ? '⚠️ This quote expires today!' : `⏰ This quote expires in ${daysLeft} days`}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Please approve soon to secure these prices. Contact us for an extension.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* Expired Banner */}
        {isExpired && (
          <Card className="mb-4 border-l-4 border-l-red-500 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-sm text-red-900">This quote has expired</p>
                  <p className="text-xs text-red-700 mt-1">
                    Please contact us to request a new quote with current pricing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Your Quote</h1>
          <p className="text-muted-foreground">
            Quote #{quote.quote_number || quote.id.slice(0, 8)}
          </p>
        </div>

        {/* Expiry Warning */}
        {isExpired && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">This quote has expired</p>
                  <p className="text-sm text-muted-foreground">
                    Please contact us for an updated quote
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(isExpired ? 'expired' : quote.status)}
                  {quote.version > 1 && (
                    <Badge variant="outline">Version {quote.version}</Badge>
                  )}
                  {expiryDate && !isExpired && (() => {
                    const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 3) {
                      return (
                        <Badge variant={daysLeft <= 1 ? 'destructive' : 'secondary'}>
                          <Clock className="mr-1 h-3 w-3" />
                          {daysLeft <= 1 ? 'Expires today' : `${daysLeft} days left`}
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              {!isExpired && daysUntilExpiry !== null && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valid for</p>
                  <p className="font-semibold">
                    {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expires today'}
                  </p>
                </div>
              )}
            </div>

            {quote.customer_message && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm">{quote.customer_message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item: QuoteItem, index: number) => (
                <div key={item.id || index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Qty: {item.quantity}</span>
                      <span>Weight: {item.weight}kg</span>
                      <span>Price: {formatCurrency(item.unit_price_origin || item.costprice_origin, quote.customer_currency || getDestinationCurrency(quote.destination_country))}</span>
                    </div>
                    {item.customer_notes && (
                      <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-blue-800">Your note:</span>
                          <p className="text-blue-700 mt-1">{item.customer_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Total</span>
                <span>{formatCurrency(breakdown.items_total || 0, quote.customer_currency || getDestinationCurrency(quote.destination_country))}</span>
              </div>
              {breakdown.shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(breakdown.shipping, quote.customer_currency || getDestinationCurrency(quote.destination_country))}</span>
                </div>
              )}
              {breakdown.customs > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customs & Duties</span>
                  <span>{formatCurrency(breakdown.customs, quote.customer_currency || getDestinationCurrency(quote.destination_country))}</span>
                </div>
              )}
              {breakdown.fees > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fees</span>
                  <span>{formatCurrency(breakdown.fees, quote.customer_currency || getDestinationCurrency(quote.destination_country))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span><CurrencyDisplay amount={quote.total_quote_origincurrency} quote={quote} /></span>
              </div>
            </div>

            {quote.payment_terms && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Payment Terms</p>
                <p className="text-sm text-muted-foreground">{quote.payment_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Discounts */}
        {!isExpired && quote.status === 'draft' && (
          <AvailableDiscounts 
            countryCode={quote.destination_country}
            customerEmail={quote.customer_email}
            className="mb-6"
          />
        )}

        {/* Export Actions - Always Available */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Download Quote</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <QuoteExportButton
                quote={{
                  id: quote.id,
                  customer_name: quote.customer_name,
                  customer_email: quote.customer_email,
                  customer_phone: quote.customer_phone,
                  status: isExpired ? 'expired' : quote.status,
                  items: quote.items || [],
                  total_quote_origincurrency: quote.total_quote_origincurrency,
                  customer_currency: quote.customer_currency,
                  origin_country: quote.origin_country,
                  destination_country: quote.destination_country,
                  created_at: quote.created_at,
                  expires_at: quote.expires_at,
                  notes: quote.notes,
                  calculation_data: quote.calculation_data,
                  share_token: actualToken,
                }}
                type="pdf"
                variant="outline"
                size="default"
              />
              <QuoteExportButton
                quote={{
                  id: quote.id,
                  customer_name: quote.customer_name,
                  customer_email: quote.customer_email,
                  customer_phone: quote.customer_phone,
                  status: isExpired ? 'expired' : quote.status,
                  items: quote.items || [],
                  total_quote_origincurrency: quote.total_quote_origincurrency,
                  customer_currency: quote.customer_currency,
                  origin_country: quote.origin_country,
                  destination_country: quote.destination_country,
                  created_at: quote.created_at,
                  expires_at: quote.expires_at,
                  notes: quote.notes,
                  calculation_data: quote.calculation_data,
                  share_token: actualToken,
                }}
                type="excel"
                variant="outline"
                size="default"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {!isExpired && quote.status !== 'approved' && quote.status !== 'rejected' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleApprove}
                  className="flex-1"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Quote
                </Button>
                <Button 
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Request Changes
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                By approving, you agree to proceed with this order
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Quote generated on {format(new Date(quote.created_at), 'MMMM d, yyyy')}</p>
          <p className="mt-2">
            Need help? <a href="/contact" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}