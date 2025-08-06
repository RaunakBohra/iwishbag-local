import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Settings } from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

const colorOptions = [
  { value: 'default', label: 'Default', className: 'bg-teal-100 text-teal-800' },
  { value: 'secondary', label: 'Secondary', className: 'bg-gray-100 text-gray-800' },
  { value: 'outline', label: 'Outline', className: 'bg-white text-gray-800 border' },
  { value: 'destructive', label: 'Destructive', className: 'bg-red-100 text-red-800' },
  { value: 'success', label: 'Success', className: 'bg-green-100 text-green-800' },
  { value: 'warning', label: 'Warning', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'info', label: 'Info', className: 'bg-sky-100 text-sky-800' },
  { value: 'purple', label: 'Purple', className: 'bg-orange-100 text-orange-800' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-100 text-pink-800' },
  { value: 'indigo', label: 'Indigo', className: 'bg-teal-100 text-cyan-800' },
  { value: 'emerald', label: 'Emerald', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'amber', label: 'Amber', className: 'bg-amber-100 text-amber-800' },
  { value: 'rose', label: 'Rose', className: 'bg-rose-100 text-rose-800' },
  { value: 'violet', label: 'Violet', className: 'bg-violet-100 text-violet-800' },
  { value: 'cyan', label: 'Cyan', className: 'bg-cyan-100 text-cyan-800' },
  { value: 'lime', label: 'Lime', className: 'bg-lime-100 text-lime-800' },
];

interface StatusEditorProps {
  status: StatusConfig;
  onUpdateStatus: (id: string, updates: Partial<StatusConfig>, category: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const StatusEditor: React.FC<StatusEditorProps> = ({
  status,
  onUpdateStatus,
  onSave,
  onCancel,
  isSaving
}) => {
  const updateField = (field: keyof StatusConfig, value: any) => {
    onUpdateStatus(status.id, { [field]: value }, status.category);
  };

  const getBadgeClassName = (color: string) => {
    const colorOption = colorOptions.find(option => option.value === color);
    return colorOption?.className || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-5 w-5 text-teal-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Status Configuration
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure the appearance and behavior of this status
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status-name">Status Name *</Label>
                <Input
                  id="status-name"
                  value={status.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., pending"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Internal identifier (lowercase, no spaces)
                </p>
              </div>

              <div>
                <Label htmlFor="status-label">Display Label *</Label>
                <Input
                  id="status-label"
                  value={status.label || ''}
                  onChange={(e) => updateField('label', e.target.value)}
                  placeholder="e.g., Pending"
                />
                <p className="text-xs text-gray-500 mt-1">
                  User-friendly display name
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="status-description">Description</Label>
              <Textarea
                id="status-description"
                value={status.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe what this status represents..."
                rows={3}
              />
            </div>
          </div>

          {/* Visual Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Visual Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status-color">Badge Color</Label>
                <Select
                  value={status.color || 'default'}
                  onValueChange={(value) => updateField('color', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-4 h-4 rounded-full ${color.className}`}
                          />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-order">Display Order</Label>
                <Input
                  id="status-order"
                  type="number"
                  value={status.order || 0}
                  onChange={(e) => updateField('order', parseInt(e.target.value))}
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Badge Preview</Label>
              <div className="mt-2">
                <Badge className={getBadgeClassName(status.color || 'default')}>
                  {status.label || 'Status Label'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Status Behavior */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Status Behavior
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requires-payment">Requires Payment</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Status requires payment to be completed
                    </p>
                  </div>
                  <Switch
                    id="requires-payment"
                    checked={status.requiresPayment || false}
                    onCheckedChange={(checked) => updateField('requiresPayment', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="final-status">Final Status</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      This is a terminal status (no further transitions)
                    </p>
                  </div>
                  <Switch
                    id="final-status"
                    checked={status.finalStatus || false}
                    onCheckedChange={(checked) => updateField('finalStatus', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-progress">Auto Progress</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically progress to next status
                    </p>
                  </div>
                  <Switch
                    id="auto-progress"
                    checked={status.autoProgress || false}
                    onCheckedChange={(checked) => updateField('autoProgress', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="send-email">Send Email Notification</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Send email when status changes to this
                    </p>
                  </div>
                  <Switch
                    id="send-email"
                    checked={status.sendEmail || false}
                    onCheckedChange={(checked) => updateField('sendEmail', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="visible-to-customer">Visible to Customer</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Show this status to customers
                    </p>
                  </div>
                  <Switch
                    id="visible-to-customer"
                    checked={status.visibleToCustomer !== false} // Default to true
                    onCheckedChange={(checked) => updateField('visibleToCustomer', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requires-admin-action">Requires Admin Action</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Requires manual admin intervention
                    </p>
                  </div>
                  <Switch
                    id="requires-admin-action"
                    checked={status.requiresAdminAction || false}
                    onCheckedChange={(checked) => updateField('requiresAdminAction', checked)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Template */}
          {status.sendEmail && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Email Configuration
              </h3>
              
              <div>
                <Label htmlFor="email-template">Email Template</Label>
                <Textarea
                  id="email-template"
                  value={status.emailTemplate || ''}
                  onChange={(e) => updateField('emailTemplate', e.target.value)}
                  placeholder="Your order status has been updated to {{status_label}}..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{'}{'{'} status_label {'}'}{'}'} and {'{'}{'{'} quote_id {'}'}{'}'} as placeholders
                </p>
              </div>
            </div>
          )}

          {/* Auto Progress Configuration */}
          {status.autoProgress && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Auto Progress Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="auto-progress-delay">Progress Delay (minutes)</Label>
                  <Input
                    id="auto-progress-delay"
                    type="number"
                    value={status.autoProgressDelay || 0}
                    onChange={(e) => updateField('autoProgressDelay', parseInt(e.target.value))}
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Delay before auto-progressing (0 = immediate)
                  </p>
                </div>

                <div>
                  <Label htmlFor="auto-progress-condition">Progress Condition</Label>
                  <Select
                    value={status.autoProgressCondition || 'always'}
                    onValueChange={(value) => updateField('autoProgressCondition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always</SelectItem>
                      <SelectItem value="payment_received">Payment Received</SelectItem>
                      <SelectItem value="admin_approval">Admin Approval</SelectItem>
                      <SelectItem value="time_based">Time Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving || !status.name || !status.label}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};