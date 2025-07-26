import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Truck,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  MapPin,
  Package,
  ShieldCheck,
  ArrowRight,
  Info,
  Heart,
  Share2,
  Minus,
  Plus,
  Calendar,
  CreditCard,
  RotateCcw,
  MessageCircle,
  ThumbsUp,
  Zap,
  Award,
  ShoppingCart,
  Timer,
  DollarSign,
  Percent,
  TrendingDown,
  Check,
  X,
  HelpCircle,
  Phone,
  Mail,
  Building2,
  Sparkles,
  BadgeCheck,
  CircleCheck,
  ShieldAlert,
  PackageCheck,
  TruckIcon,
  Banknote,
  Receipt,
  Calculator,
  FileText,
  CircleDollarSign,
  Wallet,
  PiggyBank,
  Coins,
  CreditCardIcon,
  IndianRupee,
  DollarSignIcon,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data structured like Amazon
const amazonStyleQuote = {
  id: 'Q-2024-001234',
  tracking_id: 'IWB20241234',
  status: 'sent',
  created_at: '2024-01-20T10:30:00Z',
  expires_at: '2024-01-27T10:30:00Z',
  currency: 'USD',
  exchange_rate: 83.25,
  items: [
    {
      id: '1',
      name: 'Apple iPhone 15 Pro Max (256GB) - Natural Titanium',
      brand: 'Apple',
      model: 'A17 Pro Bionic chip',
      image_main: 'https://m.media-amazon.com/images/I/81CgtwSII3L._AC_SX679_.jpg',
      images: [
        'https://m.media-amazon.com/images/I/81CgtwSII3L._AC_SX679_.jpg',
        'https://m.media-amazon.com/images/I/71ZDY57yTQL._AC_SX679_.jpg',
        'https://m.media-amazon.com/images/I/71HNmtrhOWL._AC_SX679_.jpg',
        'https://m.media-amazon.com/images/I/81fO2C9cYjL._AC_SX679_.jpg'
      ],
      price_usd: 1199.99,
      price_local: 140000,
      quantity: 1,
      url: 'https://www.amazon.com/Apple-iPhone-15-Pro-Max/dp/B0CS5X8VBF',
      in_stock: true,
      prime_eligible: true,
      rating: 4.8,
      reviews_count: 2341,
      seller: 'Amazon.com',
      ships_from: 'United States',
      sold_by: 'Amazon.com Services LLC',
      features: [
        '6.7-inch Super Retina XDR display',
        '48MP Main camera for super-high-resolution photos',
        'A17 Pro chip with 6-core GPU',
        'Up to 29 hours video playback',
        'USB-C connector with USB 3 speeds'
      ],
      specifications: {
        'Brand': 'Apple',
        'Model': 'iPhone 15 Pro Max',
        'Storage': '256GB',
        'Color': 'Natural Titanium',
        'Display': '6.7 inches',
        'Processor': 'A17 Pro Bionic',
        'Camera': '48MP + 12MP + 12MP',
        'Battery': 'Up to 29 hours video',
        'OS': 'iOS 17'
      }
    }
  ],
  pricing_breakdown: {
    subtotal: 1199.99,
    shipping: 89.50,
    customs_duty: 179.99,
    processing_fee: 25.00,
    insurance: 15.00,
    taxes: 299.99,
    total: 1809.47,
    savings: {
      vs_local: 330.53,
      percent: 15.4
    }
  },
  shipping_options: [
    {
      id: 'express',
      name: 'Express International',
      carrier: 'DHL Express',
      days: '5-7 business days',
      cost: 89.50,
      features: ['Tracking', 'Insurance', 'Signature Required'],
      selected: true
    },
    {
      id: 'standard',
      name: 'Standard International',
      carrier: 'FedEx',
      days: '10-14 business days',
      cost: 45.00,
      features: ['Tracking', 'Basic Insurance']
    }
  ],
  delivery_info: {
    destination: 'Mumbai, India',
    estimated_arrival: '2024-01-27 - 2024-01-30',
    customs_clearance: '1-2 days included'
  }
};

