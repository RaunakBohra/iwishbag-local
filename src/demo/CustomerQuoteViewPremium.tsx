import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Package,
  Shield,
  Clock,
  CheckCircle2,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Calculator,
  Download,
  MessageCircle,
  Star,
  Zap,
  Lock,
  Heart,
  Share2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Check,
  ExternalLink,
  Copy,
  RefreshCw,
  TrendingUp,
  Truck,
  CreditCard,
  Phone,
  Mail,
  Timer,
  DollarSign,
  Award,
  AlertCircle,
  ArrowUpRight,
  ShoppingBag,
  Percent,
  Calendar,
  MapPin,
  User,
  Building,
  FileText,
  HelpCircle,
  BarChart3,
  ShieldAlert,
  Banknote,
  PackageCheck,
  Landmark,
  CircleDollarSign,
  Receipt,
  WalletCards,
  ShoppingCart,
  Coins,
  PiggyBank,
  TrendingDown,
  CircleCheck,
  Wallet,
  CreditCardIcon,
  DollarSignIcon,
  ReceiptIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Enhanced mock data
const premiumQuote = {
  id: 'Q-2024-001234',
  tracking_id: 'IWB20241234',
  status: 'sent',
  created_at: '2024-01-20T10:30:00Z',
  expires_at: '2024-01-27T10:30:00Z',
  currency: 'USD',
  exchange_rate: 83.25,
  local_currency: 'INR',
  items: [
    {
      id: '1',
      name: 'iPhone 15 Pro Max 256GB',
      subtitle: 'Natural Titanium',
      image: 'https://m.media-amazon.com/images/I/81CgtwSII3L._AC_SX679_.jpg',
      price: 1199.99,
      quantity: 1,
      url: 'https://www.amazon.com/...',
      local_price: 140000,
      savings_amount: 40101,
      savings_percent: 28.6,
      availability: 'In Stock',
      shipping_estimate: '5-7 days',
      seller: 'Amazon.com',
      rating: 4.8,
      reviews: 2341
    },
    {
      id: '2',
      name: 'Apple AirPods Pro',
      subtitle: '2nd Generation with MagSafe Case',
      image: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SX679_.jpg',
      price: 249.00,
      quantity: 2,
      url: 'https://www.amazon.com/...',
      local_price: 28900,
      savings_amount: 7162,
      savings_percent: 24.8,
      availability: 'In Stock',
      shipping_estimate: '5-7 days',
      seller: 'Amazon.com',
      rating: 4.7,
      reviews: 18923
    }
  ],
  pricing: {
    items_total: 1698.98,
    shipping: 89.50,
    customs_duty: 299.85,
    processing_fee: 25.00,
    insurance: 15.00,
    taxes: {
      sales_tax: 169.90,
      import_tax: 254.85,
      vat: 85.96
    },
    total_taxes: 510.71,
    subtotal: 2128.33,
    total: 2639.04,
    total_local: 219620,
    savings: {
      amount: 47263,
      percent: 17.7,
      vs_local_retail: 266883
    }
  },
  shipping: {
    carrier: 'DHL Express',
    service: 'International Priority',
    days_min: 5,
    days_max: 7,
    tracking: true,
    insurance: true,
    signature: true
  },
  trust_features: [
    { icon: ShieldCheck, label: '100% Authentic Guarantee' },
    { icon: RefreshCw, label: '30-Day Easy Returns' },
    { icon: Lock, label: 'Secure Payment' },
    { icon: Award, label: 'Best Price Promise' }
  ]
};

