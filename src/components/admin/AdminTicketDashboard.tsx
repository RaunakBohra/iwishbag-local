import { useState, useMemo } from 'react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { CompactStatsBar } from '@/components/admin/CompactStatsBar';
import { InlineFilters } from '@/components/admin/InlineFilters';
import { useUserRoles } from '@/hooks/useUserRoles';
import { TicketIcon, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

  const handleStatusChange = (status: TicketStatus) => {
    updateStatusMutation.mutate({ ticketId: ticket.id, status });
  };

  const handleAssign = (assignedTo: string) => {
    const assigned_to = assignedTo === 'unassigned' ? null : assignedTo;
    assignTicketMutation.mutate({ ticketId: ticket.id, adminUserId: assigned_to });
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-blue-50 transition-colors ${
        isSelected ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
      }`} 
      onClick={() => onTicketClick(ticket.id)}
    >
      <TableCell className="font-medium">
        <div>
          <p className={`font-semibold hover:text-blue-600 ${isCompact ? 'text-sm' : ''}`}>
            {ticket.subject}
          </p>
          <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
        </div>
      </TableCell>

      {!isCompact && (
        <TableCell>
          <div>
            <p className="font-medium">
              {ticket.user_profile?.full_name || ticket.user_profile?.email}
            </p>
            <p className="text-sm text-gray-500">{ticket.user_profile?.email}</p>
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
          <SelectTrigger className="w-[130px]">
            <SelectValue>
              <div className={`flex items-center gap-2 ${TICKET_STATUS_COLORS[ticket.status]}`}>
                <StatusIcon status={ticket.status} />
                {ADMIN_TICKET_STATUS_LABELS[ticket.status]}
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
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
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
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Support Tickets</h1>
        <p className="text-gray-500 text-sm">Manage customer support requests and inquiries</p>
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

      {/* Split View: Tickets List + Detail Panel */}
      <div className="flex-1 flex bg-white">
        {/* Left Panel: Tickets List */}
        <div className={`${selectedTicketId ? 'w-2/5 border-r' : 'w-full'} bg-white overflow-auto`}>
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-gray-600">
                {tickets.length === 0
                  ? 'No tickets have been created yet.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="border-b">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Subject & Description</TableHead>
                    {!selectedTicketId && <TableHead>Customer</TableHead>}
                    {!selectedTicketId && <TableHead>Category</TableHead>}
                    {!selectedTicketId && <TableHead>Priority</TableHead>}
                    <TableHead>Status</TableHead>
                    {!selectedTicketId && <TableHead>Assigned To</TableHead>}
                    {!selectedTicketId && <TableHead>Created</TableHead>}
                    {!selectedTicketId && <TableHead>Related Order</TableHead>}
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

        {/* Right Panel: Ticket Detail View */}
        {selectedTicketId && (
          <div className="w-3/5 bg-gray-50">
            <TicketDetailView 
              ticketId={selectedTicketId} 
              onBack={handleBackToList}
              inSplitView={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
