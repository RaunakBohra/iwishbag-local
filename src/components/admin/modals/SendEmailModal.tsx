// ============================================================================
// SEND EMAIL MODAL - Professional Email Composition Interface (Safe Version)
// Features: Rich email composer with templates and bulk sending
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
import { useMutation } from '@tanstack/react-query';
import { Mail, Send, Users, FileText, File, AlertCircle } from 'lucide-react';
import { Customer } from '../CustomerTable';

const sendEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  template: z.string().optional(),
});

type SendEmailFormData = z.infer<typeof sendEmailSchema>;

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Customer[];
  isBulk?: boolean;
}

// Safe email templates without any template literals
const getEmailTemplates = () => [
  {
    id: 'welcome',
    name: 'Welcome Message',
    subject: 'Welcome to iwishBag!',
    message: 'Dear [CUSTOMER_NAME],\n\nWelcome to iwishBag! We are excited to have you as part of our global shopping community.\n\nWith iwishBag, you can now shop from your favorite international stores and have items delivered right to your doorstep. Our team is here to make your international shopping experience seamless and enjoyable.\n\nIf you have any questions or need assistance, please do not hesitate to reach out to our customer support team.\n\nHappy shopping!\n\nBest regards,\nThe iwishBag Team'
  },
  {
    id: 'order_update',
    name: 'Order Update',  
    subject: 'Your iwishBag Order Update',
    message: 'Dear [CUSTOMER_NAME],\n\nWe wanted to update you on the status of your recent order with iwishBag.\n\nYour order is currently being processed and will be shipped soon. We will send you tracking information as soon as your package is on its way.\n\nThank you for choosing iwishBag for your international shopping needs!\n\nBest regards,\nThe iwishBag Team'
  },
  {
    id: 'promotional',
    name: 'Promotional Offer',
    subject: 'Special Offer Just for You!',
    message: 'Dear [CUSTOMER_NAME],\n\nWe have a special offer just for you!\n\nAs one of our valued customers, you are eligible for exclusive discounts on your next international shopping order. Use this opportunity to get those items you have been wanting at an even better price.\n\nThis offer is valid for a limited time, so do not miss out!\n\nBest regards,\nThe iwishBag Team'
  },
  {
    id: 'feedback',
    name: 'Feedback Request',
    subject: 'We would love your feedback!',
    message: 'Dear [CUSTOMER_NAME],\n\nThank you for being a valued iwishBag customer! Your experience matters to us, and we would love to hear about your recent shopping experience.\n\nYour feedback helps us improve our services and better serve customers like you. Could you take a moment to share your thoughts?\n\nWe appreciate your time and look forward to serving you again soon.\n\nBest regards,\nThe iwishBag Team'
  }
];

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  open,
  onOpenChange,
  recipients,
  isBulk = false,
}) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safety check for recipients
  const safeRecipients = recipients || [];

  // Don't render if no recipients provided
  if (!recipients) {
    return null;
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SendEmailFormData>({
    resolver: zodResolver(sendEmailSchema),
  });

  const subject = watch('subject');
  const message = watch('message');

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: SendEmailFormData) => {
      setIsSubmitting(true);
      
      // Safety check for recipients
      if (!safeRecipients || safeRecipients.length === 0) {
        throw new Error('No recipients selected for email');
      }
      
      // Simulate email sending (replace with actual email service integration)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For bulk emails, we'll use a generic greeting or the first customer's name
      const customerNameForTemplate = isBulk && safeRecipients.length > 1 
        ? 'Valued Customer' 
        : safeRecipients[0]?.full_name || 'Customer';

      const emailData = {
        recipients: safeRecipients.map(r => ({
          email: r.email,
          name: r.full_name || 'Customer'
        })),
        subject: data.subject,
        message: data.message.replace(/\[CUSTOMER_NAME\]/g, customerNameForTemplate),
        isBulk,
        timestamp: new Date().toISOString()
      };
      
      console.log('Email would be sent:', emailData);
      
      return emailData;
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      toast({
        title: 'Email Sent Successfully',
        description: 'Email sent to ' + safeRecipients.length + ' recipient' + (safeRecipients.length !== 1 ? 's' : ''),
      });
      reset();
      setSelectedTemplate('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: 'Failed to Send Email',
        description: error.message || 'An error occurred while sending the email.',
        variant: 'destructive',
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    const templates = getEmailTemplates();
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setValue('subject', template.subject);
      setValue('message', template.message);
      setSelectedTemplate(templateId);
    }
  };

  const onSubmit = (data: SendEmailFormData) => {
    sendEmailMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setSelectedTemplate('');
    onOpenChange(false);
  };

  const EMAIL_TEMPLATES = getEmailTemplates();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <span>{isBulk ? 'Send Bulk Email' : 'Send Email'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Recipients Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                {safeRecipients.length} Recipient{safeRecipients.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {safeRecipients.slice(0, 5).map(recipient => (
                <Badge key={recipient.id} variant="outline" className="text-xs bg-white">
                  {recipient.email}
                </Badge>
              ))}
              {safeRecipients.length > 5 && (
                <Badge variant="outline" className="text-xs bg-white">
                  +{safeRecipients.length - 5} more
                </Badge>
              )}
            </div>
          </div>

          {/* Email Template Selection */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <File className="h-4 w-4" />
              <span>Email Template (Optional)</span>
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template or compose custom email" />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-gray-500">
                Template selected. You can edit the subject and message below.
              </p>
            )}
          </div>

          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line *</Label>
            <Input
              id="subject"
              placeholder="Enter email subject"
              {...register('subject')}
            />
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Character count: {subject?.length || 0}/100 (recommended)
            </p>
          </div>

          {/* Email Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Email Message *</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Compose your email message here..."
              className="min-h-[200px]"
              {...register('message')}
            />
            {errors.message && (
              <p className="text-sm text-red-600">{errors.message.message}</p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Use [CUSTOMER_NAME] to personalize with customer names</span>
              <span>Character count: {message?.length || 0}</span>
            </div>
          </div>

          {/* Preview Notice */}
          {safeRecipients.length > 1 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Bulk Email Notice</p>
                  <p>This email will be sent to {safeRecipients.length} customers. Please review the content carefully before sending.</p>
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
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting 
              ? 'Sending...' 
              : 'Send Email' + (safeRecipients.length > 1 ? ' (' + safeRecipients.length + ')' : '')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};