export default function CustomerQuoteAmazonStyle() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState('express');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const item = amazonStyleQuote.items[0]; // For demo, using first item
  const selectedShippingOption = amazonStyleQuote.shipping_options.find(opt => opt.id === selectedShipping);

  return (
    <div className="min-h-screen bg-white">
      {/* Amazon-style Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">iwishBag</h1>
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <a href="#" className="hover:text-orange-400">International Shopping</a>
                <a href="#" className="hover:text-orange-400">How it Works</a>
                <a href="#" className="hover:text-orange-400">Track Quote</a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white hover:text-orange-400">
                <Globe className="w-4 h-4 mr-2" />
                EN
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:text-orange-400">
                <ShoppingCart className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <a href="#" className="hover:text-orange-600">Home</a>
          <ChevronRight className="w-4 h-4" />
          <a href="#" className="hover:text-orange-600">Quotes</a>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{amazonStyleQuote.tracking_id}</span>
        </div>
      </div>

      {/* Main Content - Amazon Layout */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-5">
            <div className="sticky top-4">
              {/* Thumbnail Gallery */}
              <div className="flex gap-2 mb-4">
                <div className="space-y-2">
                  {item.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={cn(
                        "block w-16 h-16 border-2 rounded overflow-hidden hover:border-orange-500 transition-colors",
                        selectedImage === idx ? "border-orange-500" : "border-gray-300"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {/* Main Image */}
                <div className="flex-1">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={item.images[selectedImage]} 
                      alt={item.name}
                      className="w-full h-auto"
                    />
                    <Badge className="absolute top-4 left-4 bg-red-600 text-white">
                      Save ${amazonStyleQuote.pricing_breakdown.savings.vs_local}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="text-center p-3 border rounded-lg">
                  <TruckIcon className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                  <p className="text-xs font-medium">Fast Delivery</p>
                  <p className="text-xs text-gray-600">5-7 days</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-green-600" />
                  <p className="text-xs font-medium">Authentic</p>
                  <p className="text-xs text-gray-600">100% Genuine</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <RotateCcw className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs font-medium">Returns</p>
                  <p className="text-xs text-gray-600">30 Days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Product Details */}
          <div className="lg:col-span-4">
            <div className="mb-4">
              <h1 className="text-2xl font-medium text-gray-900 mb-2">{item.name}</h1>
              <div className="flex items-center gap-3 mb-2">
                <a href="#" className="text-sm text-blue-600 hover:text-orange-600">{item.brand}</a>
                <span className="text-gray-400">|</span>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn(
                        "w-4 h-4",
                        i < Math.floor(item.rating) ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200"
                      )} />
                    ))}
                  </div>
                  <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                    {item.reviews_count.toLocaleString()} ratings
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                <Zap className="w-3 h-3 mr-1" />
                Amazon's Choice
              </Badge>
            </div>

            <Separator className="my-4" />

            {/* Price Section */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-medium text-gray-900">
                  ${amazonStyleQuote.pricing_breakdown.total.toFixed(2)}
                </span>
                <span className="text-sm text-gray-600">
                  (₹{(amazonStyleQuote.pricing_breakdown.total * amazonStyleQuote.exchange_rate).toFixed(0)})
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {amazonStyleQuote.pricing_breakdown.savings.percent}% Off
                </Badge>
                <span className="text-gray-600">
                  Save ${amazonStyleQuote.pricing_breakdown.savings.vs_local}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">All import fees & taxes included</p>
            </div>

            <Separator className="my-4" />

            {/* Key Features */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">About this item</h3>
              <ul className="space-y-2">
                {item.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                See more product details
              </Button>
            </div>

            {/* Specifications Table */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Technical Details</h3>
              <div className="space-y-2">
                {Object.entries(item.specifications).slice(0, showAllSpecs ? 10 : 5).map(([key, value]) => (
                  <div key={key} className="flex text-sm">
                    <span className="font-medium w-24 text-gray-600">{key}</span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowAllSpecs(!showAllSpecs)}
                className="p-0 h-auto mt-2"
              >
                {showAllSpecs ? 'Show less' : 'Show more'}
              </Button>
            </div>
          </div>

          {/* Right Column - Buy Box */}
          <div className="lg:col-span-3">
            <Card className="border-gray-300 shadow-sm sticky top-4">
              <CardContent className="p-4 space-y-4">
                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">${amazonStyleQuote.pricing_breakdown.total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Total includes shipping, customs & all fees
                  </p>
                </div>

                <Separator />

                {/* Shipping Options */}
                <div>
                  <p className="text-sm font-medium mb-2">Delivery Options</p>
                  <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping}>
                    {amazonStyleQuote.shipping_options.map((option) => (
                      <div key={option.id} className="flex items-start space-x-2 mb-3">
                        <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{option.name}</p>
                              <p className="text-xs text-gray-600">{option.days}</p>
                            </div>
                            <span className="text-sm font-medium">${option.cost}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Delivery Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">Deliver to {amazonStyleQuote.delivery_info.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-green-700">
                      {amazonStyleQuote.delivery_info.estimated_arrival}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Stock Status */}
                <div className="flex items-center gap-2">
                  <CircleCheck className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">In Stock</span>
                </div>

                {/* Ships From / Sold By */}
                <div className="text-xs space-y-1">
                  <p>Ships from <span className="font-medium">{item.ships_from}</span></p>
                  <p>Sold by <span className="font-medium">{item.sold_by}</span></p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg">
                    Approve Quote
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Shield className="w-4 h-4" />
                    <span>Secure transaction</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <RotateCcw className="w-4 h-4" />
                    <span>Return policy: 30 days</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Award className="w-4 h-4" />
                    <span>iwishBag Purchase Protection</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Actions */}
            <div className="mt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Heart className="w-4 h-4 mr-2" />
                Save for later
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share quote
              </Button>
            </div>
          </div>
        </div>

        {/* Product Information Tabs - Amazon Style */}
        <div className="mt-12 border-t pt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping Info</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">What's Included</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">International Shipping</p>
                        <p className="text-sm text-gray-600">{selectedShippingOption?.carrier} - {selectedShippingOption?.days}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Full Insurance Coverage</p>
                        <p className="text-sm text-gray-600">Protected against damage or loss</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Why Choose iwishBag?</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Authentic Products</p>
                        <p className="text-sm text-gray-600">Direct from US retailers</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CircleDollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Best Prices</p>
                        <p className="text-sm text-gray-600">Save up to 40% vs local stores</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Fast Delivery</p>
                        <p className="text-sm text-gray-600">5-7 days door-to-door</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-6">
              <div className="max-w-2xl">
                <h3 className="text-lg font-medium mb-4">Complete Price Breakdown</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Product Price</span>
                    <span className="font-medium">${amazonStyleQuote.pricing_breakdown.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>International Shipping</span>
                    <span className="font-medium">${amazonStyleQuote.pricing_breakdown.shipping}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Import Duty & Customs</span>
                    <span className="font-medium">${amazonStyleQuote.pricing_breakdown.customs_duty}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxes</span>
                    <span className="font-medium">${amazonStyleQuote.pricing_breakdown.taxes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee</span>
                    <span className="font-medium">${amazonStyleQuote.pricing_breakdown.processing_fee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Insurance</span>
                    <span className="font-medium">${amazonStyleQuote.pricing_breakdown.insurance}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total Amount</span>
                    <span>${amazonStyleQuote.pricing_breakdown.total.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-100 rounded text-sm">
                    <p className="font-medium text-green-800">You Save: ${amazonStyleQuote.pricing_breakdown.savings.vs_local}</p>
                    <p className="text-green-700">Compared to local retail price</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="mt-6">
              <div className="max-w-2xl">
                <h3 className="text-lg font-medium mb-4">Shipping Information</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Express International Shipping</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Your order will be shipped via {selectedShippingOption?.carrier} and delivered in {selectedShippingOption?.days}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {selectedShippingOption?.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Delivery Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Quote Approved</p>
                          <p className="text-sm text-gray-600">Ready for payment</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Order Processing</p>
                          <p className="text-sm text-gray-600">1-2 business days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">In Transit</p>
                          <p className="text-sm text-gray-600">5-7 business days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Delivered</p>
                          <p className="text-sm text-gray-600">To your doorstep</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="support" className="mt-6">
              <div className="max-w-2xl">
                <h3 className="text-lg font-medium mb-4">Customer Support</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <Phone className="w-8 h-8 text-blue-600 mb-3" />
                      <h4 className="font-medium mb-1">Phone Support</h4>
                      <p className="text-sm text-gray-600 mb-3">Mon-Fri 9AM-6PM IST</p>
                      <Button variant="outline" className="w-full">
                        <Phone className="w-4 h-4 mr-2" />
                        +91 1234567890
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <MessageCircle className="w-8 h-8 text-green-600 mb-3" />
                      <h4 className="font-medium mb-1">Live Chat</h4>
                      <p className="text-sm text-gray-600 mb-3">Available 24/7</p>
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Start Chat
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Frequently Asked Questions</h4>
                  <div className="space-y-3">
                    {[
                      "What happens after I approve the quote?",
                      "How long does international shipping take?",
                      "Are there any hidden charges?",
                      "What's your return policy?"
                    ].map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => setExpandedSection(expandedSection === `faq-${idx}` ? null : `faq-${idx}`)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-left">{question}</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform",
                          expandedSection === `faq-${idx}` && "rotate-180"
                        )} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-medium mb-6">Customer Reviews</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-center">
                <p className="text-4xl font-bold mb-2">4.8</p>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn(
                      "w-5 h-5",
                      i < 5 ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200"
                    )} />
                  ))}
                </div>
                <p className="text-sm text-gray-600">2,341 global ratings</p>
              </div>
              <div className="mt-6 space-y-2">
                {[
                  { stars: 5, percent: 78 },
                  { stars: 4, percent: 15 },
                  { stars: 3, percent: 4 },
                  { stars: 2, percent: 2 },
                  { stars: 1, percent: 1 }
                ].map((rating) => (
                  <div key={rating.stars} className="flex items-center gap-2">
                    <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                      {rating.stars} star
                    </span>
                    <div className="flex-1 h-4 bg-gray-200 rounded overflow-hidden">
                      <div 
                        className="h-full bg-orange-400" 
                        style={{ width: `${rating.percent}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-10 text-right">{rating.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="space-y-4">
                {/* Sample Review */}
                <div className="border-b pb-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Priya Sharma</span>
                        <Badge variant="secondary" className="text-xs">Verified Purchase</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-orange-400 text-orange-400" />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">Great experience with international shopping!</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        Received my iPhone in perfect condition. The process was smooth and the delivery was faster than expected. 
                        Saved a lot compared to local prices. Highly recommend iwishBag!
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-xs text-gray-600 hover:text-gray-900">
                          <ThumbsUp className="w-3 h-3 inline mr-1" />
                          Helpful (23)
                        </button>
                        <span className="text-xs text-gray-400">2 weeks ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-xl font-bold">${amazonStyleQuote.pricing_breakdown.total.toFixed(2)}</span>
        </div>
        <Button className="w-full bg-orange-500 hover:bg-orange-600" size="lg">
          Approve Quote
        </Button>
      </div>
    </div>
  );
}