import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StatusConfig } from '@/hooks/useStatusManagement';

interface StatusWorkflowProps {
  editingStatus: StatusConfig;
  onUpdateStatus: (statusId: string, updates: Partial<StatusConfig>, category: 'quote' | 'order') => void;
}

export const StatusWorkflow: React.FC<StatusWorkflowProps> = ({
  editingStatus,
  onUpdateStatus,
}) => {
  return (
    <div className="space-y-8">
      {/* Visibility Controls */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Visibility & Display
        </legend>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <Label className="text-sm font-medium text-gray-700">Show in Quotes List</Label>
            <p className="text-xs text-gray-500">Display quotes with this status in the main quotes list</p>
          </div>
          <Switch
            checked={editingStatus.showsInQuotesList || false}
            onCheckedChange={(checked) =>
              onUpdateStatus(
                editingStatus.id,
                { showsInQuotesList: checked },
                editingStatus.category,
              )
            }
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <Label className="text-sm font-medium text-gray-700">Show in Orders List</Label>
            <p className="text-xs text-gray-500">Display orders with this status in the main orders list</p>
          </div>
          <Switch
            checked={editingStatus.showsInOrdersList || false}
            onCheckedChange={(checked) =>
              onUpdateStatus(
                editingStatus.id,
                { showsInOrdersList: checked },
                editingStatus.category,
              )
            }
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <Label className="text-sm font-medium text-gray-700">Can Be Paid</Label>
            <p className="text-xs text-gray-500">Allow payment processing for items in this status</p>
          </div>
          <Switch
            checked={editingStatus.canBePaid || false}
            onCheckedChange={(checked) =>
              onUpdateStatus(editingStatus.id, { canBePaid: checked }, editingStatus.category)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-gray-700">Triggers Email Notification</Label>
            <p className="text-xs text-gray-500">Send automated email when status changes</p>
          </div>
          <Switch
            checked={editingStatus.triggersEmail || false}
            onCheckedChange={(checked) =>
              onUpdateStatus(
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
              <p className="text-xs text-gray-500">Use this as the default status for new quotes</p>
            </div>
            <Switch
              checked={editingStatus.isDefaultQuoteStatus || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
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
                onUpdateStatus(
                  editingStatus.id,
                  { emailTemplate: e.target.value },
                  editingStatus.category,
                )
              }
              placeholder="e.g., quote_approved"
              className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              aria-describedby="email-template-help"
            />
            <p className="text-xs text-gray-500 mt-1" id="email-template-help">
              Template name for automated email notifications
            </p>
          </div>
        )}
      </fieldset>

      {/* Payment Configuration for Orders */}
      {editingStatus.category === 'order' && (
        <fieldset className="border-t border-gray-200 pt-4">
          <legend className="text-sm font-semibold text-gray-900 mb-4">Payment Configuration</legend>
          <div className="space-y-4">
            {/* Payment Type */}
            <div>
              <Label htmlFor="payment-type" className="text-sm font-medium text-gray-700 mb-2 block">
                Payment Type
              </Label>
              <select
                id="payment-type"
                value={editingStatus.paymentType || 'prepaid'}
                onChange={(e) =>
                  onUpdateStatus(
                    editingStatus.id,
                    { paymentType: e.target.value },
                    editingStatus.category,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                aria-describedby="payment-type-help"
              >
                <option value="prepaid">Prepaid (Full payment before processing)</option>
                <option value="cod">Cash on Delivery</option>
                <option value="partial">Partial Payment</option>
                <option value="mixed">Mixed (Prepaid + COD options)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1" id="payment-type-help">
                Determines the payment flow for orders in this status
              </p>
            </div>

            {/* Payment Required Before */}
            <div>
              <Label htmlFor="payment-required-before" className="text-sm font-medium text-gray-700 mb-2 block">
                Payment Required Before
              </Label>
              <select
                id="payment-required-before"
                value={editingStatus.paymentRequiredBefore || 'shipping'}
                onChange={(e) =>
                  onUpdateStatus(
                    editingStatus.id,
                    { paymentRequiredBefore: e.target.value },
                    editingStatus.category,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                aria-describedby="payment-required-before-help"
              >
                <option value="ordering">Ordering</option>
                <option value="shipping">Shipping</option>
                <option value="delivery">Delivery</option>
              </select>
              <p className="text-xs text-gray-500 mt-1" id="payment-required-before-help">
                When payment must be completed in the order workflow
              </p>
            </div>

            {/* Minimum Payment Percentage (for partial/mixed) */}
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
                  value={editingStatus.minPaymentPercentage || 50}
                  onChange={(e) =>
                    onUpdateStatus(
                      editingStatus.id,
                      { minPaymentPercentage: parseInt(e.target.value) || 50 },
                      editingStatus.category,
                    )
                  }
                  className="border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  aria-describedby="min-payment-percentage-help"
                />
                <p className="text-xs text-gray-500 mt-1" id="min-payment-percentage-help">
                  Minimum percentage required for partial payments (default: 50%)
                </p>
              </div>
            )}

            {/* COD Settings */}
            {(editingStatus.paymentType === 'cod' || editingStatus.paymentType === 'mixed') && (
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900">Cash on Delivery Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-blue-800">Allow COD</Label>
                    <p className="text-xs text-blue-600">Enable cash on delivery for this status</p>
                  </div>
                  <Switch
                    checked={editingStatus.allowCOD || false}
                    onCheckedChange={(checked) =>
                      onUpdateStatus(
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
                    <p className="text-xs text-blue-600">Charge additional fee for COD orders</p>
                  </div>
                  <Switch
                    checked={editingStatus.codFeeRequired || false}
                    onCheckedChange={(checked) =>
                      onUpdateStatus(
                        editingStatus.id,
                        { codFeeRequired: checked },
                        editingStatus.category,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-blue-800">COD Verification Required</Label>
                    <p className="text-xs text-blue-600">Require phone verification for COD orders</p>
                  </div>
                  <Switch
                    checked={editingStatus.codVerificationRequired || false}
                    onCheckedChange={(checked) =>
                      onUpdateStatus(
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
              <Label htmlFor="payment-validation-rule" className="text-sm font-medium text-gray-700 mb-2 block">
                Payment Validation Rule
              </Label>
              <select
                id="payment-validation-rule"
                value={editingStatus.paymentValidationRule || 'standard'}
                onChange={(e) =>
                  onUpdateStatus(
                    editingStatus.id,
                    { paymentValidationRule: e.target.value },
                    editingStatus.category,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                aria-describedby="payment-validation-rule-help"
              >
                <option value="standard">Standard validation</option>
                <option value="strict">Strict validation (manual approval)</option>
                <option value="lenient">Lenient validation (auto-approve)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1" id="payment-validation-rule-help">
                How strictly to validate payments for orders in this status
              </p>
            </div>
          </div>
        </fieldset>
      )}

      {/* User Actions & Permissions */}
      <fieldset className="border-t border-gray-200 pt-4">
        <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          User Actions & Permissions
        </legend>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">Allow Edit</Label>
              <p className="text-xs text-gray-500">Users can edit items in this status</p>
            </div>
            <Switch
              checked={editingStatus.allowEdit || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
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
              <p className="text-xs text-gray-500">Users can edit shipping addresses</p>
            </div>
            <Switch
              checked={editingStatus.allowAddressEdit || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
                  editingStatus.id,
                  { allowAddressEdit: checked },
                  editingStatus.category,
                )
              }
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">Allow Approval</Label>
              <p className="text-xs text-gray-500">Admins can approve items in this status</p>
            </div>
            <Switch
              checked={editingStatus.allowApproval || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
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
              <p className="text-xs text-gray-500">Admins can reject items in this status</p>
            </div>
            <Switch
              checked={editingStatus.allowRejection || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
                  editingStatus.id,
                  { allowRejection: checked },
                  editingStatus.category,
                )
              }
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">Allow Cart Actions</Label>
              <p className="text-xs text-gray-500">Users can add/remove items from cart</p>
            </div>
            <Switch
              checked={editingStatus.allowCartActions || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
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
              <p className="text-xs text-gray-500">Items can be shipped in this status</p>
            </div>
            <Switch
              checked={editingStatus.allowShipping || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
                  editingStatus.id,
                  { allowShipping: checked },
                  editingStatus.category,
                )
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">Allow Cancellation</Label>
              <p className="text-xs text-gray-500">Users can cancel items in this status</p>
            </div>
            <Switch
              checked={editingStatus.allowCancellation || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
                  editingStatus.id,
                  { allowCancellation: checked },
                  editingStatus.category,
                )
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700">Allow Refund</Label>
              <p className="text-xs text-gray-500">Refunds can be processed for items in this status</p>
            </div>
            <Switch
              checked={editingStatus.allowRefund || false}
              onCheckedChange={(checked) =>
                onUpdateStatus(
                  editingStatus.id,
                  { allowRefund: checked },
                  editingStatus.category,
                )
              }
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
};