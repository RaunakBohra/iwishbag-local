import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, Shield, Percent, Package, DollarSign } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useCountryUtils } from '../../lib/countryUtils';
import { ShippingRouteDisplay } from '../shared/ShippingRouteDisplay';

interface CustomsTierDisplayProps {
  quote: any;
  shippingAddress?: any;
  className?: string;
  customsTiers: any[];
  appliedTier: any;
  loading: boolean;
  error: string | null;
}

interface CustomsTier {
  id: string;
  origin_country: string;
  destination_country: string;
  rule_name: string;
  price_min?: number;
  price_max?: number;
  weight_min?: number;
  weight_max?: number;
  logic_type: 'AND' | 'OR';
  customs_percentage: number;
  vat_percentage: number;
  priority_order: number;
  is_active: boolean;
  description?: string;
}

export const CustomsTierDisplay: React.FC<CustomsTierDisplayProps> = ({ 
  quote, 
  shippingAddress,
  className = '',
  customsTiers,
  appliedTier,
  loading,
  error
}) => {
  const { countries, getCountryDisplayName } = useCountryUtils();

  // Get quote details
  const originCountry = quote.origin_country || 'US';
  let destinationCountry = shippingAddress?.destination_country || shippingAddress?.country || quote.destination_country;
  if (destinationCountry && destinationCountry.length > 2) {
    const found = countries.find(c => c.name === destinationCountry);
    if (found) destinationCountry = found.code;
  }
  const quotePrice = quote.quote_items?.reduce((sum: number, item: any) => sum + (item.item_price || 0), 0) || 0;
  const quoteWeight = quote.quote_items?.reduce((sum: number, item: any) => sum + (item.item_weight || 0), 0) || 0;



  // Check if conditions match
  const checkConditions = (tier: any): { priceMatch: boolean; weightMatch: boolean } => {
    const priceMatch = (!tier.price_min || quotePrice >= tier.price_min) && 
                      (!tier.price_max || quotePrice <= tier.price_max);
    const weightMatch = (!tier.weight_min || quoteWeight >= tier.weight_min) && 
                       (!tier.weight_max || quoteWeight <= tier.weight_max);
    return { priceMatch, weightMatch };
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span className="text-sm text-muted-foreground">Loading customs tiers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-sm text-red-600">
            Error loading customs tiers: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customsTiers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Customs Tiers
          </CardTitle>
          <CardDescription className="text-xs">
            <ShippingRouteDisplay 
              origin={originCountry} 
              destination={destinationCountry}
              showIcon={false}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            No customs tiers configured for this route
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Customs Tiers
            </CardTitle>
            <CardDescription className="text-xs">
              <ShippingRouteDisplay 
                origin={originCountry} 
                destination={destinationCountry}
                showIcon={false}
              />
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Applied Tier Summary */}
        {appliedTier && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Applied
                </Badge>
                <span className="font-medium text-sm">{appliedTier.rule_name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-blue-800">
                  {appliedTier.customs_percentage}% customs
                </div>
                <div className="text-xs text-blue-600">
                  {appliedTier.vat_percentage}% VAT
                </div>
              </div>
            </div>
            {appliedTier.description && (
              <div className="mt-2 text-xs text-blue-700">
                {appliedTier.description}
              </div>
            )}
          </div>
        )}

        {/* All Tiers (when expanded) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            All Available Tiers:
          </div>
          {customsTiers.map((tier) => {
            const { priceMatch, weightMatch } = checkConditions(tier);
            const isApplied = appliedTier?.id === tier.id;
            
            return (
              <div
                key={tier.id}
                className={`p-2 rounded border text-xs ${
                  isApplied 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tier.rule_name}</span>
                    {isApplied && (
                      <Badge variant="default" className="text-xs">
                        Applied
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{tier.customs_percentage}%</div>
                    <div className="text-muted-foreground">{tier.vat_percentage}% VAT</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>
                      ${tier.price_min || 0} - {tier.price_max || '∞'}
                    </span>
                    {priceMatch && <span className="text-green-600">✓</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>
                      {tier.weight_min || 0} - {tier.weight_max || '∞'} kg
                    </span>
                    {weightMatch && <span className="text-green-600">✓</span>}
                  </div>
                </div>
                
                <div className="mt-1 text-xs text-blue-600">
                  Logic: {tier.logic_type} • Priority: {tier.priority_order}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quote Details Summary */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Quote Price:</span>
              <div className="font-medium">${quotePrice.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Quote Weight:</span>
              <div className="font-medium">{quoteWeight.toFixed(2)} kg</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 