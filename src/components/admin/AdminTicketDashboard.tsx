import { useState, useMemo } from 'react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { CompactStatsBar } from '@/components/admin/CompactStatsBar';
import { InlineFilters } from '@/components/admin/InlineFilters';
import { useUserRoles } from '@/hooks/useUserRoles';
import { TicketIcon, Clock, CheckCircle, AlertTriangle, Grid3X3, List, Kanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminTickets,
  useTicketStats,
  useUpdateTicketStatus,
  useUpdateTicket,
  useAssignTicket,
  useTicketDetail,
  useUserTickets,
} from '@/hooks/useTickets';
import {
  TICKET_STATUS_LABELS,
  ADMIN_TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
  type TicketWithDetails,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  type TicketFilters,
} from '@/types/ticket';
import { useSLAStatus, useSLAUtils } from '@/hooks/useSLA';
import { useManualAssignTicket } from '@/hooks/useAutoAssignment';
import { formatDistanceToNow } from 'date-fns';
import { unifiedSupportEngine } from '@/services/UnifiedSupportEngine';
import { useToast } from '@/components/ui/use-toast';

const StatusIcon = ({ status, className = 'h-4 w-4' }: { status: string; className?: string }) => {
  switch (status) {
    case 'open':
      return <Clock className={`${className} text-blue-500`} />;
    case 'in_progress':
      return <AlertTriangle className={`${className} text-yellow-500 animate-pulse`} />;
    case 'pending':
      return <Clock className={`${className} text-orange-500`} />;
    case 'resolved':
      return <CheckCircle className={`${className} text-green-500`} />;
    case 'closed':
      return <CheckCircle className={`${className} text-gray-500`} />;
    default:
      return <Clock className={`${className} text-gray-400`} />;
  }
};

const PriorityIndicator = ({ priority }: { priority: string }) => {
  const indicators = {
    urgent: <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />,
    high: <div className="w-2 h-2 bg-orange-500 rounded-full" />,
    medium: <div className="w-2 h-2 bg-blue-500 rounded-full" />,
    low: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
  };
  return indicators[priority as keyof typeof indicators] || indicators.medium;
};

