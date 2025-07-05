import { useState } from 'react';
import { Button } from './ui/button';
import { useQuoteRenewal } from '../hooks/useQuoteRenewal';
import { useToast } from '../hooks/use-toast';
import { RefreshCw } from 'lucide-react';

interface RenewQuoteButtonProps {
  quoteId: string;
  onRenewed?: () => void;
  className?: string;
}

export const RenewQuoteButton = ({ quoteId, onRenewed, className }: RenewQuoteButtonProps) => {
  const { renewQuote, isRenewing } = useQuoteRenewal();
  const { toast } = useToast();
  const [isRenewed, setIsRenewed] = useState(false);

  const handleRenew = async () => {
    try {
      await renewQuote(quoteId);
      
      toast({
        title: "Quote Renewed",
        description: "Your quote has been renewed and is now pending admin review.",
      });

      setIsRenewed(true);
      onRenewed?.();
    } catch (error) {
      toast({
        title: "Renewal Failed",
        description: error instanceof Error ? error.message : "Failed to renew quote",
        variant: "destructive",
      });
    }
  };

  if (isRenewed) {
    return (
      <Button disabled className={className}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Renewed Successfully
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleRenew} 
      disabled={isRenewing}
      className={className}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRenewing ? 'animate-spin' : ''}`} />
      {isRenewing ? 'Renewing...' : 'Renew Quote'}
    </Button>
  );
}; 