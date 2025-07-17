import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { CreateOrEditTemplateDialog } from './CreateOrEditTemplateDialog';
import { QuoteTemplateListItem } from './QuoteTemplateListItem';

export type QuoteTemplate = Tables<'quote_templates'>;

export const QuoteTemplatesPage = () => {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | undefined>(undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['quote-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .order('template_name');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quote_templates').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast({ title: 'Template deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    setSelectedTemplate(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (template: QuoteTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // A confirmation dialog could be added here for safety
    deleteMutation.mutate(id);
  };

  if (isLoading) return <div>Loading templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Quote Templates</h2>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <CreateOrEditTemplateDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />

      <div className="grid gap-4">
        {templates?.map((template) => (
          <QuoteTemplateListItem
            key={template.id}
            template={template}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {templates?.length === 0 && <p>No templates found. Create one to get started!</p>}
      </div>
    </div>
  );
};
