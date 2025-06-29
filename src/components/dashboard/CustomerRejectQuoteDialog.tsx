import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tables } from '@/integrations/supabase/types';

interface RejectQuoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (reasonId: string, details: string) => void;
  isPending: boolean;
}

type RejectionReason = Tables<'rejection_reasons'>;

export const CustomerRejectQuoteDialog: React.FC<RejectQuoteDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rejectionReasons, isLoading: isLoadingReasons } = useQuery({
    queryKey: ['rejection_reasons'],
    queryFn: async (): Promise<RejectionReason[]> => {
      const { data, error } = await supabase
        .from('rejection_reasons')
        .select('*')
        .order('reason', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const handleConfirm = async () => {
    if (selectedReason && !isSubmitting && !isPending) {
      setIsSubmitting(true);
      try {
        await onConfirm(selectedReason, details);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedReason('');
      setDetails('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isSubmitting && !isPending) {
        onOpenChange(open);
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Quote</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this quote. Your feedback is
            valuable to us.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Reason for rejection</Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
              disabled={isLoadingReasons || isPending || isSubmitting}
            >
              <SelectTrigger id="rejection-reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {rejectionReasons?.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rejection-details">Additional details (optional)</Label>
            <Textarea
              id="rejection-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more information..."
              disabled={isPending || isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isPending || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason || isPending || isSubmitting}
          >
            {isPending || isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
