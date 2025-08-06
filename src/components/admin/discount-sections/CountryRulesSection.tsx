import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus, Globe, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CountryDiscountRule {
  id: string;
  discount_type_id: string;
  country_code: string;
  component_discounts: { [component: string]: number };
  min_order_amount?: number;
  max_uses_per_customer?: number;
  requires_code?: boolean;
  auto_apply?: boolean;
  description?: string;
  priority?: number;
  discount_conditions?: any;
  created_at: string;
  discount_type?: {
    id: string;
    name: string;
    code: string;
    type: string;
    value: number;
  };
}

interface CountryRulesSectionProps {
  countryRules: CountryDiscountRule[];
  onCreateRule: () => void;
  onEditRule: (rule: CountryDiscountRule) => void;
  onRefresh: () => void;
}

export const CountryRulesSection: React.FC<CountryRulesSectionProps> = ({
  countryRules,
  onCreateRule,
  onEditRule,
  onRefresh
}) => {
  const [selectedRules, setSelectedRules] = useState<string[]>([]);

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this country rule? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('country_discount_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast.success('Country rule deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete country rule');
    }
  };

  const getCountryName = (countryCode: string) => {
    // Simple country code to name mapping - in a real app, use a proper library
    const countryNames: { [key: string]: string } = {
      'US': 'United States',
      'CA': 'Canada', 
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'NZ': 'New Zealand',
      'SG': 'Singapore',
    };
    return countryNames[countryCode] || countryCode;
  };

  const formatComponentDiscounts = (componentDiscounts: { [component: string]: number }) => {
    return Object.entries(componentDiscounts)
      .map(([component, discount]) => `${component}: ${discount}%`)
      .join(', ');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Country-Specific Rules</h3>
          <p className="text-sm text-gray-600">
            Configure location-based discount rules and component-specific discounts
          </p>
        </div>
        <Button onClick={onCreateRule}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Rules grid */}
      <div className="grid gap-4">
        {countryRules.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No country rules found</h3>
              <p className="text-sm">
                Create location-specific discount rules to target customers in different countries.
              </p>
            </div>
          </Card>
        ) : (
          countryRules.map((rule) => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <span>{getCountryName(rule.country_code)}</span>
                      <Badge variant="outline" className="font-mono">
                        {rule.country_code}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      {rule.auto_apply && (
                        <Badge variant="default">Auto-Apply</Badge>
                      )}
                      {rule.requires_code && (
                        <Badge variant="secondary">Requires Code</Badge>
                      )}
                      {rule.priority && (
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditRule(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Description */}
                  {rule.description && (
                    <div>
                      <span className="text-gray-500 text-sm">Description:</span>
                      <p className="mt-1 text-sm">{rule.description}</p>
                    </div>
                  )}

                  {/* Component Discounts */}
                  <div>
                    <span className="text-gray-500 text-sm">Component Discounts:</span>
                    <div className="mt-1">
                      {Object.keys(rule.component_discounts).length === 0 ? (
                        <span className="text-sm text-gray-400">No component discounts</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(rule.component_discounts).map(([component, discount]) => (
                            <Badge key={component} variant="outline" className="text-xs">
                              {component}: {discount}%
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Min Order Amount:</span>
                      <p className="mt-1">
                        {rule.min_order_amount ? `$${rule.min_order_amount}` : 'None'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Uses per Customer:</span>
                      <p className="mt-1">
                        {rule.max_uses_per_customer || 'Unlimited'}
                      </p>
                    </div>
                  </div>

                  {/* Associated Discount Type */}
                  {rule.discount_type && (
                    <div className="pt-3 border-t">
                      <span className="text-gray-500 text-sm">Discount Type:</span>
                      <div className="mt-1 flex items-center space-x-2">
                        <Badge variant="default">
                          {rule.discount_type.name}
                        </Badge>
                        <Badge variant="outline">
                          {rule.discount_type.type === 'percentage' 
                            ? `${rule.discount_type.value}%`
                            : `$${rule.discount_type.value}`}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Code: {rule.discount_type.code}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary stats */}
      {countryRules.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-500" />
                <span>Total Rules: {countryRules.length}</span>
              </div>
              <div className="text-gray-500">
                Countries: {new Set(countryRules.map(r => r.country_code)).size}
              </div>
              <div className="text-gray-500">
                Auto-Apply: {countryRules.filter(r => r.auto_apply).length}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};