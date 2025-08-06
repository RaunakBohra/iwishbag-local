/**
 * PaymentGatewaySection Component
 * Handles payment gateway selection and configuration
 * Extracted from EnhancedPaymentLinkGenerator for better maintainability
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Zap, Smartphone } from 'lucide-react';

interface PaymentGatewayFormData {
  gateway: 'payu' | 'stripe' | 'razorpay';
  apiMethod: 'rest' | 'websdk' | 'mobile';
  template: 'default' | 'minimal' | 'branded';
  partialPaymentAllowed: boolean;
}

interface PaymentGatewaySectionProps {
  formData: PaymentGatewayFormData;
  onFormDataChange: (field: keyof PaymentGatewayFormData, value: any) => void;
  className?: string;
}

const GATEWAY_OPTIONS = [
  {
    value: 'payu',
    label: 'PayU India',
    description: 'Best for Indian customers',
    icon: '🇮🇳',
    features: ['UPI', 'Net Banking', 'Cards', 'Wallets'],
  },
  {
    value: 'stripe',
    label: 'Stripe',
    description: 'Global payment processing',
    icon: '🌍',
    features: ['Cards', 'Apple Pay', 'Google Pay', 'Bank Transfers'],
  },
  {
    value: 'razorpay',
    label: 'Razorpay',
    description: 'Indian payment gateway',
    icon: '💙',
    features: ['UPI', 'QR Code', 'Cards', 'Banking'],
  },
] as const;

const API_METHOD_OPTIONS = [
  {
    value: 'rest',
    label: 'REST API',
    description: 'Standard payment links',
    icon: Zap,
    color: 'text-blue-600',
  },
  {
    value: 'websdk',
    label: 'Web SDK',
    description: 'Embedded checkout',
    icon: Shield,
    color: 'text-green-600',
  },
  {
    value: 'mobile',
    label: 'Mobile SDK',
    description: 'Mobile optimized',
    icon: Smartphone,
    color: 'text-purple-600',
  },
] as const;

const TEMPLATE_OPTIONS = [
  {
    value: 'default',
    label: 'Default',
    description: 'Standard payment page',
    preview: 'Full featured with branding',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Clean, simple interface',
    preview: 'Minimalist design',
  },
  {
    value: 'branded',
    label: 'Branded',
    description: 'Custom branded experience',
    preview: 'Your brand colors and logo',
  },
] as const;

export const PaymentGatewaySection: React.FC<PaymentGatewaySectionProps> = ({
  formData,
  onFormDataChange,
  className = '',
}) => {
  const selectedGateway = GATEWAY_OPTIONS.find(g => g.value === formData.gateway);
  const selectedApiMethod = API_METHOD_OPTIONS.find(m => m.value === formData.apiMethod);
  const selectedTemplate = TEMPLATE_OPTIONS.find(t => t.value === formData.template);

  const getApiMethodBadge = (method: string) => {
    const methodConfig = API_METHOD_OPTIONS.find(m => m.value === method);
    if (!methodConfig) return null;

    const Icon = methodConfig.icon;
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${methodConfig.color}`} />
        {methodConfig.label}
      </Badge>
    );
  };

  const getTemplateBadge = (template: string) => {
    const badges = {
      default: { color: 'bg-blue-100 text-blue-800', label: 'Standard' },
      minimal: { color: 'bg-gray-100 text-gray-800', label: 'Clean' },
      branded: { color: 'bg-purple-100 text-purple-800', label: 'Custom' },
    };

    const config = badges[template as keyof typeof badges] || badges.default;
    return (
      <Badge className={`${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Gateway Configuration</h3>
        
        {/* Gateway Selection */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedGateway?.icon} Payment Gateway
            </CardTitle>
            <CardDescription>
              Choose the payment processor for this link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Gateway Provider</Label>
              <Select 
                value={formData.gateway} 
                onValueChange={(value) => onFormDataChange('gateway', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GATEWAY_OPTIONS.map((gateway) => (
                    <SelectItem key={gateway.value} value={gateway.value}>
                      <div className="flex items-center gap-2">
                        <span>{gateway.icon}</span>
                        <div>
                          <div className="font-medium">{gateway.label}</div>
                          <div className="text-sm text-gray-500">{gateway.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gateway Features */}
            {selectedGateway && (
              <div>
                <Label>Supported Payment Methods</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedGateway.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Method Selection */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Integration Method</CardTitle>
            <CardDescription>
              Select how customers will interact with the payment form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>API Method</Label>
              <Select 
                value={formData.apiMethod} 
                onValueChange={(value) => onFormDataChange('apiMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {API_METHOD_OPTIONS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${method.color}`} />
                          <div>
                            <div className="font-medium">{method.label}</div>
                            <div className="text-sm text-gray-500">{method.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedApiMethod && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Selected:</span>
                  {getApiMethodBadge(formData.apiMethod)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template & Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Page Settings</CardTitle>
            <CardDescription>
              Customize the appearance and behavior of the payment page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template Style</Label>
              <Select 
                value={formData.template} 
                onValueChange={(value) => onFormDataChange('template', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      <div>
                        <div className="font-medium">{template.label}</div>
                        <div className="text-sm text-gray-500">{template.description}</div>
                        <div className="text-xs text-gray-400">{template.preview}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Template:</span>
                {getTemplateBadge(formData.template)}
              </div>
            )}

            {/* Partial Payment Setting */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label>Partial Payments</Label>
                <p className="text-sm text-gray-600">
                  Allow customers to pay a portion of the total amount
                </p>
              </div>
              <Switch
                checked={formData.partialPaymentAllowed}
                onCheckedChange={(checked) => onFormDataChange('partialPaymentAllowed', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};