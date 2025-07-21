// ============================================================================
// ML WEIGHT ESTIMATOR TESTER - Interactive Testing and Training Interface
// Features: Test estimations, train with real data, view accuracy metrics
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain,
  Target,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Trash2,
  Database,
} from 'lucide-react';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';

interface EstimationResult {
  estimated_weight: number;
  confidence: number;
  reasoning: string[];
  suggestions: string[];
}

interface MLAnalytics {
  totalProducts: number;
  totalTrainingSessions: number;
  averageAccuracy: number;
  topCategories: Array<{ category: string; count: number; avgWeight: number }>;
  recentTraining: any[];
}

export const MLWeightEstimatorTester: React.FC = () => {
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [analytics, setAnalytics] = useState<MLAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [testResults, setTestResults] = useState<
    Array<{
      product: string;
      estimated: number;
      actual?: number;
      accuracy?: number;
      confidence: number;
    }>
  >([]);

  // Load analytics on component mount
  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await smartWeightEstimator.getMLAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleEstimate = async () => {
    if (!productName.trim()) return;

    try {
      const estimation = await smartWeightEstimator.estimateWeight(
        productName,
        productUrl || undefined,
      );
      setResult(estimation);

      // Add to test results
      setTestResults((prev) => [
        ...prev,
        {
          product: productName,
          estimated: estimation.estimated_weight,
          confidence: estimation.confidence,
        },
      ]);
    } catch (error) {
      console.error('Estimation error:', error);
    }
  };

  const handleLearn = async () => {
    if (!result || !actualWeight || !productName) return;

    setIsLearning(true);
    try {
      const weight = parseFloat(actualWeight);
      await smartWeightEstimator.learnFromActualWeight(
        productName,
        weight,
        productUrl || undefined,
        {
          userConfirmed: true,
          originalEstimate: result.estimated_weight,
        },
      );

      // Update test results with accuracy
      setTestResults((prev) =>
        prev.map((item) =>
          item.product === productName && !item.actual
            ? {
                ...item,
                actual: weight,
                accuracy: (1 - Math.abs(item.estimated - weight) / weight) * 100,
              }
            : item,
        ),
      );

      // Clear form
      setProductName('');
      setProductUrl('');
      setActualWeight('');
      setResult(null);

      // Reload analytics to show updated data
      await loadAnalytics();
    } catch (error) {
      console.error('Learning error:', error);
    } finally {
      setIsLearning(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all ML training data? This cannot be undone.')) {
      return;
    }

    try {
      await smartWeightEstimator.clearMLData();
      await loadAnalytics();
      setTestResults([]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* ML Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <div className="text-2xl font-bold">{analytics?.totalProducts || 0}</div>
                <div className="text-sm text-gray-600">Products Learned</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Brain className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <div className="text-2xl font-bold">{analytics?.totalTrainingSessions || 0}</div>
                <div className="text-sm text-gray-600">Training Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <div className="text-2xl font-bold">
                  {analytics?.averageAccuracy.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600">Avg Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-orange-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-600">ML Status</div>
                  <div className="text-sm font-medium">
                    {analytics?.totalProducts ? 'Learning' : 'Ready'}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleClearData}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      {analytics?.topCategories.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {analytics.topCategories.slice(0, 10).map((category) => (
                <div key={category.category} className="p-2 border rounded">
                  <div className="font-medium capitalize">{category.category}</div>
                  <div className="text-sm text-gray-600">
                    {category.count} items • {category.avgWeight.toFixed(2)}kg avg
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            ML Weight Estimator Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., iPhone 15 Pro Max, MacBook Air 13 inch"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Product URL (Optional)</label>
              <Input
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://amazon.com/..."
                className="mt-1"
              />
            </div>
          </div>

          <Button onClick={handleEstimate} disabled={!productName.trim()}>
            <Target className="w-4 h-4 mr-2" />
            Estimate Weight
          </Button>

          {/* Results Section */}
          {result && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-blue-800">
                      Estimated Weight: {result.estimated_weight} kg
                    </span>
                    <Badge className={getConfidenceColor(result.confidence)}>
                      {(result.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <div className="text-sm font-medium text-blue-700 mb-1">Reasoning:</div>
                    <div className="space-y-1">
                      {result.reasoning.map((reason, index) => (
                        <div key={index} className="text-xs text-blue-600 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {result.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-blue-700 mb-1">Suggestions:</div>
                      <div className="space-y-1">
                        {result.suggestions.map((suggestion, index) => (
                          <div key={index} className="text-xs text-blue-600 flex items-center">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Section */}
                  <div className="border-t border-blue-200 pt-3">
                    <div className="text-sm font-medium text-blue-700 mb-2">
                      Train the AI (Optional)
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={actualWeight}
                        onChange={(e) => setActualWeight(e.target.value)}
                        placeholder="Actual weight (kg)"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleLearn}
                        disabled={!actualWeight || isLearning}
                        size="sm"
                      >
                        {isLearning ? 'Learning...' : 'Train AI'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Test Results History */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Test Results History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults
                .slice(-10)
                .reverse()
                .map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{test.product}</div>
                      <div className="text-sm text-gray-600">
                        Estimated: {test.estimated}kg
                        {test.actual && ` | Actual: ${test.actual}kg`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getConfidenceColor(test.confidence)}>
                        {(test.confidence * 100).toFixed(0)}%
                      </Badge>
                      {test.accuracy && (
                        <Badge className={getAccuracyColor(test.accuracy)}>
                          {test.accuracy.toFixed(1)}% accurate
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Test Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Test Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'iPhone 15 Pro',
              'MacBook Air 13 inch',
              'Nike Air Jordan shoes',
              'Harry Potter book',
              'LEGO Star Wars set',
              'Samsung Galaxy Watch',
              'Nintendo Switch',
              'AirPods Pro',
            ].map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                onClick={() => setProductName(example)}
                className="text-left justify-start"
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
