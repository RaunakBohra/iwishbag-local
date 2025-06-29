import React from 'react';
import { Button } from '@/components/ui/button';

interface QuoteListItemProps {
  onReject: () => void;
}

const QuoteListItem: React.FC<QuoteListItemProps> = ({ onReject }) => {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onReject}
    >
      Reject Quote
    </Button>
  );
};

export default QuoteListItem; 