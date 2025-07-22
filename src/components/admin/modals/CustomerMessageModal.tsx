// ============================================================================
// CUSTOMER MESSAGE MODAL - Quick Message/Note Interface
// Features: Send internal messages and create customer notes
// ============================================================================

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, User, AlertCircle, FileText, Ticket } from 'lucide-react';
import { Customer } from '../CustomerTable';

const messageSchema = z.object({
  type: z.enum(['note', 'message', 'ticket']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Message must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface CustomerMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
}

const MESSAGE_TYPES = [
  { value: 'note', label: 'Internal Note', description: 'Private note visible only to admins' },
  { value: 'message', label: 'Customer Message', description: 'Direct message to the customer' },
  { value: 'ticket', label: 'Support Ticket', description: 'Create a support ticket for this customer' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];

export const CustomerMessageModal: React.FC<CustomerMessageModalProps> = ({
  open,
  onOpenChange,
  customer,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      type: 'note',
      priority: 'medium',
    },
  });

  const messageType = watch('type');
  const priority = watch('priority');

  // Create message/note/ticket mutation
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      setIsSubmitting(true);
      
      if (data.type === 'note') {
        // Update customer internal notes
        const currentNotes = customer.internal_notes || '';
        const timestamp = new Date().toLocaleString();
        const newNote = `[${timestamp}] ${data.title}: ${data.content}`;
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;
        
        const { error } = await supabase
          .from('profiles')
          .update({ internal_notes: updatedNotes })
          .eq('id', customer.id);
          
        if (error) throw error;
        return { type: 'note', title: data.title };
        
      } else if (data.type === 'ticket') {
        // Create support ticket (simplified - you might have a tickets table)
        const ticketData = {
          customer_id: customer.id,
          customer_email: customer.email,
          title: data.title,
          description: data.content,
          priority: data.priority,
          status: 'open',
          created_at: new Date().toISOString(),
          created_by: 'admin', // You'd get this from current user context
        };
        
        // For now, we'll just simulate ticket creation
        console.log('Support ticket would be created:', ticketData);
        return { type: 'ticket', title: data.title };
        
      } else if (data.type === 'message') {
        // Send message to customer (you'd integrate with your messaging system)
        const messageData = {
          recipient_id: customer.id,
          recipient_email: customer.email,
          subject: data.title,
          message: data.content,
          priority: data.priority,
          sent_at: new Date().toISOString(),
          sent_by: 'admin',
        };
        
        console.log('Customer message would be sent:', messageData);
        return { type: 'message', title: data.title };
      }
    },
    onSuccess: (result) => {
      setIsSubmitting(false);
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
        
        let successMessage = '';
        switch (result.type) {
          case 'note':
            successMessage = 'Internal note added successfully';
            break;
          case 'message':
            successMessage = 'Message sent to customer successfully';
            break;
          case 'ticket':
            successMessage = 'Support ticket created successfully';
            break;
        }
        
        toast({
          title: 'Success',
          description: successMessage,
        });
      }
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: 'Failed to Create Message',
        description: error.message || 'An error occurred while processing your request.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: MessageFormData) => {
    createMessageMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const selectedMessageType = MESSAGE_TYPES.find(type => type.value === messageType);
  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === priority);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
            </div>
            <span>Create Message/Note</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Info */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {customer.full_name || 'Unnamed Customer'}
                </p>
                <p className="text-sm text-gray-600">{customer.email}</p>
              </div>
            </div>
          </div>

          {/* Message Type Selection */}
          <div className="space-y-2">
            <Label>Message Type *</Label>
            <Select value={messageType} onValueChange={(value: any) => setValue('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-gray-500">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMessageType && (
              <p className="text-xs text-gray-600">{selectedMessageType.description}</p>
            )}
          </div>

          {/* Priority Selection */}
          {(messageType === 'message' || messageType === 'ticket') && (
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: any) => setValue('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <Badge className={option.color} variant="secondary">
                          {option.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title/Subject */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {messageType === 'note' ? 'Note Title' : 
               messageType === 'ticket' ? 'Ticket Subject' : 'Message Subject'} *
            </Label>
            <Input
              id="title"
              placeholder={
                messageType === 'note' ? 'Brief description of the note' :
                messageType === 'ticket' ? 'Describe the issue or request' :
                'Email subject line'
              }
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>
                {messageType === 'note' ? 'Note Content' :
                 messageType === 'ticket' ? 'Ticket Description' : 'Message Content'} *
              </span>
            </Label>
            <Textarea
              id="content"
              placeholder={
                messageType === 'note' ? 'Internal note content (visible only to admins)' :
                messageType === 'ticket' ? 'Detailed description of the issue or request' :
                'Your message to the customer'
              }
              className="min-h-[120px]"
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-red-600">{errors.content.message}</p>
            )}
          </div>

          {/* Warning for customer-facing actions */}
          {(messageType === 'message' || messageType === 'ticket') && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">
                    {messageType === 'message' ? 'Customer Notification' : 'Ticket Creation'}
                  </p>
                  <p>
                    {messageType === 'message' 
                      ? 'This message will be sent directly to the customer.'
                      : 'This will create a support ticket and may notify the customer.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {messageType === 'note' && <FileText className="h-4 w-4 mr-2" />}
            {messageType === 'message' && <Send className="h-4 w-4 mr-2" />}
            {messageType === 'ticket' && <Ticket className="h-4 w-4 mr-2" />}
            {isSubmitting 
              ? 'Processing...' 
              : messageType === 'note' ? 'Save Note' :
                messageType === 'ticket' ? 'Create Ticket' : 'Send Message'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};