import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package,
  ShoppingCart,
  CreditCard,
  Truck,
  Shield,
  Clock,
  CheckCircle2,
  Info,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Globe,
  Calculator,
  FileText,
  Download,
  MessageCircle,
  HelpCircle,
  Star,
  TrendingDown,
  Zap,
  Lock,
  Eye,
  Heart,
  Share2,
  Phone,
  Mail,
  Building,
  User,
  Timer,
  ShieldCheck,
  BadgeCheck,
  Sparkles,
  ArrowRight,
  Check,
  X,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock quote data from customer perspective
const customerQuote = {
  id: 'Q-2024-001234',
  tracking_id: 'IWB20241234',
  status: 'sent', // sent, approved, rejected, expired
  created_at: '2024-01-20T10:30:00Z',
  expires_at: '2024-01-27T10:30:00Z',
  currency: 'USD',
  items: [
    {
      id: '1',
      name: 'iPhone 15 Pro Max 256GB - Natural Titanium',
      image: 'https://m.media-amazon.com/images/I/81CgtwSII3L._AC_SX679_.jpg',
      price: 1199.99,
      quantity: 1,
      url: 'https://www.amazon.com/...',
      savings: 200.00, // Compared to local price
      availability: 'In Stock',
      original_price: 1399.99 // For showing discount
    },
    {
      id: '2',
      name: 'Apple AirPods Pro (2nd Generation)',
      image: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SX679_.jpg',
      price: 249.00,
      quantity: 2,
      url: 'https://www.amazon.com/...',
      savings: 50.00,
      availability: 'In Stock',
      original_price: 299.00
    }
  ],
  shipping: {
    method: 'DHL Express',
    days: '5-7 business days',
    tracking: true,
    insurance: true,
    cost: 89.50
  },
  pricing: {
    subtotal: 1698.98,
    total_savings: 300.00,
    customs_duty: 299.85,
    taxes: 510.71, // Combined all taxes for simplicity
    shipping: 89.50,
    handling: 25.00,
    insurance: 15.00,
    total: 2639.04,
    local_comparison: 3200.00 // What it would cost locally
  },
  benefits: [
    { icon: Shield, title: 'Buyer Protection', description: 'Full refund if item not as described' },
    { icon: Truck, title: 'Fast Shipping', description: '5-7 days door-to-door delivery' },
    { icon: BadgeCheck, title: 'Authentic Products', description: '100% genuine, brand new items' },
    { icon: TrendingDown, title: 'Best Price', description: 'Save $561 compared to local stores' }
  ],
  timeline: [
    { status: 'completed', label: 'Quote Requested', date: '2024-01-20' },
    { status: 'completed', label: 'Quote Prepared', date: '2024-01-20' },
    { status: 'current', label: 'Review & Approve', date: 'Now' },
    { status: 'upcoming', label: 'Payment', date: 'After approval' },
    { status: 'upcoming', label: 'Order & Ship', date: '2-3 days after payment' },
    { status: 'upcoming', label: 'Delivery', date: '5-7 days after shipping' }
  ]
};

