// ============================================================================
// HSN QUICK TEST - Minimal component for testing HSN in existing admin UI
// Can be easily embedded in any admin page for quick HSN system testing
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, ExternalLink, Play, Eye } from 'lucide-react';
import { CompactHSNTaxBreakdown } from '@/components/admin/smart-components/CompactHSNTaxBreakdown';
import { loadSampleHSNQuote, getSampleHSNQuoteURL } from '@/utils/loadSampleHSNQuote';
import type { UnifiedQuote } from '@/types/unified-quote';

interface HSNQuickTestProps {
  className?: string;
  compact?: boolean;
}

export const HSNQuickTest: React.FC<HSNQuickTestProps> = ({ className = '', compact = false }) => {
  const [sampleQuote, setSampleQuote] = useState<UnifiedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const quote = loadSampleHSNQuote();
      setSampleQuote(quote);
    } catch (error) {
      console.error('Error loading sample quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInAdmin = () => {
    const url = getSampleHSNQuoteURL();
    // In a real app, you'd navigate programmatically
    // For now, we'll just show the URL
    alert(`Navigate to: ${url}\n\nThis would open the sample quote in the full admin interface.`);
  };

  if (compact) {
    return (
      <Card className={`border-dashed border-orange-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <TestTube className="w-4 h-4 text-orange-600" />
              <span className="font-medium">HSN Test</span>
              <Badge variant="outline" className="text-xs">
                Dev
              </Badge>
            </div>
            <Button size="sm" variant="outline" onClick={handleLoadSample} disabled={isLoading}>
              <Play className="w-3 h-3 mr-1" />
              {isLoading ? 'Loading...' : 'Test'}
            </Button>
          </div>
          {sampleQuote && (
            <div className="mt-3">
              <CompactHSNTaxBreakdown
                quote={sampleQuote}
                compact={true}
                isCalculating={false}
                onRecalculate={handleLoadSample}
                onUpdateQuote={() => console.log('Update requested')}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 border-l-orange-500 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <TestTube className="w-5 h-5 text-orange-600" />
          <span>HSN System Quick Test</span>
          <Badge variant="outline" className="text-xs">
            Development
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            Test the enhanced HSN customs calculation system with realistic sample data. This
            includes minimum valuation conversion, dual calculation display, and admin override
            options.
          </AlertDescription>
        </Alert>

        <div className="flex space-x-2">
          <Button onClick={handleLoadSample} disabled={isLoading}>
            <Play className="w-4 h-4 mr-2" />
            {isLoading ? 'Loading Sample...' : 'Load Sample Quote'}
          </Button>

          <Button variant="outline" onClick={handleOpenInAdmin}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Admin
          </Button>

          <Button variant="outline" onClick={() => window.open('/dev/hsn-test', '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Open Test Interface
          </Button>
        </div>

        {sampleQuote && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="font-medium mb-2">Sample Quote Loaded:</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Quote ID:</span>
                  <div className="font-mono">{sampleQuote.display_id}</div>
                </div>
                <div>
                  <span className="text-gray-600">Route:</span>
                  <div>
                    {sampleQuote.origin_country} → {sampleQuote.destination_country}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Items:</span>
                  <div>{sampleQuote.items.length} products</div>
                </div>
                <div>
                  <span className="text-gray-600">HSN Items:</span>
                  <div>{sampleQuote.items.filter((item) => item.hsn_code).length} classified</div>
                </div>
              </div>
            </div>

            <CompactHSNTaxBreakdown
              quote={sampleQuote}
              compact={false}
              isCalculating={isLoading}
              onRecalculate={handleLoadSample}
              onUpdateQuote={() => {
                console.log('Quote update requested');
                alert('In a real application, this would update the quote in the database.');
              }}
            />

            <div className="text-xs text-gray-500 space-y-1">
              <div>
                💡 <strong>Test Scenarios:</strong>
              </div>
              <div>• Kurta: ₹500 vs $10 minimum (₹830) → Uses minimum valuation</div>
              <div>• Samsung: ₹25,000 vs $50 minimum (₹4,150) → Uses actual price</div>
              <div>• Books: ₹3,000, tax-exempt → Zero taxes</div>
              <div>• T-shirts: ₹1,500 vs $5 minimum (₹415) → Uses actual price</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HSNQuickTest;
