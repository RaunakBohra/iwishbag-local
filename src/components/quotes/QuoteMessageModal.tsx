import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface QuoteMessageModalProps {
  quote: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmitting?: (loading: boolean) => void;
}

const QuoteMessageModal: React.FC<QuoteMessageModalProps> = ({
  quote,
  isOpen,
  onClose,
  onSuccess,
  onSubmitting
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const categories = [
    { id: 'pricing', label: 'Price', icon: 'DollarSign', description: 'Cost, discounts, or pricing questions' },
    { id: 'items', label: 'Items', icon: 'Package', description: 'Add, remove, or change items' },
    { id: 'shipping', label: 'Shipping', icon: 'Truck', description: 'Delivery options or timeline' },
    { id: 'timeline', label: 'Timeline', icon: 'Clock', description: 'Urgent or time-sensitive requests' },
    { id: 'other', label: 'Other', icon: 'MessageCircle', description: 'General questions or concerns' }
  ];

  const resetForm = () => {
    setMessage('');
    setSelectedCategory(null);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (onSubmitting) onSubmitting(true);


      // Validate message
      if (!message.trim()) {
        toast({
          title: "Message Required",
          description: "Please enter your message.",
          variant: "destructive",
        });
        return;
      }

      if (message.trim().length < 10) {
        toast({
          title: "Message Too Short", 
          description: "Please provide at least 10 characters describing your request.",
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to send a message.",
          variant: "destructive",
        });
        return;
      }


      // Auto-categorize the message if no category selected
      let category = selectedCategory;
      if (!category) {
        // Simple auto-categorization logic (can be enhanced later)
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('discount')) {
          category = 'pricing';
        } else if (lowerMessage.includes('item') || lowerMessage.includes('product')) {
          category = 'items';
        } else if (lowerMessage.includes('ship') || lowerMessage.includes('deliver')) {
          category = 'shipping';
        } else if (lowerMessage.includes('urgent') || lowerMessage.includes('asap')) {
          category = 'timeline';
        } else {
          category = 'other';
        }
      }

      // Create support ticket using the new secure system
      const { data, error } = await supabase
        .from('support_system')
        .insert({
          user_id: userData.user.id,
          quote_id: quote.id,
          system_type: 'ticket',
          ticket_data: {
            subject: `Question about Quote #${quote.quote_number || quote.id?.slice(-8)}`,
            description: message.trim(),
            status: 'open',
            priority: category === 'timeline' ? 'urgent' : 'medium',
            category: category,
            quote_number: quote.quote_number || quote.id?.slice(-8),
            quote_total: quote.total_quote_origincurrency,
            quote_status: quote.status
          },
          is_active: true
        })
        .select('id')
        .single();

      if (error) {
        console.error('Support ticket creation error:', error);
        throw error;
      }

      // Check if we got a support ticket ID back
      if (!data?.id) {
        throw new Error('Failed to create support ticket');
      }

      toast({
        title: "Support Ticket Created!",
        description: "Your message has been sent to our team. View your ticket in the support section to track responses."
      });

      // Navigate after a short delay to let the user see the success message
      setTimeout(() => {
        const quoteParam = quote.quote_number || quote.id?.slice(-8) || '';
        navigate(`/support/my-tickets?quote=${quoteParam}`);
      }, 1500);

      resetForm();
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      if (onSubmitting) onSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <OptimizedIcon name="MessageCircle" className="w-5 h-5 text-blue-600" />
            Create Support Ticket - Quote #{quote.quote_number || quote.id?.slice(-8)}
          </DialogTitle>
          <DialogDescription>
            Create a support ticket about this quote. You can track responses and continue the conversation in your support tickets section.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Categories */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              What's this about? (optional)
            </label>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <OptimizedIcon name={category.icon} className="w-4 h-4" />
                  <span className="text-xs font-medium">{category.label}</span>
                </Button>
              ))}
            </div>
            {selectedCategory && (
              <p className="text-xs text-gray-500 mt-2">
                {categories.find(c => c.id === selectedCategory)?.description}
              </p>
            )}
          </div>

          {/* Message Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Your Message *
            </label>
            <Textarea
              placeholder="Hi! I'd like to discuss this quote. Please let me know about..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Minimum 10 characters required
              </p>
              <p className="text-xs text-gray-400">
                {message.length}/1000
              </p>
            </div>
          </div>

          {/* Quote Context */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Quote Details</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">${quote.total_quote_origincurrency?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Status:</span>
              <Badge variant="outline" className="capitalize">
                {quote.status}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || message.trim().length < 10}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <OptimizedIcon name="Send" className="w-4 h-4 mr-2" />
                  Create Support Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteMessageModal;