import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const [existingTicket, setExistingTicket] = useState<any>(null);
  const [checkingTicket, setCheckingTicket] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only show for quotes that can be discussed
  const allowedStatuses = ['pending', 'sent', 'approved', 'rejected', 'expired'];
  
  // Check for existing support tickets for this quote
  useEffect(() => {
    const checkExistingTicket = async () => {
      if (!user?.id || !quote?.id) {
        setCheckingTicket(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('support_system')
          .select('id, ticket_data, created_at')
          .eq('user_id', user.id)
          .eq('quote_id', quote.id)
          .eq('system_type', 'ticket')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing ticket:', error);
        } else if (data) {
          setExistingTicket(data);
        }
      } catch (err) {
        console.error('Exception checking existing ticket:', err);
      } finally {
        setCheckingTicket(false);
      }
    };

    checkExistingTicket();
  }, [user?.id, quote?.id]);
  
  if (!allowedStatuses.includes(quote.status)) {
    return null;
  }

  const handleSuccess = () => {
    setModalOpen(false);
    setIsLoading(false);
    setCheckingTicket(true); // Refresh ticket check
    
    if (onMessageSent) {
      onMessageSent();
    }
  };

  const handleViewTicket = () => {
    const quoteParam = quote.quote_number || quote.id?.slice(-8) || '';
    navigate(`/support/my-tickets?quote=${quoteParam}`);
  };

  const handleSubmitting = (loading: boolean) => {
    setIsLoading(loading);
  };

  // Button size configurations
  const sizeConfig = {
    sm: {
      button: 'h-8 px-3 text-sm',
      icon: 'w-3 h-3',
      gap: 'gap-1.5'
    },
    md: {
      button: 'h-10 px-4 text-sm',
      icon: 'w-4 h-4', 
      gap: 'gap-2'
    },
    lg: {
      button: 'h-12 px-6 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2.5'
    }
  };

  const currentSize = sizeConfig[size];

  // STATE 1: Loading - Check for existing tickets
  if (checkingTicket) {
    return (
      <div className={`inline-flex ${className}`}>
        <Button
          variant={variant}
          className={`${currentSize.button} ${currentSize.gap} min-w-[120px] justify-center`}
          disabled={true}
        >
          <div className={`animate-spin rounded-full ${currentSize.icon} border-2 border-current border-t-transparent`} />
          <span>Loading...</span>
        </Button>
      </div>
    );
  }

  // STATE 2: Has Existing Tickets - Show dual action buttons
  if (existingTicket) {
    return (
      <div className={`inline-flex flex-col sm:flex-row gap-2 w-full sm:w-auto ${className}`}>
        {/* Primary Action: View Conversation */}
        <Button
          variant="default"
          className={`${currentSize.button} ${currentSize.gap} bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm flex-1 sm:flex-initial min-w-[140px] justify-center`}
          onClick={handleViewTicket}
        >
          <OptimizedIcon name="MessageCircle" className={currentSize.icon} />
          <span>View Chat</span>
        </Button>

        {/* Secondary Action: New Ticket */}
        <Button
          variant="outline"
          className={`${currentSize.button} ${currentSize.gap} border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex-1 sm:flex-initial min-w-[100px] justify-center`}
          onClick={() => setModalOpen(true)}
          disabled={isLoading}
        >
          <OptimizedIcon name="Plus" className={currentSize.icon} />
          <span>New Ticket</span>
        </Button>

        {/* Modal for new ticket creation */}
        <QuoteMessageModal
          quote={quote}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
          onSubmitting={handleSubmitting}
        />
      </div>
    );
  }

  // STATE 3: No Existing Tickets - Show contact support
  return (
    <div className={`inline-flex ${className}`}>
      <Button
        variant={variant}
        className={`${currentSize.button} ${currentSize.gap} min-w-[140px] justify-center font-medium`}
        onClick={() => setModalOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className={`animate-spin rounded-full ${currentSize.icon} border-2 border-current border-t-transparent`} />
            <span>Sending...</span>
          </>
        ) : (
          <>
            <OptimizedIcon name="MessageCircle" className={currentSize.icon} />
            <span>Contact Support</span>
          </>
        )}
      </Button>

      {/* Modal for ticket creation */}
      <QuoteMessageModal
        quote={quote}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        onSubmitting={handleSubmitting}
      />
    </div>
  );
};

export default QuoteMessagingButton;