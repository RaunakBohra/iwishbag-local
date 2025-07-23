// ============================================================================
// CUSTOMER TRACKING PAGE - Phase 1 Basic Tracking
// Public page for customers to track orders using iwishBag tracking ID
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ExternalLink,
  Search,
  ArrowLeft,
  MapPin,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { trackingService } from '@/services/TrackingService';
import type { UnifiedQuote } from '@/types/unified-quote';

export const TrackingPage: React.FC = () => {
  const { trackingId } = useParams<{ trackingId: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<UnifiedQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(trackingId || '');

  // Fetch tracking information
  useEffect(() => {
    if (trackingId) {
      fetchTrackingInfo(trackingId);
    } else {
      setLoading(false);
    }
  }, [trackingId]);

  const fetchTrackingInfo = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const trackingInfo = await trackingService.getTrackingInfo(id);

      if (trackingInfo) {
        setQuote(trackingInfo);
      } else {
        setError('Tracking information not found. Please check your tracking ID and try again.');
      }
    } catch (err) {
      console.error('Error fetching tracking info:', err);
      setError('Unable to load tracking information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchId.trim()) {
      navigate(`/track/${searchId.trim()}`);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'preparing':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'exception':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getProgressPercentage = (status: string | null): number => {
    switch (status) {
      case 'pending':
        return 10;
      case 'preparing':
        return 25;
      case 'shipped':
        return 75;
      case 'delivered':
        return 100;
      case 'exception':
        return 50;
      default:
        return 0;
    }
  };

  // Get external carrier tracking link
  const getCarrierTrackingLink = (carrier: string | null, trackingNumber: string | null) => {
    if (!carrier || !trackingNumber) return null;
    const carrierLower = carrier.toLowerCase();
    if (carrierLower.includes('dhl')) {
      return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    }
    if (carrierLower.includes('fedex')) {
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    }
    if (carrierLower.includes('ups')) {
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    }
    return `https://www.google.com/search?q=${carrier} ${trackingNumber} tracking`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to iwishBag</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
                <p className="text-gray-600">Real-time tracking for your iwishBag orders</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search Box */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter your iwishBag tracking ID (e.g., IWB20251001)"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg"
                />
              </div>
              <Button onClick={handleSearch} size="lg">
                <Search className="w-4 h-4 mr-2" />
                Track
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Tracking Not Found</h3>
              <p className="text-red-600">{error}</p>
              <div className="mt-4 text-sm text-red-600">
                <p>Make sure your tracking ID is correct and starts with "IWB"</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tracking Information */}
        {quote && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Tracking Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span>Order Status</span>
                    </div>
                    <Badge
                      variant={trackingService.getStatusBadgeVariant(quote?.tracking_status)}
                      className="text-sm"
                    >
                      {trackingService.getStatusDisplayText(quote?.tracking_status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* iwishBag Tracking ID */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">iwishBag Tracking ID</p>
                        <p className="text-xl font-bold text-blue-800 font-mono">
                          {quote?.iwish_tracking_id}
                        </p>
                      </div>
                      {getStatusIcon(quote?.tracking_status)}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Order Progress</span>
                        <span>{getProgressPercentage(quote?.tracking_status)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${getProgressPercentage(quote?.tracking_status)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Estimated Delivery */}
                    {quote?.estimated_delivery_date && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Estimated Delivery</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(quote?.estimated_delivery_date || '').toLocaleDateString(
                              'en-US',
                              {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Carrier Tracking */}
              {quote?.shipping_carrier && quote?.tracking_number && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Truck className="w-5 h-5 text-green-600" />
                      <span>Carrier Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Shipping Carrier</p>
                          <p className="font-semibold text-gray-900">{quote?.shipping_carrier}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Carrier Tracking Number</p>
                          <p className="font-mono text-gray-900">{quote?.tracking_number}</p>
                        </div>
                      </div>

                      {getCarrierTrackingLink(quote?.shipping_carrier, quote?.tracking_number) && (
                        <Button asChild variant="outline" className="w-full">
                          <a
                            href={
                              getCarrierTrackingLink(
                                quote?.shipping_carrier,
                                quote?.tracking_number,
                              )!
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Track on {quote?.shipping_carrier} Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quote?.items?.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${typeof item.price_usd === 'number' ? item.price_usd : 0}
                          </p>
                          {item.customer_notes && <p className="text-xs text-gray-500">{item.customer_notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${typeof item.price_usd === 'number' && typeof item.quantity === 'number' 
                              ? (item.price_usd * item.quantity).toFixed(2) 
                              : '0.00'}
                          </p>
                          <p className="text-sm text-gray-600">{item.weight_kg}kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              {quote?.customer_data?.info?.name && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <span>Customer Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{quote?.customer_data?.info?.name}</p>
                    </div>
                    {quote?.customer_data?.info?.email && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium flex items-center">
                          <Mail className="w-4 h-4 mr-1 text-gray-500" />
                          {quote?.customer_data?.info?.email}
                        </p>
                      </div>
                    )}
                    {quote?.customer_data?.info?.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium flex items-center">
                          <Phone className="w-4 h-4 mr-1 text-gray-500" />
                          {quote?.customer_data?.info?.phone}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <span>Delivery Address</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm leading-relaxed text-gray-700">
                    {quote?.customer_data?.shipping_address?.line1 && (
                      <>
                        <p>{quote?.customer_data?.shipping_address?.line1}</p>
                        {quote?.customer_data?.shipping_address?.line2 && (
                          <p>{quote?.customer_data?.shipping_address?.line2}</p>
                        )}
                        <p>
                          {quote?.customer_data?.shipping_address?.city}
                          {quote?.customer_data?.shipping_address?.state &&
                            `, ${quote?.customer_data?.shipping_address?.state}`}
                        </p>
                        <p>
                          {quote?.customer_data?.shipping_address?.postal}{' '}
                          {quote?.customer_data?.shipping_address?.country}
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Quote ID</span>
                    <span className="font-mono">#{quote?.display_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Value</span>
                    <span className="font-semibold">${quote?.final_total_usd?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={trackingService.getStatusBadgeVariant(quote?.tracking_status)}>
                      {trackingService.getStatusDisplayText(quote?.tracking_status)}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Created</span>
                    <span>
                      {quote?.created_at
                        ? new Date(quote.created_at).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Help Section */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Need Help?</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    If you have questions about your order or tracking, we're here to help.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Empty State - No tracking ID provided */}
        {!trackingId && !error && !quote && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Track Your iwishBag Order</h2>
            <p className="text-gray-600 mb-6">
              Enter your iwishBag tracking ID above to view real-time tracking information
            </p>
            <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                Your tracking ID starts with <strong>IWB</strong> followed by the year and order
                number.
                <br />
                Example: <code className="bg-gray-200 px-1 rounded">IWB20251001</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
