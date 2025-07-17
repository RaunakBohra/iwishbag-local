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
} from 'lucide-react';
import { useStatusManagement, StatusConfig } from '@/hooks/useStatusManagement';
import { supabase } from '@/integrations/supabase/client';
import { FixStatusJSON } from '@/components/admin/FixStatusJSON';
import { TestStatusFiltering } from '@/components/admin/TestStatusFiltering';
import { StatusConfigFixer } from '@/components/debug/StatusConfigFixer';

const colorOptions = [
  {
    value: 'default',
    label: 'Default',
    className: 'bg-blue-100 text-blue-800',
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
    className: 'bg-purple-100 text-purple-800',
  },
  { value: 'pink', label: 'Pink', className: 'bg-pink-100 text-pink-800' },
  {
    value: 'indigo',
    label: 'Indigo',
    className: 'bg-indigo-100 text-indigo-800',
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
      <Card key={status.id} className="relative hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconComponent className="h-5 w-5" />
              <div>
                <CardTitle className="text-lg">{status.label}</CardTitle>
                <CardDescription>{status.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.color}>{status.name}</Badge>
              {status.isActive ? (
                <Badge variant="outline" className="text-green-600">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Order</Label>
              <p className="font-medium">{status.order}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Terminal</Label>
              <p className="font-medium">{status.isTerminal ? 'Yes' : 'No'}</p>
            </div>
            {status.autoExpireHours && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Auto Expire</Label>
                <p className="font-medium">{status.autoExpireHours} hours</p>
              </div>
            )}
          </div>

          {/* NEW: Flow Properties */}
          <div className="border-t pt-4">
            <Label className="text-xs text-muted-foreground font-medium">Flow Behavior</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${status.showsInQuotesList ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <span>Quotes List</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${status.showsInOrdersList ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <span>Orders List</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${status.canBePaid ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <span>Can Be Paid</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${status.triggersEmail ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <span>Sends Email</span>
              </div>
              {status.isDefaultQuoteStatus && (
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-medium">Default Quote Status</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Allowed Transitions</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {status.allowedTransitions.length > 0 ? (
                status.allowedTransitions.map((transitionId) => {
                  const transition = availableTransitions.find((s) => s.id === transitionId);
                  return transition ? (
                    <Badge key={transitionId} variant="outline" className="text-xs">
                      {transition.label}
                    </Badge>
                  ) : null;
                })
              ) : (
                <span className="text-sm text-muted-foreground">No transitions allowed</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setEditingStatus(status)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => moveStatus(status.id, 'up', category)}
              disabled={status.order === 1}
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
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteStatus(status.id, category)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEditDialog = () => {
    if (!editingStatus) return null;

    const IconComponent = getIconComponent(editingStatus.icon);
    const availableTransitions =
      editingStatus.category === 'quote' ? localQuoteStatuses : localOrderStatuses;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Edit Status</h3>
            <Button size="sm" variant="outline" onClick={() => setEditingStatus(null)}>
              ×
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name (Internal)</Label>
                <Input
                  value={editingStatus.name}
                  onChange={(e) =>
                    updateStatus(editingStatus.id, { name: e.target.value }, editingStatus.category)
                  }
                  placeholder="e.g., pending"
                />
              </div>
              <div>
                <Label>Display Label</Label>
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
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
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
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color</Label>
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
                  <SelectTrigger>
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
                <Label>Icon</Label>
                <Select
                  value={editingStatus.icon}
                  onValueChange={(value) =>
                    updateStatus(editingStatus.id, { icon: value }, editingStatus.category)
                  }
                >
                  <SelectTrigger>
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

            {/* Live Preview Section */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <Label className="text-sm font-medium mb-3 block">Live Preview</Label>
              <div className="flex items-center gap-3">
                <IconComponent className="h-5 w-5" />
                <Badge variant={editingStatus.color}>
                  {editingStatus.label || editingStatus.name}
                </Badge>
                {editingStatus.isActive ? (
                  <Badge variant="outline" className="text-green-600">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This is how the status will appear in the application
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order</Label>
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
                />
              </div>
              <div>
                <Label>Auto Expire (hours)</Label>
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
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Enable this status</p>
              </div>
              <Switch
                checked={editingStatus.isActive}
                onCheckedChange={(checked) =>
                  updateStatus(editingStatus.id, { isActive: checked }, editingStatus.category)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Terminal Status</Label>
                <p className="text-sm text-muted-foreground">No further transitions allowed</p>
              </div>
              <Switch
                checked={editingStatus.isTerminal}
                onCheckedChange={(checked) =>
                  updateStatus(editingStatus.id, { isTerminal: checked }, editingStatus.category)
                }
              />
            </div>

            {/* NEW: Flow Properties */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Flow Behavior</Label>
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Show in Quotes List</Label>
                    <p className="text-xs text-muted-foreground">
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
                    <Label className="text-sm">Show in Orders List</Label>
                    <p className="text-xs text-muted-foreground">
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
                    <Label className="text-sm">Can Be Paid</Label>
                    <p className="text-xs text-muted-foreground">
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
                    <Label className="text-sm">Send Email</Label>
                    <p className="text-xs text-muted-foreground">
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
                      <Label className="text-sm">Default Quote Status</Label>
                      <p className="text-xs text-muted-foreground">
                        Use this status for new quotes
                      </p>
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
                    <Label className="text-sm">Email Template</Label>
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
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Allowed Transitions</Label>
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {availableTransitions
                  .filter((s) => s.id !== editingStatus.id)
                  .map((status) => (
                    <div key={status.id} className="flex items-center gap-2">
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
                      />
                      <label htmlFor={`transition-${status.id}`} className="text-sm">
                        {status.label}
                      </label>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setEditingStatus(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await handleSaveIndividualStatus(editingStatus.id, editingStatus.category);
                  setEditingStatus(null);
                }}
                disabled={isSaving}
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading status settings...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">Error loading status settings: {error}</p>
            </CardContent>
          </Card>
          <FixStatusJSON />
          <TestStatusFiltering />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Status Management
          </h1>
          <p className="text-muted-foreground">
            Configure quote and order statuses, their transitions, and display settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quote Statuses
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Order Statuses
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Debug & Fix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Quote Statuses</h2>
                <p className="text-muted-foreground">Configure the workflow for quote processing</p>
              </div>
              <Button onClick={() => addStatus('quote')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </div>

            <div className="grid gap-4">
              {localQuoteStatuses
                .sort((a, b) => a.order - b.order)
                .map((status) => renderStatusCard(status, 'quote'))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Order Statuses</h2>
                <p className="text-muted-foreground">Configure the workflow for order processing</p>
              </div>
              <Button onClick={() => addStatus('order')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </div>

            <div className="grid gap-4">
              {localOrderStatuses
                .sort((a, b) => a.order - b.order)
                .map((status) => renderStatusCard(status, 'order'))}
            </div>
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Debug & Fix Status Issues</h2>
                <p className="text-muted-foreground">
                  Diagnose and fix issues with status filtering and configuration
                </p>
              </div>

              {/* Status Configuration Fixer */}
              <StatusConfigFixer />

              {/* Test Status Filtering Component */}
              <TestStatusFiltering />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end pt-6">
          <div className="flex-1 text-sm text-muted-foreground">
            <p>
              💡 Changes are auto-saved after 2 seconds. Use "Save All Changes" to save immediately.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setLocalQuoteStatuses([...quoteStatuses]);
              setLocalOrderStatuses([...orderStatuses]);
            }}
            disabled={isSaving}
          >
            Reset to Saved
          </Button>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
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

        {renderEditDialog()}
      </div>
    </div>
  );
}
