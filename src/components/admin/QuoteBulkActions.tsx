import { Button } from "@/components/ui/button";

interface QuoteBulkActionsProps {
  selectedCount: number;
  onBulkAction: (action: 'accepted' | 'cancelled' | 'confirm_payment') => void;
  isProcessing: boolean;
  isUpdatingStatus: boolean;
  activeStatusUpdate: string | null;
}

export const QuoteBulkActions = ({ selectedCount, onBulkAction, isProcessing, isUpdatingStatus, activeStatusUpdate }: QuoteBulkActionsProps) => {
  if (selectedCount === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg flex-wrap">
      <p className="text-sm font-medium">{selectedCount} quotes selected</p>
      <Button 
        size="sm" 
        onClick={() => onBulkAction('accepted')} 
        disabled={isProcessing}
      >
        {isUpdatingStatus && activeStatusUpdate === 'accepted' ? 'Approving...' : 'Approve Selected'}
      </Button>
      <Button 
        size="sm" 
        variant="destructive" 
        onClick={() => onBulkAction('cancelled')}
        disabled={isProcessing}
      >
        Reject Selected
      </Button>
      <Button 
        size="sm" 
        onClick={() => onBulkAction('confirm_payment')}
        disabled={isProcessing}
      >
        {isUpdatingStatus && activeStatusUpdate === 'confirm_payment' ? 'Confirming...' : 'Confirm Payment'}
      </Button>
    </div>
  );
};