export default function CustomerQuoteViewRedesign() {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [savedToWishlist, setSavedToWishlist] = useState(false);

  // Calculate expiry
  const daysUntilExpiry = Math.ceil((new Date(customerQuote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const expiryPercentage = ((7 - daysUntilExpiry) / 7) * 100;

  // Mobile-first responsive design with desktop enhancements
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Quote</h1>
                <Badge variant="secondary" className="font-mono text-sm">
                  {customerQuote.tracking_id}
                </Badge>
              </div>
              <p className="text-gray-600">
                Review your personalized quote for international shopping
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSavedToWishlist(!savedToWishlist)}>
                <Heart className={cn("w-4 h-4 mr-2", savedToWishlist && "fill-red-500 text-red-500")} />
                {savedToWishlist ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Warning */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <Alert className="bg-orange-50 border-orange-200">
          <Timer className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Quote expires in {daysUntilExpiry} days</AlertTitle>
          <AlertDescription className="text-orange-700">
            This quote is valid until {new Date(customerQuote.expires_at).toLocaleDateString()}. 
            Prices and availability may change after expiry.
          </AlertDescription>
          <Progress value={expiryPercentage} className="mt-2 h-2 bg-orange-100" />
        </Alert>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Savings Highlight */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800">Total Savings</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">
                      ${customerQuote.pricing.local_comparison - customerQuote.pricing.total}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Compared to local retail price of ${customerQuote.pricing.local_comparison}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-600 text-white">
                      {Math.round(((customerQuote.pricing.local_comparison - customerQuote.pricing.total) / customerQuote.pricing.local_comparison) * 100)}% OFF
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Your Items
                </CardTitle>
                <CardDescription>
                  {customerQuote.items.reduce((sum, item) => sum + item.quantity, 0)} items from international stores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerQuote.items.map((item) => (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex gap-4">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {item.availability}
                            </Badge>
                            <span className="text-gray-500">Qty: {item.quantity}</span>
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              View Product <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">${item.price}</span>
                              {item.original_price > item.price && (
                                <>
                                  <span className="text-sm line-through text-gray-400">
                                    ${item.original_price}
                                  </span>
                                  <Badge variant="destructive" className="text-xs">
                                    Save ${item.savings}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {item.quantity > 1 && (
                        <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                          Subtotal: ${(item.price * item.quantity).toFixed(2)} ({item.quantity} × ${item.price})
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Price Breakdown
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                  >
                    {showDetailedBreakdown ? (
                      <>Hide Details <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>Show Details <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Always visible items */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Products Total</span>
                    <span className="font-medium">${customerQuote.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {showDetailedBreakdown && (
                    <>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">International Shipping</span>
                          <span>${customerQuote.pricing.shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customs & Import Duties</span>
                          <span>${customerQuote.pricing.customs_duty.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxes & Fees</span>
                          <span>${customerQuote.pricing.taxes.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Handling</span>
                          <span>${customerQuote.pricing.handling.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Insurance</span>
                          <span>${customerQuote.pricing.insurance.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${customerQuote.pricing.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        All fees included
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trust Badge */}
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Price Guarantee:</strong> This is your final price. No hidden fees or surprises at delivery.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{customerQuote.shipping.method}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Estimated delivery: {customerQuote.shipping.days}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Tracking Available
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Insured Shipping
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        Door-to-Door
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-6">
                  <h4 className="font-medium text-sm text-gray-900 mb-4">Delivery Timeline</h4>
                  <div className="relative">
                    {customerQuote.timeline.map((step, index) => (
                      <div key={index} className="flex items-start gap-4 relative">
                        {index < customerQuote.timeline.length - 1 && (
                          <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-200" />
                        )}
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                          step.status === 'completed' ? "bg-green-100" :
                          step.status === 'current' ? "bg-blue-100" : "bg-gray-100"
                        )}>
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : step.status === 'current' ? (
                            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
                          ) : (
                            <div className="w-3 h-3 bg-gray-400 rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <p className={cn(
                            "font-medium",
                            step.status === 'completed' ? "text-gray-900" :
                            step.status === 'current' ? "text-blue-600" : "text-gray-400"
                          )}>
                            {step.label}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{step.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Why Shop with iwishBag?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {customerQuote.benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{benefit.title}</h4>
                        <p className="text-sm text-gray-600">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Sticky on Desktop */}
          <div className="lg:sticky lg:top-6 space-y-6 h-fit">
            {/* Action Card */}
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-lg">Ready to Order?</CardTitle>
                <CardDescription>
                  Secure your items at these prices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="text-2xl font-bold">${customerQuote.pricing.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">You Save</span>
                    <span className="text-green-600 font-medium">
                      ${(customerQuote.pricing.local_comparison - customerQuote.pricing.total).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Approve Quote
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ask a Question
                  </Button>
                </div>

                <div className="text-center text-xs text-gray-500">
                  By approving, you agree to our{' '}
                  <a href="#" className="text-blue-600 hover:underline">terms</a>
                  {' '}and{' '}
                  <a href="#" className="text-blue-600 hover:underline">privacy policy</a>
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Secure Checkout</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Buyer Protection</span>
                </div>
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Easy Returns</span>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">4.8/5 (2,341 reviews)</span>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-3">Need Help?</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Phone className="w-4 h-4 mr-2" />
                    +1 (555) 123-4567
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    support@iwishbag.com
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Live Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQs Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  q: "What happens after I approve the quote?",
                  a: "You'll be redirected to our secure checkout to complete payment. Once paid, we'll place the order with the merchant and start tracking your shipment."
                },
                {
                  q: "Are there any hidden fees?",
                  a: "No! The price shown includes all costs - product price, international shipping, customs duties, taxes, and our service fee. You won't pay anything extra."
                },
                {
                  q: "How long will delivery take?",
                  a: "Typically 5-7 business days after we place the order. You'll receive tracking information to monitor your package every step of the way."
                },
                {
                  q: "What if I need to return an item?",
                  a: "We offer a 30-day return policy. If the item doesn't meet your expectations, we'll help arrange the return and refund."
                }
              ].map((faq, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{faq.q}</h4>
                  <p className="text-sm text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-xl font-bold">${customerQuote.pricing.total.toFixed(2)}</span>
        </div>
        <Button className="w-full" size="lg">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Approve Quote
        </Button>
      </div>
    </div>
  );
}