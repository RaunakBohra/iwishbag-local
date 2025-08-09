import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
        const { data: autoCategory, error: catError } = await supabase.rpc('categorize_message', {
          p_message: message.trim()
        });
        
        if (catError) {
          console.error('Auto-categorization error:', catError);
        }
        
        category = autoCategory || 'other';
      }

      // Create quote discussion
      const { data, error } = await supabase.rpc('create_quote_discussion', {
        p_customer_id: userData.user.id,
        p_quote_id: quote.id,
        p_message: message.trim(),
        p_category: category
      });

      if (error) {
        console.error('Quote discussion creation error:', error);
        throw error;
      }

      // Check if we got a support ticket ID back
      if (!data) {
        throw new Error('Failed to create quote discussion');
      }

      toast({
        title: "Message Sent Successfully",
        description: "Your message has been sent to our team. We'll respond within 24 hours.",
      });

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
            Message About Quote #{quote.quote_number || quote.id?.slice(-8)}
          </DialogTitle>
          <DialogDescription>
            Send us a message about this quote. Our team will respond within 24 hours.
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
                  Send Message
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