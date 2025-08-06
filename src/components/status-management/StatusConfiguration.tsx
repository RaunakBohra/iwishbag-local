import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShoppingCart,
  Calculator,
  Banknote,
  X,
  Save,
  Loader2,
} from 'lucide-react';
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

const iconOptions = [
  { value: 'Clock', label: 'Clock', icon: Clock },
  { value: 'CheckCircle', label: 'Check Circle', icon: CheckCircle },
  { value: 'XCircle', label: 'X Circle', icon: XCircle },
  { value: 'AlertTriangle', label: 'Alert Triangle', icon: AlertTriangle },
  { value: 'Package', label: 'Package', icon: Package },
  { value: 'Truck', label: 'Truck', icon: Truck },
  { value: 'DollarSign', label: 'Dollar Sign', icon: DollarSign },
  { value: 'FileText', label: 'File Text', icon: FileText },
  { value: 'ShoppingCart', label: 'Shopping Cart', icon: ShoppingCart },
  { value: 'Calculator', label: 'Calculator', icon: Calculator },
  { value: 'Banknote', label: 'Banknote', icon: Banknote },
];

interface StatusConfigurationProps {
  editingStatus: StatusConfig;
  onUpdateStatus: (statusId: string, updates: Partial<StatusConfig>, category: 'quote' | 'order') => void;
  onClose: () => void;
  onSave: (statusId: string, category: 'quote' | 'order') => Promise<void>;
  isSaving: boolean;
}

