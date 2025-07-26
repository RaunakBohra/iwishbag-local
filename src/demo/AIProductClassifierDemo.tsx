import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Package, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Target,
  Truck,
  Scale,
  Tags
} from 'lucide-react';
import { aiProductClassifierService, type ProductClassificationResult, type ProductClassificationInput } from '@/services/AIProductClassifierService';

interface ClassificationMetrics {
  total: number;
  successful: number;
  avgConfidence: number;
  avgResponseTime: number;
  totalNeurons: number;
  estimatedCost: string;
}

const AIProductClassifierDemo: React.FC = () => {
  const [productInput, setProductInput] = useState('');
  const [originCountry, setOriginCountry] = useState('US');
  const [destinationCountry, setDestinationCountry] = useState('IN');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifications, setClassifications] = useState<ProductClassificationResult[]>([]);
  const [metrics, setMetrics] = useState<ClassificationMetrics>({
    total: 0,
    successful: 0,
    avgConfidence: 0,
    avgResponseTime: 0,
    totalNeurons: 0,
    estimatedCost: '0.00'
  });

  const sampleProducts = [
    { category: 'Electronics', items: ['iPhone 15 Pro 128GB', 'MacBook Air M2 13 inch', 'Sony WH-1000XM5 Headphones'] },
    { category: 'Clothing', items: ['Women Cotton Kurta Embroidered', 'Levis 501 Original Fit Jeans', 'Nike Air Max 270 Running Shoes'] },
    { category: 'Others', items: ['Harry Potter Complete Book Set', 'Kitchen Knife Set Stainless Steel', 'DJI Mini 3 Pro Drone with Camera'] }
  ];

  const updateMetrics = useCallback((results: ProductClassificationResult[]) => {
    const stats = aiProductClassifierService.getClassificationStats(results);
    setMetrics({
      total: stats.total,
      successful: stats.successful,
      avgConfidence: stats.avgConfidence,
      avgResponseTime: stats.avgResponseTime,
      totalNeurons: stats.totalNeurons,
      estimatedCost: stats.estimatedCost
    });
  }, []);

  const classifyProduct = async () => {
    if (!productInput.trim()) {
      alert('Please enter a product name or URL');
      return;
    }

    setIsClassifying(true);

    try {
      const input: ProductClassificationInput = {
        productName: productInput.trim(),
        productUrl: productInput.startsWith('http') ? productInput : undefined,
        originCountry,
        destinationCountry
      };

      const result = await aiProductClassifierService.classifyProduct(input);
      const newClassifications = [result, ...classifications];
      
      setClassifications(newClassifications);
      updateMetrics(newClassifications);

    } catch (error) {
      console.error('Classification failed:', error);
      alert(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClassifying(false);
    }
  };

  const loadSampleProduct = (productName: string) => {
    setProductInput(productName);
  };

  const runAccuracyTest = async () => {
    setIsClassifying(true);
    
    try {
      const testProducts = sampleProducts.flatMap(cat => cat.items);
      const inputs: ProductClassificationInput[] = testProducts.map(product => ({
        productName: product,
        originCountry,
        destinationCountry
      }));

      const results = await aiProductClassifierService.batchClassify(inputs);
      setClassifications([...results, ...classifications]);
      updateMetrics([...results, ...classifications]);

    } catch (error) {
      console.error('Accuracy test failed:', error);
      alert(`Accuracy test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClassifying(false);
    }
  };

  const clearResults = () => {
    setClassifications([]);
    setMetrics({
      total: 0,
      successful: 0,
      avgConfidence: 0,
      avgResponseTime: 0,
      totalNeurons: 0,
      estimatedCost: '0.00'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-500';
    if (confidence > 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🤖 AI Product Classifier
        </h1>
        <p className="text-lg text-gray-600">
          Test Cloudflare Workers AI for automatic product classification, HSN codes, and tax calculations
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="product">Product URL or Name</Label>
              <Input
                id="product"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                placeholder="Enter Amazon, Flipkart, eBay, or Alibaba URL, or just product name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="origin">Origin Country</Label>
              <select
                id="origin"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="US">United States</option>
                <option value="IN">India</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="CN">China</option>
              </select>
            </div>
            <div>
              <Label htmlFor="destination">Destination Country</Label>
              <select
                id="destination"
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="IN">India</option>
                <option value="NP">Nepal</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={classifyProduct} 
              disabled={isClassifying}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isClassifying ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Classifying...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Classify Product
                </>
              )}
            </Button>
            <Button 
              onClick={runAccuracyTest} 
              disabled={isClassifying}
              variant="outline"
            >
              <Target className="w-4 h-4 mr-2" />
              Test Accuracy
            </Button>
            <Button 
              onClick={clearResults} 
              variant="outline"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Sample Products for Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleProducts.map((category) => (
              <div key={category.category}>
                <h4 className="font-semibold mb-2">{category.category}:</h4>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <Button
                      key={item}
                      onClick={() => loadSampleProduct(item)}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start"
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.total}</div>
            <div className="text-sm text-gray-600">Classifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{(metrics.avgConfidence * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.totalNeurons}</div>
            <div className="text-sm text-gray-600">Neurons Used</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.avgResponseTime}ms</div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {metrics.total > 0 ? (metrics.successful / metrics.total * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">${metrics.estimatedCost}</div>
            <div className="text-sm text-gray-600">Cost (Free Tier)</div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Classification Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classifications.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No classifications yet. Try entering a product name or using the sample products above.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {classifications.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">{result.product_name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                        <Badge variant="outline" className={getConfidenceColor(result.confidence)}>
                          {getConfidenceText(result.confidence)} ({(result.confidence * 100).toFixed(1)}%)
                        </Badge>
                      </div>
                    </div>

                    <Progress value={result.confidence * 100} className="mb-3" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Tags className="w-4 h-4" />
                          Classification
                        </div>
                        <div className="mt-1">
                          <Badge variant="secondary">{result.category}</Badge>
                          <Badge variant="outline" className="ml-1">{result.subcategory}</Badge>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          HSN Code
                        </div>
                        <Badge className="mt-1 bg-blue-600">{result.hsn_code}</Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Scale className="w-4 h-4" />
                          Weight
                        </div>
                        <div className="mt-1 text-sm">{result.estimated_weight_kg} kg</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Truck className="w-4 h-4" />
                          Shipping
                        </div>
                        <Badge variant="outline" className="mt-1">{result.shipping_method}</Badge>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Tax Implications:</div>
                      <div className="text-sm text-gray-600">{result.tax_implications}</div>
                    </div>

                    {result.restrictions.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-1">Shipping Restrictions:</div>
                        <div className="flex flex-wrap gap-1">
                          {result.restrictions.map((restriction, idx) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.manual_review_needed && (
                      <Alert className="mb-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Manual Review Required: This item has complex regulations or low confidence score.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-between text-xs text-gray-500 pt-3 border-t">
                      <span>Neurons: {result.neuronsUsed}</span>
                      <span>Response: {result.responseTime.toFixed(0)}ms</span>
                      <span>Customs: {result.customs_rate_percent}%</span>
                      <span>Model: {result.ai_model_used}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Free Tier Info */}
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Free Tier Usage:</strong> Cloudflare Workers AI provides 10,000 requests per day at $0 cost! 
          Current usage: {metrics.totalNeurons} neurons (~{(metrics.totalNeurons / 100).toFixed(0)} requests).
          {metrics.totalNeurons > 8000 && (
            <span className="text-orange-600 ml-2">
              ⚠️ Approaching daily limit
            </span>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AIProductClassifierDemo;