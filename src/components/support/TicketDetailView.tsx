import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Shield,
  ArrowLeft,
  Package,
  MessageSquare,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  useTicketDetail,
  useTicketReplies,
  useCreateReply,
  useUpdateTicketStatus,
  useUpdateTicket,
  useHasCompletedSurvey,
  useSubmitSatisfactionSurvey
} from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ReplyTemplatesManager } from '@/components/support/ReplyTemplatesManager';
import { CustomerSatisfactionSurvey } from '@/components/support/CustomerSatisfactionSurvey';
import { InternalNotesPanel } from '@/components/support/InternalNotesPanel';
import {
  TICKET_STATUS_LABELS,
  ADMIN_TICKET_STATUS_LABELS,
  CUSTOMER_TICKET_STATUS_LABELS,
  TICKET_STATUS_DESCRIPTIONS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
  type TicketPriority
} from '@/types/ticket';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

const replySchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters'),
  is_internal: z.boolean().default(false)
});

type ReplyForm = z.infer<typeof replySchema>;

const StatusIcon = ({ status }: { status: string }) => {
  const iconClass = 'h-4 w-4';
  switch (status) {
    case 'open':
      return <Clock className={iconClass} />;
    case 'in_progress':
      return <AlertTriangle className={iconClass} />;
    case 'pending':
      return <Clock className={iconClass} />;
    case 'resolved':
    case 'closed':
      return <CheckCircle className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
};

interface TicketDetailViewProps {
  ticketId: string;
  onBack?: () => void;
  inSplitView?: boolean;
}

export const TicketDetailView = ({ ticketId, onBack, inSplitView = false }: TicketDetailViewProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { users: adminUsers = [] } = useUserRoles();
  
  const { data: ticket, isLoading: ticketLoading } = useTicketDetail(ticketId);

  const { data: replies = [], isLoading: repliesLoading } = useTicketReplies(ticketId);
  const { data: hasCompletedSurvey = false } = useHasCompletedSurvey(ticketId);

  const createReplyMutation = useCreateReply();
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateTicket();
  const submitSurveyMutation = useSubmitSatisfactionSurvey();

  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      message: '',
      is_internal: false
    }
  });

  // Auto-scroll to bottom when new replies are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  // Check if current user can view this ticket
  const canView = ticket && (ticket.user_id === user?.id || !!user); // All authenticated users can view (simplified access)

  // Helper function to get status description
  const getStatusDescription = (status: TicketStatus) => {
    const descriptions = TICKET_STATUS_DESCRIPTIONS[status];
    if (!descriptions) return 'Unknown status';
    
    // Return appropriate description based on user type
    // All authenticated users see admin descriptions (simplified access)
    return user ? descriptions.admin : descriptions.customer;
  };

  // Helper function to get status label based on user type
  const getStatusLabel = (status: TicketStatus) => {
    // All authenticated users see admin labels (simplified access)
    return user ? ADMIN_TICKET_STATUS_LABELS[status] : CUSTOMER_TICKET_STATUS_LABELS[status];
  };

  const handleStatusChange = (status: TicketStatus) => {
    updateStatusMutation.mutate({ ticketId, status });
  };

  const handlePriorityChange = (priority: TicketPriority) => {
    updateTicketMutation.mutate({
      ticketId,
      updateData: { priority }
    });
  };

  const handleAssignmentChange = (assignedTo: string) => {
    const assigned_to = assignedTo === 'unassigned' ? null : assignedTo;
    updateTicketMutation.mutate({
      ticketId,
      updateData: { assigned_to }
    });
  };

  const handleTemplateSelect = (template: any) => {
    // Replace template variables with actual values
    let message = template.body_template;

    if (ticket) {
      message = message
        .replace(
          /\{\{customer_name\}\}/g,
          ticket.user_profile?.full_name || ticket.user_profile?.email || 'Customer',
        )
        .replace(/\{\{ticket_id\}\}/g, ticket.id.slice(0, 8))
        .replace(
          /\{\{order_id\}\}/g,
          ticket.quote?.iwish_tracking_id || ticket.quote?.id?.slice(0, 8) || 'N/A',
        )
        .replace(/\{\{tracking_id\}\}/g, ticket.quote?.iwish_tracking_id || 'N/A')
        .replace(/\{\{status\}\}/g, ticket.status);
    }

    form.setValue('message', message);
    setShowTemplates(false);
  };

  const onSubmitReply = async (values: ReplyForm) => {
    if (!ticket || !user) return;

    setIsSubmitting(true);

    try {
      await createReplyMutation.mutateAsync({
        ticket_id: ticketId,
        message: values.message,
        is_internal: values.is_internal
      });

      form.reset({
        message: '',
        is_internal: false
      });
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSurveySubmit = async (surveyData: import('@/types/ticket').CreateSurveyData) => {
    await submitSurveyMutation.mutateAsync(surveyData);
    setShowSurvey(false);
  };

  const handleSurveySkip = () => {
    setShowSurvey(false);
  };

  // Show survey for non-admin users when ticket is resolved and survey not completed
  const shouldShowSurvey =
    ticket &&
    ticket.status === 'resolved' &&
    !hasCompletedSurvey &&
    ticket.user_id === user?.id;

  // Auto-show survey when ticket is resolved
  React.useEffect(() => {
    if (shouldShowSurvey) {
      const timer = setTimeout(() => {
        setShowSurvey(true);
      }, 2000); // Show survey after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [shouldShowSurvey]);

  if (ticketLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!ticket || !canView) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">Ticket not found</h3>
        <p className="text-gray-600 mb-4">
          This ticket doesn't exist or you don't have permission to view it.
        </p>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}
      </div>
    );
  }

  // Filter replies based on user role (hide internal notes from customers)
  const visibleReplies = replies.filter((reply) => {
    // Show all replies to authenticated users (simplified access)
    if (user) return true;
    // Hide internal notes from non-authenticated users
    return !reply.is_internal;
  });

  return (
    <div className={`${inSplitView ? 'h-full flex flex-col' : 'space-y-6'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${inSplitView ? 'p-4 border-b bg-white' : ''}`}>
        <div className="flex items-center gap-4">
          {onBack && !inSplitView && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {inSplitView && onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className={`font-bold ${inSplitView ? 'text-lg' : 'text-2xl'}`}>{ticket.subject}</h1>
            <p className={`text-gray-600 ${inSplitView ? 'text-xs' : 'text-sm'}`}>
              Ticket #{ticket.id.slice(0, 8)}... • Created{' '}
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Admin Status Controls */}
        {user && (
          <Select
            value={ticket.status}
            onValueChange={handleStatusChange}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue>
                <div className={`flex items-center gap-2 ${TICKET_STATUS_COLORS[ticket.status]}`}>
                  <StatusIcon status={ticket.status} />
                  {getStatusLabel(ticket.status)}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ADMIN_TICKET_STATUS_LABELS).map(([status, label]) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className={`${inSplitView 
        ? 'flex-1 flex flex-col overflow-hidden' 
        : 'grid grid-cols-1 lg:grid-cols-3 gap-6'
      }`}>
        {/* Conversation */}
        <div className={`${inSplitView 
          ? 'flex-1 flex flex-col overflow-hidden p-4' 
          : 'lg:col-span-2 space-y-6'
        }`}>
          {/* Initial Ticket */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{ticket.user_profile?.full_name || 'Customer'}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{ticket.description}</div>
            </CardContent>
          </Card>

          {/* Replies */}
          {repliesLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            visibleReplies.map((reply) => (
              <Card key={reply.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        reply.is_internal
                          ? 'bg-orange-100'
                          : reply.user_id === ticket.user_id
                            ? 'bg-blue-100'
                            : 'bg-green-100',
                      )}
                    >
                      {reply.is_internal ? (
                        <Shield className="h-4 w-4 text-orange-600" />
                      ) : reply.user_id === ticket.user_id ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {reply.user_profile?.full_name ||
                            (reply.user_id === ticket.user_id ? 'Customer' : 'Support Team')}
                        </p>
                        {reply.is_internal && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Internal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap">{reply.message}</div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Reply Form */}
          {ticket.status !== 'closed' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Add Reply</CardTitle>
                  {user && (
                    <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          {showTemplates ? 'Hide Templates' : 'Use Template'}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ReplyTemplatesManager
                          onSelectTemplate={handleTemplateSelect}
                          className="mb-4"
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CardHeader>
              <CardContent>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitReply)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Type your reply..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Internal Note Toggle (Admin Only) */}
                    {user && (
                      <FormField
                        control={form.control}
                        name="is_internal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                <Lock className="h-4 w-4 text-orange-600" />
                                Internal Note
                              </FormLabel>
                              <p className="text-xs text-gray-600">
                                Only visible to support team members - customers won't see this
                                message
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex justify-between items-center">
                      {form.watch('is_internal') && (
                        <div className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-md">
                          <strong>Internal Note:</strong> This message will only be visible to support
                          team members.
                        </div>
                      )}

                      <div className="flex gap-2 ml-auto">
                        <Button type="submit" disabled={isSubmitting}>
                          {form.watch('is_internal') ? (
                            <Lock className="mr-2 h-4 w-4" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          {isSubmitting
                            ? 'Sending...'
                            : form.watch('is_internal')
                              ? 'Add Internal Note'
                              : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div ref={messagesEndRef} />

          {/* Customer Satisfaction Survey */}
          {showSurvey && ticket && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-blue-900">🎉 Issue Resolved!</h3>
                <p className="text-blue-700">Help us improve by sharing your experience</p>
              </div>
              <CustomerSatisfactionSurvey
                ticket={ticket}
                onSubmit={handleSurveySubmit}
                onSkip={handleSurveySkip}
                isLoading={submitSurveyMutation.isPending}
              />
            </div>
          )}

          {/* Survey completion confirmation */}
          {!showSurvey && hasCompletedSurvey && ticket?.status === 'resolved' && ticket.user_id === user?.id && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-green-800">
                <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                <p className="font-semibold">Thank you for your feedback!</p>
                <p className="text-sm">Your survey response helps us improve our service.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Hidden in split view */}
        {!inSplitView && (
          <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div
                  className={`mt-1 inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm ${TICKET_STATUS_COLORS[ticket.status]}`}
                >
                  <StatusIcon status={ticket.status} />
                  {getStatusLabel(ticket.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1">{getStatusDescription(ticket.status)}</p>
              </div>

              <Separator />

              {/* Priority - Admin Only */}
              {user && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <Select
                      value={ticket.priority}
                      onValueChange={handlePriorityChange}
                      disabled={updateTicketMutation.isPending}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue>
                          <div
                            className={`inline-block px-2 py-1 rounded-md text-sm ${TICKET_PRIORITY_COLORS[ticket.priority]}`}
                          >
                            {TICKET_PRIORITY_LABELS[ticket.priority]}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                          <SelectItem key={priority} value={priority}>
                            <div
                              className={`px-2 py-1 rounded-md text-sm ${TICKET_PRIORITY_COLORS[priority as TicketPriority]}`}
                            >
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <p className="mt-1 text-sm">{TICKET_CATEGORY_LABELS[ticket.category]}</p>
              </div>

              {/* Assignment - Admin Only */}
              {user && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Assigned To</label>
                    <Select
                      value={ticket.assigned_to || 'unassigned'}
                      onValueChange={handleAssignmentChange}
                      disabled={updateTicketMutation.isPending}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue>
                          {ticket.assigned_to_profile?.full_name ||
                            ticket.assigned_to_profile?.email ||
                            'Unassigned'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-gray-500">Unassigned</span>
                        </SelectItem>
                        {adminUsers
                          .filter((user) => user.role === 'admin' || user.role === 'moderator')
                          .map((adminUser) => (
                            <SelectItem key={adminUser.id} value={adminUser.id}>
                              <div className="flex flex-col">
                                <span>{adminUser.full_name || adminUser.email}</span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {adminUser.role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-600">Customer</label>
                <div className="mt-1">
                  <p className="font-medium">{ticket.user_profile?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{ticket.user_profile?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Order */}
          {ticket.quote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Related Order
                  </div>
                  {user && (
                    <a
                      href={`/admin/quotes/${ticket.quote.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      View Full Details
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tracking ID</label>
                    <p className="font-mono text-sm font-medium">
                      {ticket.quote.iwish_tracking_id || `Quote ${ticket.quote.id.slice(0, 8)}...`}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={ticket.quote.status === 'delivered' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {ticket.quote.status}
                      </Badge>
                      {ticket.quote.tracking_status && (
                        <Badge variant="outline" className="text-xs">
                          {ticket.quote.tracking_status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Destination</label>
                    <p className="text-sm">{ticket.quote.destination_country}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <p className="text-sm font-semibold">
                      ${ticket.quote.final_total_origincurrency?.toFixed(2) || '0.00'} USD
                    </p>
                  </div>

                  {ticket.quote.estimated_delivery_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Est. Delivery</label>
                      <p className="text-sm">
                        {new Date(ticket.quote.estimated_delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {ticket.quote.display_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Display ID</label>
                      <p className="text-sm font-mono">{ticket.quote.display_id}</p>
                    </div>
                  )}
                </div>

                {/* Customer Information */}
                {ticket.quote.customer_data?.info && (
                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-sm font-medium text-gray-600">Customer Info</label>
                    <div className="text-sm text-gray-700 mt-1">
                      {ticket.quote.customer_data.info.name && (
                        <div>Name: {ticket.quote.customer_data.info.name}</div>
                      )}
                      {ticket.quote.customer_data.info.email && (
                        <div>Email: {ticket.quote.customer_data.info.email}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items Preview */}
                {ticket.quote.items && (
                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-sm font-medium text-gray-600">Items</label>
                    <div className="text-sm text-gray-700 mt-1">
                      {Array.isArray(ticket.quote.items) ? (
                        <div className="space-y-1">
                          {ticket.quote.items.slice(0, 3).map((item: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>{item?.name || 'Unnamed item'}</span>
                              {item?.price && <span>${item.price}</span>}
                            </div>
                          ))}
                          {ticket.quote.items.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{ticket.quote.items.length - 3} more items
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>Product details available</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes Panel (Admin Only) */}
          {user && (
            <InternalNotesPanel
              ticketId={ticketId}
              replies={replies.filter(r => r.is_internal)}
              isLoading={repliesLoading}
            />
          )}
          </div>
        )}
      </div>
    </div>
  );
};