export default function CustomerQuoteViewPremium() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [savedQuote, setSavedQuote] = useState(false);

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil((new Date(premiumQuote.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const expiryUrgent = daysUntilExpiry <= 3;

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(premiumQuote.tracking_id);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Premium Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-slate-600" />
                <span className="text-2xl font-semibold text-slate-900">iwishBag</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                <ChevronRight className="w-4 h-4" />
                <span>Quote Details</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSavedQuote(!savedQuote)}
                className="hidden sm:flex"
              >
                <Heart className={cn("w-4 h-4", savedQuote && "fill-red-500 text-red-500")} />
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quote Header Info */}
          <div className="pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900">Your Quote</h1>
                  <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                    {premiumQuote.tracking_id}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTracking}
                    className="h-6 w-6 p-0"
                  >
                    {copiedTracking ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <p className="text-slate-600">
                  Save <span className="font-semibold text-green-600">₹{premiumQuote.pricing.savings.amount.toLocaleString()}</span> on your international shopping
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                expiryUrgent ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"
              )}>
                <Timer className="w-4 h-4" />
                Expires in {daysUntilExpiry} days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Banner - Shopify Style */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Total Savings</p>
                <p className="text-2xl font-bold">₹{premiumQuote.pricing.savings.amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/90">Compared to local retail</p>
              <p className="text-lg font-semibold">{premiumQuote.pricing.savings.percent}% OFF</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card - Stripe Style */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-700" />
                    <CardTitle className="text-xl">Items in Your Quote</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {premiumQuote.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-0">
                {premiumQuote.items.map((item, index) => (
                  <div key={item.id}>
                    <div className="px-6 pb-4">
                      <div className="flex gap-4">
                        <div className="relative">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          {item.quantity > 1 && (
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center">
                              {item.quantity}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-slate-900">{item.name}</h3>
                              <p className="text-sm text-slate-600">{item.subtitle}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-slate-600">{item.rating}</span>
                                  <span className="text-xs text-slate-400">({item.reviews.toLocaleString()})</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {item.seller}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-slate-900">${item.price}</p>
                              <p className="text-sm text-slate-500">₹{(item.price * premiumQuote.exchange_rate).toFixed(0)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-green-600">
                              <TrendingDown className="w-4 h-4" />
                              <span className="font-medium">Save ₹{item.savings_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span>{item.availability}</span>
                            </div>
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < premiumQuote.items.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Price Breakdown - Stripe Style */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Price Breakdown
                </CardTitle>
                <CardDescription>
                  Transparent pricing with no hidden fees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Items Subtotal */}
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Items Subtotal</span>
                      <span className="font-medium">${premiumQuote.pricing.items_total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ₹{(premiumQuote.pricing.items_total * premiumQuote.exchange_rate).toFixed(0)}
                    </p>
                  </div>

                  <Separator />

                  {/* Shipping & Handling */}
                  <div>
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'shipping' ? null : 'shipping')}
                      className="w-full flex items-center justify-between py-2 hover:bg-slate-50 -mx-2 px-2 rounded"
                    >
                      <span className="text-slate-600">Shipping & Handling</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          ${(premiumQuote.pricing.shipping + premiumQuote.pricing.processing_fee).toFixed(2)}
                        </span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform",
                          expandedSection === 'shipping' && "rotate-180"
                        )} />
                      </div>
                    </button>
                    {expandedSection === 'shipping' && (
                      <div className="mt-2 pl-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">International Shipping</span>
                          <span>${premiumQuote.pricing.shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Processing Fee</span>
                          <span>${premiumQuote.pricing.processing_fee.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Taxes & Duties */}
                  <div>
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'taxes' ? null : 'taxes')}
                      className="w-full flex items-center justify-between py-2 hover:bg-slate-50 -mx-2 px-2 rounded"
                    >
                      <span className="text-slate-600">Taxes & Import Duties</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          ${(premiumQuote.pricing.customs_duty + premiumQuote.pricing.total_taxes).toFixed(2)}
                        </span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform",
                          expandedSection === 'taxes' && "rotate-180"
                        )} />
                      </div>
                    </button>
                    {expandedSection === 'taxes' && (
                      <div className="mt-2 pl-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Customs Duty</span>
                          <span>${premiumQuote.pricing.customs_duty.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sales Tax</span>
                          <span>${premiumQuote.pricing.taxes.sales_tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Import Tax</span>
                          <span>${premiumQuote.pricing.taxes.import_tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">VAT</span>
                          <span>${premiumQuote.pricing.taxes.vat.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Insurance */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Shipping Insurance</span>
                      <Info className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="font-medium">${premiumQuote.pricing.insurance.toFixed(2)}</span>
                  </div>

                  <Separator className="my-4" />

                  {/* Total */}
                  <div className="bg-slate-50 -mx-6 px-6 py-4 -mb-6 rounded-b-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Amount</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">
                          ${premiumQuote.pricing.total.toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-600">
                          ≈ ₹{premiumQuote.pricing.total_local.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details - Shopify Style */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{premiumQuote.shipping.carrier}</p>
                        <p className="text-sm text-slate-600">{premiumQuote.shipping.service}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {premiumQuote.shipping.days_min}-{premiumQuote.shipping.days_max} days
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { icon: PackageCheck, label: 'Door-to-Door', included: true },
                      { icon: Shield, label: 'Insured', included: premiumQuote.shipping.insurance },
                      { icon: FileText, label: 'Tracking', included: premiumQuote.shipping.tracking }
                    ].map((feature, index) => (
                      <div key={index} className="text-center">
                        <div className={cn(
                          "w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center",
                          feature.included ? "bg-green-100" : "bg-gray-100"
                        )}>
                          <feature.icon className={cn(
                            "w-6 h-6",
                            feature.included ? "text-green-600" : "text-gray-400"
                          )} />
                        </div>
                        <p className="text-sm font-medium text-slate-700">{feature.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust Features */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {premiumQuote.trust_features.map((feature, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-slate-700" />
                  </div>
                  <p className="text-sm text-slate-600">{feature.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - Stripe Style */}
          <div className="lg:sticky lg:top-6 space-y-6 h-fit">
            {/* Action Card */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-300 text-sm">Total Amount</p>
                    <p className="text-3xl font-bold mt-1">${premiumQuote.pricing.total.toFixed(2)}</p>
                    <p className="text-sm text-slate-300 mt-1">
                      You save ${premiumQuote.pricing.savings.amount} ({premiumQuote.pricing.savings.percent}%)
                    </p>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-white text-slate-900 hover:bg-slate-100" 
                      size="lg"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Proceed to Checkout
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-slate-600 text-white hover:bg-slate-700"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Ask a Question
                    </Button>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <Lock className="w-3 h-3" />
                      <span>Secure checkout powered by Stripe</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-slate-700 text-white text-xs">
                        <WalletCards className="w-3 h-3 mr-1" />
                        Visa
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-700 text-white text-xs">
                        <CreditCardIcon className="w-3 h-3 mr-1" />
                        Mastercard
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-700 text-white text-xs">
                        <Wallet className="w-3 h-3 mr-1" />
                        PayPal
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>

            {/* Reviews Summary */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">4.8 out of 5</span>
                </div>
                <p className="text-xs text-slate-600">Based on 2,341 reviews</p>
                <div className="mt-3 space-y-1">
                  {[
                    { stars: 5, percent: 78 },
                    { stars: 4, percent: 15 },
                    { stars: 3, percent: 4 },
                    { stars: 2, percent: 2 },
                    { stars: 1, percent: 1 }
                  ].map((rating) => (
                    <div key={rating.stars} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-3">{rating.stars}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400" 
                          style={{ width: `${rating.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 w-8">{rating.percent}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section - Clean Design */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "What happens after I checkout?",
                a: "We'll immediately place your order with the merchant and send you a confirmation email with tracking details."
              },
              {
                q: "How long does shipping take?",
                a: "International shipping typically takes 5-7 business days. You'll receive tracking information to monitor your package."
              },
              {
                q: "Are there any hidden fees?",
                a: "No! The price shown includes everything - product cost, shipping, customs, taxes, and our service fee."
              },
              {
                q: "What if I need to return an item?",
                a: "We offer a 30-day return policy. Contact our support team and we'll guide you through the return process."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar - iOS Style */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-xl font-bold">${premiumQuote.pricing.total.toFixed(2)}</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Save ${premiumQuote.pricing.savings.amount}
          </Badge>
        </div>
        <Button className="w-full" size="lg">
          <CreditCard className="w-5 h-5 mr-2" />
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}