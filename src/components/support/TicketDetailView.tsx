import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useTicketDetail,
  useTicketReplies,
  useCreateReply,
  useUpdateTicketStatus,
  useUpdateTicket,
} from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminRole } from '@/hooks/useAdminRole';
import { ReplyTemplatesManager } from '@/components/support/ReplyTemplatesManager';
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
  type TicketPriority,
} from '@/types/ticket';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

const replySchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters'),
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
}

export const TicketDetailView = ({ ticketId, onBack }: TicketDetailViewProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { users: adminUsers = [] } = useUserRoles();
  const { data: isAdmin } = useAdminRole();

  const { data: ticket, isLoading: ticketLoading } = useTicketDetail(ticketId);
  
  const { data: replies = [], isLoading: repliesLoading } = useTicketReplies(ticketId);
  const createReplyMutation = useCreateReply();
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateTicket();

  const form = useForm<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      message: '',
    },
  });

  // Auto-scroll to bottom when new replies are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  // Check if current user can view this ticket
  const canView = ticket && (ticket.user_id === user?.id || isAdmin);

  // Helper function to get appropriate status label
  const getStatusLabel = (status: TicketStatus) => {
    return isAdmin ? ADMIN_TICKET_STATUS_LABELS[status] : CUSTOMER_TICKET_STATUS_LABELS[status];
  };

  // Helper function to get status description
  const getStatusDescription = (status: TicketStatus) => {
    return isAdmin ? TICKET_STATUS_DESCRIPTIONS[status].admin : TICKET_STATUS_DESCRIPTIONS[status].customer;
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
        .replace(/\{\{customer_name\}\}/g, ticket.user_profile?.full_name || ticket.user_profile?.email || 'Customer')
        .replace(/\{\{ticket_id\}\}/g, ticket.id.slice(0, 8))
        .replace(/\{\{order_id\}\}/g, ticket.quote?.iwish_tracking_id || ticket.quote?.id?.slice(0, 8) || 'N/A')
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
        is_internal: false, // For now, all replies are public
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (isAdmin) return true; // Admins see all replies
    return !reply.is_internal; // Customers only see public replies
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <p className="text-gray-600">
              Ticket #{ticket.id.slice(0, 8)}... • Created{' '}
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Admin Status Controls */}
        {isAdmin && (
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
              {Object.entries(isAdmin ? ADMIN_TICKET_STATUS_LABELS : CUSTOMER_TICKET_STATUS_LABELS).map(([status, label]) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-6">
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
                        {reply.is_internal && isAdmin && (
                          <Badge variant="outline" className="text-xs">
                            Internal Note
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
                  {isAdmin && (
                    <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          {showTemplates ? 'Hide Templates' : 'Use Template'}
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isAdmin && showTemplates && (
                  <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <ReplyTemplatesManager 
                      mode="select" 
                      onTemplateSelect={handleTemplateSelect}
                    />
                  </div>
                )}
                
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

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting}>
                        <Send className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sidebar */}
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
                <p className="text-xs text-gray-500 mt-1">
                  {getStatusDescription(ticket.status)}
                </p>
              </div>

              <Separator />

              {/* Priority - Admin Only */}
              {isAdmin && (
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
                          <div className={`inline-block px-2 py-1 rounded-md text-sm ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                            {TICKET_PRIORITY_LABELS[ticket.priority]}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                          <SelectItem key={priority} value={priority}>
                            <div className={`px-2 py-1 rounded-md text-sm ${TICKET_PRIORITY_COLORS[priority as TicketPriority]}`}>
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
              {isAdmin && (
                <>
                  <Separator />
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
                          .filter(user => user.role === 'admin' || user.role === 'moderator')
                          .map(adminUser => (
                            <SelectItem key={adminUser.id} value={adminUser.id}>
                              <div className="flex flex-col">
                                <span>{adminUser.full_name || adminUser.email}</span>
                                <span className="text-xs text-gray-500 capitalize">{adminUser.role}</span>
                              </div>
                            </SelectItem>
                          ))
                        }
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
                  {isAdmin && (
                    <a
                      href={`/admin/quotes/${ticket.quote.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      View Full Details
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
                      ${ticket.quote.final_total_usd?.toFixed(2) || '0.00'} USD
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
        </div>
      </div>
    </div>
  );
};
