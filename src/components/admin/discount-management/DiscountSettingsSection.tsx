import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Banknote, Layers, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentDiscounts {
  bank_transfer: { percentage: number; is_active: boolean };
  wire_transfer: { percentage: number; is_active: boolean };
}

interface StackingRules {
  allow_multiple_campaigns: boolean;
  allow_code_with_auto: boolean;
  max_discount_percentage: number;
  priority_order: string[];
}

interface TriggerRules {
  happy_hour: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    days?: number[];
    discount_percentage: number;
  };
  cart_abandonment: {
    enabled: boolean;
    delay_hours: number;
    discount_percentage: number;
    max_uses_per_customer: number;
  };
}

interface DiscountSettingsSectionProps {
  paymentDiscounts: PaymentDiscounts;
  stackingRules: StackingRules;
  triggerRules: TriggerRules;
  onPaymentDiscountsChange: (discounts: PaymentDiscounts) => void;
  onStackingRulesChange: (rules: StackingRules) => void;
  onTriggerRulesChange: (rules: TriggerRules) => void;
  onSaveSettings: () => Promise<void>;
}

export const DiscountSettingsSection: React.FC<DiscountSettingsSectionProps> = ({
  paymentDiscounts,
  stackingRules,
  triggerRules,
  onPaymentDiscountsChange,
  onStackingRulesChange,
  onTriggerRulesChange,
  onSaveSettings,
}) => {
  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'Unknown';
  };

  const handleSaveSettings = async () => {
    try {
      await onSaveSettings();
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Discounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Payment Method Discounts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure automatic discounts for specific payment methods
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(paymentDiscounts).map(([method, config]) => (
            <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={config.is_active}
                  onCheckedChange={(checked) => {
                    onPaymentDiscountsChange({
                      ...paymentDiscounts,
                      [method]: { ...config, is_active: checked }
                    });
                  }}
                />
                <div>
                  <p className="font-medium capitalize">
                    {method.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Encourage {method.replace('_', ' ')} payments
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={config.percentage}
                  onChange={(e) => {
                    onPaymentDiscountsChange({
                      ...paymentDiscounts,
                      [method]: { ...config, percentage: parseFloat(e.target.value) || 0 }
                    });
                  }}
                  className="w-20"
                  min="0"
                  max="50"
                  step="0.1"
                />
                <span className="text-sm">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stacking Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Discount Stacking Rules
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control how multiple discounts can be combined
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow Multiple Campaigns</Label>
              <p className="text-xs text-muted-foreground">
                Enable customers to benefit from multiple active campaigns
              </p>
            </div>
            <Switch
              checked={stackingRules.allow_multiple_campaigns}
              onCheckedChange={(checked) => {
                onStackingRulesChange({
                  ...stackingRules,
                  allow_multiple_campaigns: checked
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow Code with Auto-Apply</Label>
              <p className="text-xs text-muted-foreground">
                Allow discount codes to stack with automatic campaigns
              </p>
            </div>
            <Switch
              checked={stackingRules.allow_code_with_auto}
              onCheckedChange={(checked) => {
                onStackingRulesChange({
                  ...stackingRules,
                  allow_code_with_auto: checked
                });
              }}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Maximum Total Discount</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input
                type="number"
                value={stackingRules.max_discount_percentage}
                onChange={(e) => {
                  onStackingRulesChange({
                    ...stackingRules,
                    max_discount_percentage: parseFloat(e.target.value) || 0
                  });
                }}
                className="w-24"
                min="0"
                max="100"
                step="1"
              />
              <span className="text-sm">% maximum total discount</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cap the total discount percentage across all stacked discounts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automatic Triggers
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set up time-based and behavior-triggered discounts
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Happy Hour Section */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <Label htmlFor="happy-hour-toggle" className="font-medium">Happy Hour Discount</Label>
              </div>
              <Switch
                id="happy-hour-toggle"
                checked={triggerRules.happy_hour.enabled}
                onCheckedChange={(enabled) => onTriggerRulesChange({
                  ...triggerRules,
                  happy_hour: {
                    ...triggerRules.happy_hour,
                    enabled
                  }
                })}
              />
            </div>

            {triggerRules.happy_hour.enabled && (
              <div className="space-y-4 pl-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input
                      type="time"
                      value={triggerRules.happy_hour.start_time}
                      onChange={(e) => onTriggerRulesChange({
                        ...triggerRules,
                        happy_hour: {
                          ...triggerRules.happy_hour,
                          start_time: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input
                      type="time"
                      value={triggerRules.happy_hour.end_time}
                      onChange={(e) => onTriggerRulesChange({
                        ...triggerRules,
                        happy_hour: {
                          ...triggerRules.happy_hour,
                          end_time: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number"
                      value={triggerRules.happy_hour.discount_percentage}
                      onChange={(e) => onTriggerRulesChange({
                        ...triggerRules,
                        happy_hour: {
                          ...triggerRules.happy_hour,
                          discount_percentage: parseFloat(e.target.value) || 0
                        }
                      })}
                      min="0"
                      max="50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Active Days</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <Button
                        key={day}
                        variant={triggerRules.happy_hour.days?.includes(day) ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs px-2 py-1 h-7"
                        onClick={() => {
                          const currentDays = triggerRules.happy_hour.days || [];
                          const newDays = currentDays.includes(day)
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day];
                          
                          onTriggerRulesChange({
                            ...triggerRules,
                            happy_hour: {
                              ...triggerRules.happy_hour,
                              days: newDays
                            }
                          });
                        }}
                      >
                        {getDayName(day).slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">Happy Hour Preview</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Days:</p>
                      <div className="flex flex-wrap gap-1">
                        {triggerRules.happy_hour.days?.map((day: number) => (
                          <Badge key={day} variant="secondary" className="text-xs">
                            {getDayName(day)}
                          </Badge>
                        )) || <span className="text-xs text-muted-foreground">All days</span>}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Time & Discount:</p>
                      <p className="text-xs font-mono">
                        {triggerRules.happy_hour.start_time} - {triggerRules.happy_hour.end_time}
                      </p>
                      <p className="text-xs">
                        {triggerRules.happy_hour.discount_percentage}% off
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Abandonment Section */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Cart Abandonment</Badge>
                <Label htmlFor="cart-abandonment-toggle" className="font-medium">Recovery Discount</Label>
              </div>
              <Switch
                id="cart-abandonment-toggle"
                checked={triggerRules.cart_abandonment.enabled}
                onCheckedChange={(enabled) => onTriggerRulesChange({
                  ...triggerRules,
                  cart_abandonment: {
                    ...triggerRules.cart_abandonment,
                    enabled
                  }
                })}
              />
            </div>

            {triggerRules.cart_abandonment.enabled && (
              <div className="grid grid-cols-3 gap-4 pl-6">
                <div>
                  <Label className="text-xs">Delay (hours)</Label>
                  <Input
                    type="number"
                    value={triggerRules.cart_abandonment.delay_hours}
                    onChange={(e) => onTriggerRulesChange({
                      ...triggerRules,
                      cart_abandonment: {
                        ...triggerRules.cart_abandonment,
                        delay_hours: parseInt(e.target.value) || 0
                      }
                    })}
                    min="1"
                    max="168"
                  />
                </div>
                <div>
                  <Label className="text-xs">Discount %</Label>
                  <Input
                    type="number"
                    value={triggerRules.cart_abandonment.discount_percentage}
                    onChange={(e) => onTriggerRulesChange({
                      ...triggerRules,
                      cart_abandonment: {
                        ...triggerRules.cart_abandonment,
                        discount_percentage: parseFloat(e.target.value) || 0
                      }
                    })}
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max Uses/Customer</Label>
                  <Input
                    type="number"
                    value={triggerRules.cart_abandonment.max_uses_per_customer}
                    onChange={(e) => onTriggerRulesChange({
                      ...triggerRules,
                      cart_abandonment: {
                        ...triggerRules.cart_abandonment,
                        max_uses_per_customer: parseInt(e.target.value) || 0
                      }
                    })}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="min-w-[120px]">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};