import { useState, useMemo } from 'react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { CompactStatsBar } from '@/components/admin/CompactStatsBar';
import { InlineFilters } from '@/components/admin/InlineFilters';
import { useUserRoles } from '@/hooks/useUserRoles';
import { TicketIcon, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
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
  useAssignTicket,
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

  const handleAssign = (assignedTo: string) => {
    const assigned_to = assignedTo === 'unassigned' ? null : assignedTo;
    assignTicketMutation.mutate({ ticketId: ticket.id, adminUserId: assigned_to });
  };

  const priorityBorderColors = {
    urgent: 'border-l-red-500 bg-red-50/50',
    high: 'border-l-orange-500 bg-orange-50/50', 
    medium: 'border-l-blue-500 bg-blue-50/50',
    low: 'border-l-gray-400 bg-gray-50/50',
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:shadow-sm transition-all duration-200 border-l-4 ${
        priorityBorderColors[ticket.priority as keyof typeof priorityBorderColors] || priorityBorderColors.medium
      } ${
        isSelected ? 'shadow-md ring-2 ring-blue-500/20' : 'border-l-transparent hover:border-l-gray-300'
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
              {/* Unread indicator */}
              <div className="w-2 h-2 bg-blue-500 rounded-full opacity-60" />
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
                {ticket.user_profile?.full_name || ticket.user_profile?.email || 'Anonymous'}
              </p>
              <p className="text-sm text-gray-500">{ticket.user_profile?.email}</p>
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
        <TableCell>
          <Badge variant="outline" className={TICKET_PRIORITY_COLORS[ticket.priority]}>
            {TICKET_PRIORITY_LABELS[ticket.priority]}
          </Badge>
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

// Customer Intelligence Panel Component
const CustomerIntelligencePanel = ({ ticketId }: { ticketId: string }) => {
  const { data: ticket } = useTicketDetail(ticketId);
  
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
              {customer?.full_name || 'Anonymous Customer'}
            </h4>
            <p className="text-sm text-gray-500 truncate">{customer?.email}</p>
            {customer?.country && (
              <div className="flex items-center gap-1 mt-1">
                <div className="w-3 h-3 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-500">{customer.country}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-gray-900">3</div>
            <div className="text-xs text-gray-500">Total Tickets</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-green-600">2.1h</div>
            <div className="text-xs text-gray-500">Avg Response</div>
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
                <span className="font-mono text-gray-900">
                  {ticket.quote.iwish_tracking_id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Destination:</span>
                <span className="text-gray-900">{ticket.quote.destination_country}</span>
              </div>
              {ticket.quote.final_total_origincurrency && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Value:</span>
                  <span className="font-semibold text-gray-900">
                    ${ticket.quote.final_total_origincurrency.toFixed(2)}
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
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Neutral</span>
          </div>
          <div className="text-xs text-gray-500">
            Customer tone appears professional and solution-focused.
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h5>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Created ticket about shipping delay</p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Placed order #IWB20251234</p>
                <p className="text-xs text-gray-400">2 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Account created</p>
                <p className="text-xs text-gray-400">1 week ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tags & Labels */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Customer Tags</h5>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              First-time customer
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700">
              High-value
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 text-green-700">
              Responsive
            </Badge>
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
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
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

export const AdminTicketDashboard = () => {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [quoteFilter, setQuoteFilter] = useState<'all' | 'with_quote' | 'without_quote'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

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
          selectedTicketId 
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
        </div>

        {/* Right Panel: Enhanced Ticket Detail View with Customer Intelligence */}
        {selectedTicketId && (
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
        {selectedTicketId && (
          <div className="md:hidden fixed inset-0 z-50 bg-white">
            <TicketDetailView 
              ticketId={selectedTicketId} 
              onBack={handleBackToList}
              inSplitView={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
