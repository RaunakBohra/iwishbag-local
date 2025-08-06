import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useStatusManagement, StatusConfig } from '@/hooks/useStatusManagement';
import { FixStatusJSON } from '@/components/admin/FixStatusJSON';
import { StatusConfigFixer } from '@/components/debug/StatusConfigFixer';

// Import focused components
import { StatusConfigurationList } from '@/components/admin/status-management/StatusConfigurationList';
import { StatusEditor } from '@/components/admin/status-management/StatusEditor';
import { StatusTransitions } from '@/components/admin/status-management/StatusTransitions';
import { PaymentMilestones } from '@/components/admin/status-management/PaymentMilestones';
import { AdvancedStatusSettings } from '@/components/admin/status-management/AdvancedStatusSettings';

export default function StatusManagement() {
  const {
    quoteStatuses,
    orderStatuses,
    updateStatus,
    saveStatus,
    addStatus,
    deleteStatus,
    reorderStatus,
    saveAllStatuses,
    isLoading,
    isSaving,
  } = useStatusManagement();

  const [editingStatus, setEditingStatus] = useState<StatusConfig | null>(null);
  const [activeTab, setActiveTab] = useState('quotes');

  // Event handlers
  const handleAddStatus = async (category: string) => {
    const newStatusId = await addStatus(category);
    if (newStatusId) {
      // Find the newly created status and edit it
      const allStatuses = [...quoteStatuses, ...orderStatuses];
      const newStatus = allStatuses.find(s => s.id === newStatusId);
      if (newStatus) {
        setEditingStatus(newStatus);
      }
    }
  };

  const handleEditStatus = (status: StatusConfig) => {
    setEditingStatus(status);
  };

  const handleDeleteStatus = async (id: string, category: string) => {
    await deleteStatus(id, category);
  };

  const handleReorderStatus = async (id: string, direction: 'up' | 'down', category: string) => {
    await reorderStatus(id, direction, category);
  };

  const handleSaveIndividualStatus = async (id: string, category: string) => {
    await saveStatus(id, category);
  };

  const handleSaveAll = async () => {
    await saveAllStatuses();
  };

  const handleUpdateStatus = (id: string, updates: Partial<StatusConfig>, category: string) => {
    updateStatus(id, updates, category);
  };

  const handleSaveAndCloseEditor = async () => {
    if (editingStatus) {
      await handleSaveIndividualStatus(editingStatus.id, editingStatus.category);
      setEditingStatus(null);
    }
  };

  const handleCancelEditor = () => {
    setEditingStatus(null);
  };

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Settings className="h-8 w-8 text-teal-600" />
              <span>Status Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure and manage quote and order status workflows
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              variant="outline"
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quotes">Quote Statuses</TabsTrigger>
          <TabsTrigger value="orders">Order Statuses</TabsTrigger>
          <TabsTrigger value="debug">Debug Tools</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Quote Statuses */}
        <TabsContent value="quotes" className="space-y-6">
          <StatusConfigurationList
            statuses={quoteStatuses}
            category="quote"
            onAddStatus={handleAddStatus}
            onEditStatus={handleEditStatus}
            onDeleteStatus={handleDeleteStatus}
            onReorderStatus={handleReorderStatus}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Order Statuses */}
        <TabsContent value="orders" className="space-y-6">
          <StatusConfigurationList
            statuses={orderStatuses}
            category="order"
            onAddStatus={handleAddStatus}
            onEditStatus={handleEditStatus}
            onDeleteStatus={handleDeleteStatus}
            onReorderStatus={handleReorderStatus}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Debug Tools */}
        <TabsContent value="debug" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FixStatusJSON />
            <StatusConfigFixer />
          </div>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="config" className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">System Configuration</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900">Quote Statuses</h4>
                  <p className="text-2xl font-bold text-blue-700">{quoteStatuses.length}</p>
                  <p className="text-sm text-blue-600">Configured statuses</p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900">Order Statuses</h4>
                  <p className="text-2xl font-bold text-green-700">{orderStatuses.length}</p>
                  <p className="text-sm text-green-600">Configured statuses</p>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900">Total Transitions</h4>
                  <p className="text-2xl font-bold text-purple-700">
                    {[...quoteStatuses, ...orderStatuses].reduce((sum, s) => sum + (s.allowedTransitions?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-purple-600">Configured transitions</p>
                </div>
              </div>

              {/* Workflow Summary */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Workflow Health Check</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Statuses with no transitions (excluding finals):</span>
                    <span className="font-medium">
                      {[...quoteStatuses, ...orderStatuses].filter(s => !s.finalStatus && (!s.allowedTransitions || s.allowedTransitions.length === 0)).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Final statuses:</span>
                    <span className="font-medium">
                      {[...quoteStatuses, ...orderStatuses].filter(s => s.finalStatus).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Statuses with payment requirements:</span>
                    <span className="font-medium">
                      {[...quoteStatuses, ...orderStatuses].filter(s => s.requiresPayment).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Editor Modal */}
      {editingStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Edit Status: {editingStatus.label || editingStatus.name}
                  </h2>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Configure the appearance and behavior of this status
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Basic Status Editor */}
              <StatusEditor
                status={editingStatus}
                onUpdateStatus={handleUpdateStatus}
                onSave={handleSaveAndCloseEditor}
                onCancel={handleCancelEditor}
                isSaving={isSaving}
              />

              {/* Transitions */}
              <StatusTransitions
                editingStatus={editingStatus}
                quoteStatuses={quoteStatuses}
                orderStatuses={orderStatuses}
                onUpdateStatus={handleUpdateStatus}
              />

              {/* Payment Milestones */}
              {editingStatus.requiresPayment && (
                <PaymentMilestones
                  editingStatus={editingStatus}
                  onUpdateStatus={handleUpdateStatus}
                />
              )}

              {/* Advanced Settings */}
              <AdvancedStatusSettings
                editingStatus={editingStatus}
                onUpdateStatus={handleUpdateStatus}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancelEditor}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAndCloseEditor}
                  disabled={isSaving || !editingStatus.name || !editingStatus.label}
                  className="min-w-[120px]"
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
      )}
    </main>
  );
}