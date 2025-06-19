import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QuoteForm from "@/components/forms/QuoteForm";
import { 
  Package, 
  Clock, 
  Shield, 
  Globe, 
  Star, 
  ArrowRight, 
  CheckCircle,
  Truck,
  DollarSign,
  Users,
  ShoppingBag,
  Plane,
  Sparkles,
  Zap
} from "lucide-react";

const Quote = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="container py-8 md:py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="space-y-4">
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              <Star className="h-3 w-3 mr-1" />
              Trusted by customers worldwide for international shopping
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Shop from
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"> Any Country</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Get products from US, China, Japan, UK, and more delivered to your doorstep. 
              We handle the international shopping and shipping for you.
            </p>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Global Shopping</h3>
              <p className="text-muted-foreground text-center text-sm">
                Shop from US, China, Japan, UK, and more international stores
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Doorstep Delivery</h3>
              <p className="text-muted-foreground text-center text-sm">
                We handle international shipping and deliver to your address
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Safe & Secure</h3>
              <p className="text-muted-foreground text-center text-sm">
                Protected purchases with secure payment and tracking
              </p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 mt-8 text-muted-foreground">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">No hidden fees</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Free quotes</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Global shipping</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">24/7 support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-16">
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered system automatically analyzes product links and fills in all the details for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-primary/10 bg-primary/5">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Smart Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Just paste a product URL and our AI automatically extracts all the details
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/10 bg-primary/5">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Auto-Fill Forms</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Product name, brand, description, and images are automatically filled in
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/10 bg-primary/5">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Rich Data</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Get ratings, reviews, features, and pricing information automatically
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Sparkles className="h-5 w-5" />
                Try Smart Analysis
              </CardTitle>
              <p className="text-blue-700">
                Test our smart analysis with these Amazon products:
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-blue-700">
                  <div className="font-medium mb-2">🇺🇸 Amazon US:</div>
                  <a 
                    href="https://www.amazon.com/dp/B09V3BS25N" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    NOW Foods Lion's Mane 500mg
                  </a>
                </div>
                <div className="text-sm text-blue-700">
                  <div className="font-medium mb-2">🇮🇳 Amazon India:</div>
                  <a 
                    href="https://www.amazon.in/dp/B07JDM9DF5" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    Naturoman Frankincense Essential Oil (₹210)
                  </a>
                </div>
                <div className="text-sm text-blue-700">
                  <div className="font-medium mb-2">🛒 eBay:</div>
                  <a 
                    href="https://www.ebay.com/itm/167595093681" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    LEGO 40766 Tribute To Jane Austen's Books ($46.69)
                  </a>
                </div>
              </div>
              <div className="mt-4 text-sm text-blue-700 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Paste any Amazon URL and click "Smart Analysis"</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Works with Amazon US, India, UK, Germany, and more</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Also supports eBay, Walmart, and other major retailers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Get local pricing, ratings, and product details</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Quote Form */}
      <div className="container py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <CardHeader className="text-center pb-8">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl md:text-4xl font-bold">
                    Get Your Shopping Quote
                  </CardTitle>
                  <CardDescription className="text-lg max-w-2xl mx-auto">
                    Share the products you want from international stores, and we'll get them for you. 
                    It only takes a few minutes!
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 md:px-8 pb-8">
              <QuoteForm />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container py-16">
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Getting products from international stores is simple with us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Share Your Wishlist</h3>
              <p className="text-muted-foreground text-center">
                Send us links to products you want from US, China, Japan, UK, or any international store.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Get Your Quote</h3>
              <p className="text-muted-foreground text-center">
                We'll provide a complete quote including product cost, international shipping, and delivery.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Shop & Deliver</h3>
              <p className="text-muted-foreground text-center">
                We purchase the items and ship them internationally to your doorstep with full tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Countries */}
      <div className="container py-16">
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Shop from These Countries
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We help you shop from major international markets
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇺🇸</span>
              </div>
              <h3 className="font-semibold">United States</h3>
              <p className="text-sm text-muted-foreground text-center">
                Amazon, Walmart, Best Buy, and more
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇨🇳</span>
              </div>
              <h3 className="font-semibold">China</h3>
              <p className="text-sm text-muted-foreground text-center">
                Taobao, JD, AliExpress, and more
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇯🇵</span>
              </div>
              <h3 className="font-semibold">Japan</h3>
              <p className="text-sm text-muted-foreground text-center">
                Rakuten, Amazon Japan, and more
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">🇬🇧</span>
              </div>
              <h3 className="font-semibold">United Kingdom</h3>
              <p className="text-sm text-muted-foreground text-center">
                Amazon UK, Argos, and more
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container py-16">
        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Shop Globally?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of customers who trust us for their international shopping needs
          </p>
          <Button size="lg" className="h-12 px-8 text-lg">
            Start Shopping Now
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quote;
