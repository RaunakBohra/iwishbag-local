import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Shield,
  Calculator,
  Globe,
  CreditCard,
  Tag,
  Info
} from 'lucide-react';

interface CustomerBreakdownProps {
  quote: any;
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
}

export const CustomerBreakdown: React.FC<CustomerBreakdownProps> = ({
  quote,
  formatCurrency,
  className = ""
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!quote || !quote.calculation_data) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500 text-center">Breakdown not available</p>
        </CardContent>
      </Card>
    );
  }

  const calc = quote.calculation_data;
  const steps = calc.calculation_steps || {};
  const currency = quote.customer_currency || 'USD';

  // Essential breakdown items (always visible)
  const essentialItems = [
    {
      label: 'Products',
      amount: steps.items_subtotal || 0,
      icon: <Package className="w-4 h-4" />,
      savings: steps.item_discounts || 0
    },
    {
      label: 'Shipping',
      amount: steps.discounted_shipping_cost || steps.shipping_cost || 0,
      icon: <Truck className="w-4 h-4" />,
      savings: steps.shipping_discount_amount || 0,
      originalAmount: steps.shipping_cost
    },
    {
      label: 'Insurance',
      amount: steps.insurance_amount || 0,
      icon: <Shield className="w-4 h-4" />,
      optional: true
    },
    {
      label: 'Duties & Taxes',
      amount: (steps.discounted_customs_duty || steps.customs_duty || 0) + (steps.discounted_tax_amount || steps.local_tax_amount || 0),
      icon: <Globe className="w-4 h-4" />,
      savings: (steps.customs_discount_amount || 0) + (steps.tax_discount_amount || 0),
      originalAmount: (steps.customs_duty || 0) + (steps.local_tax_amount || 0)
    },
    {
      label: 'Service Fees',
      amount: (steps.discounted_handling_fee || steps.handling_fee || 0) + (steps.discounted_delivery || steps.domestic_delivery || 0),
      icon: <Calculator className="w-4 h-4" />,
      savings: (steps.handling_discount_amount || 0) + (steps.delivery_discount_amount || 0),
      originalAmount: (steps.handling_fee || 0) + (steps.domestic_delivery || 0)
    },
    {
      label: 'Payment Processing',
      amount: steps.payment_gateway_fee || 0,
      icon: <CreditCard className="w-4 h-4" />
    }
  ];

  // Detailed breakdown items (shown when expanded)
  const detailedItems = [
    {
      section: 'Product Details',
      items: [
        { label: 'Items Subtotal', amount: steps.items_subtotal || 0 },
        ...(steps.item_discounts > 0 ? [{ label: 'Item Discounts', amount: -(steps.item_discounts || 0), isDiscount: true }] : []),
        ...(steps.order_discount_amount > 0 ? [{ label: 'Order Discount', amount: -(steps.order_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.origin_sales_tax > 0 ? [{ label: 'Origin Sales Tax', amount: steps.origin_sales_tax || 0 }] : [])
      ]
    },
    {
      section: 'Shipping & Logistics',
      items: [
        { label: 'International Shipping', amount: steps.shipping_cost || 0 },
        ...(steps.shipping_discount_amount > 0 ? [{ label: 'Shipping Savings', amount: -(steps.shipping_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.insurance_amount > 0 ? [{ label: 'Package Insurance', amount: steps.insurance_amount || 0 }] : []),
        { label: 'Local Delivery', amount: steps.domestic_delivery || 0 },
        ...(steps.delivery_discount_amount > 0 ? [{ label: 'Delivery Savings', amount: -(steps.delivery_discount_amount || 0), isDiscount: true }] : [])
      ]
    },
    {
      section: 'Duties & Taxes',
      items: [
        ...(steps.customs_duty > 0 ? [{ label: 'Import Duties', amount: steps.customs_duty || 0 }] : []),
        ...(steps.customs_discount_amount > 0 ? [{ label: 'Customs Savings', amount: -(steps.customs_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.local_tax_amount > 0 ? [{ label: 'Local Tax (GST/VAT)', amount: steps.local_tax_amount || 0 }] : []),
        ...(steps.tax_discount_amount > 0 ? [{ label: 'Tax Savings', amount: -(steps.tax_discount_amount || 0), isDiscount: true }] : []),
        ...(steps.handling_fee > 0 ? [{ label: 'Handling Fee', amount: steps.handling_fee || 0 }] : []),
        ...(steps.handling_discount_amount > 0 ? [{ label: 'Handling Savings', amount: -(steps.handling_discount_amount || 0), isDiscount: true }] : [])
      ]
    },
    {
      section: 'Payment Processing',
      items: [
        { label: 'Payment Gateway Fee', amount: steps.payment_gateway_fee || 0, description: '2.9% + $0.30 processing fee' }
      ]
    },
    {
      section: 'Exchange & Conversion',
      items: [
        { label: 'Exchange Rate Used', amount: 0, description: `1 ${calc.inputs?.origin_currency || 'USD'} = ${calc.applied_rates?.exchange_rate || 1} ${currency}`, isInfo: true }
      ]
    }
  ];

  const totalSavings = steps.total_savings || 0;
  const finalTotal = steps.total_customer_currency || quote.total_customer_currency || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-blue-600" />
            <span>Pricing Breakdown</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700"
          >
            {showDetails ? 'Hide' : 'Show'} Details
            {showDetails ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Essential Breakdown (Always Visible) */}
          <div className="space-y-3">
            {essentialItems.map((item, index) => {
              if (item.optional && item.amount === 0) return null;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-3">{item.icon}</span>
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="text-right">
                      {item.savings > 0 && item.originalAmount ? (
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground line-through">
                            {formatCurrency(item.originalAmount, currency)}
                          </span>
                          <div className="font-medium">
                            {formatCurrency(item.amount, currency)}
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium">
                          {formatCurrency(item.amount, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.savings > 0 && (
                    <div className="flex justify-end">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        Saved {formatCurrency(item.savings, currency)}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Savings */}
          {totalSavings > 0 && (
            <>
              <Separator />
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">Total Savings</span>
                </div>
                <span className="text-green-800 font-semibold">
                  -{formatCurrency(totalSavings, currency)}
                </span>
              </div>
            </>
          )}

          <Separator />

          {/* Final Total */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(finalTotal, currency)}</span>
          </div>

          {/* USD Equivalent */}
          {currency !== 'USD' && steps.total_usd && (
            <div className="text-center text-sm text-muted-foreground">
              ≈ {formatCurrency(steps.total_usd || 0, 'USD')}
            </div>
          )}

          {/* Detailed Breakdown (Expandable) */}
          {showDetails && (
            <div className="mt-6 pt-6 border-t">
              <div className="space-y-6">
                {detailedItems.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                      {section.section}
                    </h4>
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={`${item.isDiscount ? 'text-green-600' : item.isInfo ? 'text-blue-600' : 'text-muted-foreground'}`}>
                              {item.label}
                            </span>
                            {!item.isInfo && (
                              <span className={`${item.isDiscount ? 'text-green-600 font-medium' : ''}`}>
                                {formatCurrency(item.amount, currency)}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-500 pl-2">
                              {item.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Additional Details */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-900 font-medium mb-1">Price Breakdown Details</p>
                      <ul className="text-blue-800 space-y-1">
                        <li>• All prices include applicable taxes and duties</li>
                        <li>• Shipping calculated based on total weight: {calc.inputs?.total_weight_kg || 0}kg</li>
                        <li>• Exchange rates are updated daily for accurate pricing</li>
                        {steps.insurance_amount > 0 && <li>• Insurance covers full package value and shipping costs</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};