import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, Plane, MapPin, CreditCard } from 'lucide-react';

interface TaxBreakdownEducationProps {
  originCountry?: string;
  destinationCountry?: string;
}

export const TaxBreakdownEducation: React.FC<TaxBreakdownEducationProps> = ({
  originCountry = 'US',
  destinationCountry = 'IN',
}) => {
  // Map country codes to display names and tax types
  const getCountryInfo = (countryCode: string) => {
    const countryMap: Record<string, { name: string; localTax: string; localTaxRate: string }> = {
      US: { name: 'United States', localTax: 'Sales Tax', localTaxRate: '0-11%' },
      IN: { name: 'India', localTax: 'GST', localTaxRate: '5-28%' },
      NP: { name: 'Nepal', localTax: 'VAT', localTaxRate: '13%' },
      UK: { name: 'United Kingdom', localTax: 'VAT', localTaxRate: '20%' },
      CA: { name: 'Canada', localTax: 'HST/GST', localTaxRate: '5-15%' },
    };
    return (
      countryMap[countryCode] || {
        name: countryCode,
        localTax: 'Local Tax',
        localTaxRate: 'Varies',
      }
    );
  };

  const originInfo = getCountryInfo(originCountry);
  const destinationInfo = getCountryInfo(destinationCountry);

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-green-900">
          <Receipt className="mr-2 h-5 w-5" />
          Understanding Your Tax Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-green-800 text-sm leading-relaxed">
          Your total cost includes multiple tax components applied at different stages of the
          shipping process. Here's what each component means:
        </p>

        <div className="space-y-4">
          {/* Customs Duties */}
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Plane className="h-4 w-4 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Customs Duties</h4>
              </div>
              <Badge variant="outline" className="text-green-700 border-green-300">
                Import Tax
              </Badge>
            </div>
            <p className="text-green-700 text-sm mb-2">
              Charged by {destinationInfo.name} customs when your package enters the country.
            </p>
            <ul className="text-green-600 text-xs space-y-1">
              <li>• Applied to the higher of: actual item price or minimum HSN valuation</li>
              <li>• Rate varies by product category (typically 5-40%)</li>
              <li>• Collected by customs authorities</li>
            </ul>
          </div>

          {/* Local Taxes */}
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">
                  {destinationInfo.localTax} ({destinationInfo.localTaxRate})
                </h4>
              </div>
              <Badge variant="outline" className="text-green-700 border-green-300">
                Local Tax
              </Badge>
            </div>
            <p className="text-green-700 text-sm mb-2">
              Local tax applied by {destinationInfo.name} on the total landed value.
            </p>
            <ul className="text-green-600 text-xs space-y-1">
              <li>• Applied to: item price + customs duties + shipping costs</li>
              <li>• Rate: {destinationInfo.localTaxRate} depending on product category</li>
              <li>• Collected by local tax authorities</li>
            </ul>
          </div>

          {/* Payment Gateway Fees */}
          <div className="bg-white/80 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Processing Fees</h4>
              </div>
              <Badge variant="outline" className="text-green-700 border-green-300">
                Service Fee
              </Badge>
            </div>
            <p className="text-green-700 text-sm mb-2">
              Payment processing and handling charges for international transactions.
            </p>
            <ul className="text-green-600 text-xs space-y-1">
              <li>• Payment gateway fees (2-3%)</li>
              <li>• Currency conversion charges</li>
              <li>• International transaction fees</li>
            </ul>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 text-sm mb-2 flex items-center">
            <Receipt className="h-4 w-4 mr-2" />
            Tax Calculation Method
          </h4>
          <p className="text-blue-800 text-xs">
            <strong>HSN-Based Calculation:</strong> We use the Harmonized System of Nomenclature
            (HSN) to determine the most accurate tax rates for each item. This ensures compliance
            with {destinationInfo.name} customs regulations and prevents delays or additional
            charges.
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-3">
          <h4 className="font-medium text-amber-900 text-sm mb-2">Important Notes:</h4>
          <ul className="text-amber-800 text-xs space-y-1">
            <li>• Tax rates are estimated based on current regulations</li>
            <li>• Final amounts may vary slightly due to exchange rate fluctuations</li>
            <li>• Some products may be eligible for duty exemptions</li>
            <li>• All taxes are collected on your behalf to ensure smooth delivery</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
