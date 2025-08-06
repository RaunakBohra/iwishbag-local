import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface PaymentMilestone {
  name: string;
  percentage: number;
  description?: string;
  required: boolean;
}

interface PaymentMilestonesProps {
  editingStatus: StatusConfig;
  onUpdateStatus: (id: string, updates: Partial<StatusConfig>, category: string) => void;
}

export const PaymentMilestones: React.FC<PaymentMilestonesProps> = ({
  editingStatus,
  onUpdateStatus
}) => {
  const paymentMilestones = editingStatus.paymentMilestones || [];

  const addMilestone = () => {
    const newMilestone: PaymentMilestone = {
      name: 'New Milestone',
      percentage: 0,
      description: '',
      required: false
    };
    
    const updatedMilestones = [...paymentMilestones, newMilestone];
    onUpdateStatus(
      editingStatus.id,
      { paymentMilestones: updatedMilestones },
      editingStatus.category
    );
  };

  const updateMilestone = (index: number, updates: Partial<PaymentMilestone>) => {
    const currentMilestones = [...paymentMilestones];
    currentMilestones[index] = { ...currentMilestones[index], ...updates };
    
    onUpdateStatus(
      editingStatus.id,
      { paymentMilestones: currentMilestones },
      editingStatus.category
    );
  };

  const removeMilestone = (index: number) => {
    const currentMilestones = [...paymentMilestones];
    currentMilestones.splice(index, 1);
    
    onUpdateStatus(
      editingStatus.id,
      { paymentMilestones: currentMilestones },
      editingStatus.category
    );
  };

  const getTotalPercentage = () => {
    return paymentMilestones.reduce((sum, milestone) => sum + (milestone.percentage || 0), 0);
  };

  const totalPercentage = getTotalPercentage();
  const isValidTotal = totalPercentage === 100;

  return (
    <fieldset className="border-t border-gray-200 pt-4">
      <legend className="text-sm font-semibold text-gray-900 mb-4">Payment Milestones</legend>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              Configure payment milestones for multi-stage payment workflows.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMilestone}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Milestone</span>
          </Button>
        </div>

        {/* Milestones List */}
        <div className="space-y-3">
          {paymentMilestones.length > 0 ? (
            <>
              {paymentMilestones.map((milestone, index) => (
                <div 
                  key={index} 
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="space-y-3">
                    {/* Milestone Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Milestone {index + 1}</span>
                        {milestone.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Milestone Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor={`milestone-name-${index}`}>Name</Label>
                        <Input
                          id={`milestone-name-${index}`}
                          value={milestone.name}
                          onChange={(e) => updateMilestone(index, { name: e.target.value })}
                          placeholder="e.g., Down Payment"
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`milestone-percentage-${index}`}>Percentage</Label>
                        <div className="relative">
                          <Input
                            id={`milestone-percentage-${index}`}
                            type="number"
                            min="0"
                            max="100"
                            value={milestone.percentage}
                            onChange={(e) => updateMilestone(index, { percentage: parseFloat(e.target.value) || 0 })}
                            className="pr-8 text-sm"
                          />
                          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            %
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={milestone.required}
                            onChange={(e) => updateMilestone(index, { required: e.target.checked })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          />
                          <span className="text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <Label htmlFor={`milestone-description-${index}`}>Description (Optional)</Label>
                      <Input
                        id={`milestone-description-${index}`}
                        value={milestone.description || ''}
                        onChange={(e) => updateMilestone(index, { description: e.target.value })}
                        placeholder="Brief description of this milestone..."
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Summary */}
              <div className={`p-3 rounded-lg border-2 ${
                isValidTotal 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">Total Percentage:</span>
                    <span className={`ml-2 font-bold ${
                      isValidTotal ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {totalPercentage}%
                    </span>
                  </div>
                  
                  {!isValidTotal && (
                    <div className="text-xs text-red-600">
                      {totalPercentage > 100 
                        ? `Exceeds 100% by ${totalPercentage - 100}%`
                        : `Missing ${100 - totalPercentage}%`
                      }
                    </div>
                  )}
                </div>
                
                {isValidTotal && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Milestones add up to 100%
                  </div>
                )}
              </div>

              {/* Milestone Preview */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Milestone Flow Preview:</h5>
                <div className="space-y-1">
                  {paymentMilestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between text-xs text-blue-700">
                      <span>
                        {index + 1}. {milestone.name}
                        {milestone.required && <span className="text-red-600"> *</span>}
                      </span>
                      <span className="font-mono">{milestone.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

            </>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-4">
                No payment milestones configured. Click "Add Milestone" to create multi-stage payment workflow.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Milestone
              </Button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h5 className="text-sm font-medium text-gray-800 mb-2">Payment Milestone Examples:</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Down Payment:</strong> 30% upfront, 70% on completion</div>
            <div><strong>Installments:</strong> 25% × 4 payments over time</div>
            <div><strong>Progress Based:</strong> 50% on start, 30% midway, 20% completion</div>
          </div>
        </div>

        {/* Validation Warnings */}
        {paymentMilestones.length > 0 && !isValidTotal && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2 text-amber-800">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Invalid milestone configuration</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Payment milestones should add up to exactly 100% for proper payment processing.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
};