import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Save
} from "lucide-react";
import { useCartAbandonmentEmails } from "@/hooks/useCartAbandonmentEmails";
import { toast } from "sonner";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
}

export const EmailTemplateManager = () => {
  const { emailTemplates, loadingTemplates } = useCartAbandonmentEmails();
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: ''
  });

  const queryClient = useQueryClient();

  const handleCreateTemplate = () => {
    setTemplateForm({ name: '', subject: '', body: '' });
    setShowCreateTemplate(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body
    });
    setShowEditTemplate(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      toast.error('Please fill in all fields');
      return;
    }

    // In a real implementation, this would save to database
    console.log('Saving template:', templateForm);
    toast.success('Template saved successfully');
    
    setShowCreateTemplate(false);
    setShowEditTemplate(false);
    setTemplateForm({ name: '', subject: '', body: '' });
  };

  const handleDeleteTemplate = (templateId: string) => {
    // In a real implementation, this would delete from database
    console.log('Deleting template:', templateId);
    toast.success('Template deleted successfully');
  };

  const handleCopyTemplate = (template: EmailTemplate) => {
    navigator.clipboard.writeText(`
Subject: ${template.subject}

${template.body}
    `);
    toast.success('Template copied to clipboard');
  };

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { data, error } = await supabase
        .from('email_templates')
        .upsert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    },
  });

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage email templates for cart abandonment recovery
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {emailTemplates?.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.is_default && (
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
                  {!template.is_default && (
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
                  {template.body.length > 200 
                    ? `${template.body.substring(0, 200)}...` 
                    : template.body
                  }
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Available variables: {'{product_name}'}, {'{cart_value}'}, {'{discounted_value}'}
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
                value={templateForm.body}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter your email template here..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{product_name}'}, {'{cart_value}'}, {'{discounted_value}'} as variables
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
                value={templateForm.body}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter your email template here..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{product_name}'}, {'{cart_value}'}, {'{discounted_value}'} as variables
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
}; 