import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ExternalLink, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAutoQuote } from '@/hooks/useAutoQuote';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useCountryWithCurrency } from '@/hooks/useCountryWithCurrency';

interface ScrapedProduct {
  title: string;
  price: number;
  weight: number;
  images: string[];
  availability: string;
  category: string;
  originalCurrency?: string;
  url?: string;
}

interface AutoQuote {
  id: string;
  product_name: string;
  item_price: number;
  item_weight: number;
  final_total: number;
  sub_total: number;
  vat: number;
  international_shipping: number;
  customs_and_ecs: number;
  payment_gateway_fee: number;
  final_currency: string;
  final_total_local: number;
  confidence_score: number;
  applied_rules: {
    weight: string;
    customs: string;
    pricing: string;
  };
  scraped_data: {
    originalPrice: number;
    originalWeight: number;
    title: string;
    images: string[];
    category: string;
    originalCurrency?: string;
    url?: string;
  };
  status: string;
  created_at: string;
}

export default function QuoteAuto() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [purchaseCountry, setPurchaseCountry] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [scrapedData, setScrapedData] = useState<ScrapedProduct | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'scraping' | 'calculating' | 'result' | 'error'>('input');
  
  const { 
    scrapeProduct, 
    calculateQuote, 
    acceptQuote, 
    requestManualReview, 
    saveForLater, 
    addToCart,
    isLoading, 
    error, 
    quote, 
    isAutoQuoteEnabled 
  } = useAutoQuote();
  
  const { data: rawCountries, isLoading: countriesLoading } = usePurchaseCountries();
  const countries = useCountryWithCurrency(rawCountries);

  // Reset state when component mounts
  useEffect(() => {
    setCurrentStep('input');
    setScrapedData(null);
  }, []);

  const handleUrlSubmit = async () => {
    if (!url || !purchaseCountry || !shippingCountry) {
      return;
    }

    // Validate URL format for supported websites
    const supportedDomains = [
      'amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.nl', 'amazon.se', 'amazon.pl', 'amazon.sg', 'amazon.ae', 'amazon.sa', 'amazon.eg', 'amazon.com.tr', 'amazon.co.jp',
      'ebay.com', 'ebay.co.uk', 'ebay.ca', 'ebay.de', 'ebay.fr', 'ebay.it', 'ebay.es', 'ebay.com.au',
      'walmart.com', 'walmart.ca',
      'target.com'
    ];
    
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (!supportedDomains.some(supported => domain.includes(supported))) {
      alert('Please enter a URL from a supported website: Amazon, eBay, Walmart, or Target');
      return;
    }
    
    // Check if it's a direct product URL (not a search or category page)
    const path = urlObj.pathname.toLowerCase();
    const isProductUrl = path.includes('/dp/') || path.includes('/product/') || path.includes('/itm/') || path.includes('/ip/');
    
    if (!isProductUrl) {
      alert('Please enter a direct product URL. Search results and category pages are not supported.');
      return;
    }

    setCurrentStep('scraping');
    
    try {
      const result = await scrapeProduct(url);
      
      if (result.success && result.data) {
        setScrapedData(result.data);
        setCurrentStep('calculating');
        
        // Calculate quote with both purchase and shipping country
        const quoteResult = await calculateQuote(result.data, purchaseCountry, shippingCountry);
        
        if (quoteResult) {
          setCurrentStep('result');
        } else {
          setCurrentStep('error');
        }
      } else {
        setCurrentStep('error');
      }
    } catch (err) {
      setCurrentStep('error');
    }
  };

  const handleAcceptQuote = async () => {
    if (quote) {
      const success = await acceptQuote(quote.id);
      if (success) {
        navigate('/dashboard');
      }
    }
  };

  const handleRequestReview = async () => {
    if (quote) {
      const success = await requestManualReview(quote.id, 'User requested manual review for auto quote');
      if (success) {
        navigate('/dashboard');
      }
    }
  };

  const handleSaveForLater = async () => {
    if (quote) {
      const success = await saveForLater(quote.id);
      if (success) {
        navigate('/dashboard');
      }
    }
  };

  const handleAddToCart = async () => {
    if (quote) {
      const success = await addToCart(quote.id);
      if (success) {
        navigate('/cart');
      }
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  // Temporarily disable the system check for testing
  // if (!isAutoQuoteEnabled) {
  //   return (
  //     <Layout>
  //       <div className="container mx-auto px-4 py-8">
  //         <Card>
  //           <CardHeader>
  //             <CardTitle className="flex items-center gap-2">
  //               <AlertTriangle className="h-5 w-5 text-orange-500" />
  //               Auto Quote System Unavailable
  //             </CardTitle>
  //             <CardDescription>
  //               The instant quote system is currently disabled. Please use our manual quote system.
  //             </CardDescription>
  //           </CardHeader>
  //           <CardContent>
  //             <Button onClick={() => navigate('/quote')} className="w-full">
  //               Go to Manual Quote
  //             </Button>
  //           </CardContent>
  //         </Card>
  //       </div>
  //     </Layout>
  //   );
  // }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Instant Quote</h1>
        <p className="text-gray-600">
          Get an instant quote for products from supported websites around the world
        </p>
      </div>

      {/* Step 1: Input Form */}
      {currentStep === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Enter the product URL and the purchase country to get an instant quote
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url">Product URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.amazon.com/product..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Supported websites: Amazon, eBay, Walmart, Target
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseCountry">Purchase Country</Label>
              <Select value={purchaseCountry} onValueChange={setPurchaseCountry} disabled={countriesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    countriesLoading 
                      ? "Loading countries..." 
                      : countries && countries.length > 0 
                        ? "Select purchase country" 
                        : "No countries available"
                  } />
                </SelectTrigger>
                {!countriesLoading && countries && countries.length > 0 && (
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                )}
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the country where the product is being purchased from. This affects the currency and local costs.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingCountry">Shipping Country</Label>
              <Select value={shippingCountry} onValueChange={setShippingCountry} disabled={countriesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    countriesLoading 
                      ? "Loading countries..." 
                      : countries && countries.length > 0 
                        ? "Select shipping country" 
                        : "No countries available"
                  } />
                </SelectTrigger>
                {!countriesLoading && countries && countries.length > 0 && (
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                )}
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the country where the product is being shipped from. This affects the currency and local costs.
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> The purchase country determines the currency and local costs for the product. 
                We'll ship to your location and handle all international shipping and customs. 
                This is an automated quote system - final prices may vary and are subject to admin review.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleUrlSubmit} 
              disabled={!url || !purchaseCountry || !shippingCountry || isLoading || countriesLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Get Instant Quote'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scraping */}
      {currentStep === 'scraping' && (
        <Card>
          <CardHeader>
            <CardTitle>Scraping Product Information</CardTitle>
            <CardDescription>
              We're gathering product details from the website...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Please wait while we extract product information...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Calculating */}
      {currentStep === 'calculating' && (
        <Card>
          <CardHeader>
            <CardTitle>Calculating Quote</CardTitle>
            <CardDescription>
              We're calculating shipping, customs, and fees...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Calculating your instant quote...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Error */}
      {currentStep === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Unable to Generate Quote
            </CardTitle>
            <CardDescription>
              We encountered an issue while processing your request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error || 'Failed to scrape product or calculate quote. Please try again or use our manual quote system.'}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={() => setCurrentStep('input')} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => navigate('/quote')}>
                Use Manual Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Result */}
      {currentStep === 'result' && quote && (
        <div className="space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">{quote.scraped_data.title}</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Original Price:</strong> 
                      {quote.scraped_data.originalPrice} {quote.scraped_data.originalCurrency || 'USD'}
                      {quote.scraped_data.originalCurrency && quote.scraped_data.originalCurrency !== 'USD' && (
                        <span className="text-muted-foreground ml-2">
                          (≈ ${quote.scraped_data.originalPrice})
                        </span>
                      )}
                    </p>
                    <p><strong>Estimated Weight:</strong> {quote.item_weight} kg</p>
                    <p><strong>Category:</strong> {quote.scraped_data.category}</p>
                    <p><strong>Availability:</strong> {quote.scraped_data.availability}</p>
                    {quote.scraped_data.url && (
                      <p>
                        <strong>Product URL:</strong>{' '}
                        <a 
                          href={quote.scraped_data.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 inline-flex"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Original
                        </a>
                      </p>
                    )}
                  </div>
                </div>
                {quote.scraped_data.images.length > 0 && (
                  <div>
                    <img 
                      src={quote.scraped_data.images[0]} 
                      alt={quote.scraped_data.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quote Breakdown
                <Badge className={getConfidenceColor(quote.confidence_score)}>
                  {getConfidenceText(quote.confidence_score)} ({Math.round(quote.confidence_score * 100)}%)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Product Price</span>
                  <span>${quote.item_price}</span>
                </div>
                <div className="flex justify-between">
                  <span>International Shipping</span>
                  <span>${quote.international_shipping}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customs & ECS</span>
                  <span>${quote.customs_and_ecs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway Fee</span>
                  <span>${quote.payment_gateway_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT</span>
                  <span>${quote.vat}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${quote.final_total} {quote.final_currency}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Local Currency</span>
                  <span>{quote.final_total_local} {quote.final_currency}</span>
                </div>
              </div>

              {/* Applied Rules */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Applied Rules:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Weight:</strong> {quote.applied_rules.weight}</p>
                  <p><strong>Customs:</strong> {quote.applied_rules.customs}</p>
                  <p><strong>Pricing:</strong> {quote.applied_rules.pricing}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>What would you like to do?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleAcceptQuote} className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Quote
                </Button>
                <Button onClick={handleAddToCart} variant="outline" className="w-full">
                  Add to Cart
                </Button>
                <Button onClick={handleRequestReview} variant="outline" className="w-full">
                  Request Manual Review
                </Button>
                <Button onClick={handleSaveForLater} variant="outline" className="w-full">
                  Save for Later
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <Button 
                  onClick={() => setCurrentStep('input')} 
                  variant="ghost" 
                  size="sm"
                >
                  Get Another Quote
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Disclaimer:</strong> This is an automated quote. Final prices may vary based on actual 
              product specifications, availability, and shipping conditions. For high-value items or complex 
              products, we recommend requesting a manual review.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
} 