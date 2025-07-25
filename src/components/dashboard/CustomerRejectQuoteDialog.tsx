import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { XCircle, AlertTriangle } from 'lucide-react';

interface CustomerRejectQuoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonId: string, details?: string) => Promise<void>;
  isPending?: boolean;
}

const rejectionReasons = [
  {
    id: 'price_too_high',
    label: 'Price is too high',
    description: 'The total cost exceeds my budget'
  },
  {
    id: 'shipping_too_expensive',
    label: 'Shipping costs too much',
    description: 'International shipping fees are too high'
  },
  {
    id: 'taxes_too_high',
    label: 'Taxes and duties too high',
    description: 'Customs duties and local taxes are excessive'
  },
  {
    id: 'delivery_too_slow',
    label: 'Delivery time too long',
    description: 'Takes too long to receive the items'
  },
  {
    id: 'changed_mind',
    label: 'Changed my mind',
    description: 'No longer need these items'
  },
  {
    id: 'found_better_deal',
    label: 'Found a better deal',
    description: 'Found the same items at a better price elsewhere'
  },
  {
    id: 'other',
    label: 'Other reason',
    description: 'Please specify in the details below'
  }
];

export const CustomerRejectQuoteDialog: React.FC<CustomerRejectQuoteDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending = false
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(selectedReason, details.trim() || undefined);
      // Reset form
      setSelectedReason('');
      setDetails('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReasonData = rejectionReasons.find(r => r.id === selectedReason);
  const showDetailsField = selectedReason === 'other' || details.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            Reject Quote
          </DialogTitle>
          <DialogDescription>
            We're sorry this quote doesn't meet your needs. Please let us know why you're rejecting it 
            so we can improve our service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Reason for rejection:</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {rejectionReasons.map((reason) => (
                <div key={reason.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                  <RadioGroupItem value={reason.id} id={reason.id} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={reason.id} className="font-medium text-sm cursor-pointer">
                      {reason.label}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">{reason.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          {(showDetailsField || selectedReason === 'other') && (
            <div className="space-y-2">
              <Label htmlFor="details" className="text-sm font-medium">
                {selectedReason === 'other' ? 'Please specify:' : 'Additional details (optional):'}
              </Label>
              <Textarea
                id="details"
                placeholder={
                  selectedReason === 'other' 
                    ? 'Please tell us more about your reason...'
                    : 'Any additional feedback you\'d like to share...'
                }
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Warning */}
          {selectedReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">Before rejecting:</p>
                  <ul className="space-y-1">
                    <li>• This action cannot be undone</li>
                    <li>• You can contact support for assistance with pricing concerns</li>
                    <li>• Alternative shipping options may be available</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedReason || isPending || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Reject Quote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};