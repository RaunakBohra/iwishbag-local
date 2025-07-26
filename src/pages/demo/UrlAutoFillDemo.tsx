import React, { useState } from 'react';
import { 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Package,
  DollarSign,
  Weight,
  FileText,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { productDataFetchService } from '@/services/ProductDataFetchService';

// Demo URLs for testing
const DEMO_URLS = [
  {
    category: 'Electronics',
    items: [
      {
        title: 'Amazon Echo Dot',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        description: 'Smart speaker with Alexa'
      },
      {
        title: 'Apple iPhone',
        url: 'https://www.amazon.com/Apple-iPhone-15-Pro-256GB/dp/B0CDQ3H4XJ',
        description: 'Latest iPhone model'
      },
      {
        title: 'Dell Laptop',
        url: 'https://www.amazon.com/Dell-XPS-13-Laptop/dp/B09M2Q3H4XJ',
        description: 'High-performance laptop'
      }
    ]
  },
  {
    category: 'Fashion',
    items: [
      {
        title: 'Nike Air Max',
        url: 'https://www.nike.com/air-max-270-react-shoes-kZlQ4r',
        description: 'Popular running shoes'
      },
      {
        title: 'Adidas Sneakers',
        url: 'https://www.adidas.com/ultraboost-22-shoes/GX5915.html',
        description: 'Comfortable sports shoes'
      }
    ]
  },
  {
    category: 'Home & Garden',
    items: [
      {
        title: 'IKEA Furniture',
        url: 'https://www.ikea.com/us/en/p/finnala-sofa-gunnared-beige-s99319985/',
        description: 'Modern sofa'
      }
    ]
  }
];

export default function UrlAutoFillDemo() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedUrl, setSelectedUrl] = useState('');

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const fetchResult = await productDataFetchService.fetchProductData(url);
      
      if (fetchResult.success) {
        setResult({
          ...fetchResult,
          timestamp: new Date().toISOString()
        });
      } else {
        setError(fetchResult.error || 'Failed to fetch product data');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const tryDemoUrl = (demoUrl: string) => {
    setUrl(demoUrl);
    setSelectedUrl(demoUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">URL Auto-Fill Demo</h1>
          </div>
          <p className="text-gray-600 mt-1">
            Paste any product URL and watch the magic happen!
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: URL Input Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Form */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Try It Out
              </h2>
              
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste any product URL (Amazon, eBay, Nike, etc.)"
                      className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      disabled={loading}
                    />
                    <Globe className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Fetching Product Details...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5" />
                      Fetch Product Data
                    </>
                  )}
                </button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {result && result.success && (
              <div className="bg-white rounded-xl shadow-sm border p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Fetched Product Data
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    result.source === 'scraper' ? 'bg-blue-100 text-blue-700' :
                    result.source === 'api' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    Source: {result.source}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  {result.data.title && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Product Title</p>
                        <p className="text-gray-900 mt-1">{result.data.title}</p>
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  {result.data.price !== undefined && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Price</p>
                        <p className="text-gray-900 mt-1">
                          {result.data.currency || '$'}{result.data.price}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Weight */}
                  {result.data.weight !== undefined && (
                    <div className="flex items-start gap-3">
                      <Weight className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Weight</p>
                        <p className="text-gray-900 mt-1">{result.data.weight} kg</p>
                      </div>
                    </div>
                  )}

                  {/* Category */}
                  {result.data.category && (
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <p className="text-gray-900 mt-1 capitalize">{result.data.category}</p>
                      </div>
                    </div>
                  )}

                  {/* Raw JSON */}
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                      View Raw JSON Response
                    </summary>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>

          {/* Right: Demo URLs */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Try These Demo URLs
              </h3>
              
              <div className="space-y-4">
                {DEMO_URLS.map((category) => (
                  <div key={category.category}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {category.category}
                    </h4>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div
                          key={item.url}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedUrl === item.url
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => tryDemoUrl(item.url)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {item.description}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {item.url}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(item.url);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Copy URL"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Open URL"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                How It Works
              </h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-medium">1.</span>
                  <span>Paste any product URL from supported sites</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">2.</span>
                  <span>Our system detects the e-commerce platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">3.</span>
                  <span>Fetches product title, price, weight & more</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium">4.</span>
                  <span>Auto-fills your quote form instantly!</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}