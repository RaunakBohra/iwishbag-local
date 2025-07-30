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
      {}
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