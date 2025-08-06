import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface StatusTransitionsProps {
  editingStatus: StatusConfig;
  quoteStatuses: StatusConfig[];
  orderStatuses: StatusConfig[];
  onUpdateStatus: (id: string, updates: Partial<StatusConfig>, category: string) => void;
}

export const StatusTransitions: React.FC<StatusTransitionsProps> = ({
  editingStatus,
  quoteStatuses,
  orderStatuses,
  onUpdateStatus
}) => {
  const handleTransitionToggle = (statusName: string, checked: boolean) => {
    const currentTransitions = editingStatus.allowedTransitions || [];
    const newTransitions = checked
      ? [...currentTransitions, statusName]
      : currentTransitions.filter(t => t !== statusName);
    
    onUpdateStatus(
      editingStatus.id,
      { allowedTransitions: newTransitions },
      editingStatus.category
    );
  };

  return (
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
                      onChange={(e) => handleTransitionToggle(status.name, e.target.checked)}
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
                      onChange={(e) => handleTransitionToggle(status.name, e.target.checked)}
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
                  <Badge
                    key={transition}
                    variant="outline"
                    className="text-xs"
                  >
                    {fullStatus ? fullStatus.label : transition}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* No Transitions Warning */}
        {(!editingStatus.allowedTransitions || editingStatus.allowedTransitions.length === 0) && !editingStatus.finalStatus && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">No transitions configured</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              This status has no allowed transitions. Consider adding transitions or marking it as a final status.
            </p>
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

        {/* Common Transition Patterns */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="text-sm font-medium text-blue-800 mb-2">Common Patterns:</h5>
          <div className="text-xs text-blue-700 space-y-1">
            <div><strong>Quote Flow:</strong> pending → sent → approved → ordered</div>
            <div><strong>Order Flow:</strong> paid → processing → shipped → delivered</div>
            <div><strong>Rejection Flow:</strong> Any status → rejected (final)</div>
            <div><strong>Cancellation Flow:</strong> Any status → cancelled (final)</div>
          </div>
        </div>
      </div>
    </fieldset>
  );
};