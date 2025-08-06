import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Target, Edit2, Trash2 } from 'lucide-react';
import { DiscountService, type DiscountCampaign } from '@/services/DiscountService';
import { toast } from 'sonner';

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

interface DiscountTier {
  id: string;
  discount_type_id: string;
  min_order_value: number;
  max_order_value?: number;
  discount_value: number;
  applicable_components: string[];
  description?: string;
  priority?: number;
  usage_count?: number;
  total_savings?: number;
  avg_order_value?: number;
  last_used_at?: string;
  created_at: string;
}

interface DiscountRulesSectionProps {
  countryRules: CountryDiscountRule[];
  discountTiers: DiscountTier[];
  campaigns: DiscountCampaign[];
  onCountryRulesChange: (rules: CountryDiscountRule[]) => void;
  onDiscountTiersChange: (tiers: DiscountTier[]) => void;
  onCountryRuleEdit: (rule: CountryDiscountRule) => void;
  onDiscountTierEdit: (tier: DiscountTier) => void;
  activeTab: string;
}

export const DiscountRulesSection: React.FC<DiscountRulesSectionProps> = ({
  countryRules,
  discountTiers,
  campaigns,
  onCountryRulesChange,
  onDiscountTiersChange,
  onCountryRuleEdit,
  onDiscountTierEdit,
  activeTab,
}) => {
  const handleDeleteCountryRule = async (ruleId: string) => {
    try {
      await DiscountService.deleteCountryRule(ruleId);
      const updatedRules = countryRules.filter(r => r.id !== ruleId);
      onCountryRulesChange(updatedRules);
      toast.success('Country rule deleted successfully');
    } catch (error) {
      console.error('Error deleting country rule:', error);
      toast.error('Failed to delete country rule');
    }
  };

  const handleDeleteDiscountTier = async (tierId: string) => {
    try {
      await DiscountService.deleteDiscountTier(tierId);
      const updatedTiers = discountTiers.filter(t => t.id !== tierId);
      onDiscountTiersChange(updatedTiers);
      toast.success('Discount tier deleted successfully');
    } catch (error) {
      console.error('Error deleting discount tier:', error);
      toast.error('Failed to delete discount tier');
    }
  };

  if (activeTab === 'country-rules') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Country-Specific Rules</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure discounts based on customer location
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Globe className="mr-2 h-4 w-4" />
                  Create Country Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Country-Specific Discount Rule</DialogTitle>
                  <DialogDescription>
                    Set up component-specific discounts for a particular country
                  </DialogDescription>
                </DialogHeader>
                {/* Country rule creation form would go here */}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {countryRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No country rules found. Create your first rule to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {countryRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {rule.country_code}
                        </Badge>
                        <span className="font-medium">
                          {rule.discount_type?.name || 'Unknown Campaign'}
                        </span>
                        {rule.auto_apply && (
                          <Badge variant="default" className="text-xs">
                            Auto-Apply
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.description || 'No description provided'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {Object.entries(rule.component_discounts).map(([component, discount]) => (
                          <Badge key={component} variant="secondary" className="text-xs">
                            {component.replace('_', ' ')}: {discount}%
                          </Badge>
                        ))}
                      </div>

                      {rule.min_order_amount && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Min order: ${rule.min_order_amount}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCountryRuleEdit(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCountryRule(rule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'discount-tiers') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Volume Discount Tiers</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up tiered discounts based on order value
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Target className="mr-2 h-4 w-4" />
                  Create Tier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Volume Discount Tier</DialogTitle>
                  <DialogDescription>
                    Set up tiered discounts based on order value
                  </DialogDescription>
                </DialogHeader>
                {/* Tier creation form would go here */}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {discountTiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No discount tiers found. Create your first tier to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {discountTiers
                  .sort((a, b) => a.min_order_value - b.min_order_value)
                  .map((tier) => (
                  <div 
                    key={tier.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          ${tier.min_order_value}
                          {tier.max_order_value ? ` - $${tier.max_order_value}` : '+'}
                        </Badge>
                        <span className="font-medium">
                          {tier.discount_value}% off
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {tier.description || 'No description provided'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {tier.applicable_components.map((component) => (
                          <Badge key={component} variant="secondary" className="text-xs">
                            {component.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Uses: {tier.usage_count || 0}</span>
                        {tier.total_savings && (
                          <span>Total Savings: ${tier.total_savings.toFixed(2)}</span>
                        )}
                        {tier.avg_order_value && (
                          <span>Avg Order: ${tier.avg_order_value.toFixed(2)}</span>
                        )}
                        {tier.last_used_at && (
                          <span>Last Used: {new Date(tier.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDiscountTierEdit(tier)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDiscountTier(tier.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};