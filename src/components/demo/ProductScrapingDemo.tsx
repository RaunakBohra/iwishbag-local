import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useManualProductScraping } from '@/hooks/useProductScraping';
import { Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Demo component to test product scraping functionality
 * This can be accessed at /demo/scraping
 */
export const ProductScrapingDemo = () => {
  const [testUrls] = useState([
    'https://www.amazon.com/dp/B08N5WRWNW', // Echo Dot
    'https://www.ebay.com/itm/123456789', // Sample eBay
    'https://www.walmart.com/ip/sample-product/123', // Sample Walmart
    'https://www.etsy.com/listing/sample', // Sample Etsy
    'https://www.toysrus.com/product/sample-toy', // Sample Toys"R"Us
    'https://www.carters.com/p/baby-product/sample', // Sample Carter's
    'https://www.prada.com/ww/en/p/luxury-bag/sample', // Sample Prada
    'https://www.ysl.com/en-us/handbags/sample-bag.html', // Sample YSL
    'https://www.balenciaga.com/en-us/sneakers/sample-sneaker', // Sample Balenciaga
    'https://www.dior.com/en_int/fashion/products/sample-jacket', // Sample Dior
    'https://www.chanel.com/vn/makeup/p/sample-product/nail-color/', // Sample Chanel
  ]);
  
  const [currentUrl, setCurrentUrl] = useState('');
  const { isLoading, error, scrapeProduct, clearError } = useManualProductScraping();
  const [results, setResults] = useState<any[]>([]);

  const handleScrapeUrl = async (url: string) => {
    clearError();
    setCurrentUrl(url);
    
    const result = await scrapeProduct(url, {
      enhanceWithAI: true,
      includeImages: true,
      includeVariants: true
    });
    
    if (result.success) {
      setResults(prev => [...prev, { url, data: result.data, source: result.source }]);
    }
  };

  const handleManualScrape = async () => {
    if (currentUrl.trim()) {
      await handleScrapeUrl(currentUrl);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🚀 Bright Data Product Scraping Demo</CardTitle>
          <p className="text-sm text-gray-600">
            Test the smart product scraping with AI enhancement
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual URL Input */}
          <div className="flex space-x-2">
            <Input
              placeholder="Enter product URL (Amazon, eBay, Walmart, Toys\"R\"Us, Carter's, Prada, YSL, Balenciaga, Dior, Chanel, etc.)..."
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleManualScrape}
              disabled={isLoading || !currentUrl.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Scrape
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Sample URLs */}
          <div>
            <h3 className="font-medium mb-2">Sample URLs to test:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {testUrls.map((url, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleScrapeUrl(url)}
                  disabled={isLoading}
                  className="justify-start text-left h-auto p-2"
                >
                  <div className="truncate">
                    <div className="font-medium text-xs">
                      {url.includes('amazon') ? '📦 Amazon' : 
                       url.includes('ebay') ? '🏪 eBay' :
                       url.includes('walmart') ? '🛒 Walmart' : 
                       url.includes('etsy') ? '🎨 Etsy' :
                       url.includes('toysrus') ? '🧸 Toys"R"Us' :
                       url.includes('carters') ? '👶 Carter\'s' :
                       url.includes('prada') ? '👜 Prada' :
                       url.includes('ysl') ? '💄 YSL' :
                       url.includes('balenciaga') ? '🏃 Balenciaga' :
                       url.includes('dior') ? '👑 Dior' :
                       url.includes('chanel') ? '💎 Chanel' : '🌐 Other'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{url}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Scraping Results ({results.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">{result.url}</h4>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      {result.source}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Title:</strong>
                      <p className="text-gray-600 truncate">{result.data?.title || 'N/A'}</p>
                    </div>
                    <div>
                      <strong>Price:</strong>
                      <p className="text-gray-600">
                        {result.data?.price ? `${result.data.currency || 'USD'} ${result.data.price}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <strong>Weight:</strong>
                      <p className="text-gray-600">
                        {result.data?.weight ? `${result.data.weight} kg` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <strong>Category:</strong>
                      <p className="text-gray-600">{result.data?.category || 'N/A'}</p>
                    </div>
                  </div>

                  {result.data?.brand && (
                    <div className="mt-2 text-sm">
                      <strong>Brand:</strong> <span className="text-gray-600">{result.data.brand}</span>
                    </div>
                  )}

                  {(result.data as any)?.suggested_hsn && (
                    <div className="mt-2 text-sm">
                      <strong>Suggested HSN:</strong> 
                      <span className="text-gray-600 ml-1">{(result.data as any).suggested_hsn}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Support Info */}
      <Card>
        <CardHeader>
          <CardTitle>🌐 Supported Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Amazon (US, UK, DE, etc.)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>eBay (Global)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Walmart (US)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Best Buy</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Etsy</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Zara</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Toys"R"Us</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Carter's</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Prada</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>YSL</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Balenciaga</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Dior</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <span>Chanel</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <h4 className="font-medium text-sm mb-2">🤖 AI Enhancement Features:</h4>
            <ul className="text-xs space-y-1 text-gray-600">
              <li>• Smart category detection</li>
              <li>• Intelligent weight estimation</li>
              <li>• HSN code suggestions for Indian customs</li>
              <li>• Currency conversion to USD</li>
              <li>• Product data normalization</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};