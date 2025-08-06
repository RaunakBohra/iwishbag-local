import React, { useState } from 'react';
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
  Activity,
  Banknote,
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
  { value: 'Banknote', label: 'Banknote', icon: Banknote },
];

export default function StatusManagement() {
  const [activeTab, setActiveTab] = useState('quotes');
  const [editingStatus, setEditingStatus] = useState<StatusConfig | null>(null);
  const [localQuoteStatuses, setLocalQuoteStatuses] = useState<StatusConfig[]>([]);
  const [localOrderStatuses, setLocalOrderStatuses] = useState<StatusConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { quoteStatuses, orderStatuses, isLoading, error, saveStatusSettings, refreshData } =
    useStatusManagement();

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

    if (editingStatus && editingStatus.id === statusId) {
      setEditingStatus((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

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
    
    if (index === -1) return;

    let newStatuses = [...statuses];
    
    if (direction === 'up' && index > 0) {
      [newStatuses[index], newStatuses[index - 1]] = [newStatuses[index - 1], newStatuses[index]];
      newStatuses[index].order = index + 1;
      newStatuses[index - 1].order = index;
    } else if (direction === 'down' && index < statuses.length - 1) {
      [newStatuses[index], newStatuses[index + 1]] = [newStatuses[index + 1], newStatuses[index]];
      newStatuses[index].order = index + 1;
      newStatuses[index + 1].order = index + 2;
    } else {
      return;
    }
    
    if (category === 'quote') {
      setLocalQuoteStatuses(newStatuses);
    } else {
      setLocalOrderStatuses(newStatuses);
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
      await saveStatusSettings(localQuoteStatuses, localOrderStatuses);
    } catch (error) {
      console.error('Failed to save status:', error);
      alert(`Failed to save status settings: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusCard = (status: StatusConfig, category: 'quote' | 'order') => {
    const IconComponent = getIconComponent(status.icon);

    return (
      <article
        key={status.id}
        className="bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2"
        role="article"
        aria-labelledby={`status-${status.id}-title`}
        aria-describedby={`status-${status.id}-desc`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-50 rounded-lg" aria-hidden="true">
                <IconComponent className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900" id={`status-${status.id}-title`}>
                  {status.label}
                </h3>
                <p className="text-xs text-gray-500" id={`status-${status.id}-desc`}>
                  {status.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={status.color} className="text-xs" aria-label={`Status name: ${status.name}`}>
                {status.name}
              </Badge>
              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  status.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
                role="status"
                aria-label={`Status is ${status.isActive ? 'active' : 'inactive'}`}
              >
                {status.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

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
                disabled={
                  (category === 'quote' ? localQuoteStatuses : localOrderStatuses)
                    .sort((a, b) => a.order - b.order)
                    .findIndex(s => s.id === status.id) === 0
                }
                className="text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveStatus(status.id, 'down', category)}
                disabled={
                  (category === 'quote' ? localQuoteStatuses : localOrderStatuses)
                    .sort((a, b) => a.order - b.order)
                    .findIndex(s => s.id === status.id) === 
                  (category === 'quote' ? localQuoteStatuses.length - 1 : localOrderStatuses.length - 1)
                }
                className="text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </article>
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
    <main className="min-h-screen bg-gray-50" role="main">
      <header className="bg-white border-b border-gray-200" role="banner">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-50 rounded-lg" aria-hidden="true">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900" id="page-title">
                    Status Management
                  </h1>
                  <p className="text-sm text-gray-600" id="page-description">
                    Configure quote and order statuses, their transitions, and display settings
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3" role="toolbar" aria-label="Status management actions">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (confirm('This will clear your database and load all new statuses including COD and partial payment statuses. Are you sure?')) {
                      setIsSaving(true);
                      try {
                        await supabase
                          .from('system_settings')
                          .delete()
                          .in('setting_key', ['quote_statuses', 'order_statuses']);
                        
                        await refreshData();
                        alert('Statuses reset to new defaults! You now have COD and partial payment statuses.');
                      } catch (error) {
                        console.error('Failed to reset statuses:', error);
                        alert('Failed to reset statuses. Check console for details.');
                      } finally {
                        setIsSaving(false);
                      }
                    }
                  }}
                  className="text-orange-700 border-orange-300 hover:bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  disabled={isSaving}
                  aria-describedby="load-payment-statuses-desc"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Load All Payment Statuses
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalQuoteStatuses([...quoteStatuses]);
                    setLocalOrderStatuses([...orderStatuses]);
                  }}
                  disabled={isSaving}
                  className="text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-describedby="reset-desc"
                >
                  Reset to Saved
                </Button>
                
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-w-[140px]"
                  aria-describedby="save-desc"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      <span>Saving...</span>
                      <span className="sr-only">Saving changes in progress</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" role="region" aria-labelledby="page-title">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 mb-8">
            <TabsList className="bg-transparent border-0 p-0 h-auto" role="tablist" aria-label="Status management sections">
              <TabsTrigger
                value="quotes"
                className="data-[state=active]:bg-transparent data-[state=active]:text-teal-600 data-[state=active]:border-teal-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                role="tab"
                aria-controls="quotes-panel"
                aria-selected={activeTab === 'quotes'}
              >
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                Quote Statuses
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-transparent data-[state=active]:text-teal-600 data-[state=active]:border-teal-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                role="tab"
                aria-controls="orders-panel"
                aria-selected={activeTab === 'orders'}
              >
                <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
                Order Statuses
              </TabsTrigger>
              <TabsTrigger
                value="debug"
                className="data-[state=active]:bg-transparent data-[state=active]:text-teal-600 data-[state=active]:border-teal-600 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                role="tab"
                aria-controls="debug-panel"
                aria-selected={activeTab === 'debug'}
              >
                <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                Debug & Fix
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="quotes" className="space-y-6" role="tabpanel" id="quotes-panel" aria-labelledby="quotes-tab">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900" id="quotes-section-title">Quote Statuses</h2>
                <p className="text-sm text-gray-600" id="quotes-section-desc">Configure the workflow for quote processing</p>
              </div>
              <Button
                onClick={() => addStatus('quote')}
                className="bg-teal-600 hover:bg-teal-700 text-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
                aria-describedby="add-quote-status-desc"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Add Status
              </Button>
              <span id="add-quote-status-desc" className="sr-only">
                Creates a new quote status configuration
              </span>
            </div>

            <div className="space-y-4" role="list" aria-label="Quote statuses list">
              {localQuoteStatuses
                .sort((a, b) => a.order - b.order)
                .map((status, index) => (
                  <div key={status.id} role="listitem" aria-setsize={localQuoteStatuses.length} aria-posinset={index + 1}>
                    {renderStatusCard(status, 'quote')}
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6" role="tabpanel" id="orders-panel" aria-labelledby="orders-tab">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900" id="orders-section-title">Order Statuses</h2>
                <p className="text-sm text-gray-600" id="orders-section-desc">Configure the workflow for order processing</p>
              </div>
              <Button
                onClick={() => addStatus('order')}
                className="bg-teal-600 hover:bg-teal-700 text-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
                aria-describedby="add-order-status-desc"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Add Status
              </Button>
              <span id="add-order-status-desc" className="sr-only">
                Creates a new order status configuration
              </span>
            </div>

            <div className="space-y-4" role="list" aria-label="Order statuses list">
              {localOrderStatuses
                .sort((a, b) => a.order - b.order)
                .map((status, index) => (
                  <div key={status.id} role="listitem" aria-setsize={localOrderStatuses.length} aria-posinset={index + 1}>
                    {renderStatusCard(status, 'order')}
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="debug" className="space-y-6" role="tabpanel" id="debug-panel" aria-labelledby="debug-tab">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900" id="debug-section-title">Debug & Fix Status Issues</h2>
                <p className="text-sm text-gray-600" id="debug-section-desc">
                  Diagnose and fix issues with status filtering and configuration
                </p>
              </div>

              <div role="region" aria-labelledby="debug-section-title">
                <StatusConfigFixer />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center">
            <Save className="h-4 w-4 text-amber-600 mr-2" />
            <span className="text-sm text-amber-800">
              Remember to click "Save All Changes" to save your modifications.
            </span>
          </div>
        </div>

        {/* Edit Dialog */}
        {editingStatus && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="edit-status-title"
            aria-describedby="edit-status-desc"
          >
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              role="document"
            >
              <header className="px-6 py-4 border-b border-gray-200">
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
                    onClick={() => setEditingStatus(null)}
                    className="text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
                    aria-label="Close edit dialog"
                  >
                    <span className="text-xl" aria-hidden="true">×</span>
                    <span className="sr-only">Close dialog</span>
                  </Button>
                </div>
              </header>

              <section className="px-6 py-4 space-y-6">
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Basic Information</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label 
                        htmlFor="status-name"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Name (Internal) <span className="text-red-500" aria-label="required">*</span>
                      </Label>
                      <Input
                        id="status-name"
                        value={editingStatus.name}
                        onChange={(e) =>
                          updateStatus(editingStatus.id, { name: e.target.value }, editingStatus.category)
                        }
                        placeholder="e.g., pending"
                        className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                        aria-describedby="status-name-help"
                        aria-required="true"
                      />
                      <p id="status-name-help" className="text-xs text-gray-500 mt-1">
                        Internal identifier used in the system code
                      </p>
                    </div>
                    <div>
                      <Label 
                        htmlFor="status-label"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Display Label <span className="text-red-500" aria-label="required">*</span>
                      </Label>
                      <Input
                        id="status-label"
                        value={editingStatus.label}
                        onChange={(e) =>
                          updateStatus(
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
                      <p id="status-label-help" className="text-xs text-gray-500 mt-1">
                        Human-readable label shown to users
                      </p>
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Description</legend>
                  <div>
                    <Label 
                      htmlFor="status-description"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="status-description"
                      value={editingStatus.description}
                      onChange={(e) =>
                        updateStatus(
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
                    <p id="status-description-help" className="text-xs text-gray-500 mt-1">
                      Provide a clear description of when this status is used
                    </p>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Appearance</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label 
                        htmlFor="status-color"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Color Theme
                      </Label>
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
                        <SelectTrigger 
                          id="status-color"
                          className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="status-color-help"
                        >
                          <SelectValue aria-label="Selected color theme" />
                        </SelectTrigger>
                        <SelectContent role="listbox" aria-label="Color theme options">
                          {colorOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              aria-label={`${option.label} color theme`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${option.className}`} aria-hidden="true" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p id="status-color-help" className="text-xs text-gray-500 mt-1">
                        Visual color scheme for the status badge
                      </p>
                    </div>
                    <div>
                      <Label 
                        htmlFor="status-icon"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Icon
                      </Label>
                      <Select
                        value={editingStatus.icon}
                        onValueChange={(value) =>
                          updateStatus(editingStatus.id, { icon: value }, editingStatus.category)
                        }
                      >
                        <SelectTrigger 
                          id="status-icon"
                          className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="status-icon-help"
                        >
                          <SelectValue aria-label="Selected icon" />
                        </SelectTrigger>
                        <SelectContent role="listbox" aria-label="Icon options">
                          {iconOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              aria-label={`${option.label} icon`}
                            >
                              <div className="flex items-center gap-2">
                                <option.icon className="h-4 w-4" aria-hidden="true" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p id="status-icon-help" className="text-xs text-gray-500 mt-1">
                        Icon displayed with the status
                      </p>
                    </div>
                  </div>
                </fieldset>

                {/* Live Preview */}
                <section 
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  aria-labelledby="status-preview-title"
                >
                  <h4 id="status-preview-title" className="text-sm font-medium text-gray-700 mb-3">
                    Live Preview
                  </h4>
                  <div className="flex items-center gap-3" role="group" aria-label="Status appearance preview">
                    <div className="p-2 bg-white rounded-lg" aria-hidden="true">
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
                </section>

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Status Properties</legend>
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
                </fieldset>

                {/* Configuration */}
                <fieldset>
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Configuration</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label 
                        htmlFor="status-order"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Order
                      </Label>
                      <Input
                        id="status-order"
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
                        className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                        aria-describedby="status-order-help"
                      />
                      <p id="status-order-help" className="text-xs text-gray-500 mt-1">
                        Display order in status lists
                      </p>
                    </div>
                    <div>
                      <Label 
                        htmlFor="status-auto-expire"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Auto Expire (hours)
                      </Label>
                      <Input
                        id="status-auto-expire"
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
                        className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                        aria-describedby="status-auto-expire-help"
                      />
                      <p id="status-auto-expire-help" className="text-xs text-gray-500 mt-1">
                        Automatically expire after specified hours
                      </p>
                    </div>
                  </div>
                </fieldset>

                {/* Flow Behavior */}
                <fieldset className="border-t border-gray-200 pt-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Flow Behavior</legend>
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
                        <Label 
                          htmlFor="email-template"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Email Template
                        </Label>
                        <Input
                          id="email-template"
                          value={editingStatus.emailTemplate || ''}
                          onChange={(e) =>
                            updateStatus(
                              editingStatus.id,
                              { emailTemplate: e.target.value },
                              editingStatus.category,
                            )
                          }
                          placeholder="e.g., quote_approved"
                          className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="email-template-help"
                        />
                        <p id="email-template-help" className="text-xs text-gray-500 mt-1">
                          Template name for email notifications
                        </p>
                      </div>
                    )}
                  </div>
                </fieldset>

                {/* Payment Configuration - Only for ORDER category statuses */}
                {editingStatus.category === 'order' && (
                  <fieldset className="border-t border-gray-200 pt-4">
                    <legend className="text-sm font-semibold text-gray-900 mb-4">Payment Configuration</legend>
                    <div className="space-y-4">
                      {/* Payment Type */}
                      <div>
                        <Label 
                          htmlFor="payment-type"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Payment Type
                        </Label>
                        <select
                          id="payment-type"
                          value={editingStatus.paymentType || 'prepaid'}
                          onChange={(e) =>
                            updateStatus(
                              editingStatus.id,
                              { paymentType: e.target.value },
                              editingStatus.category,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="payment-type-help"
                        >
                          <option value="prepaid">Prepaid (Full payment required)</option>
                          <option value="cod">Cash on Delivery</option>
                          <option value="partial">Partial Payment</option>
                          <option value="mixed">Mixed (COD + Prepaid options)</option>
                        </select>
                        <p id="payment-type-help" className="text-xs text-gray-500 mt-1">
                          How payments are accepted for this order status
                        </p>
                      </div>

                      {/* Payment Required Before */}
                      <div>
                        <Label 
                          htmlFor="payment-required-before"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Payment Required Before
                        </Label>
                        <select
                          id="payment-required-before"
                          value={editingStatus.paymentRequiredBefore || 'shipping'}
                          onChange={(e) =>
                            updateStatus(
                              editingStatus.id,
                              { paymentRequiredBefore: e.target.value },
                              editingStatus.category,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="payment-required-before-help"
                        >
                          <option value="never">Never (payment not required)</option>
                          <option value="processing">Processing starts</option>
                          <option value="shipping">Shipping begins</option>
                          <option value="completion">Order completion</option>
                        </select>
                        <p id="payment-required-before-help" className="text-xs text-gray-500 mt-1">
                          When payment must be completed for this status
                        </p>
                      </div>

                      {/* Minimum Payment Percentage - Only for partial/mixed payments */}
                      {(editingStatus.paymentType === 'partial' || editingStatus.paymentType === 'mixed') && (
                        <div>
                          <Label 
                            htmlFor="min-payment-percentage"
                            className="text-sm font-medium text-gray-700 mb-2 block"
                          >
                            Minimum Payment Percentage
                          </Label>
                          <Input
                            id="min-payment-percentage"
                            type="number"
                            min="0"
                            max="100"
                            value={editingStatus.minPaymentPercentage || 50}
                            onChange={(e) =>
                              updateStatus(
                                editingStatus.id,
                                { minPaymentPercentage: parseInt(e.target.value) || 50 },
                                editingStatus.category,
                              )
                            }
                            className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                            aria-describedby="min-payment-percentage-help"
                          />
                          <p id="min-payment-percentage-help" className="text-xs text-gray-500 mt-1">
                            Minimum percentage that must be paid upfront (0-100%)
                          </p>
                        </div>
                      )}

                      {/* COD-specific Settings - Only for cod/mixed payment types */}
                      {(editingStatus.paymentType === 'cod' || editingStatus.paymentType === 'mixed') && (
                        <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-900">Cash on Delivery Settings</h4>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium text-blue-800">Allow COD</Label>
                              <p className="text-xs text-blue-600">
                                Enable cash on delivery for this status
                              </p>
                            </div>
                            <Switch
                              checked={editingStatus.allowCOD || false}
                              onCheckedChange={(checked) =>
                                updateStatus(
                                  editingStatus.id,
                                  { allowCOD: checked },
                                  editingStatus.category,
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium text-blue-800">COD Fee Required</Label>
                              <p className="text-xs text-blue-600">
                                Charge additional fee for COD orders
                              </p>
                            </div>
                            <Switch
                              checked={editingStatus.codFeeRequired || false}
                              onCheckedChange={(checked) =>
                                updateStatus(
                                  editingStatus.id,
                                  { codFeeRequired: checked },
                                  editingStatus.category,
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-medium text-blue-800">COD Verification</Label>
                              <p className="text-xs text-blue-600">
                                Require phone verification for COD orders
                              </p>
                            </div>
                            <Switch
                              checked={editingStatus.codVerificationRequired || false}
                              onCheckedChange={(checked) =>
                                updateStatus(
                                  editingStatus.id,
                                  { codVerificationRequired: checked },
                                  editingStatus.category,
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* Payment Validation Rule */}
                      <div>
                        <Label 
                          htmlFor="payment-validation-rule"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Payment Validation Rule
                        </Label>
                        <select
                          id="payment-validation-rule"
                          value={editingStatus.paymentValidationRule || 'standard'}
                          onChange={(e) =>
                            updateStatus(
                              editingStatus.id,
                              { paymentValidationRule: e.target.value },
                              editingStatus.category,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="payment-validation-rule-help"
                        >
                          <option value="none">No validation required</option>
                          <option value="standard">Standard validation</option>
                          <option value="strict">Strict validation (manual approval)</option>
                          <option value="automatic">Automatic validation</option>
                        </select>
                        <p id="payment-validation-rule-help" className="text-xs text-gray-500 mt-1">
                          How payments for this status should be validated
                        </p>
                      </div>
                    </div>
                  </fieldset>
                )}

                {/* Action Permissions */}
                <fieldset className="border-t border-gray-200 pt-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Action Permissions</legend>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 mb-4">
                      Control which actions are available when quotes/orders have this status. These permissions determine UI behavior and business logic.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Edit Operations */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                          Edit Operations
                        </h4>
                        
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Edit</Label>
                            <p className="text-xs text-gray-500">Can edit quote/order details</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowEdit || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowEdit: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Address Edit</Label>
                            <p className="text-xs text-gray-500">Can edit shipping address</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowAddressEdit || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowAddressEdit: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Approval Operations */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          Approval Operations
                        </h4>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Approval</Label>
                            <p className="text-xs text-gray-500">Can approve quote</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowApproval || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowApproval: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Rejection</Label>
                            <p className="text-xs text-gray-500">Can reject quote</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowRejection || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowRejection: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cart & Order Operations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                          Cart & Order Operations
                        </h4>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Cart Actions</Label>
                            <p className="text-xs text-gray-500">Can add to cart/checkout</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowCartActions || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowCartActions: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Shipping</Label>
                            <p className="text-xs text-gray-500">Can be shipped</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowShipping || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowShipping: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Status Control Operations */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                          Status Control
                        </h4>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Cancellation</Label>
                            <p className="text-xs text-gray-500">Can cancel quote/order</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowCancellation || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowCancellation: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Allow Renewal</Label>
                            <p className="text-xs text-gray-500">Can renew expired quote</p>
                          </div>
                          <Switch
                            checked={editingStatus.allowRenewal || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { allowRenewal: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Permissions Summary */}
                    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-indigo-800">
                            <strong>Permission Tips:</strong> Action permissions control what buttons and features are available to users when viewing quotes/orders with this status. For example, 'allowCartActions' enables the "Add to Cart" button.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Display & UI Properties */}
                <fieldset className="border-t border-gray-200 pt-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Display & UI Properties</legend>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 mb-4">
                      Control how this status appears and behaves in the user interface across different views and contexts.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Visibility Controls */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-cyan-500 rounded-full"></span>
                          Visibility Controls
                        </h4>
                        
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Show in Customer View</Label>
                            <p className="text-xs text-gray-500">Visible to customers</p>
                          </div>
                          <Switch
                            checked={editingStatus.showInCustomerView !== false} // Default to true
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { showInCustomerView: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Show in Admin View</Label>
                            <p className="text-xs text-gray-500">Visible to administrators</p>
                          </div>
                          <Switch
                            checked={editingStatus.showInAdminView !== false} // Default to true
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { showInAdminView: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Show Expiration</Label>
                            <p className="text-xs text-gray-500">Display expiration timer/date</p>
                          </div>
                          <Switch
                            checked={editingStatus.showExpiration || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { showExpiration: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Status Classification */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
                          Status Classification
                        </h4>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Is Successful</Label>
                            <p className="text-xs text-gray-500">Represents successful completion</p>
                          </div>
                          <Switch
                            checked={editingStatus.isSuccessful || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { isSuccessful: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Counts as Order</Label>
                            <p className="text-xs text-gray-500">Include in order statistics</p>
                          </div>
                          <Switch
                            checked={editingStatus.countsAsOrder || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { countsAsOrder: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        {/* Progress Percentage */}
                        <div>
                          <Label 
                            htmlFor="progress-percentage"
                            className="text-sm font-medium text-gray-700 mb-2 block"
                          >
                            Progress Percentage
                          </Label>
                          <Input
                            id="progress-percentage"
                            type="number"
                            min="0"
                            max="100"
                            value={editingStatus.progressPercentage || 0}
                            onChange={(e) =>
                              updateStatus(
                                editingStatus.id,
                                { progressPercentage: parseInt(e.target.value) || 0 },
                                editingStatus.category,
                              )
                            }
                            className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                            aria-describedby="progress-percentage-help"
                          />
                          <p id="progress-percentage-help" className="text-xs text-gray-500 mt-1">
                            Progress bar percentage (0-100%) for visual indicators
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Preview */}
                    {(editingStatus.progressPercentage || 0) > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="text-sm font-medium text-gray-800 mb-3">Progress Preview:</h5>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-teal-500 h-3 rounded-full transition-all duration-300 flex items-center justify-center"
                            style={{ width: `${Math.min(100, Math.max(0, editingStatus.progressPercentage || 0))}%` }}
                          >
                            {(editingStatus.progressPercentage || 0) >= 20 && (
                              <span className="text-xs font-medium text-white">
                                {editingStatus.progressPercentage}%
                              </span>
                            )}
                          </div>
                        </div>
                        {(editingStatus.progressPercentage || 0) < 20 && (
                          <p className="text-xs text-gray-600 mt-1 text-right">
                            {editingStatus.progressPercentage}%
                          </p>
                        )}
                      </div>
                    )}

                    {/* Display Properties Summary */}
                    <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-cyan-800">
                            <strong>Display Tips:</strong> These properties control UI behavior - for example, 'countsAsOrder' affects analytics and reporting, while 'progressPercentage' shows completion status to users.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Customer Messaging */}
                <fieldset className="border-t border-gray-200 pt-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Customer Messaging</legend>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 mb-4">
                      Customize the messages and action text shown to customers when quotes/orders have this status.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* Customer Message */}
                      <div>
                        <Label 
                          htmlFor="customer-message"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Customer Message
                        </Label>
                        <textarea
                          id="customer-message"
                          value={editingStatus.customerMessage || ''}
                          onChange={(e) =>
                            updateStatus(
                              editingStatus.id,
                              { customerMessage: e.target.value },
                              editingStatus.category,
                            )
                          }
                          placeholder="e.g., Your quote is being processed. We'll notify you when it's ready."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500 resize-none"
                          aria-describedby="customer-message-help"
                        />
                        <p id="customer-message-help" className="text-xs text-gray-500 mt-1">
                          Message displayed to customers explaining this status (optional)
                        </p>
                      </div>

                      {/* Customer Action Text */}
                      <div>
                        <Label 
                          htmlFor="customer-action-text"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Customer Action Text
                        </Label>
                        <Input
                          id="customer-action-text"
                          value={editingStatus.customerActionText || ''}
                          onChange={(e) =>
                            updateStatus(
                              editingStatus.id,
                              { customerActionText: e.target.value },
                              editingStatus.category,
                            )
                          }
                          placeholder="e.g., View Details, Pay Now, Contact Us"
                          className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          aria-describedby="customer-action-text-help"
                        />
                        <p id="customer-action-text-help" className="text-xs text-gray-500 mt-1">
                          Text for customer action buttons (optional)
                        </p>
                      </div>
                    </div>

                    {/* Message Preview */}
                    {(editingStatus.customerMessage || editingStatus.customerActionText) && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h5 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5v3a.75.75 0 001.5 0v-3a.75.75 0 000-1.5H9z" clipRule="evenodd" />
                          </svg>
                          Customer View Preview:
                        </h5>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-start gap-3">
                            <Badge variant={editingStatus.color} className="shrink-0">
                              {editingStatus.label || editingStatus.name}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              {editingStatus.customerMessage && (
                                <p className="text-sm text-gray-700 mb-2">
                                  {editingStatus.customerMessage}
                                </p>
                              )}
                              {editingStatus.customerActionText && (
                                <button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors">
                                  {editingStatus.customerActionText}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer Messaging Tips */}
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-amber-800">
                            <strong>Messaging Tips:</strong> Keep customer messages clear and actionable. Use friendly, helpful language that explains next steps. Action text should be concise (2-3 words when possible).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Advanced Configuration */}
                <fieldset className="border-t border-gray-200 pt-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Advanced Configuration</legend>
                  <div className="space-y-6">
                    <p className="text-xs text-gray-500 mb-4">
                      Advanced settings for complex workflows, styling customization, and specialized payment features.
                    </p>
                    
                    {/* Advanced Flow Control */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                        <span className="inline-block w-2 h-2 bg-violet-500 rounded-full"></span>
                        Advanced Flow Control
                      </h4>
                      
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Requires Action</Label>
                          <p className="text-xs text-gray-500">Status requires admin intervention or action</p>
                        </div>
                        <Switch
                          checked={editingStatus.requiresAction || false}
                          onCheckedChange={(checked) =>
                            updateStatus(
                              editingStatus.id,
                              { requiresAction: checked },
                              editingStatus.category,
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Styling & CSS */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                        <span className="inline-block w-2 h-2 bg-pink-500 rounded-full"></span>
                        Styling & CSS
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label 
                            htmlFor="css-class"
                            className="text-sm font-medium text-gray-700 mb-2 block"
                          >
                            CSS Class
                          </Label>
                          <Input
                            id="css-class"
                            value={editingStatus.cssClass || ''}
                            onChange={(e) =>
                              updateStatus(
                                editingStatus.id,
                                { cssClass: e.target.value },
                                editingStatus.category,
                              )
                            }
                            placeholder="e.g., status-custom-pending"
                            className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                            aria-describedby="css-class-help"
                          />
                          <p id="css-class-help" className="text-xs text-gray-500 mt-1">
                            Custom CSS class for styling (optional)
                          </p>
                        </div>

                        <div>
                          <Label 
                            htmlFor="badge-variant"
                            className="text-sm font-medium text-gray-700 mb-2 block"
                          >
                            Badge Variant
                          </Label>
                          <Input
                            id="badge-variant"
                            value={editingStatus.badgeVariant || ''}
                            onChange={(e) =>
                              updateStatus(
                                editingStatus.id,
                                { badgeVariant: e.target.value },
                                editingStatus.category,
                              )
                            }
                            placeholder="e.g., custom-gradient"
                            className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                            aria-describedby="badge-variant-help"
                          />
                          <p id="badge-variant-help" className="text-xs text-gray-500 mt-1">
                            Custom badge variant for UI (optional)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Advanced COD Settings */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                        <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                        Advanced COD Settings
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Is COD Status</Label>
                            <p className="text-xs text-gray-500">Mark as COD-specific</p>
                          </div>
                          <Switch
                            checked={editingStatus.isCODStatus || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { isCODStatus: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">COD Collection Required</Label>
                            <p className="text-xs text-gray-500">Collection needed</p>
                          </div>
                          <Switch
                            checked={editingStatus.codCollectionRequired || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { codCollectionRequired: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">COD Remittance Tracking</Label>
                            <p className="text-xs text-gray-500">Track remittance</p>
                          </div>
                          <Switch
                            checked={editingStatus.codRemittanceTracking || false}
                            onCheckedChange={(checked) =>
                              updateStatus(
                                editingStatus.id,
                                { codRemittanceTracking: checked },
                                editingStatus.category,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Milestones Configuration */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                        <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full"></span>
                        Payment Milestones
                      </h4>
                      
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium text-gray-700">Payment Milestones</Label>
                          <button
                            type="button"
                            onClick={() => {
                              const currentMilestones = editingStatus.paymentMilestones || [];
                              const newMilestone = {
                                percentage: 50,
                                label: `Milestone ${currentMilestones.length + 1}`,
                                required: false
                              };
                              updateStatus(
                                editingStatus.id,
                                { paymentMilestones: [...currentMilestones, newMilestone] },
                                editingStatus.category,
                              );
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200 transition-colors"
                          >
                            Add Milestone
                          </button>
                        </div>
                        
                        {editingStatus.paymentMilestones && editingStatus.paymentMilestones.length > 0 ? (
                          <div className="space-y-3">
                            {editingStatus.paymentMilestones.map((milestone, index) => (
                              <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={milestone.percentage}
                                  onChange={(e) => {
                                    const currentMilestones = [...(editingStatus.paymentMilestones || [])];
                                    currentMilestones[index] = {
                                      ...currentMilestones[index],
                                      percentage: parseInt(e.target.value) || 0
                                    };
                                    updateStatus(
                                      editingStatus.id,
                                      { paymentMilestones: currentMilestones },
                                      editingStatus.category,
                                    );
                                  }}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <span className="text-xs text-gray-500">%</span>
                                <input
                                  type="text"
                                  value={milestone.label}
                                  onChange={(e) => {
                                    const currentMilestones = [...(editingStatus.paymentMilestones || [])];
                                    currentMilestones[index] = {
                                      ...currentMilestones[index],
                                      label: e.target.value
                                    };
                                    updateStatus(
                                      editingStatus.id,
                                      { paymentMilestones: currentMilestones },
                                      editingStatus.category,
                                    );
                                  }}
                                  placeholder="Milestone label"
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={milestone.required}
                                    onChange={(e) => {
                                      const currentMilestones = [...(editingStatus.paymentMilestones || [])];
                                      currentMilestones[index] = {
                                        ...currentMilestones[index],
                                        required: e.target.checked
                                      };
                                      updateStatus(
                                        editingStatus.id,
                                        { paymentMilestones: currentMilestones },
                                        editingStatus.category,
                                      );
                                    }}
                                    className="h-3 w-3"
                                  />
                                  <span className="text-xs text-gray-500">Required</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentMilestones = [...(editingStatus.paymentMilestones || [])];
                                    currentMilestones.splice(index, 1);
                                    updateStatus(
                                      editingStatus.id,
                                      { paymentMilestones: currentMilestones },
                                      editingStatus.category,
                                    );
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No payment milestones configured. Click "Add Milestone" to create one.
                          </p>
                        )}
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
                            <strong>Advanced Features:</strong> These settings provide granular control over status behavior. Payment milestones enable complex multi-stage payment workflows, while COD settings handle cash-on-delivery specific requirements.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Allowed Transitions */}
                <fieldset className="border-t border-gray-200 pt-4">
                  <legend className="text-sm font-semibold text-gray-900 mb-4">Allowed Transitions</legend>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 mb-3">
                      Select which statuses this status can transition to. Transitions define the valid workflow paths.
                    </p>
                    
                    {/* Available Statuses for Transitions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Quote Status Transitions */}
                      {quoteStatuses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            Quote Statuses
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                            {quoteStatuses
                              .filter(status => status.id !== editingStatus.id) // Don't allow self-transition
                              .map((status) => (
                              <div key={`quote-${status.id}`} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`transition-quote-${status.id}`}
                                  checked={(editingStatus.allowedTransitions || []).includes(status.name)}
                                  onChange={(e) => {
                                    const currentTransitions = editingStatus.allowedTransitions || [];
                                    const newTransitions = e.target.checked
                                      ? [...currentTransitions, status.name]
                                      : currentTransitions.filter(t => t !== status.name);
                                    
                                    updateStatus(
                                      editingStatus.id,
                                      { allowedTransitions: newTransitions },
                                      editingStatus.category
                                    );
                                  }}
                                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                />
                                <Label 
                                  htmlFor={`transition-quote-${status.id}`}
                                  className="text-sm text-gray-700 cursor-pointer flex-1"
                                >
                                  <span className="font-medium">{status.label}</span>
                                  <span className="text-xs text-gray-500 ml-2">({status.name})</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Status Transitions */}
                      {orderStatuses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                            Order Statuses
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                            {orderStatuses
                              .filter(status => status.id !== editingStatus.id) // Don't allow self-transition
                              .map((status) => (
                              <div key={`order-${status.id}`} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`transition-order-${status.id}`}
                                  checked={(editingStatus.allowedTransitions || []).includes(status.name)}
                                  onChange={(e) => {
                                    const currentTransitions = editingStatus.allowedTransitions || [];
                                    const newTransitions = e.target.checked
                                      ? [...currentTransitions, status.name]
                                      : currentTransitions.filter(t => t !== status.name);
                                    
                                    updateStatus(
                                      editingStatus.id,
                                      { allowedTransitions: newTransitions },
                                      editingStatus.category
                                    );
                                  }}
                                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                />
                                <Label 
                                  htmlFor={`transition-order-${status.id}`}
                                  className="text-sm text-gray-700 cursor-pointer flex-1"
                                >
                                  <span className="font-medium">{status.label}</span>
                                  <span className="text-xs text-gray-500 ml-2">({status.name})</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current Transitions Summary */}
                    {editingStatus.allowedTransitions && editingStatus.allowedTransitions.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="text-sm font-medium text-gray-800 mb-2">Current Transitions:</h5>
                        <div className="flex flex-wrap gap-2">
                          {editingStatus.allowedTransitions.map((transition) => {
                            // Find the full status object to get the label
                            const fullStatus = [...quoteStatuses, ...orderStatuses].find(s => s.name === transition);
                            return (
                              <span
                                key={transition}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200"
                              >
                                {fullStatus ? fullStatus.label : transition}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Helper Text */}
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Workflow Tip:</strong> Ensure transitions make logical sense. For example, 'pending' quotes typically transition to 'sent', 'approved', or 'rejected'. Orders usually follow: paid → ordered → shipped → completed.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </section>

              <footer className="px-6 py-4 border-t border-gray-200 bg-gray-50" role="contentinfo">
                <div className="flex justify-end gap-3" role="group" aria-label="Dialog actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingStatus(null)}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
                    aria-label="Cancel editing and close dialog"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={async () => {
                      await handleSaveIndividualStatus(editingStatus.id, editingStatus.category);
                      setEditingStatus(null);
                    }}
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-700 text-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 min-h-[44px] min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isSaving ? "Saving status changes" : "Save status changes and close dialog"}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        <span>Saving...</span>
                        <span className="sr-only">Please wait while changes are saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </footer>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}