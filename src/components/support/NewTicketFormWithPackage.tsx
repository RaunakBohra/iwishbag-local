import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, AlertTriangle, Info } from 'lucide-react';
import { useCreateCustomerTicket } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

// Package-specific ticket categories
const PACKAGE_TICKET_CATEGORIES = {
  damaged: 'Package Damaged',
  missing_items: 'Missing Items',
  wrong_items: 'Wrong Items',
  customs_issue: 'Customs Issue',
  storage_fees: 'Storage Fee Question',
  consolidation: 'Consolidation Request',
  shipping_question: 'Shipping Question',
  other: 'Other Package Issue',
} as const;

// Package-specific issue templates
const ISSUE_TEMPLATES = {
  damaged: {
    subject: 'Package Damaged - ',
    description: `My package was received damaged.

Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Damage description:
[Please describe the damage]

Items affected:
[List any damaged items]`,
  },
  missing_items: {
    subject: 'Missing Items from Package - ',
    description: `Some items are missing from my package.

Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Missing items:
[Please list the missing items]

Expected items based on invoice/receipt:
[List what was supposed to be in the package]`,
  },
  wrong_items: {
    subject: 'Wrong Items Received - ',
    description: `I received wrong items in my package.

Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Items received:
[List what you received]

Items ordered:
[List what you actually ordered]`,
  },
  customs_issue: {
    subject: 'Customs Issue with Package - ',
    description: `I need help with customs for my package.

Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Issue description:
[Describe the customs issue]`,
  },
  storage_fees: {
    subject: 'Storage Fee Question - ',
    description: `I have a question about storage fees for my package.

Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Question:
[Your question about storage fees]`,
  },
  consolidation: {
    subject: 'Consolidation Request - ',
    description: `I would like to consolidate this package with others.

Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Other packages to consolidate:
[List other package tracking numbers]

Preferred shipping method:
[Express/Standard/Economy]`,
  },
  other: {
    subject: 'Package Issue - ',
    description: `Package details:
- Tracking number: {tracking}
- Sender: {sender}
- Date received: {date}

Issue description:
[Please describe your issue]`,
  },
};

const ticketSchema = z.object({
  category: z.enum(Object.keys(PACKAGE_TICKET_CATEGORIES) as [string, ...string[]]),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Please provide more details (at least 20 characters)'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface NewTicketFormWithPackageProps {
  package: Tables<'received_packages'>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewTicketFormWithPackage({
  package: pkg,
  onSuccess,
  onCancel,
}: NewTicketFormWithPackageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutate: createTicket, isPending: isCreating } = useCreateCustomerTicket();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      category: 'other',
      subject: '',
      description: '',
      priority: 'medium',
    },
  });

  const selectedCategory = form.watch('category') as keyof typeof ISSUE_TEMPLATES;

  // Auto-fill template when category changes
  const handleCategoryChange = (category: keyof typeof ISSUE_TEMPLATES) => {
    const template = ISSUE_TEMPLATES[category];
    if (template) {
      // Replace placeholders with actual package data
      const filledDescription = template.description
        .replace('{tracking}', pkg.tracking_number)
        .replace('{sender}', pkg.sender_name || 'Unknown')
        .replace('{date}', new Date(pkg.created_at).toLocaleDateString());
      
      form.setValue('subject', template.subject + pkg.tracking_number);
      form.setValue('description', filledDescription);
    }
  };

  const onSubmit = async (values: TicketFormData) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to create a support ticket.',
        variant: 'destructive',
      });
      return;
    }

    // Determine ticket priority based on issue type
    let priority = values.priority;
    if (values.category === 'damaged' || values.category === 'missing_items') {
      priority = 'high';
    }

    createTicket(
      {
        subject: values.subject,
        description: values.description,
        category: values.category === 'customs_issue' ? 'customs' : 'product',
        priority,
        metadata: {
          package_id: pkg.id,
          tracking_number: pkg.tracking_number,
          sender: pkg.sender_name,
          carrier: pkg.carrier,
          weight: pkg.weight_lbs,
          dimensions: pkg.dimensions_l && pkg.dimensions_w && pkg.dimensions_h
            ? `${pkg.dimensions_l}x${pkg.dimensions_w}x${pkg.dimensions_h}`
            : null,
          status: pkg.status,
          condition_notes: pkg.condition_notes,
          issue_type: values.category,
          package_created_at: pkg.created_at,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Ticket created successfully',
            description: 'We\'ll review your package issue and respond soon.',
          });
          onSuccess?.();
        },
        onError: (error) => {
          toast({
            title: 'Failed to create ticket',
            description: error.message || 'Please try again later.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Quick issue selector */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Select an issue type below to automatically fill in relevant details.
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Type</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleCategoryChange(value as keyof typeof ISSUE_TEMPLATES);
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PACKAGE_TICKET_CATEGORIES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Brief description of your issue" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={8}
                  placeholder="Please provide detailed information about your issue..."
                />
              </FormControl>
              <FormDescription>
                Include any relevant details that will help us resolve your issue quickly.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      Low - General inquiry
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Medium - Issue affecting service
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      High - Urgent issue
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                High priority is automatically set for damaged or missing items.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Ticket
          </Button>
        </div>
      </form>
    </Form>
  );
}