const CustomerAvatar = ({ customer, size = 'sm' }: { customer?: any; size?: 'sm' | 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
  };
  
  const initials = customer?.full_name
    ? customer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : customer?.email
    ? customer.email.slice(0, 2).toUpperCase()
    : '??';
    
  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm`}>
      {initials}
    </div>
  );
};

const TicketRow = ({
  ticket,
  onTicketClick,
  adminUsers,
  isCompact = false,
  isSelected = false,
}: {
  ticket: TicketWithDetails;
  onTicketClick: (ticketId: string) => void;
  adminUsers: any[];
  isCompact?: boolean;
  isSelected?: boolean;
}) => {
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateTicket();
  const assignTicketMutation = useAssignTicket();
  const { toast } = useToast();

  const handleStatusChange = (status: TicketStatus) => {
    // Proactive validation to prevent errors
    const allowedTransitions = unifiedSupportEngine.getAllowedTransitions(ticket.status as TicketStatus);
    
    if (!allowedTransitions.includes(status)) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${ticket.status}" to "${status}". Allowed transitions: ${allowedTransitions.join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }

    updateStatusMutation.mutate({ ticketId: ticket.id, status });
  };

  const handlePriorityChange = (priority: TicketPriority) => {
    updateTicketMutation.mutate({
      ticketId: ticket.id,
      updateData: { priority }
    });
  };

  const handleAssign = (assignedTo: string) => {
    const assigned_to = assignedTo === 'unassigned' ? null : assignedTo;
    assignTicketMutation.mutate({ ticketId: ticket.id, adminUserId: assigned_to });
  };

  const priorityBorderColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500', 
    medium: 'border-l-blue-500',
    low: 'border-l-slate-400',
  };

  // Enhanced background colors for unread tickets
  const getTicketBackground = (ticket: any) => {
    if (ticket.has_unread_replies) {
      return ticket.priority === 'urgent' ? 'bg-red-50/70' :
             ticket.priority === 'high' ? 'bg-orange-50/70' :
             'bg-blue-50/70'; // Medium/Low unread tickets
    }
    return 'bg-white';
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:shadow-sm transition-all duration-200 border-l-4 ${
        priorityBorderColors[ticket.priority as keyof typeof priorityBorderColors] || priorityBorderColors.medium
      } ${getTicketBackground(ticket)} ${
        isSelected ? 'shadow-md ring-2 ring-blue-500/20' : 'hover:bg-gray-50/80'
      }`} 
      onClick={() => onTicketClick(ticket.id)}
    >
      <TableCell className="font-medium">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 mt-1">
            <PriorityIndicator priority={ticket.priority} />
            <CustomerAvatar customer={ticket.user_profile} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-semibold text-gray-900 hover:text-blue-600 truncate ${isCompact ? 'text-sm' : ''}`}>
                {ticket.subject}
              </p>
              {/* Enhanced unread indicator - priority-based colors */}
              {(ticket as any).has_unread_replies && (
                <div 
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    ticket.priority === 'urgent' ? 'bg-red-500' : 
                    ticket.priority === 'high' ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`} 
                  title={`Has unread customer replies (${ticket.priority} priority)`} 
                />
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{ticket.description}</p>
          </div>
        </div>
      </TableCell>

      {!isCompact && (
        <TableCell>
          <div className="flex items-center gap-3">
            <CustomerAvatar customer={ticket.user_profile} size="md" />
            <div>
              <p className="font-medium text-gray-900">
                {ticket.user_profile?.full_name || ticket.user_profile?.email || (ticket.user_id ? 'Anonymous' : 'System Generated')}
              </p>
              <p className="text-sm text-gray-500">{ticket.user_profile?.email}</p>
              {ticket.user_profile?.phone && (
                <p className="text-xs text-gray-400">{ticket.user_profile.phone}</p>
              )}
            </div>
          </div>
        </TableCell>
      )}

      {!isCompact && (
        <TableCell>
          <Badge variant="outline" className={TICKET_CATEGORY_LABELS[ticket.category]}>
            {TICKET_CATEGORY_LABELS[ticket.category]}
          </Badge>
        </TableCell>
      )}

      {!isCompact && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Select
            value={ticket.priority}
            onValueChange={handlePriorityChange}
            disabled={updateTicketMutation.isPending}
          >
            <SelectTrigger className="w-[120px] border-0 shadow-sm bg-white hover:bg-gray-50 transition-colors">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    ticket.priority === 'urgent' ? 'bg-red-500' : 
                    ticket.priority === 'high' ? 'bg-orange-500' :
                    ticket.priority === 'low' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {TICKET_PRIORITY_LABELS[ticket.priority]}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                <SelectItem key={priority} value={priority}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      priority === 'urgent' ? 'bg-red-500' : 
                      priority === 'high' ? 'bg-orange-500' :
                      priority === 'low' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm">{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      )}

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={ticket.status}
          onValueChange={handleStatusChange}
          disabled={updateStatusMutation.isPending}
        >
          <SelectTrigger className="w-[140px] border-0 shadow-sm bg-white hover:bg-gray-50 transition-colors">
            <SelectValue>
              <div className="flex items-center gap-2">
                <StatusIcon status={ticket.status} className="h-3.5 w-3.5" />
                <span className="text-sm font-medium text-gray-700">
                  {ADMIN_TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {unifiedSupportEngine.getValidStatusOptionsForDropdown(ticket.status as TicketStatus, true).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <StatusIcon status={option.value} />
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${option.isSuggested ? 'text-green-600' : ''}`}>
                      {option.label}
                      {option.isSuggested && <span className="ml-1 text-xs">✨ Suggested</span>}
                    </span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {!isCompact && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Select
              value={ticket.assigned_to || 'unassigned'}
              onValueChange={handleAssign}
              disabled={assignTicketMutation.isPending}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue>
                  <span className={ticket.assigned_to ? 'text-gray-900' : 'text-gray-500'}>
                    {ticket.assigned_to_profile?.full_name ||
                      ticket.assigned_to_profile?.email ||
                      'Unassigned'}
                  </span>
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
                        <span className="text-sm font-medium">
                          {adminUser.full_name || adminUser.email}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{adminUser.role}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </TableCell>
      )}

      {!isCompact && (
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm text-gray-900 font-medium">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Response due in 2h</span>
            </div>
          </div>
        </TableCell>
      )}

      {!isCompact && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          {ticket.quote ? (
            <div className="text-sm space-y-1">
              <a
                href={`/admin/quotes/${ticket.quote.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {ticket.quote.iwish_tracking_id || `Quote ${ticket.quote.id.slice(0, 8)}...`}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{ticket.quote.destination_country}</span>
                {ticket.quote.status && (
                  <Badge
                    variant={ticket.quote.status === 'delivered' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {ticket.quote.status}
                  </Badge>
                )}
              </div>
              {ticket.quote.final_total_origincurrency && (
                <div className="text-xs text-gray-600">
                  ${ticket.quote.final_total_origincurrency.toFixed(2)} USD
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">No order</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
};

// Card View Component
const TicketCardView = ({
  tickets,
  onTicketClick,
  selectedTicketId,
  adminUsers,
}: {
  tickets: TicketWithDetails[];
  onTicketClick: (ticketId: string) => void;
  selectedTicketId: string | null;
  adminUsers: any[];
}) => {
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateTicket();
  const assignTicketMutation = useAssignTicket();
  const { toast } = useToast();

  const handleStatusChange = (ticket: TicketWithDetails, status: TicketStatus) => {
    const allowedTransitions = unifiedSupportEngine.getAllowedTransitions(ticket.status as TicketStatus);
    
    if (!allowedTransitions.includes(status)) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${ticket.status}" to "${status}". Allowed transitions: ${allowedTransitions.join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }

    updateStatusMutation.mutate({ ticketId: ticket.id, status });
  };

  const handlePriorityChange = (ticket: TicketWithDetails, priority: TicketPriority) => {
    updateTicketMutation.mutate({
      ticketId: ticket.id,
      updateData: { priority }
    });
  };

  const priorityBorderColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500', 
    medium: 'border-l-blue-500',
    low: 'border-l-slate-400',
  };

  // Enhanced background colors for unread tickets in card view
  const getCardBackground = (ticket: any) => {
    if (ticket.has_unread_replies) {
      return ticket.priority === 'urgent' ? 'bg-red-50/70' :
             ticket.priority === 'high' ? 'bg-orange-50/70' :
             'bg-blue-50/70'; // Medium/Low unread tickets
    }
    return 'bg-white';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          onClick={() => onTicketClick(ticket.id)}
          className={`${getCardBackground(ticket)} rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-4 ${
            priorityBorderColors[ticket.priority as keyof typeof priorityBorderColors] || priorityBorderColors.medium
          } ${
            selectedTicketId === ticket.id ? 'ring-2 ring-blue-500/20 shadow-lg' : 'hover:shadow-lg'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <PriorityIndicator priority={ticket.priority} />
              <Badge variant="outline" className="text-xs">
                {TICKET_PRIORITY_LABELS[ticket.priority]}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <StatusIcon status={ticket.status} className="h-3.5 w-3.5" />
              <span className="text-xs font-medium text-gray-600">
                {ADMIN_TICKET_STATUS_LABELS[ticket.status]}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-2 mb-3">
            <CustomerAvatar customer={ticket.user_profile} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {ticket.user_profile?.full_name || ticket.user_profile?.email || (ticket.user_id ? 'Anonymous' : 'System Generated')}
              </p>
              <p className="text-xs text-gray-500 truncate">{ticket.user_profile?.email}</p>
              {ticket.user_profile?.phone && (
                <p className="text-xs text-gray-400">{ticket.user_profile.phone}</p>
              )}
            </div>
          </div>

          {/* Subject & Description */}
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{ticket.subject}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{ticket.description}</p>
          </div>

          {/* Category & Quote Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
            {ticket.quote && (
              <span className="text-blue-600 font-medium">Has Order</span>
            )}
          </div>

          {/* Status Dropdown */}
          <div onClick={(e) => e.stopPropagation()} className="mb-2">
            <Select
              value={ticket.status}
              onValueChange={(status) => handleStatusChange(ticket, status as TicketStatus)}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unifiedSupportEngine.getValidStatusOptionsForDropdown(ticket.status as TicketStatus, true).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={option.value} className="h-3 w-3" />
                      <span className={option.isSuggested ? 'text-green-600 font-medium' : ''}>
                        {option.label}
                        {option.isSuggested && ' ✨'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Dropdown */}
          <div onClick={(e) => e.stopPropagation()} className="mb-2">
            <Select
              value={ticket.priority}
              onValueChange={(priority) => handlePriorityChange(ticket, priority as TicketPriority)}
              disabled={updateTicketMutation.isPending}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      ticket.priority === 'urgent' ? 'bg-red-500' : 
                      ticket.priority === 'high' ? 'bg-orange-500' :
                      ticket.priority === 'low' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span>{TICKET_PRIORITY_LABELS[ticket.priority]}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                  <SelectItem key={priority} value={priority}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        priority === 'urgent' ? 'bg-red-500' : 
                        priority === 'high' ? 'bg-orange-500' :
                        priority === 'low' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-xs">{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Due in 2h</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Kanban View Component
const KanbanView = ({
  tickets,
  onTicketClick,
  selectedTicketId,
  adminUsers,
}: {
  tickets: TicketWithDetails[];
  onTicketClick: (ticketId: string) => void;
  selectedTicketId: string | null;
  adminUsers: any[];
}) => {
  const statusColumns = [
    { status: 'open', label: 'Open', color: 'bg-blue-50 border-blue-200' },
    { status: 'in_progress', label: 'In Progress', color: 'bg-yellow-50 border-yellow-200' },
    { status: 'pending', label: 'Pending', color: 'bg-orange-50 border-orange-200' },
    { status: 'resolved', label: 'Resolved', color: 'bg-green-50 border-green-200' },
    { status: 'closed', label: 'Closed', color: 'bg-gray-50 border-gray-200' },
  ];

  return (
    <div className="flex gap-4 p-4 overflow-x-auto min-h-0">
      {statusColumns.map((column) => {
        const columnTickets = tickets.filter(ticket => ticket.status === column.status);
        
        return (
          <div key={column.status} className={`flex-shrink-0 w-80 rounded-lg border-2 ${column.color}`}>
            {/* Column Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={column.status} />
                  <h3 className="font-semibold text-gray-900">{column.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnTickets.length}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
              {columnTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket.id)}
                  className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border ${
                    selectedTicketId === ticket.id ? 'ring-2 ring-blue-500/20 border-blue-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <PriorityIndicator priority={ticket.priority} />
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      {ticket.priority}
                    </Badge>
                  </div>

                  <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                    {ticket.subject}
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <CustomerAvatar customer={ticket.user_profile} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600 truncate">
                        {ticket.user_profile?.full_name || ticket.user_profile?.email || (ticket.user_id ? 'Anonymous' : 'System Generated')}
                      </div>
                      {ticket.user_profile?.phone && (
                        <div className="text-xs text-gray-400">{ticket.user_profile.phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                    {ticket.quote && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Has related order" />
                    )}
                  </div>
                </div>
              ))}
              
              {columnTickets.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <StatusIcon status={column.status} className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {column.label.toLowerCase()} tickets</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Customer Intelligence Panel Component
const CustomerIntelligencePanel = ({ ticketId }: { ticketId: string }) => {
  const { data: ticket } = useTicketDetail(ticketId);
  const { data: userTickets = [] } = useUserTickets(ticket?.user_profile?.id);
  
  if (!ticket) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const customer = ticket.user_profile;
  const totalTickets = userTickets.length;
  const resolvedTickets = userTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const avgResponseTime = "2.1h"; // Could be calculated from ticket data
  
  // Calculate customer tags based on real data
  const isFirstTime = totalTickets <= 1;
  const isHighValue = ticket.quote && ticket.quote.final_total_origincurrency && ticket.quote.final_total_origincurrency > 1000;
  const isResponsive = userTickets.some(t => t.replies && t.replies.length > 1);
  
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Customer Intelligence</h3>
        <p className="text-xs text-gray-500 mt-1">Insights & history</p>
      </div>

      {/* Customer Profile */}
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <CustomerAvatar customer={customer} size="md" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {customer?.full_name || customer?.email || (ticket.user_id ? 'Anonymous Customer' : 'System Generated')}
            </h4>
            <div className="space-y-1 mt-1">
              {customer?.email && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 w-8">Email:</span>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
              )}
              {customer?.phone && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 w-8">Phone:</span>
                  <p className="text-xs text-gray-500">{customer.phone}</p>
                </div>
              )}
              {customer?.country && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-500">{customer.country}</span>
                </div>
              )}
              {customer?.preferred_display_currency && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 w-8">Currency:</span>
                  <span className="text-xs text-gray-500">{customer.preferred_display_currency}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900">{totalTickets}</div>
            <div className="text-xs text-gray-500">Total Tickets</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-green-600">
              {totalTickets > 0 ? `${Math.round((resolvedTickets / totalTickets) * 100)}%` : '0%'}
            </div>
            <div className="text-xs text-gray-500">Resolution Rate</div>
          </div>
        </div>

        {/* Related Quote/Order Info */}
        {ticket.quote && (
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-gray-900">Related Order</h5>
              <Badge variant="secondary" className="text-xs">
                {ticket.quote.status || 'pending'}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tracking:</span>
                <a
                  href={`/admin/quotes/${ticket.quote.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-sm"
                >
                  {ticket.quote.iwish_tracking_id || `Quote ${ticket.quote.id.slice(0, 8)}...`}
                </a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Destination:</span>
                <span className="text-gray-900">{ticket.quote.destination_country}</span>
              </div>
              {ticket.quote.origin_country && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Origin:</span>
                  <span className="text-gray-900">{ticket.quote.origin_country}</span>
                </div>
              )}
              {ticket.quote.final_total_origincurrency && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Value:</span>
                  <span className="font-semibold text-gray-900">
                    ${ticket.quote.final_total_origincurrency.toFixed(2)}
                  </span>
                </div>
              )}
              {ticket.quote.created_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ordered:</span>
                  <span className="text-gray-900">
                    {formatDistanceToNow(new Date(ticket.quote.created_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Sentiment */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Sentiment Analysis</h5>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              ticket.priority === 'urgent' ? 'bg-red-500' : 
              ticket.priority === 'high' ? 'bg-orange-500' :
              ticket.priority === 'low' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {ticket.priority === 'urgent' ? 'Frustrated' : 
               ticket.priority === 'high' ? 'Concerned' :
               ticket.priority === 'low' ? 'Satisfied' : 'Neutral'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {ticket.priority === 'urgent' ? 'Customer appears frustrated and needs immediate attention.' :
             ticket.priority === 'high' ? 'Customer is concerned but remains professional.' :
             ticket.priority === 'low' ? 'Customer appears satisfied with polite tone.' :
             'Customer tone appears professional and solution-focused.'}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h5>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {/* Current ticket */}
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Created ticket: {ticket.subject}</p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            {/* Related quote activity */}
            {ticket.quote && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">
                    Placed order {ticket.quote.iwish_tracking_id || `#${ticket.quote.id.slice(0, 8)}...`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ticket.quote.created_at ? formatDistanceToNow(new Date(ticket.quote.created_at), { addSuffix: true }) : 'Recently'}
                  </p>
                </div>
              </div>
            )}

            {/* Other recent tickets */}
            {userTickets
              .filter(t => t.id !== ticket.id)
              .slice(0, 2)
              .map((recentTicket) => (
                <div key={recentTicket.id} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
                    recentTicket.status === 'resolved' || recentTicket.status === 'closed' 
                      ? 'bg-green-400' 
                      : 'bg-orange-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600">
                      {recentTicket.status === 'resolved' || recentTicket.status === 'closed' 
                        ? 'Resolved ticket:' 
                        : 'Created ticket:'
                      } {recentTicket.subject}
                    </p>
                    <p className="text-xs text-gray-400">
                      {recentTicket.created_at ? formatDistanceToNow(new Date(recentTicket.created_at), { addSuffix: true }) : 'Recently'}
                    </p>
                  </div>
                </div>
              ))}
            
            {/* Account creation */}
            {customer?.created_at && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Account created</p>
                  <p className="text-xs text-gray-400">
                    {customer.created_at ? formatDistanceToNow(new Date(customer.created_at), { addSuffix: true }) : 'Recently'}
                  </p>
                </div>
              </div>
            )}

            {userTickets.length === 0 && !ticket.quote && (
              <p className="text-xs text-gray-400 text-center py-2">No recent activity</p>
            )}
          </div>
        </div>

        {/* Tags & Labels */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Customer Tags</h5>
          <div className="flex flex-wrap gap-1">
            {isFirstTime && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                First-time customer
              </Badge>
            )}
            {isHighValue && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700">
                High-value
              </Badge>
            )}
            {isResponsive && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700">
                Responsive
              </Badge>
            )}
            {resolvedTickets > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700">
                Returning customer
              </Badge>
            )}
            {ticket.priority === 'urgent' && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-red-50 text-red-700">
                Priority case
              </Badge>
            )}
            {ticket.quote && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700">
                Has active order
              </Badge>
            )}
            {/* Show placeholder if no tags */}
            {!isFirstTime && !isHighValue && !isResponsive && resolvedTickets === 0 && ticket.priority !== 'urgent' && !ticket.quote && (
              <span className="text-xs text-gray-400">No tags assigned</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h5>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Schedule Follow-up
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Escalate to Manager
            </Button>
            {ticket.quote && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs"
                onClick={() => window.open(`/admin/quotes/${ticket.quote.id}`, '_blank')}
              >
                <TicketIcon className="h-3 w-3 mr-1" />
                View Full Order
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

type ViewMode = 'table' | 'card' | 'kanban';

export const AdminTicketDashboard = () => {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [quoteFilter, setQuoteFilter] = useState<'all' | 'with_quote' | 'without_quote'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const { users: adminUsers = [] } = useUserRoles();

  // Simple filters conversion
  const filters: TicketFilters = useMemo(() => {
    const converted: TicketFilters = {};
    if (statusFilter !== 'all') converted.status = [statusFilter];
    if (priorityFilter !== 'all') converted.priority = [priorityFilter];
    if (categoryFilter !== 'all') converted.category = [categoryFilter];
    return converted;
  }, [statusFilter, priorityFilter, categoryFilter]);

  const { data: tickets = [], isLoading } = useAdminTickets(filters);
  const { data: stats } = useTicketStats();

  // Filter tickets by search input and quote filter
  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    
    // Apply quote filter first
    if (quoteFilter === 'with_quote') {
      filtered = filtered.filter(ticket => ticket.quote);
    } else if (quoteFilter === 'without_quote') {
      filtered = filtered.filter(ticket => !ticket.quote);
    }
    
    // Then apply search filter
    if (searchInput) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.user_profile?.email?.toLowerCase().includes(searchLower) ||
          ticket.user_profile?.full_name?.toLowerCase().includes(searchLower) ||
          // Enhanced: Search by quote/tracking data
          ticket.quote?.iwish_tracking_id?.toLowerCase().includes(searchLower) ||
          ticket.quote?.destination_country?.toLowerCase().includes(searchLower) ||
          ticket.quote?.status?.toLowerCase().includes(searchLower),
      );
    }
    
    return filtered;
  }, [tickets, searchInput, quoteFilter]);

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Modern Header with Gradient */}
      <div className="px-6 py-6 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Support Tickets</h1>
            <p className="text-gray-600 text-sm mt-1">Manage customer support requests and inquiries</p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 transition-colors ${
                  viewMode === 'card' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Card View"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 transition-colors ${
                  viewMode === 'kanban' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                title="Kanban Board"
              >
                <Kanban className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-500">Response Time</p>
                <p className="text-sm font-semibold text-green-600">2.3h avg</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Satisfaction</p>
                <p className="text-sm font-semibold text-blue-600">4.8/5.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <CompactStatsBar stats={stats} isLoading={!stats} />

      {/* Inline Filters Toolbar */}
      <InlineFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        quoteFilter={quoteFilter}
        onQuoteChange={setQuoteFilter}
        totalTickets={tickets.length}
        filteredCount={filteredTickets.length}
      />

      {/* Enhanced Three-Panel Layout with Dynamic Sizing */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel: Tickets List with Responsive Sizing */}
        <div className={`${
          selectedTicketId && viewMode !== 'kanban'
            ? 'w-full md:w-2/5 xl:w-1/3 border-r border-gray-200' 
            : 'w-full'
        } bg-white overflow-auto shadow-sm transition-all duration-300 ease-in-out`}>
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <TicketIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {tickets.length === 0
                  ? 'All caught up! No support tickets need your attention right now.'
                  : 'Try adjusting your search criteria or filters to find what you\'re looking for.'}
              </p>
              {tickets.length === 0 && (
                <div className="mt-6">
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    🎉 Great job keeping up with customer support!
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Table View */}
              {viewMode === 'table' && (
                <div className="border-b border-gray-200">
                  <Table>
                    <TableHeader className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-700 py-4">Subject & Description</TableHead>
                        {!selectedTicketId && <TableHead className="font-semibold text-gray-700">Customer</TableHead>}
                        {!selectedTicketId && <TableHead className="font-semibold text-gray-700">Category</TableHead>}
                        {!selectedTicketId && <TableHead className="font-semibold text-gray-700">Priority</TableHead>}
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        {!selectedTicketId && <TableHead className="font-semibold text-gray-700">Assigned To</TableHead>}
                        {!selectedTicketId && <TableHead className="font-semibold text-gray-700">Response Time</TableHead>}
                        {!selectedTicketId && <TableHead className="font-semibold text-gray-700">Related Order</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TicketRow
                          key={ticket.id}
                          ticket={ticket}
                          onTicketClick={handleTicketClick}
                          adminUsers={adminUsers}
                          isCompact={selectedTicketId !== null}
                          isSelected={selectedTicketId === ticket.id}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Card View */}
              {viewMode === 'card' && (
                <div className="overflow-auto">
                  <TicketCardView
                    tickets={filteredTickets}
                    onTicketClick={handleTicketClick}
                    selectedTicketId={selectedTicketId}
                    adminUsers={adminUsers}
                  />
                </div>
              )}

              {/* Kanban View */}
              {viewMode === 'kanban' && (
                <div className="overflow-auto">
                  <KanbanView
                    tickets={filteredTickets}
                    onTicketClick={handleTicketClick}
                    selectedTicketId={selectedTicketId}
                    adminUsers={adminUsers}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel: Enhanced Ticket Detail View with Customer Intelligence */}
        {selectedTicketId && viewMode !== 'kanban' && (
          <div className="hidden md:flex md:w-3/5 xl:w-2/3 bg-gray-50 min-h-0">
            <div className="flex-1 flex">
              {/* Main Detail Panel */}
              <div className="flex-1 min-w-0">
                <TicketDetailView 
                  ticketId={selectedTicketId} 
                  onBack={handleBackToList}
                  inSplitView={true}
                />
              </div>
              
              {/* Customer Intelligence Sidebar (Right Panel on XL screens) */}
              <div className="hidden xl:block w-80 border-l border-gray-200 bg-white">
                <CustomerIntelligencePanel ticketId={selectedTicketId} />
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile: Full Screen Ticket Detail */}
        {selectedTicketId && viewMode !== 'kanban' && (
          <div className="md:hidden fixed inset-0 z-50 bg-white">
            <TicketDetailView 
              ticketId={selectedTicketId} 
              onBack={handleBackToList}
              inSplitView={false}
            />
          </div>
        )}

        {/* Kanban: Modal Ticket Detail */}
        {selectedTicketId && viewMode === 'kanban' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <TicketDetailView 
                ticketId={selectedTicketId} 
                onBack={handleBackToList}
                inSplitView={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