export const StatusConfiguration: React.FC<StatusConfigurationProps> = ({
  editingStatus,
  onUpdateStatus,
  onClose,
  onSave,
  isSaving,
}) => {
  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find((opt) => opt.value === iconName);
    return iconOption ? iconOption.icon : Clock;
  };

  const handleSave = () => {
    onSave(editingStatus.id, editingStatus.category);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="edit-status-title"
      aria-describedby="edit-status-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900" id="edit-status-title">
                Edit Status: {editingStatus.label || editingStatus.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1" id="edit-status-desc">
                Configure the properties and behavior for this {editingStatus.category} status
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 border-gray-300 hover:bg-gray-50"
              aria-label="Close status configuration dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <fieldset className="space-y-6">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Basic Information
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="status-name" className="text-sm font-medium text-gray-700 mb-2 block">
                  Status Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="status-name"
                  type="text"
                  value={editingStatus.name}
                  onChange={(e) =>
                    onUpdateStatus(editingStatus.id, { name: e.target.value }, editingStatus.category)
                  }
                  placeholder="e.g., pending"
                  className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  aria-describedby="status-name-help"
                  aria-required="true"
                />
                <p className="text-xs text-gray-500 mt-1" id="status-name-help">
                  Internal identifier for this status (lowercase, no spaces)
                </p>
              </div>

              <div>
                <Label htmlFor="status-label" className="text-sm font-medium text-gray-700 mb-2 block">
                  Display Label <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="status-label"
                  type="text"
                  value={editingStatus.label}
                  onChange={(e) =>
                    onUpdateStatus(
                      editingStatus.id,
                      { label: e.target.value },
                      editingStatus.category,
                    )
                  }
                  placeholder="e.g., Pending"
                  className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  aria-describedby="status-label-help"
                  aria-required="true"
                />
                <p className="text-xs text-gray-500 mt-1" id="status-label-help">
                  User-friendly label displayed in the interface
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="status-description" className="text-sm font-medium text-gray-700 mb-2 block">
                Description
              </Label>
              <Textarea
                id="status-description"
                value={editingStatus.description}
                onChange={(e) =>
                  onUpdateStatus(
                    editingStatus.id,
                    { description: e.target.value },
                    editingStatus.category,
                  )
                }
                placeholder="Describe what this status means"
                className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                aria-describedby="status-description-help"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1" id="status-description-help">
                Optional description explaining what this status represents
              </p>
            </div>
          </fieldset>

          {/* Appearance */}
          <fieldset className="space-y-6">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Appearance
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="status-color" className="text-sm font-medium text-gray-700 mb-2 block">
                  Color Theme
                </Label>
                <Select
                  value={editingStatus.color}
                  onValueChange={(value) =>
                    onUpdateStatus(
                      editingStatus.id,
                      { color: value as string },
                      editingStatus.category,
                    )
                  }
                >
                  <SelectTrigger 
                    id="status-color"
                    className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                    aria-describedby="status-color-help"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full ${color.className}`} />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1" id="status-color-help">
                  Color scheme for status badges and indicators
                </p>
              </div>

              <div>
                <Label htmlFor="status-icon" className="text-sm font-medium text-gray-700 mb-2 block">
                  Icon
                </Label>
                <Select
                  value={editingStatus.icon}
                  onValueChange={(value) =>
                    onUpdateStatus(editingStatus.id, { icon: value }, editingStatus.category)
                  }
                >
                  <SelectTrigger 
                    id="status-icon"
                    className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                    aria-describedby="status-icon-help"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center space-x-2">
                          {React.createElement(icon.icon, { className: "h-4 w-4" })}
                          <span>{icon.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1" id="status-icon-help">
                  Icon displayed alongside the status
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Preview
              </Label>
              <div className="flex items-center space-x-3" aria-describedby="preview-description">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {React.createElement(getIconComponent(editingStatus.icon), {
                    className: "h-5 w-5 text-gray-600"
                  })}
                </div>
                <Badge 
                  variant={editingStatus.color}
                  aria-label={`Status badge: ${editingStatus.label || editingStatus.name}`}
                >
                  {editingStatus.label || editingStatus.name}
                </Badge>
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    editingStatus.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  role="status"
                  aria-label={`Status is ${editingStatus.isActive ? 'active' : 'inactive'}`}
                >
                  {editingStatus.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2" id="preview-description">
                This is how the status will appear in the application interface
              </p>
            </div>
          </fieldset>

          {/* Basic Settings */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Basic Settings
            </legend>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <Label className="text-sm font-medium text-gray-700">Active Status</Label>
                <p className="text-xs text-gray-500">Whether this status is available for use</p>
              </div>
              <Switch
                checked={editingStatus.isActive}
                onCheckedChange={(checked) =>
                  onUpdateStatus(editingStatus.id, { isActive: checked }, editingStatus.category)
                }
              />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <Label className="text-sm font-medium text-gray-700">Terminal Status</Label>
                <p className="text-xs text-gray-500">Whether this is a final status (no further transitions)</p>
              </div>
              <Switch
                checked={editingStatus.isTerminal}
                onCheckedChange={(checked) =>
                  onUpdateStatus(editingStatus.id, { isTerminal: checked }, editingStatus.category)
                }
              />
            </div>
          </fieldset>

          {/* Order & Timing */}
          <fieldset className="space-y-6">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Order & Timing
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="status-order" className="text-sm font-medium text-gray-700 mb-2 block">
                  Display Order
                </Label>
                <Input
                  id="status-order"
                  type="number"
                  value={editingStatus.order}
                  onChange={(e) =>
                    onUpdateStatus(
                      editingStatus.id,
                      { order: parseInt(e.target.value) },
                      editingStatus.category,
                    )
                  }
                  min="1"
                  className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  aria-describedby="status-order-help"
                />
                <p className="text-xs text-gray-500 mt-1" id="status-order-help">
                  Order in which this status appears in lists and workflows
                </p>
              </div>

              <div>
                <Label htmlFor="auto-expire-hours" className="text-sm font-medium text-gray-700 mb-2 block">
                  Auto-expire (hours)
                </Label>
                <Input
                  id="auto-expire-hours"
                  type="number"
                  value={editingStatus.autoExpireHours || ''}
                  onChange={(e) =>
                    onUpdateStatus(
                      editingStatus.id,
                      {
                        autoExpireHours: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                      editingStatus.category,
                    )
                  }
                  placeholder="Optional"
                  min="1"
                  className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  aria-describedby="auto-expire-help"
                />
                <p className="text-xs text-gray-500 mt-1" id="auto-expire-help">
                  Automatically transition after specified hours (optional)
                </p>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-teal-600 hover:bg-teal-700 text-white min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
  );
};