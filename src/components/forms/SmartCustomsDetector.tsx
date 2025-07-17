import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { applyRouteSpecificCustomsRules, CustomsResult } from '@/lib/route-specific-customs';

interface SmartCustomsDetectorProps {
  originCountry: string;
  destinationCountry: string;
  itemPrice: number;
  itemWeight: number;
  productCategory?: string;
  productTitle?: string;
  onCustomsDetected: (result: CustomsResult) => void;
  disabled?: boolean;
}

export const SmartCustomsDetector: React.FC<SmartCustomsDetectorProps> = ({
  originCountry,
  destinationCountry,
  itemPrice,
  itemWeight,
  productCategory,
  productTitle,
  onCustomsDetected,
  disabled = false,
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedResult, setDetectedResult] = useState<CustomsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canDetect = originCountry && destinationCountry && itemPrice > 0 && itemWeight > 0;

  const detectCustoms = async () => {
    if (!canDetect) return;

    setIsDetecting(true);
    setError(null);
    setDetectedResult(null);

    try {
      const result = await applyRouteSpecificCustomsRules(
        {
          price: itemPrice,
          weight: itemWeight,
          category: productCategory,
          title: productTitle,
        },
        originCountry,
        destinationCountry,
      );

      setDetectedResult(result);
      onCustomsDetected(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect customs category';
      setError(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Smart Customs Detection
        </CardTitle>
        <CardDescription>
          Automatically detect the appropriate customs category based on your route and product
          details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canDetect && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Please fill in origin country, destination country, price, and weight to enable
              detection
            </span>
          </div>
        )}

        {canDetect && (
          <div className="flex gap-2">
            <Button onClick={detectCustoms} disabled={isDetecting || disabled} className="flex-1">
              {isDetecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Auto-Detect Customs
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {detectedResult && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Detected Customs Category</span>
              </div>
              <Badge className={getConfidenceColor(detectedResult.confidence)}>
                {getConfidenceText(detectedResult.confidence)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>
                <div className="font-medium">{detectedResult.category}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Duty Rate:</span>
                <div className="font-medium">{detectedResult.dutyPercentage}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Route:</span>
                <div className="font-medium">{detectedResult.route}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence:</span>
                <div className="font-medium">{Math.round(detectedResult.confidence * 100)}%</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Rule Applied:</strong> {detectedResult.ruleApplied}
            </div>

            <Button
              onClick={() => onCustomsDetected(detectedResult)}
              className="w-full"
              variant="outline"
            >
              Use This Category
            </Button>
          </div>
        )}

        {canDetect && !detectedResult && !isDetecting && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Click "Auto-Detect Customs" to find the best customs category for your route
          </div>
        )}
      </CardContent>
    </Card>
  );
};
