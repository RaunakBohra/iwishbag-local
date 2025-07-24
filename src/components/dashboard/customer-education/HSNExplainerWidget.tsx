import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Package, Globe, Calculator } from 'lucide-react';

export const HSNExplainerWidget: React.FC = () => {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-blue-900">
          <Info className="mr-2 h-5 w-5" />
          What is HSN Classification?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-blue-800 text-sm leading-relaxed">
          HSN (Harmonized System of Nomenclature) is an internationally standardized system used to classify products 
          for customs and tax purposes. It ensures accurate calculation of duties and taxes for your international purchases.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-start space-x-3">
            <Package className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Product Classification</h4>
              <p className="text-blue-700 text-xs mt-1">
                Each product gets a unique HSN code based on its characteristics and use.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Global Standard</h4>
              <p className="text-blue-700 text-xs mt-1">
                Used by 200+ countries worldwide for consistent international trade.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Accurate Taxation</h4>
              <p className="text-blue-700 text-xs mt-1">
                Ensures you pay the correct customs duties and local taxes.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-lg p-3 mt-4">
          <h4 className="font-medium text-blue-900 text-sm mb-2">Why HSN Matters for You:</h4>
          <ul className="text-blue-800 text-xs space-y-1">
            <li>• <strong>Transparency:</strong> See exactly how your taxes are calculated</li>
            <li>• <strong>Accuracy:</strong> Avoid overpaying or underpaying duties</li>
            <li>• <strong>Compliance:</strong> Ensure your shipment clears customs smoothly</li>
            <li>• <strong>Speed:</strong> Faster customs processing with proper classification</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};