import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { productAnalyzer, ProductAnalysis } from '@/lib/productAnalyzer';
import { Loader2, ExternalLink, Package, DollarSign, Weight, Tag, Settings, CheckCircle, XCircle } from 'lucide-react';

export const ProductAnalyzerTest = () => {
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<{ scraperApi: boolean; proxyApi: boolean } | null>(null);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();

  // Check API configuration on component mount
  useEffect(() => {
    const config = productAnalyzer.debugConfig();
    setApiConfig(config);
  }, []);

  // Sample URLs for testing
  const sampleUrls = [
    {
      name: 'Amazon Echo Dot',
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
      description: 'Smart speaker'
    },
    {
      name: 'iPhone 13 Pro',
      url: 'https://www.ebay.com/itm/123456789',
      description: 'Smartphone'
    },
    {
      name: 'Samsung TV',
      url: 'https://www.walmart.com/ip/123456789',
      description: 'Television'
    },
    {
      name: 'Wireless Earbuds',
      url: 'https://www.aliexpress.com/item/123456789.html',
      description: 'Audio device'
    }
  ];

  const handleAnalyze = async () => {
    if (!url && !productName) {
      toast({
        title: "Input Required",
        description: "Please provide either a product URL or product name.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setDebugInfo(null);

    try {
      console.log('Starting analysis for:', { url, productName });
      
      const analysis = await productAnalyzer.analyzeProduct(url, productName);
      setResult(analysis);
      
      // Get debug info from the Edge Function logs
      setDebugInfo({
        url,
        productName,
        platform: analysis.platform,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed: ${analysis.name}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setDebugInfo({
        url,
        productName,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestAPI = async () => {
    setIsTestingAPI(true);
    try {
      const result = await productAnalyzer.testAPI();
      setApiTestResult(result);
      toast({
        title: result.success ? "API Test Successful" : "API Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      setApiTestResult({ success: false, message: 'API test failed' });
      toast({
        title: "API Test Failed",
        description: "Could not test API connectivity",
        variant: "destructive"
      });
    } finally {
      setIsTestingAPI(false);
    }
  };

  const handleSampleUrl = (sample: typeof sampleUrls[0]) => {
    setUrl(sample.url);
    setProductName(sample.name);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      electronics: 'bg-blue-100 text-blue-800',
      clothing: 'bg-purple-100 text-purple-800',
      home: 'bg-green-100 text-green-800',
      beauty: 'bg-pink-100 text-pink-800',
      sports: 'bg-orange-100 text-orange-800',
      toys: 'bg-yellow-100 text-yellow-800',
      books: 'bg-red-100 text-red-800',
      automotive: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Product Analyzer Test</h1>
        <p className="text-muted-foreground">
          Test the product analysis system with real URLs
        </p>
      </div>

      {/* API Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Check your API key configuration and test connectivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {apiConfig.scraperApi ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  ScraperAPI: {apiConfig.scraperApi ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {apiConfig.proxyApi ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  ProxyAPI: {apiConfig.proxyApi ? 'Configured' : 'Not configured'}
                </span>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleTestAPI} 
            disabled={isTestingAPI || !apiConfig?.scraperApi}
            variant="outline"
          >
            {isTestingAPI ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing API...
              </>
            ) : (
              'Test API Connection'
            )}
          </Button>

          {apiTestResult && (
            <div className={`p-3 rounded-lg ${
              apiTestResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`text-sm ${
                apiTestResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {apiTestResult.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Form */}
      <Card>
        <CardHeader>
          <CardTitle>Analyze Product</CardTitle>
          <CardDescription>
            Enter a product URL or name to test the analysis system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="url">Product URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.amazon.com/dp/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="productName">Product Name (if no URL)</Label>
              <Input
                id="productName"
                placeholder="Product name..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Product'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sample URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Sample URLs for Testing</CardTitle>
          <CardDescription>
            Click any sample to test with pre-filled data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleUrls.map((sample, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => handleSampleUrl(sample)}
              >
                <div className="font-medium">{sample.name}</div>
                <div className="text-sm text-muted-foreground">{sample.description}</div>
                <div className="text-xs text-blue-600 mt-1 truncate w-full">
                  {sample.url}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Product Name</Label>
                  <div className="text-lg font-semibold">{result.name}</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-medium">Price</Label>
                  <div className="text-lg font-semibold text-green-600">
                    ${result.price.toFixed(2)} {result.currency}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">Weight</Label>
                  <div className="text-lg font-semibold text-blue-600">
                    {result.weight.toFixed(2)} kg
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-600" />
                  <Label className="text-sm font-medium">Category</Label>
                  <Badge className={getCategoryColor(result.category)}>
                    {result.category}
                  </Badge>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                {result.brand && (
                  <div>
                    <Label className="text-sm font-medium">Brand</Label>
                    <div className="text-lg">{result.brand}</div>
                  </div>
                )}

                {result.dimensions && (
                  <div>
                    <Label className="text-sm font-medium">Dimensions</Label>
                    <div className="text-sm">
                      {result.dimensions.length} × {result.dimensions.width} × {result.dimensions.height} cm
                    </div>
                  </div>
                )}

                {result.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {result.description}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Availability</Label>
                  <Badge variant={result.availability ? "default" : "destructive"}>
                    {result.availability ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>

                {result.imageUrl && (
                  <div>
                    <Label className="text-sm font-medium">Product Image</Label>
                    <a
                      href={result.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Image
                    </a>
                  </div>
                )}
              </div>
            </div>

            {result.error && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> {result.error}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Analysis Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">{error}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              This product will be added to the manual analysis queue for admin review.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {debugInfo && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-600">Debug Information</CardTitle>
            <CardDescription>
              Technical details about the analysis process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>URL:</strong> {debugInfo.url || 'N/A'}</div>
              <div><strong>Product Name:</strong> {debugInfo.productName || 'N/A'}</div>
              <div><strong>Platform:</strong> {debugInfo.platform || 'N/A'}</div>
              <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
              {debugInfo.error && (
                <div><strong>Error:</strong> <span className="text-red-600">{debugInfo.error}</span></div>
              )}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600">
                <strong>Note:</strong> Check the browser console and Supabase Edge Function logs for more detailed debugging information.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 