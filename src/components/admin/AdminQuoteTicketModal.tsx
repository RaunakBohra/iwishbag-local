import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { toast } from '@/hooks/use-toast';
import { ticketService } from '@/services/TicketService';
import type { TicketCategory, TicketPriority } from '@/types/ticket';

interface AdminQuoteTicketModalProps {
  quote: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSubmitting?: (loading: boolean) => void;
}

const ADMIN_CATEGORIES: { id: TicketCategory; label: string; description: string; icon: string }[] = [
  { id: 'general', label: 'General', description: 'General inquiry or question', icon: 'MessageCircle' },
  { id: 'pricing', label: 'Pricing', description: 'Price adjustment or discount inquiry', icon: 'DollarSign' },
  { id: 'product', label: 'Product', description: 'Product availability or details', icon: 'Package' },
  { id: 'shipping', label: 'Shipping', description: 'Delivery or logistics question', icon: 'Truck' },
  { id: 'payment', label: 'Payment', description: 'Payment or billing issue', icon: 'CreditCard' },
  { id: 'customs', label: 'Customs', description: 'Import duties or customs clearance', icon: 'FileText' },
  { id: 'refund', label: 'Refund', description: 'Refund or return request', icon: 'RotateCcw' },
  { id: 'urgent', label: 'Urgent', description: 'Time-sensitive or urgent matter', icon: 'AlertTriangle' },
];

const ADMIN_PRIORITIES: { id: TicketPriority; label: string; description: string; color: string }[] = [
  { id: 'low', label: 'Low', description: 'Non-urgent, can wait', color: 'text-green-600 bg-green-50' },
  { id: 'medium', label: 'Medium', description: 'Standard priority', color: 'text-blue-600 bg-blue-50' },
  { id: 'high', label: 'High', description: 'Important, needs attention soon', color: 'text-orange-600 bg-orange-50' },
  { id: 'urgent', label: 'Urgent', description: 'Critical, needs immediate attention', color: 'text-red-600 bg-red-50' },
];

const AdminQuoteTicketModal: React.FC<AdminQuoteTicketModalProps> = ({
  quote,
  isOpen,
  onClose,
  onSuccess,
  onSubmitting
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setCategory('general');
    setPriority('medium');
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (onSubmitting) onSubmitting(true);

      // Validate input
      if (!subject.trim()) {
        toast({
          title: "Subject Required",
          description: "Please enter a ticket subject.",
          variant: "destructive",
        });
        return;
      }

      if (!description.trim()) {
        toast({
          title: "Description Required",
          description: "Please provide a ticket description.",
          variant: "destructive",
        });
        return;
      }

      if (description.trim().length < 10) {
        toast({
          title: "Description Too Short",
          description: "Please provide at least 10 characters describing the issue.",
          variant: "destructive",
        });
        return;
      }

      // Create admin ticket via TicketService
      const ticket = await ticketService.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        quote_id: quote.id,
      });

      if (!ticket) {
        throw new Error('Failed to create ticket');
      }

      toast({
        title: "Ticket Created Successfully",
        description: `Support ticket has been created and assigned ID: ${ticket.id.slice(-8)}`,
      });

      resetForm();
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error creating admin ticket:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      if (onSubmitting) onSubmitting(false);
    }
  };

  const selectedCategory = ADMIN_CATEGORIES.find(cat => cat.id === category);
  const selectedPriority = ADMIN_PRIORITIES.find(pri => pri.id === priority);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <OptimizedIcon name="Ticket" className="w-5 h-5 text-blue-600" />
            Create Support Ticket - Quote #{quote.quote_number || quote.id?.slice(-8)}
          </DialogTitle>
          <DialogDescription>
            Create an internal support ticket for proactive customer service or issue tracking.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Subject Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Subject *
            </label>
            <Input
              placeholder="Brief summary of the issue or inquiry"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Clear, concise subject line for easy identification
            </p>
          </div>

          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ADMIN_CATEGORIES.map((cat) => (
                <Button
                  key={cat.id}
                  variant={category === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(cat.id)}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <OptimizedIcon name={cat.icon} className="w-4 h-4" />
                  <span className="text-xs font-medium">{cat.label}</span>
                </Button>
              ))}
            </div>
            {selectedCategory && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedCategory.description}
              </p>
            )}
          </div>

          {/* Priority Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Priority *
            </label>
            <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_PRIORITIES.map((pri) => (
                  <SelectItem key={pri.id} value={pri.id}>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${pri.color}`}>
                        {pri.label}
                      </Badge>
                      <span className="text-sm">{pri.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPriority && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedPriority.description}
              </p>
            )}
          </div>

          {/* Description Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Description *
            </label>
            <Textarea
              placeholder="Detailed description of the issue, background context, or required action..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Minimum 10 characters required
              </p>
              <p className="text-xs text-gray-400">
                {description.length}/2000
              </p>
            </div>
          </div>

          {/* Quote Context */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Quote Context</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium ml-2">
                  {quote.customer_name || quote.customer_email || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium ml-2">
                  ${quote.total_quote_origincurrency?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <Badge variant="outline" className="ml-2 capitalize">
                  {quote.status}
                </Badge>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="font-medium ml-2">
                  {new Date(quote.created_at).toLocaleDateString()}
                </span>
              </div>
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
              disabled={isSubmitting || !subject.trim() || description.trim().length < 10}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <OptimizedIcon name="Plus" className="w-4 h-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminQuoteTicketModal;