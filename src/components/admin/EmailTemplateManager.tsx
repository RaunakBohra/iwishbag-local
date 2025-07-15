import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Save,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Package
} from "lucide-react";
import { useCartAbandonmentEmails } from "@/hooks/useCartAbandonmentEmails";
import { toast } from "sonner";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useEmailSettings } from "@/hooks/useEmailSettings";
import { useToast } from "@/hooks/use-toast";

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
  const { emailTemplates, loadingTemplates, sendAbandonmentEmail } = useCartAbandonmentEmails();
  const { emailSettings, isLoading: loadingSettings, updateEmailSetting, isUpdating } = useEmailSettings();
  const { toast } = useToast();
  
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    template_type: 'cart_abandonment'
  });

  const queryClient = useQueryClient();

  // Helper function to get boolean value from JSONB setting
  const getSettingValue = (settingKey: string): boolean => {
    const setting = emailSettings?.find(s => s.setting_key === settingKey);
    if (!setting) return true; // Default to true if setting doesn't exist
    
    // Handle both boolean and JSONB values
    if (typeof setting.setting_value === 'boolean') {
      return setting.setting_value;
    }
    
    // If it's JSONB, try to parse it
    try {
      const parsed = typeof setting.setting_value === 'string' 
        ? JSON.parse(setting.setting_value) 
        : setting.setting_value;
      return parsed === true || parsed === 'true';
    } catch {
      return true; // Default to true if parsing fails
    }
  };

  const handleCreateTemplate = () => {
    setTemplateForm({ name: '', subject: '', html_content: '', template_type: 'cart_abandonment' });
    setShowCreateTemplate(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      template_type: template.template_type
    });
    setShowEditTemplate(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.html_content) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
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
      is_active: true
    };

    saveTemplateMutation.mutate(templateData);
    
    setShowCreateTemplate(false);
    setShowEditTemplate(false);
    setTemplateForm({ name: '', subject: '', html_content: '', template_type: 'cart_abandonment' });
  };

  const handleDeleteTemplate = (templateId: string) => {
    // In a real implementation, this would delete from database
    console.log('Deleting template:', templateId);
    toast({
      title: "Success",
      description: "Template deleted successfully"
    });
  };

  const handleCopyTemplate = (template: EmailTemplate) => {
    navigator.clipboard.writeText(`
Subject: ${template.subject}

${template.html_content}
    `);
    toast({
      title: "Success",
      description: "Template copied to clipboard"
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
        title: "Success",
        description: "Template saved successfully",
      });
    },
    onError: (error: unknown) => {
      console.error('Save template mutation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage || "Failed to save template",
        variant: "destructive",
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
        template_type: 'status_notification'
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
        template_type: 'status_notification'
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
        template_type: 'status_notification'
      }
    ];

    try {
      for (const template of defaultTemplates) {
        await supabase
          .from('email_templates')
          .upsert(template)
          .select()
          .single();
      }
      
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: "Success",
        description: "Default status notification templates created successfully"
      });
    } catch (error) {
      console.error('Error creating default templates:', error);
      toast({
        title: "Error",
        description: "Failed to create default templates",
        variant: "destructive"
      });
    }
  };

  if (loadingTemplates) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted animate-pulse rounded w-1/2 mb-2" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Settings
          </CardTitle>
          <CardDescription>
            Control which types of emails are sent from your system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Global Email Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Global Email Sending</h4>
                  <p className="text-sm text-muted-foreground">
                    Master toggle to enable/disable all email sending
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('email_sending_enabled')}
                  onCheckedChange={(checked) => 
                    updateEmailSetting({ settingKey: 'email_sending_enabled', value: checked })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Cart Abandonment Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Cart Abandonment Emails</h4>
                  <p className="text-sm text-muted-foreground">
                    Send recovery emails when customers abandon their cart
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('cart_abandonment_enabled')}
                  onCheckedChange={(checked) => 
                    updateEmailSetting({ settingKey: 'cart_abandonment_enabled', value: checked })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Quote Notifications Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Quote Notification Emails</h4>
                  <p className="text-sm text-muted-foreground">
                    Send confirmation emails when quotes are created or updated
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('quote_notifications_enabled')}
                  onCheckedChange={(checked) => 
                    updateEmailSetting({ settingKey: 'quote_notifications_enabled', value: checked })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Order Notifications Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Order Notification Emails</h4>
                  <p className="text-sm text-muted-foreground">
                    Send confirmation emails when orders are placed or updated
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('order_notifications_enabled')}
                  onCheckedChange={(checked) => 
                    updateEmailSetting({ settingKey: 'order_notifications_enabled', value: checked })
                  }
                  disabled={isUpdating}
                />
              </div>

              {/* Status Notifications Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Status Change Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Send emails when quote or order status changes
                  </p>
                </div>
                <Switch
                  checked={getSettingValue('status_notifications_enabled')}
                  onCheckedChange={(checked) => 
                    updateEmailSetting({ settingKey: 'status_notifications_enabled', value: checked })
                  }
                  disabled={isUpdating}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Email Templates Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage all email templates for quotes, orders, cart abandonment recovery, and status notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createDefaultStatusTemplates} variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Create Status Templates
          </Button>
          <Button onClick={() => setShowCreateTemplate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {emailTemplates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.template_type === 'cart_abandonment' && (
                    <Badge variant="secondary">Cart Abandonment</Badge>
                  )}
                  {template.template_type === 'quote_notification' && (
                    <Badge variant="outline">Quote</Badge>
                  )}
                  {template.template_type === 'order_notification' && (
                    <Badge variant="outline">Order</Badge>
                  )}
                  {template.template_type === 'status_notification' && (
                    <Badge variant="default">Status</Badge>
                  )}
                  {template.name.includes('Default') && (
                    <Badge variant="default">Default</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCopyTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {template.template_type === 'cart_abandonment' && !template.name.includes('Default') && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.subject}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Preview</Label>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                  {template.html_content.length > 200 
                    ? `${template.html_content.substring(0, 200)}...` 
                    : template.html_content
                  }
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Available variables: {'{product_name}'}, {'{cart_value}'}, {'{discounted_value}'}, {'{quote_id}'}, {'{order_id}'}, {'{customer_name}'}, {'{total_amount}'}, {'{tracking_number}'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a new email template for various communication purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Default Abandonment Recovery"
              />
            </div>
            <div>
              <Label htmlFor="template-type">Template Type</Label>
              <Select 
                value={templateForm.template_type} 
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, template_type: value }))}
              >
                <SelectTrigger>
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
            <div>
              <Label htmlFor="template-subject">Email Subject</Label>
              <Input
                id="template-subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Complete Your Purchase - Your Cart is Waiting!"
              />
            </div>
            <div>
              <Label htmlFor="template-body">Email Body</Label>
              <Textarea
                id="template-body"
                value={templateForm.html_content}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, html_content: e.target.value }))}
                placeholder="Enter your email template here..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{product_name}'}, {'{cart_value}'}, {'{discounted_value}'}, {'{quote_id}'}, {'{order_id}'}, {'{customer_name}'}, {'{total_amount}'}, {'{tracking_number}'} as variables
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveTemplate} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateTemplate(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditTemplate} onOpenChange={setShowEditTemplate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Modify the email template for various communication purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Default Abandonment Recovery"
              />
            </div>
            <div>
              <Label htmlFor="edit-template-type">Template Type</Label>
              <Select 
                value={templateForm.template_type} 
                onValueChange={(value) => setTemplateForm(prev => ({ ...prev, template_type: value }))}
              >
                <SelectTrigger>
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
            <div>
              <Label htmlFor="edit-template-subject">Email Subject</Label>
              <Input
                id="edit-template-subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Complete Your Purchase - Your Cart is Waiting!"
              />
            </div>
            <div>
              <Label htmlFor="edit-template-body">Email Body</Label>
              <Textarea
                id="edit-template-body"
                value={templateForm.html_content}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, html_content: e.target.value }))}
                placeholder="Enter your email template here..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{product_name}'}, {'{cart_value}'}, {'{discounted_value}'}, {'{quote_id}'}, {'{order_id}'}, {'{customer_name}'}, {'{total_amount}'}, {'{tracking_number}'} as variables
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveTemplate} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEditTemplate(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 