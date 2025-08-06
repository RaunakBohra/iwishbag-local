import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ShoppingCart, Settings } from 'lucide-react';
import { useStatusManagement, StatusConfig } from '@/hooks/useStatusManagement';
import { supabase } from '@/integrations/supabase/client';
import { StatusConfigFixer } from '@/components/debug/StatusConfigFixer';

// Import our refactored components
import { StatusHeader } from '@/components/status-management/StatusHeader';
import { StatusList } from '@/components/status-management/StatusList';
import { StatusConfiguration } from '@/components/status-management/StatusConfiguration';
import { StatusWorkflow } from '@/components/status-management/StatusWorkflow';

export default function StatusManagementRefactored() {
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
      setEditingStatus(null);
    } catch (error) {
      console.error('Failed to save status:', error);
      alert(`Failed to save status settings: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToSaved = () => {
    setLocalQuoteStatuses([...quoteStatuses]);
    setLocalOrderStatuses([...orderStatuses]);
  };

  const handleLoadPaymentStatuses = async () => {
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
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading status configurations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading status configurations: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50" role="main">
      <StatusHeader
        isSaving={isSaving}
        quoteStatuses={localQuoteStatuses}
        orderStatuses={localOrderStatuses}
        onSaveSettings={handleSaveSettings}
        onResetToSaved={handleResetToSaved}
        onLoadPaymentStatuses={handleLoadPaymentStatuses}
      />

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
            <StatusList
              title="Quote Statuses"
              description="Configure the workflow for quote processing"
              category="quote"
              statuses={localQuoteStatuses}
              onAddStatus={addStatus}
              onEditStatus={setEditingStatus}
              onDeleteStatus={deleteStatus}
              onMoveStatus={moveStatus}
            />
          </TabsContent>

          <TabsContent value="orders" className="space-y-6" role="tabpanel" id="orders-panel" aria-labelledby="orders-tab">
            <StatusList
              title="Order Statuses"
              description="Configure the workflow for order processing"
              category="order"
              statuses={localOrderStatuses}
              onAddStatus={addStatus}
              onEditStatus={setEditingStatus}
              onDeleteStatus={deleteStatus}
              onMoveStatus={moveStatus}
            />
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

        {/* Status Configuration Modal */}
        {editingStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <StatusConfiguration
                editingStatus={editingStatus}
                onUpdateStatus={updateStatus}
                onClose={() => setEditingStatus(null)}
                onSave={handleSaveIndividualStatus}
                isSaving={isSaving}
              />
              
              {/* Advanced Configuration Tab */}
              <div className="border-t border-gray-200">
                <div className="px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Advanced Workflow Configuration
                  </h3>
                  <StatusWorkflow
                    editingStatus={editingStatus}
                    onUpdateStatus={updateStatus}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}