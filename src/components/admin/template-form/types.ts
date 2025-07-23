import * as z from 'zod';
import { Tables } from '@/integrations/supabase/types';

type QuoteTemplate = Tables<'quote_templates'>;

export const templateFormSchema = z.object({
  template_name: z.string().min(1, 'Template name is required.'),
  product_name: z.string().optional(),
  item_price: z.coerce.number().positive().optional().or(z.literal('')),
  item_weight: z.coerce.number().positive().optional().or(z.literal('')),
  quantity: z.coerce.number().min(1).default(1),
  customer_notes: z.string().optional(),
  image_url: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  product_url: z
    .string()
    .url({ message: 'Please enter a valid URL.' })
    .optional()
    .or(z.literal('')),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export interface CreateOrEditTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  template?: QuoteTemplate;
}
