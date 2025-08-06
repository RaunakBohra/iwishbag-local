import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  Save, 
  Loader2 
} from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface StatusHeaderProps {
  isSaving: boolean;
  quoteStatuses: StatusConfig[];
  orderStatuses: StatusConfig[];
  onSaveSettings: () => Promise<void>;
  onResetToSaved: () => void;
  onLoadPaymentStatuses: () => Promise<void>;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  isSaving,
  quoteStatuses,
  orderStatuses,
  onSaveSettings,
  onResetToSaved,
  onLoadPaymentStatuses,
}) => {
  const handleLoadPaymentStatuses = async () => {
    if (confirm('This will clear your database and load all new statuses including COD and partial payment statuses. Are you sure?')) {
      await onLoadPaymentStatuses();
    }
  };

  return (
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
                onClick={handleLoadPaymentStatuses}
                className="text-orange-700 border-orange-300 hover:bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                disabled={isSaving}
                aria-describedby="load-payment-statuses-desc"
              >
                <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
                Load All Payment Statuses
              </Button>
              
              <Button
                variant="outline"
                onClick={onResetToSaved}
                disabled={isSaving}
                className="text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-describedby="reset-desc"
              >
                Reset to Saved
              </Button>
              
              <Button
                onClick={onSaveSettings}
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

      {/* Help Text - Hidden descriptions for screen readers */}
      <div className="sr-only">
        <span id="load-payment-statuses-desc">
          Loads comprehensive payment status configurations including COD and partial payment options
        </span>
        <span id="reset-desc">
          Discards all unsaved changes and reverts to the last saved configuration
        </span>
        <span id="save-desc">
          Saves all status configuration changes to the database
        </span>
      </div>
    </header>
  );
};