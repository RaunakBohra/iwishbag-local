import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Copy, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReplyTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string | null;
  body_template: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface ReplyTemplatesManagerProps {
  onTemplateSelect?: (template: ReplyTemplate) => void;
  mode?: 'manage' | 'select'; // manage = full admin interface, select = template picker
}

const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'shipping', label: 'Shipping & Delivery' },
  { value: 'payment', label: 'Payment & Billing' },
  { value: 'refund', label: 'Refunds & Returns' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'product', label: 'Product Questions' },
];

export const ReplyTemplatesManager = ({
  onTemplateSelect,
  mode = 'manage',
}: ReplyTemplatesManagerProps) => {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ReplyTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);

  const { toast } = useToast();

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    subject_template: '',
    body_template: '',
  });

  // Load templates
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reply_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
      setFilteredTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reply templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates
  useEffect(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.body_template.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((template) => template.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, selectedCategory]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Handle template selection
  const handleTemplateSelect = async (template: ReplyTemplate) => {
    if (onTemplateSelect) {
      // Increment usage count
      await supabase
        .from('reply_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

      onTemplateSelect(template);
    }
  };

  // Copy template to clipboard
  const copyTemplate = (template: ReplyTemplate) => {
    const content = `${template.subject_template ? `Subject: ${template.subject_template}\n\n` : ''}${template.body_template}`;
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: 'Template copied to clipboard',
    });
  };

  // Save template (create or update)
  const saveTemplate = async () => {
    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('reply_templates')
          .update({
            name: formData.name,
            category: formData.category,
            subject_template: formData.subject_template || null,
            body_template: formData.body_template,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template updated successfully' });
      } else {
        // Create new template
        const { error } = await supabase.from('reply_templates').insert({
          name: formData.name,
          category: formData.category,
          subject_template: formData.subject_template || null,
          body_template: formData.body_template,
        });

        if (error) throw error;
        toast({ title: 'Success', description: 'Template created successfully' });
      }

      // Reset form and reload
      setFormData({ name: '', category: 'general', subject_template: '', body_template: '' });
      setShowCreateDialog(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  // Delete template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('reply_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Template deleted successfully' });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  // Edit template
  const editTemplate = (template: ReplyTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject_template: template.subject_template || '',
      body_template: template.body_template,
    });
    setShowCreateDialog(true);
  };

  if (mode === 'select') {
    // Simple template picker mode
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="p-3 border rounded cursor-pointer hover:bg-gray-50"
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm">{template.name}</span>
                <Badge variant="outline" className="text-xs">
                  {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{template.body_template}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full management interface
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Reply Templates</h2>
          <p className="text-sm text-gray-600">Manage canned responses for quick ticket replies</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm">{template.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyTemplate(template)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => editTemplate(template)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between">
                <Badge variant="outline" className="text-xs">
                  {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label}
                </Badge>
                <span className="text-xs text-gray-500">{template.usage_count} uses</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 line-clamp-3">{template.body_template}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Order Status Update"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Subject Template (Optional)</label>
              <Input
                value={formData.subject_template}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subject_template: e.target.value }))
                }
                placeholder="e.g., Update on Your Order #{{order_id}}"
              />
              <p className="text-xs text-gray-500 mt-1">Use {{ variable }} for dynamic content</p>
            </div>

            <div>
              <label className="text-sm font-medium">Body Template</label>
              <Textarea
                value={formData.body_template}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, body_template: e.target.value }))
                }
                placeholder="Hi {{customer_name}},

Thank you for contacting us..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {{ customer_name }}, {{ order_id }}, {{ tracking_id }},{' '}
                {{ status }}, etc.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingTemplate(null);
                  setFormData({
                    name: '',
                    category: 'general',
                    subject_template: '',
                    body_template: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveTemplate}>
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
