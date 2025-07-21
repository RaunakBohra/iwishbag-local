import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShoppingCart,
  Loader2,
  Calculator,
  Edit,
  MoreHorizontal,
  Activity,
  Zap,
} from 'lucide-react';
import { useStatusManagement, StatusConfig } from '@/hooks/useStatusManagement';
import { supabase } from '@/integrations/supabase/client';
import { FixStatusJSON } from '@/components/admin/FixStatusJSON';
import { StatusConfigFixer } from '@/components/debug/StatusConfigFixer';

const colorOptions = [
  {
    value: 'default',
    label: 'Default',
    className: 'bg-teal-100 text-teal-800',
  },
  {
    value: 'secondary',
    label: 'Secondary',
    className: 'bg-gray-100 text-gray-800',
  },
  {
    value: 'outline',
    label: 'Outline',
    className: 'bg-white text-gray-800 border',
  },
  {
    value: 'destructive',
    label: 'Destructive',
    className: 'bg-red-100 text-red-800',
  },
  {
    value: 'success',
    label: 'Success',
    className: 'bg-green-100 text-green-800',
  },
  {
    value: 'warning',
    label: 'Warning',
    className: 'bg-yellow-100 text-yellow-800',
  },
  { value: 'info', label: 'Info', className: 'bg-sky-100 text-sky-800' },
  {
    value: 'purple',
    label: 'Purple',
    className: 'bg-orange-100 text-orange-800',
  },
  { value: 'pink', label: 'Pink', className: 'bg-pink-100 text-pink-800' },
  {
    value: 'indigo',
    label: 'Indigo',
    className: 'bg-teal-100 text-cyan-800',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    className: 'bg-emerald-100 text-emerald-800',
  },
  { value: 'amber', label: 'Amber', className: 'bg-amber-100 text-amber-800' },
  { value: 'rose', label: 'Rose', className: 'bg-rose-100 text-rose-800' },
  {
    value: 'violet',
    label: 'Violet',
    className: 'bg-violet-100 text-violet-800',
  },
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
];

