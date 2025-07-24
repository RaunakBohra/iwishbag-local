/**
 * Create Assignment Rule Dialog
 * Dialog for creating new auto-assignment rules
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  useCreateAssignmentRule,
  useEligibleUsers,
  useAutoAssignmentUtils,
} from '@/hooks/useAutoAssignment';
import { TICKET_PRIORITY_LABELS, TICKET_CATEGORY_LABELS } from '@/types/ticket';

// Form schema
const assignmentRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100, 'Name must be under 100 characters'),
  assignment_method: z.enum(['round_robin', 'least_assigned', 'random']),
  is_active: z.boolean(),
  priority_criteria: z.array(z.string()).optional(),
  category_criteria: z.array(z.string()).optional(),
  eligible_user_ids: z.array(z.string()).min(1, 'At least one assignee is required'),
});

type FormData = z.infer<typeof assignmentRuleSchema>;

interface CreateAssignmentRuleDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAssignmentRuleDialog = ({
  children,
  open,
  onOpenChange,
}: CreateAssignmentRuleDialogProps) => {
  const [testTicket, setTestTicket] = useState({ priority: 'medium', category: 'general' });

  const { data: eligibleUsers = [] } = useEligibleUsers();
  const createMutation = useCreateAssignmentRule();
  const { getAssignmentMethodIcon, getAssignmentMethodLabel } = useAutoAssignmentUtils();

  const form = useForm<FormData>({
    resolver: zodResolver(assignmentRuleSchema),
    defaultValues: {
      name: '',
      assignment_method: 'round_robin',
      is_active: true,
      priority_criteria: [],
      category_criteria: [],
      eligible_user_ids: [],
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    try {
      // Build criteria object
      const criteria: Record<string, string[]> = {};
      if (data.priority_criteria && data.priority_criteria.length > 0) {
        criteria.priority = data.priority_criteria;
      }
      if (data.category_criteria && data.category_criteria.length > 0) {
        criteria.category = data.category_criteria;
      }

      await createMutation.mutateAsync({
        name: data.name,
        assignment_method: data.assignment_method,
        is_active: data.is_active,
        criteria,
        eligible_user_ids: data.eligible_user_ids,
      });

      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error creating rule:', error);
    }
  };

  // Test if current form would match test ticket
  const testCurrentRule = () => {
    const formData = form.getValues();
    const priorityMatch =
      !formData.priority_criteria?.length ||
      formData.priority_criteria.includes(testTicket.priority);
    const categoryMatch =
      !formData.category_criteria?.length ||
      formData.category_criteria.includes(testTicket.category);
    return priorityMatch && categoryMatch;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment Rule</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rule Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., High Priority Support Team" {...field} />
                  </FormControl>
                  <FormDescription>A descriptive name for this assignment rule</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignment Method */}
            <FormField
              control={form.control}
              name="assignment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="round_robin">
                        <div className="flex items-center gap-2">
                          <span>{getAssignmentMethodIcon('round_robin')}</span>
                          {getAssignmentMethodLabel('round_robin')}
                        </div>
                      </SelectItem>
                      <SelectItem value="least_assigned">
                        <div className="flex items-center gap-2">
                          <span>{getAssignmentMethodIcon('least_assigned')}</span>
                          {getAssignmentMethodLabel('least_assigned')}
                        </div>
                      </SelectItem>
                      <SelectItem value="random">
                        <div className="flex items-center gap-2">
                          <span>{getAssignmentMethodIcon('random')}</span>
                          {getAssignmentMethodLabel('random')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How tickets should be distributed among assignees
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority Criteria */}
            <FormField
              control={form.control}
              name="priority_criteria"
              render={() => (
                <FormItem>
                  <FormLabel>Priority Filter (Optional)</FormLabel>
                  <FormDescription>
                    Select which priorities this rule should handle. Leave empty for all priorities.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                      <FormField
                        key={priority}
                        control={form.control}
                        name="priority_criteria"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={priority}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(priority)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), priority])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== priority),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{label}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Criteria */}
            <FormField
              control={form.control}
              name="category_criteria"
              render={() => (
                <FormItem>
                  <FormLabel>Category Filter (Optional)</FormLabel>
                  <FormDescription>
                    Select which categories this rule should handle. Leave empty for all categories.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(TICKET_CATEGORY_LABELS).map(([category, label]) => (
                      <FormField
                        key={category}
                        control={form.control}
                        name="category_criteria"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={category}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(category)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), category])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== category),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{label}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Eligible Users */}
            <FormField
              control={form.control}
              name="eligible_user_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Assignees</FormLabel>
                  <FormDescription>
                    Select team members who can be assigned tickets by this rule
                  </FormDescription>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {eligibleUsers.map((user) => (
                      <FormField
                        key={user.id}
                        control={form.control}
                        name="eligible_user_ids"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={user.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), user.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== user.id),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal flex-1">
                                <div>
                                  <div className="font-medium">{user.full_name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </FormLabel>
                              <Badge variant="outline" className="capitalize">
                                {user.role}
                              </Badge>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Enable this rule to automatically assign tickets
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Test Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rule Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Test Priority</label>
                      <Select
                        value={testTicket.priority}
                        onValueChange={(priority) =>
                          setTestTicket((prev) => ({ ...prev, priority }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                            <SelectItem key={priority} value={priority}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Test Category</label>
                      <Select
                        value={testTicket.category}
                        onValueChange={(category) =>
                          setTestTicket((prev) => ({ ...prev, category }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TICKET_CATEGORY_LABELS).map(([category, label]) => (
                            <SelectItem key={category} value={category}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm">This rule would:</span>
                    <Badge variant={testCurrentRule() ? 'default' : 'secondary'}>
                      {testCurrentRule() ? '✅ Match' : '❌ Not Match'}
                    </Badge>
                    <span className="text-sm">this test ticket</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
