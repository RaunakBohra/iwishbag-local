import React from 'react';
import { 
  Package,
  Calculator,
  Globe,
  Truck,
  Receipt,
  AlertCircle,
  ChevronRight,
  Info,
  DollarSign,
  Percent,
  FileText,
  Shield,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  DisclosureProvider,
  DisclosureLevelControl,
  DisclosureContainer,
  DisclosureSection,
  ShowAtLevel,
  DisclosureLevelBadge,
  DisclosureExpandToggle,
  DisclosureLevel
} from '@/components/ui/progressive-disclosure';
import { UnifiedQuote } from '@/types/quote';
import { formatCurrency } from '@/utils/currency';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProgressiveTaxBreakdownProps {
  quote: UnifiedQuote;
  className?: string;
}

export function ProgressiveTaxBreakdown({ quote, className }: ProgressiveTaxBreakdownProps) {
  const breakdown = quote.calculation_data?.breakdown;
  if (!breakdown) return null;

  const hasHSN = quote.items.some(item => item.hsn_code);
  const taxMethod = quote.calculation_method_preference || 'auto';

  return (
    <DisclosureProvider defaultLevel={DisclosureLevel.ESSENTIAL} persistKey={`tax-breakdown-${quote.id}`}>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax & Customs Breakdown
                <DisclosureLevelBadge />
              </CardTitle>
              <CardDescription>
                Progressive view of all taxes and fees
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DisclosureExpandToggle />
              <DisclosureLevelControl compact />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Level 1: Summary - Just the totals */}
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Total Tax & Customs</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    (breakdown.customs || 0) + 
                    (breakdown.destination_tax || 0) + 
                    (breakdown.purchase_tax || 0),
                    quote.currency
                  )}
                </span>
              </div>
              
              <ShowAtLevel minLevel={DisclosureLevel.ESSENTIAL}>
                <Progress 
                  value={
                    ((breakdown.customs || 0) + 
                     (breakdown.destination_tax || 0) + 
                     (breakdown.purchase_tax || 0)) / 
                    breakdown.final_total * 100
                  }
                  className="h-2 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(
                    ((breakdown.customs || 0) + 
                     (breakdown.destination_tax || 0) + 
                     (breakdown.purchase_tax || 0)) / 
                    breakdown.final_total * 100
                  )}% of total order value
                </p>
              </ShowAtLevel>
            </div>

            {/* Quick breakdown badges */}
            <ShowAtLevel minLevel={DisclosureLevel.ESSENTIAL}>
              <div className="flex flex-wrap gap-2">
                {breakdown.customs > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Customs: {formatCurrency(breakdown.customs, quote.currency)}
                  </Badge>
                )}
                {breakdown.destination_tax > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Receipt className="h-3 w-3" />
                    VAT/GST: {formatCurrency(breakdown.destination_tax, quote.currency)}
                  </Badge>
                )}
                {hasHSN && (
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" />
                    HSN Classified
                  </Badge>
                )}
              </div>
            </ShowAtLevel>
          </div>

          <Separator />

          {/* Level 2: Essential - Main tax categories */}
          <DisclosureContainer minLevel={DisclosureLevel.ESSENTIAL}>
            <div className="space-y-3">
              {/* Customs Duty Section */}
              {breakdown.customs > 0 && (
                <DisclosureSection
                  id="customs"
                  title="Customs Duty"
                  subtitle={`${quote.operational_data?.customs?.percentage || 0}% on declared value`}
                  icon={Shield}
                  badge={formatCurrency(breakdown.customs, quote.currency)}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Customs Rate</span>
                        <p className="font-medium">{quote.operational_data?.customs?.percentage || 0}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Applied To</span>
                        <p className="font-medium">{formatCurrency(breakdown.items_total, quote.currency)}</p>
                      </div>
                    </div>

                    <ShowAtLevel minLevel={DisclosureLevel.ADVANCED}>
                      <div className="bg-muted/30 rounded-md p-3">
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5" />
                          Calculation Method
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          {taxMethod === 'hsn_based' ? 'HSN-based classification' :
                           taxMethod === 'country_settings' ? 'Country default rates' :
                           'Smart auto-detection'}
                        </p>
                      </div>
                    </ShowAtLevel>
                  </div>
                </DisclosureSection>
              )}

              {/* Destination Tax Section */}
              {breakdown.destination_tax > 0 && (
                <DisclosureSection
                  id="destination-tax"
                  title={`${quote.destination_country} Tax`}
                  subtitle="VAT/GST at destination"
                  icon={Receipt}
                  badge={formatCurrency(breakdown.destination_tax, quote.currency)}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tax Rate</span>
                        <p className="font-medium">
                          {quote.operational_data?.customs?.smart_tier?.vat_percentage || 0}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tax Base</span>
                        <p className="font-medium">
                          {formatCurrency(
                            breakdown.items_total + breakdown.customs,
                            quote.currency
                          )}
                        </p>
                      </div>
                    </div>

                    <ShowAtLevel minLevel={DisclosureLevel.ADVANCED}>
                      <div className="text-xs space-y-1">
                        <p className="text-muted-foreground">
                          Applied to: Product value + Customs duty
                        </p>
                        {quote.destination_country === 'IN' && (
                          <p className="text-blue-600">
                            Includes IGST (Integrated GST) for imports
                          </p>
                        )}
                      </div>
                    </ShowAtLevel>
                  </div>
                </DisclosureSection>
              )}

              {/* Origin Tax Section */}
              {breakdown.purchase_tax > 0 && (
                <DisclosureSection
                  id="origin-tax"
                  title={`${quote.origin_country} Sales Tax`}
                  subtitle="Tax at origin"
                  icon={DollarSign}
                  badge={formatCurrency(breakdown.purchase_tax, quote.currency)}
                  minLevel={DisclosureLevel.ADVANCED}
                >
                  <div className="text-sm text-muted-foreground">
                    Sales tax applied in {quote.origin_country}
                  </div>
                </DisclosureSection>
              )}
            </div>
          </DisclosureContainer>

          {/* Level 3: Advanced - Per-item breakdown */}
          <DisclosureContainer minLevel={DisclosureLevel.ADVANCED}>
            <Separator />
            <DisclosureSection
              id="per-item"
              title="Per-Item Tax Details"
              subtitle="Individual product tax calculations"
              icon={Package}
              defaultExpanded={false}
            >
              <div className="space-y-3">
                {quote.items.map((item, index) => (
                  <div key={item.id || index} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.hsn_code && (
                          <p className="text-xs text-muted-foreground">
                            HSN: {item.hsn_code}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.quantity} × {formatCurrency(item.costprice_origin, quote.currency)}
                      </Badge>
                    </div>

                    <ShowAtLevel minLevel={DisclosureLevel.EXPERT}>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <span className="text-muted-foreground">Customs</span>
                          <p className="font-medium">
                            {formatCurrency(
                              item.costprice_origin * item.quantity * 
                              (quote.operational_data?.customs?.percentage || 0) / 100,
                              quote.currency
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">VAT/GST</span>
                          <p className="font-medium">
                            {formatCurrency(
                              item.costprice_origin * item.quantity * 
                              (quote.operational_data?.customs?.smart_tier?.vat_percentage || 0) / 100,
                              quote.currency
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Tax</span>
                          <p className="font-medium text-blue-600">
                            {formatCurrency(
                              item.costprice_origin * item.quantity * 
                              ((quote.operational_data?.customs?.percentage || 0) + 
                               (quote.operational_data?.customs?.smart_tier?.vat_percentage || 0)) / 100,
                              quote.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </ShowAtLevel>
                  </div>
                ))}
              </div>
            </DisclosureSection>
          </DisclosureContainer>

          {/* Level 4: Expert - Complete calculation details */}
          <DisclosureContainer minLevel={DisclosureLevel.EXPERT}>
            <Separator />
            <DisclosureSection
              id="calculation-details"
              title="Complete Calculation Details"
              subtitle="Full tax computation breakdown"
              icon={Settings}
              defaultExpanded={false}
            >
              <div className="space-y-4">
                {/* Calculation formula */}
                <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs">
                  <p className="font-semibold mb-2">Tax Calculation Formula:</p>
                  <div className="space-y-1">
                    <p>Items Total: {formatCurrency(breakdown.items_total, quote.currency)}</p>
                    <p>+ Shipping: {formatCurrency(breakdown.shipping || 0, quote.currency)}</p>
                    <p>= CIF Value: {formatCurrency(breakdown.items_total + (breakdown.shipping || 0), quote.currency)}</p>
                    <p className="mt-2">Customs ({quote.operational_data?.customs?.percentage}%): {formatCurrency(breakdown.customs, quote.currency)}</p>
                    <p>VAT Base: CIF + Customs = {formatCurrency(breakdown.items_total + (breakdown.shipping || 0) + breakdown.customs, quote.currency)}</p>
                    <p>VAT ({quote.operational_data?.customs?.smart_tier?.vat_percentage}%): {formatCurrency(breakdown.destination_tax, quote.currency)}</p>
                    <p className="mt-2 font-semibold border-t pt-2">
                      Total Tax: {formatCurrency(breakdown.customs + breakdown.destination_tax, quote.currency)}
                    </p>
                  </div>
                </div>

                {/* Debug information */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Debug Information</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/20 rounded p-2">
                      <span className="text-muted-foreground">Calculation Method:</span>
                      <p className="font-medium">{taxMethod}</p>
                    </div>
                    <div className="bg-muted/20 rounded p-2">
                      <span className="text-muted-foreground">HSN Items:</span>
                      <p className="font-medium">{quote.items.filter(i => i.hsn_code).length}/{quote.items.length}</p>
                    </div>
                    <div className="bg-muted/20 rounded p-2">
                      <span className="text-muted-foreground">Route:</span>
                      <p className="font-medium">{quote.origin_country} → {quote.destination_country}</p>
                    </div>
                    <div className="bg-muted/20 rounded p-2">
                      <span className="text-muted-foreground">Exchange Rate:</span>
                      <p className="font-medium">{quote.calculation_data?.exchange_rate || 1}</p>
                    </div>
                  </div>
                </div>
              </div>
            </DisclosureSection>
          </DisclosureContainer>
        </CardContent>
      </Card>
    </DisclosureProvider>
  );
}