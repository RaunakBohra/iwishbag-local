import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Copy, Save, Settings, Bell } from 'lucide-react';
import { useCartAbandonmentEmails } from '@/hooks/useCartAbandonmentEmails';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  template_type: string;
  variables?: Record<string, unknown>;
  is_active?: boolean;
}

export default function EmailTemplateManager() {
  const { emailTemplates, loadingTemplates } = useCartAbandonmentEmails();
  const {
    emailSettings,
    isLoading: loadingSettings,
    updateEmailSetting,
    isUpdating,
  } = useEmailSettings();
  const { toast } = useToast();

  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    template_type: 'cart_abandonment',
  });

  const queryClient = useQueryClient();

  // Helper function to get boolean value from JSONB setting
  const getSettingValue = (settingKey: string): boolean => {
    const setting = emailSettings?.find((s) => s.setting_key === settingKey);
    if (!setting) return true; // Default to true if setting doesn't exist

    // Handle both boolean and JSONB values
    if (typeof setting.setting_value === 'boolean') {
      return setting.setting_value;
    }

    // If it's JSONB, try to parse it
    try {
      const parsed =
        typeof setting.setting_value === 'string'
          ? JSON.parse(setting.setting_value)
          : setting.setting_value;
      return parsed === true || parsed === 'true';
    } catch {
      return true; // Default to true if parsing fails
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      template_type: template.template_type,
    });
    setShowEditTemplate(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.html_content) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const templateData: EmailTemplate = {
      id: selectedTemplate?.id || `template_${Date.now()}`,
      name: templateForm.name,
      subject: templateForm.subject,
      html_content: templateForm.html_content,
      template_type: templateForm.template_type,
      variables: {},
      is_active: true,
    };

    saveTemplateMutation.mutate(templateData);

    setShowCreateTemplate(false);
    setShowEditTemplate(false);
    setTemplateForm({
      name: '',
      subject: '',
      html_content: '',
      template_type: 'cart_abandonment',
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    // In a real implementation, this would delete from database
    console.log('Deleting template:', templateId);
    toast({
      title: 'Success',
      description: 'Template deleted successfully',
    });
  };

  const handleCopyTemplate = (template: EmailTemplate) => {
    navigator.clipboard.writeText(`
Subject: ${template.subject}

${template.html_content}
    `);
    toast({
      title: 'Success',
      description: 'Template copied to clipboard',
    });
  };

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      console.log('Saving email template:', template);

      const { data, error } = await supabase
        .from('email_templates')
        .upsert(template)
        .select()
        .single();

      if (error) {
        console.error('Error saving email template:', error);
        throw new Error(`Failed to save email template: ${error.message}`);
      }

      console.log('Email template saved successfully');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });
    },
    onError: (error: unknown) => {
      console.error('Save template mutation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: errorMessage || 'Failed to save template',
        variant: 'destructive',
      });
    },
  });

  // Create default status notification templates
  const createDefaultStatusTemplates = async () => {
    const defaultTemplates = [
      {
        name: 'Status Update - Quote Sent',
        subject: 'Your Quote is Ready - {{quote_id}}',
        html_content: `
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Your Quote is Ready!</h2>
              
              <p>Dear {{customer_name}},</p>
              
              <p>Your quote has been sent and is ready for review.</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Quote Details</h3>
                <p><strong>Quote ID:</strong> {{quote_id}}</p>
                <p><strong>Product:</strong> {{product_name}}</p>
                <p><strong>Total Amount:</strong> {{total_amount}}</p>
                <p><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">Sent</span></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_url}}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Quote in Dashboard
                </a>
              </div>
              
              <p>If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>
              The WishBag Team</p>
            </div>
          </body>
          </html>
        `,
        template_type: 'status_notification',
      },
      {
        name: 'Status Update - Quote Approved',
        subject: 'Quote Approved - {{quote_id}}',
        html_content: `
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #16a34a;">Quote Approved!</h2>
              
              <p>Dear {{customer_name}},</p>
              
              <p>Great news! Your quote has been approved! You can now proceed with payment.</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <h3 style="margin-top: 0; color: #16a34a;">Quote Details</h3>
                <p><strong>Quote ID:</strong> {{quote_id}}</p>
                <p><strong>Product:</strong> {{product_name}}</p>
                <p><strong>Total Amount:</strong> {{total_amount}}</p>
                <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Approved</span></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{payment_url}}" 
                   style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Proceed to Payment
                </a>
              </div>
              
              <p>Best regards,<br>
              The WishBag Team</p>
            </div>
          </body>
          </html>
        `,
        template_type: 'status_notification',
      },
      {
        name: 'Status Update - Order Shipped',
        subject: 'Your Order Has Been Shipped - {{order_id}}',
        html_content: `
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #7c3aed;">Your Order is on its Way!</h2>
              
              <p>Dear {{customer_name}},</p>
              
              <p>Exciting news! Your order has been shipped and is on its way to you.</p>
              
              <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                <h3 style="margin-top: 0; color: #7c3aed;">Order Details</h3>
                <p><strong>Order ID:</strong> {{order_id}}</p>
                <p><strong>Product:</strong> {{product_name}}</p>
                <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
                <p><strong>Status:</strong> <span style="color: #7c3aed; font-weight: bold;">Shipped</span></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{tracking_url}}" 
                   style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Track Your Order
                </a>
              </div>
              
              <p>We'll keep you updated on the delivery progress.</p>
              
              <p>Best regards,<br>
              The WishBag Team</p>
            </div>
          </body>
          </html>
        `,
        template_type: 'status_notification',
      },
    ];

    try {
      for (const template of defaultTemplates) {
        await supabase.from('email_templates').upsert(template).select().single();
      }

      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: 'Success',
        description: 'Default status notification templates created successfully',
      });
    } catch (error) {
      console.error('Error creating default templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to create default templates',
        variant: 'destructive',
      });
    }
  };

  if (loadingTemplates) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3 mb-4" />
              <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2 mb-2" />
              <div className="h-20 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email Settings Section - Stripe Style */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <Settings className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email settings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Control which types of emails are sent from your system
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-gray-200">
              {/* Global Email Toggle */}
              <div className="flex items-center justify-between py-4 first:pt-0">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Global email sending</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Master toggle to enable or disable all email sending
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('email_sending_enabled')}
                  onCheckedChange={(checked) =>
                    updateEmailSetting({
                      settingKey: 'email_sending_enabled',
                      value: checked,
                    })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Cart Abandonment Toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Cart abandonment emails</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Send recovery emails when customers abandon their cart
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('cart_abandonment_enabled')}
                  onCheckedChange={(checked) =>
                    updateEmailSetting({
                      settingKey: 'cart_abandonment_enabled',
                      value: checked,
                    })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Quote Notifications Toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Quote notification emails</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Send confirmation emails when quotes are created or updated
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('quote_notifications_enabled')}
                  onCheckedChange={(checked) =>
                    updateEmailSetting({
                      settingKey: 'quote_notifications_enabled',
                      value: checked,
                    })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Order Notifications Toggle */}
              <div className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Order notification emails</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Send confirmation emails when orders are placed or updated
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('order_notifications_enabled')}
                  onCheckedChange={(checked) =>
                    updateEmailSetting({
                      settingKey: 'order_notifications_enabled',
                      value: checked,
                    })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Status Notifications Toggle */}
              <div className="flex items-center justify-between py-4 pb-0">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Status change notifications</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Send emails when quote or order status changes
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('status_notifications_enabled')}
                  onCheckedChange={(checked) =>
                    updateEmailSetting({
                      settingKey: 'status_notifications_enabled',
                      value: checked,
                    })
                  }
                  disabled={isUpdating}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Templates Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email templates</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage templates for customer communications and automated messaging
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={createDefaultStatusTemplates}
            variant="outline"
            className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Bell className="h-4 w-4 mr-2" />
            Create status templates
          </Button>
          <Button
            onClick={() => setShowCreateTemplate(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create template
          </Button>
        </div>
      </div>

      {/* Templates List - Stripe Style */}
      <div className="space-y-4">
        {emailTemplates?.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex gap-2">
                    {template.template_type === 'cart_abandonment' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Cart Abandonment
                      </span>
                    )}
                    {template.template_type === 'quote_notification' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Quote
                      </span>
                    )}
                    {template.template_type === 'order_notification' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Order
                      </span>
                    )}
                    {template.template_type === 'status_notification' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Status
                      </span>
                    )}
                    {template.name.includes('Default') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyTemplate(template)}
                    className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <Copy className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditTemplate(template)}
                    className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <Edit className="h-4 w-4 text-gray-600" />
                  </Button>
                  {template.template_type === 'cart_abandonment' &&
                    !template.name.includes('Default') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="h-8 w-8 p-0 border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                  Subject
                </h4>
                <p className="text-sm text-gray-900">{template.subject}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                  Preview
                </h4>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700 font-mono">
                    {template.html_content.length > 200
                      ? `${template.html_content.substring(0, 200)}...`
                      : template.html_content}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Available variables:</span> {'{product_name}'},{' '}
                  {'{cart_value}'}, {'{discounted_value}'}, {'{quote_id}'}, {'{order_id}'},{' '}
                  {'{customer_name}'}, {'{total_amount}'}, {'{tracking_number}'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Dialog - Stripe Style */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Create email template
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Create a new email template for customer communications and automated messaging.
            </DialogDescription>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name" className="text-sm font-medium text-gray-700">
                  Template name
                </Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Default Abandonment Recovery"
                  className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div>
                <Label htmlFor="template-type" className="text-sm font-medium text-gray-700">
                  Template type
                </Label>
                <Select
                  value={templateForm.template_type}
                  onValueChange={(value) =>
                    setTemplateForm((prev) => ({ ...prev, template_type: value }))
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cart_abandonment">Cart Abandonment</SelectItem>
                    <SelectItem value="quote_notification">Quote Notification</SelectItem>
                    <SelectItem value="order_notification">Order Notification</SelectItem>
                    <SelectItem value="status_notification">Status Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="template-subject" className="text-sm font-medium text-gray-700">
                Email subject
              </Label>
              <Input
                id="template-subject"
                value={templateForm.subject}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="Complete Your Purchase - Your Cart is Waiting!"
                className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
            <div>
              <Label htmlFor="template-body" className="text-sm font-medium text-gray-700">
                Email body
              </Label>
              <Textarea
                id="template-body"
                value={templateForm.html_content}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    html_content: e.target.value,
                  }))
                }
                placeholder="Enter your email template here..."
                rows={8}
                className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium">Available variables:</span> {'{product_name}'},{' '}
                {'{cart_value}'}, {'{discounted_value}'}, {'{quote_id}'}, {'{order_id}'},{' '}
                {'{customer_name}'}, {'{total_amount}'}, {'{tracking_number}'}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreateTemplate(false)}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Create template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog - Stripe Style */}
      <Dialog open={showEditTemplate} onOpenChange={setShowEditTemplate}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Edit email template
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Modify the email template for customer communications and automated messaging.
            </DialogDescription>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-template-name" className="text-sm font-medium text-gray-700">
                  Template name
                </Label>
                <Input
                  id="edit-template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Default Abandonment Recovery"
                  className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div>
                <Label htmlFor="edit-template-type" className="text-sm font-medium text-gray-700">
                  Template type
                </Label>
                <Select
                  value={templateForm.template_type}
                  onValueChange={(value) =>
                    setTemplateForm((prev) => ({ ...prev, template_type: value }))
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cart_abandonment">Cart Abandonment</SelectItem>
                    <SelectItem value="quote_notification">Quote Notification</SelectItem>
                    <SelectItem value="order_notification">Order Notification</SelectItem>
                    <SelectItem value="status_notification">Status Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-template-subject" className="text-sm font-medium text-gray-700">
                Email subject
              </Label>
              <Input
                id="edit-template-subject"
                value={templateForm.subject}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="Complete Your Purchase - Your Cart is Waiting!"
                className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
            <div>
              <Label htmlFor="edit-template-body" className="text-sm font-medium text-gray-700">
                Email body
              </Label>
              <Textarea
                id="edit-template-body"
                value={templateForm.html_content}
                onChange={(e) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    html_content: e.target.value,
                  }))
                }
                placeholder="Enter your email template here..."
                rows={8}
                className="mt-1 border-gray-300 focus:border-teal-500 focus:ring-teal-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium">Available variables:</span> {'{product_name}'},{' '}
                {'{cart_value}'}, {'{discounted_value}'}, {'{quote_id}'}, {'{order_id}'},{' '}
                {'{customer_name}'}, {'{total_amount}'}, {'{tracking_number}'}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowEditTemplate(false)}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
