import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import QuoteMessageModal from './QuoteMessageModal';

interface QuoteMessagingButtonProps {
  quote: any;
  onMessageSent?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const QuoteMessagingButton: React.FC<QuoteMessagingButtonProps> = ({
  quote,
  onMessageSent,
  className = '',
  variant = 'outline',
  size = 'md'
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Only show for quotes that can be discussed
  const allowedStatuses = ['pending', 'sent', 'approved', 'rejected', 'expired'];
  
  if (!allowedStatuses.includes(quote.status)) {
    return null;
  }

  const handleSuccess = () => {
    setModalOpen(false);
    setIsLoading(false);
    if (onMessageSent) {
      onMessageSent();
    }
  };

  const handleSubmitting = (loading: boolean) => {
    setIsLoading(loading);
  };

  const buttonSizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6'
  };

  return (
    <>
      <Button
        variant={variant}
        className={`${buttonSizes[size]} gap-2 ${className}`}
        onClick={() => setModalOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            Sending...
          </>
        ) : (
          <>
            <OptimizedIcon name="MessageCircle" className="w-4 h-4" />
            Message About Quote
          </>
        )}
      </Button>

      <QuoteMessageModal
        quote={quote}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        onSubmitting={handleSubmitting}
      />
    </>
  );
};

export default QuoteMessagingButton;