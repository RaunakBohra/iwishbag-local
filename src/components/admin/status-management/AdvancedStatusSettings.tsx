import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Banknote, Clock, Mail } from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface AdvancedStatusSettingsProps {
  editingStatus: StatusConfig;
  onUpdateStatus: (id: string, updates: Partial<StatusConfig>, category: string) => void;
}

export const AdvancedStatusSettings: React.FC<AdvancedStatusSettingsProps> = ({
  editingStatus,
  onUpdateStatus
}) => {
  const updateField = (field: keyof StatusConfig, value: any) => {
    onUpdateStatus(editingStatus.id, { [field]: value }, editingStatus.category);
  };

  const updateCODSettings = (field: string, value: any) => {
    const currentCODSettings = editingStatus.codSettings || {};
    const updatedCODSettings = {
      ...currentCODSettings,
      [field]: value
    };
    
    onUpdateStatus(
      editingStatus.id,
      { codSettings: updatedCODSettings },
      editingStatus.category
    );
  };

  return (
    <fieldset className="border-t border-gray-200 pt-4">
      <legend className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <Settings className="h-4 w-4" />
        <span>Advanced Configuration</span>
      </legend>

      <div className="space-y-6">
        
        {/* Conditional Visibility */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-800 border-b pb-2">
            Conditional Visibility
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="show-if-payment-method">Show Only for Payment Methods</Label>
              <Input
                id="show-if-payment-method"
                value={editingStatus.showIfPaymentMethod || ''}
                onChange={(e) => updateField('showIfPaymentMethod', e.target.value)}
                placeholder="e.g., stripe,paypal"
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list. Leave empty to show for all payment methods.
              </p>
            </div>

            <div>
              <Label htmlFor="hide-if-country">Hide for Countries</Label>
              <Input
                id="hide-if-country"
                value={editingStatus.hideIfCountry || ''}
                onChange={(e) => updateField('hideIfCountry', e.target.value)}
                placeholder="e.g., US,CA,GB"
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated country codes to hide this status from.
              </p>
            </div>
          </div>
        </div>

        {/* Auto Progress Settings */}
        {editingStatus.autoProgress && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800 border-b pb-2 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Auto Progress Configuration</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auto-progress-delay">Progress Delay (minutes)</Label>
                <Input
                  id="auto-progress-delay"
                  type="number"
                  value={editingStatus.autoProgressDelay || 0}
                  onChange={(e) => updateField('autoProgressDelay', parseInt(e.target.value))}
                  min="0"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Delay before auto-progressing (0 = immediate)
                </p>
              </div>

              <div>
                <Label htmlFor="auto-progress-to">Progress To Status</Label>
                <Input
                  id="auto-progress-to"
                  value={editingStatus.autoProgressTo || ''}
                  onChange={(e) => updateField('autoProgressTo', e.target.value)}
                  placeholder="e.g., approved"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Status name to automatically progress to
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="auto-progress-condition">Progress Condition</Label>
              <Select
                value={editingStatus.autoProgressCondition || 'always'}
                onValueChange={(value) => updateField('autoProgressCondition', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="payment_received">Payment Received</SelectItem>
                  <SelectItem value="admin_approval">Admin Approval Required</SelectItem>
                  <SelectItem value="time_based">Time Based Only</SelectItem>
                  <SelectItem value="external_trigger">External System Trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Email Configuration */}
        {editingStatus.sendEmail && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-800 border-b pb-2 flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Configuration</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email-template-id">Email Template ID</Label>
                <Input
                  id="email-template-id"
                  value={editingStatus.emailTemplateId || ''}
                  onChange={(e) => updateField('emailTemplateId', e.target.value)}
                  placeholder="e.g., order-confirmed"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Reference to email template in system
                </p>
              </div>

              <div>
                <Label htmlFor="email-subject">Email Subject</Label>
                <Input
                  id="email-subject"
                  value={editingStatus.emailSubject || ''}
                  onChange={(e) => updateField('emailSubject', e.target.value)}
                  placeholder="Order Status Updated"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom subject line for status change emails
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="email-template">Email Template</Label>
              <Textarea
                id="email-template"
                value={editingStatus.emailTemplate || ''}
                onChange={(e) => updateField('emailTemplate', e.target.value)}
                placeholder="Dear {{customer_name}}, your order status has been updated to {{status_label}}..."
                rows={4}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{'}{'{'} customer_name {'}'}{'}'}, {'{'}{'{'} status_label {'}'}{'}'}, {'{'}{'{'} quote_id {'}'}{'}'}, {'{'}{'{'} order_url {'}'}{'}'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-send-to-admin">Send Copy to Admin</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Send notification copy to admin users
                </p>
              </div>
              <Switch
                id="email-send-to-admin"
                checked={editingStatus.emailSendToAdmin || false}
                onCheckedChange={(checked) => updateField('emailSendToAdmin', checked)}
              />
            </div>
          </div>
        )}

        {/* Cash on Delivery (COD) Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-800 border-b pb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Banknote className="h-4 w-4" />
              <span>Cash on Delivery (COD) Settings</span>
            </div>
            <Switch
              checked={!!editingStatus.codSettings}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateField('codSettings', {
                    enabled: true,
                    maxAmount: 1000,
                    allowedCountries: ['IN', 'NP'],
                    verificationRequired: true
                  });
                } else {
                  updateField('codSettings', null);
                }
              }}
            />
          </h4>

          {editingStatus.codSettings && (
            <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cod-max-amount">Maximum COD Amount</Label>
                  <Input
                    id="cod-max-amount"
                    type="number"
                    value={editingStatus.codSettings.maxAmount || 0}
                    onChange={(e) => updateCODSettings('maxAmount', parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum order value allowed for COD (USD)
                  </p>
                </div>

                <div>
                  <Label htmlFor="cod-allowed-countries">Allowed Countries</Label>
                  <Input
                    id="cod-allowed-countries"
                    value={editingStatus.codSettings.allowedCountries?.join(',') || ''}
                    onChange={(e) => updateCODSettings('allowedCountries', e.target.value.split(',').filter(c => c.trim()))}
                    placeholder="IN,NP,BD"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated country codes where COD is allowed
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cod-verification-required">Verification Required</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Require phone verification for COD orders
                  </p>
                </div>
                <Switch
                  id="cod-verification-required"
                  checked={editingStatus.codSettings.verificationRequired || false}
                  onCheckedChange={(checked) => updateCODSettings('verificationRequired', checked)}
                />
              </div>

              <div>
                <Label htmlFor="cod-instructions">COD Instructions</Label>
                <Textarea
                  id="cod-instructions"
                  value={editingStatus.codSettings.instructions || ''}
                  onChange={(e) => updateCODSettings('instructions', e.target.value)}
                  placeholder="Please have exact change ready. Our delivery partner will collect payment..."
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Instructions shown to customers for COD orders
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Fields */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-800 border-b pb-2">
            Custom Configuration
          </h4>
          
          <div>
            <Label htmlFor="custom-config">Custom JSON Configuration</Label>
            <Textarea
              id="custom-config"
              value={editingStatus.customConfig ? JSON.stringify(editingStatus.customConfig, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || '{}');
                  updateField('customConfig', parsed);
                } catch (error) {
                  // Invalid JSON - don't update
                }
              }}
              placeholder='{"key": "value", "webhookUrl": "https://example.com/webhook"}'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Advanced configuration in JSON format for custom integrations
            </p>
          </div>
        </div>

        {/* Advanced Configuration Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-violet-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-violet-800">
                <strong>Advanced Features:</strong> These settings provide granular control over status behavior. COD settings handle cash-on-delivery specific requirements, while auto-progress enables workflow automation. Email templates allow for customized communication with customers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
};