export default function StatusManagement() {
  const [activeTab, setActiveTab] = useState('quotes');
  const [editingStatus, setEditingStatus] = useState<StatusConfig | null>(null);
  const [localQuoteStatuses, setLocalQuoteStatuses] = useState<StatusConfig[]>([]);
  const [localOrderStatuses, setLocalOrderStatuses] = useState<StatusConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { quoteStatuses, orderStatuses, isLoading, error, saveStatusSettings } =
    useStatusManagement();

  // Check authentication and role
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        console.log('Current user:', user);

        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          console.log('User roles:', roles);
        } else {
          console.log('No authenticated user found');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, []);

  // Initialize local state when data loads
  React.useEffect(() => {
    if (!isLoading) {
      setLocalQuoteStatuses([...quoteStatuses]);
      setLocalOrderStatuses([...orderStatuses]);
    }
  }, [quoteStatuses, orderStatuses, isLoading]);

  const addStatus = (category: 'quote' | 'order') => {
    const newStatus: StatusConfig = {
      id: `new_${Date.now()}`,
      name: '',
      label: '',
      description: '',
      color: 'default',
      icon: 'Clock',
      isActive: true,
      order: category === 'quote' ? localQuoteStatuses.length + 1 : localOrderStatuses.length + 1,
      allowedTransitions: [],
      isTerminal: false,
      category,
    };

    if (category === 'quote') {
      setLocalQuoteStatuses([...localQuoteStatuses, newStatus]);
    } else {
      setLocalOrderStatuses([...localOrderStatuses, newStatus]);
    }
    setEditingStatus(newStatus);
  };

  const updateStatus = (
    statusId: string,
    updates: Partial<StatusConfig>,
    category: 'quote' | 'order',
  ) => {
    if (category === 'quote') {
      setLocalQuoteStatuses((prev) =>
        prev.map((s) => (s.id === statusId ? { ...s, ...updates } : s)),
      );
    } else {
      setLocalOrderStatuses((prev) =>
        prev.map((s) => (s.id === statusId ? { ...s, ...updates } : s)),
      );
    }

    // Also update the editingStatus if it's the same status being edited
    if (editingStatus && editingStatus.id === statusId) {
      setEditingStatus((prev) => (prev ? { ...prev, ...updates } : null));
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const updatedQuoteStatuses =
          category === 'quote'
            ? localQuoteStatuses.map((s) => (s.id === statusId ? { ...s, ...updates } : s))
            : localQuoteStatuses;
        const updatedOrderStatuses =
          category === 'order'
            ? localOrderStatuses.map((s) => (s.id === statusId ? { ...s, ...updates } : s))
            : localOrderStatuses;

        await saveStatusSettings(updatedQuoteStatuses, updatedOrderStatuses);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000); // 2 second debounce
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const deleteStatus = (statusId: string, category: 'quote' | 'order') => {
    if (category === 'quote') {
      setLocalQuoteStatuses((prev) => prev.filter((s) => s.id !== statusId));
    } else {
      setLocalOrderStatuses((prev) => prev.filter((s) => s.id !== statusId));
    }
  };

  const moveStatus = (statusId: string, direction: 'up' | 'down', category: 'quote' | 'order') => {
    const statuses = category === 'quote' ? localQuoteStatuses : localOrderStatuses;
    const index = statuses.findIndex((s) => s.id === statusId);

    if (direction === 'up' && index > 0) {
      const newStatuses = [...statuses];
      [newStatuses[index], newStatuses[index - 1]] = [newStatuses[index - 1], newStatuses[index]];
      if (category === 'quote') {
        setLocalQuoteStatuses(newStatuses);
      } else {
        setLocalOrderStatuses(newStatuses);
      }
    } else if (direction === 'down' && index < statuses.length - 1) {
      const newStatuses = [...statuses];
      [newStatuses[index], newStatuses[index + 1]] = [newStatuses[index + 1], newStatuses[index]];
      if (category === 'quote') {
        setLocalQuoteStatuses(newStatuses);
      } else {
        setLocalOrderStatuses(newStatuses);
      }
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find((opt) => opt.value === iconName);
    return iconOption ? iconOption.icon : Clock;
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveStatusSettings(localQuoteStatuses, localOrderStatuses);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveIndividualStatus = async (statusId: string, category: 'quote' | 'order') => {
    setIsSaving(true);
    try {
      console.log('Attempting to save status settings...');
      console.log('Quote statuses:', localQuoteStatuses);
      console.log('Order statuses:', localOrderStatuses);

      await saveStatusSettings(localQuoteStatuses, localOrderStatuses);
      console.log('Status settings saved successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to save status:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });

      // Show error message to user
      alert(`Failed to save status settings: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusCard = (status: StatusConfig, category: 'quote' | 'order') => {
    const IconComponent = getIconComponent(status.icon);
    const availableTransitions = category === 'quote' ? localQuoteStatuses : localOrderStatuses;

    return (
      <div
        key={status.id}
        className="bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <IconComponent className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">{status.label}</h3>
                <p className="text-xs text-gray-500">{status.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={status.color} className="text-xs">
                {status.name}
              </Badge>
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  status.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {status.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-sm">
              <span className="text-gray-500">Order:</span>
              <span className="ml-2 font-medium text-gray-900">{status.order}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Terminal:</span>
              <span className="ml-2 font-medium text-gray-900">
                {status.isTerminal ? 'Yes' : 'No'}
              </span>
            </div>
            {status.autoExpireHours && (
              <div className="col-span-2 text-sm">
                <span className="text-gray-500">Auto Expire:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {status.autoExpireHours} hours
                </span>
              </div>
            )}
          </div>

          {/* Flow Properties */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <h4 className="text-xs font-medium text-gray-700 mb-3">Flow Behavior</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.showsInQuotesList ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-600">Quotes List</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.showsInOrdersList ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-600">Orders List</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.canBePaid ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-600">Can Be Paid</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.triggersEmail ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-600">Sends Email</span>
              </div>
              {status.isDefaultQuoteStatus && (
                <div className="col-span-2 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="text-xs font-medium text-teal-600">Default Quote Status</span>
                </div>
              )}
            </div>
          </div>

          {/* Allowed Transitions */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Allowed Transitions</h4>
            <div className="flex flex-wrap gap-1">
              {status.allowedTransitions.length > 0 ? (
                status.allowedTransitions.map((transitionId) => {
                  const transition = availableTransitions.find((s) => s.id === transitionId);
                  return transition ? (
                    <span
                      key={transitionId}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                    >
                      {transition.label}
                    </span>
                  ) : null;
                })
              ) : (
                <span className="text-xs text-gray-500">No transitions allowed</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingStatus(status)}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveStatus(status.id, 'up', category)}
                disabled={status.order === 1}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveStatus(status.id, 'down', category)}
                disabled={
                  status.order ===
                  (category === 'quote' ? localQuoteStatuses.length : localOrderStatuses.length)
                }
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteStatus(status.id, category)}
              className="text-red-700 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditDialog = () => {
    if (!editingStatus) return null;

    const IconComponent = getIconComponent(editingStatus.icon);
    const availableTransitions =
      editingStatus.category === 'quote' ? localQuoteStatuses : localOrderStatuses;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Status</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingStatus(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Name (Internal)
                </Label>
                <Input
                  value={editingStatus.name}
                  onChange={(e) =>
                    updateStatus(editingStatus.id, { name: e.target.value }, editingStatus.category)
                  }
                  placeholder="e.g., pending"
                  className="border-gray-300 focus:border-teal-500"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Display Label
                </Label>
                <Input
                  value={editingStatus.label}
                  onChange={(e) =>
                    updateStatus(
                      editingStatus.id,
                      { label: e.target.value },
                      editingStatus.category,
                    )
                  }
                  placeholder="e.g., Pending"
                  className="border-gray-300 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Description</Label>
              <Textarea
                value={editingStatus.description}
                onChange={(e) =>
                  updateStatus(
                    editingStatus.id,
                    { description: e.target.value },
                    editingStatus.category,
                  )
                }
                placeholder="Describe what this status means"
                className="border-gray-300 focus:border-teal-500"
              />
            </div>

            {/* Appearance */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Color</Label>
                <Select
                  value={editingStatus.color}
                  onValueChange={(value) =>
                    updateStatus(
                      editingStatus.id,
                      { color: value as string },
                      editingStatus.category,
                    )
                  }
                >
                  <SelectTrigger className="border-gray-300 focus:border-teal-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${option.className}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Icon</Label>
                <Select
                  value={editingStatus.icon}
                  onValueChange={(value) =>
                    updateStatus(editingStatus.id, { icon: value }, editingStatus.category)
                  }
                >
                  <SelectTrigger className="border-gray-300 focus:border-teal-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Live Preview</Label>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <IconComponent className="h-5 w-5 text-gray-600" />
                </div>
                <Badge variant={editingStatus.color}>
                  {editingStatus.label || editingStatus.name}
                </Badge>
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    editingStatus.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {editingStatus.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This is how the status will appear in the application
              </p>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Order</Label>
                <Input
                  type="number"
                  value={editingStatus.order}
                  onChange={(e) =>
                    updateStatus(
                      editingStatus.id,
                      { order: parseInt(e.target.value) },
                      editingStatus.category,
                    )
                  }
                  min="1"
                  className="border-gray-300 focus:border-teal-500"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Auto Expire (hours)
                </Label>
                <Input
                  type="number"
                  value={editingStatus.autoExpireHours || ''}
                  onChange={(e) =>
                    updateStatus(
                      editingStatus.id,
                      {
                        autoExpireHours: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                      editingStatus.category,
                    )
                  }
                  placeholder="Optional"
                  min="1"
                  className="border-gray-300 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Status Properties */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Active</Label>
                  <p className="text-xs text-gray-500">Enable this status</p>
                </div>
                <Switch
                  checked={editingStatus.isActive}
                  onCheckedChange={(checked) =>
                    updateStatus(editingStatus.id, { isActive: checked }, editingStatus.category)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Terminal Status</Label>
                  <p className="text-xs text-gray-500">No further transitions allowed</p>
                </div>
                <Switch
                  checked={editingStatus.isTerminal}
                  onCheckedChange={(checked) =>
                    updateStatus(editingStatus.id, { isTerminal: checked }, editingStatus.category)
                  }
                />
              </div>
            </div>

            {/* Flow Properties */}
            <div className="border-t border-gray-200 pt-4">
              <Label className="text-sm font-medium text-gray-700 mb-4 block">Flow Behavior</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Show in Quotes List</Label>
                    <p className="text-xs text-gray-500">
                      Display quotes with this status on the Quotes page
                    </p>
                  </div>
                  <Switch
                    checked={editingStatus.showsInQuotesList || false}
                    onCheckedChange={(checked) =>
                      updateStatus(
                        editingStatus.id,
                        { showsInQuotesList: checked },
                        editingStatus.category,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Show in Orders List</Label>
                    <p className="text-xs text-gray-500">
                      Display quotes with this status on the Orders page
                    </p>
                  </div>
                  <Switch
                    checked={editingStatus.showsInOrdersList || false}
                    onCheckedChange={(checked) =>
                      updateStatus(
                        editingStatus.id,
                        { showsInOrdersList: checked },
                        editingStatus.category,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Can Be Paid</Label>
                    <p className="text-xs text-gray-500">
                      Allow payment for quotes with this status
                    </p>
                  </div>
                  <Switch
                    checked={editingStatus.canBePaid || false}
                    onCheckedChange={(checked) =>
                      updateStatus(editingStatus.id, { canBePaid: checked }, editingStatus.category)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Send Email</Label>
                    <p className="text-xs text-gray-500">
                      Send email notification when this status is set
                    </p>
                  </div>
                  <Switch
                    checked={editingStatus.triggersEmail || false}
                    onCheckedChange={(checked) =>
                      updateStatus(
                        editingStatus.id,
                        { triggersEmail: checked },
                        editingStatus.category,
                      )
                    }
                  />
                </div>

                {editingStatus.category === 'quote' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Default Quote Status
                      </Label>
                      <p className="text-xs text-gray-500">Use this status for new quotes</p>
                    </div>
                    <Switch
                      checked={editingStatus.isDefaultQuoteStatus || false}
                      onCheckedChange={(checked) =>
                        updateStatus(
                          editingStatus.id,
                          { isDefaultQuoteStatus: checked },
                          editingStatus.category,
                        )
                      }
                    />
                  </div>
                )}

                {editingStatus.triggersEmail && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Email Template
                    </Label>
                    <Input
                      value={editingStatus.emailTemplate || ''}
                      onChange={(e) =>
                        updateStatus(
                          editingStatus.id,
                          { emailTemplate: e.target.value },
                          editingStatus.category,
                        )
                      }
                      placeholder="e.g., quote_approved"
                      className="border-gray-300 focus:border-teal-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Allowed Transitions */}
            <div className="border-t border-gray-200 pt-4">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Allowed Transitions
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableTransitions
                  .filter((s) => s.id !== editingStatus.id)
                  .map((status) => (
                    <div key={status.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`transition-${status.id}`}
                        checked={editingStatus.allowedTransitions.includes(status.id)}
                        onChange={(e) => {
                          const newTransitions = e.target.checked
                            ? [...editingStatus.allowedTransitions, status.id]
                            : editingStatus.allowedTransitions.filter((id) => id !== status.id);
                          updateStatus(
                            editingStatus.id,
                            { allowedTransitions: newTransitions },
                            editingStatus.category,
                          );
                        }}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <label htmlFor={`transition-${status.id}`} className="text-sm text-gray-700">
                        {status.label}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingStatus(null)}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSaveIndividualStatus(editingStatus.id, editingStatus.category);
                  setEditingStatus(null);
                }}
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
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
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Status Management</h1>
                  <p className="text-sm text-gray-600">
                    Configure quote and order statuses, their transitions, and display settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <span className="text-gray-600">Loading status settings...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Status Management</h1>
                  <p className="text-sm text-gray-600">
                    Configure quote and order statuses, their transitions, and display settings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-red-800">
                    Error Loading Status Settings
                  </h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
            <FixStatusJSON />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Status Management</h1>
                  <p className="text-sm text-gray-600">
                    Configure quote and order statuses, their transitions, and display settings
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalQuoteStatuses([...quoteStatuses]);
                    setLocalOrderStatuses([...orderStatuses]);
                  }}
                  disabled={isSaving}
                  className="text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Reset to Saved
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save All Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 mb-8">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger
                value="quotes"
                className="data-[state=active]:bg-transparent data-[state=active]:text-teal-600 data-[state=active]:border-teal-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Quote Statuses
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-transparent data-[state=active]:text-teal-600 data-[state=active]:border-teal-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Order Statuses
              </TabsTrigger>
              <TabsTrigger
                value="debug"
                className="data-[state=active]:bg-transparent data-[state=active]:text-teal-600 data-[state=active]:border-teal-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <Settings className="h-4 w-4 mr-2" />
                Debug & Fix
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="quotes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Quote Statuses</h2>
                <p className="text-sm text-gray-600">Configure the workflow for quote processing</p>
              </div>
              <Button
                onClick={() => addStatus('quote')}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </div>

            <div className="space-y-4">
              {localQuoteStatuses
                .sort((a, b) => a.order - b.order)
                .map((status) => renderStatusCard(status, 'quote'))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Order Statuses</h2>
                <p className="text-sm text-gray-600">Configure the workflow for order processing</p>
              </div>
              <Button
                onClick={() => addStatus('order')}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </div>

            <div className="space-y-4">
              {localOrderStatuses
                .sort((a, b) => a.order - b.order)
                .map((status) => renderStatusCard(status, 'order'))}
            </div>
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Debug & Fix Status Issues</h2>
                <p className="text-sm text-gray-600">
                  Diagnose and fix issues with status filtering and configuration
                </p>
              </div>

              {/* Status Configuration Fixer */}
              <StatusConfigFixer />

              {/* Test Status Filtering Component - Removed */}
            </div>
          </TabsContent>
        </Tabs>

        {/* Auto-save indicator */}
        <div className="mt-8 p-4 bg-teal-50 rounded-lg border border-teal-200">
          <div className="flex items-center">
            <Zap className="h-4 w-4 text-teal-600 mr-2" />
            <span className="text-sm text-teal-800">
              Changes are auto-saved after 2 seconds. Use "Save All Changes" to save immediately.
            </span>
          </div>
        </div>

        {renderEditDialog()}
      </div>
    </div>
  );
}
