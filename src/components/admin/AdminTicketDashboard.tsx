import { useState } from 'react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  TicketIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  useAdminTickets,
  useTicketStats,
  useUpdateTicketStatus,
  useAssignTicket,
} from '@/hooks/useTickets';
import {
  TICKET_STATUS_LABELS,
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
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'text-gray-600',
}: {
  title: string;
  value: number;
  icon: any;
  color?: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </CardContent>
  </Card>
);

const StatusIcon = ({ status }: { status: string }) => {
  const iconClass = 'h-4 w-4';
  switch (status) {
    case 'open':
      return <Clock className={iconClass} />;
    case 'in_progress':
      return <AlertTriangle className={iconClass} />;
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
}: {
  ticket: TicketWithDetails;
  onTicketClick: (ticketId: string) => void;
  adminUsers: any[];
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
    <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => onTicketClick(ticket.id)}>
      <TableCell className="font-medium">
        <div>
          <p className="font-semibold hover:text-blue-600">{ticket.subject}</p>
          <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
        </div>
      </TableCell>

      <TableCell>
        <div>
          <p className="font-medium">
            {ticket.user_profile?.full_name || ticket.user_profile?.email}
          </p>
          <p className="text-sm text-gray-500">{ticket.user_profile?.email}</p>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant="outline" className={TICKET_CATEGORY_LABELS[ticket.category]}>
          {TICKET_CATEGORY_LABELS[ticket.category]}
        </Badge>
      </TableCell>

      <TableCell>
        <Badge variant="outline" className={TICKET_PRIORITY_COLORS[ticket.priority]}>
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </Badge>
      </TableCell>

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
                {TICKET_STATUS_LABELS[ticket.status]}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
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

      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={ticket.assigned_to || 'unassigned'}
          onValueChange={handleAssign}
          disabled={assignTicketMutation.isPending}
        >
          <SelectTrigger className="w-[140px]">
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
              .filter(user => user.role === 'admin' || user.role === 'moderator')
              .map(adminUser => (
                <SelectItem key={adminUser.id} value={adminUser.id}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{adminUser.full_name || adminUser.email}</span>
                    <span className="text-xs text-gray-500 capitalize">{adminUser.role}</span>
                  </div>
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        <div className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
        </div>
      </TableCell>

      <TableCell>
        {ticket.quote && (
          <div className="text-sm">
            <div className="font-medium text-blue-600">
              {ticket.quote.iwish_tracking_id || `Quote ${ticket.quote.id.slice(0, 8)}...`}
            </div>
            <div className="text-gray-500">{ticket.quote.destination_country}</div>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export const AdminTicketDashboard = () => {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const { users: adminUsers = [] } = useUserRoles();

  // Build filters object
  const filters: TicketFilters = {};
  if (statusFilter !== 'all') {
    filters.status = [statusFilter as TicketStatus];
  }
  if (priorityFilter !== 'all') {
    filters.priority = [priorityFilter as TicketPriority];
  }
  if (categoryFilter !== 'all') {
    filters.category = [categoryFilter as TicketCategory];
  }

  const { data: tickets = [], isLoading } = useAdminTickets(filters);
  const { data: stats } = useTicketStats();

  // Filter tickets by search term
  const filteredTickets = tickets.filter((ticket) => {
    if (!searchInput) return true;
    const searchLower = searchInput.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(searchLower) ||
      ticket.description.toLowerCase().includes(searchLower) ||
      ticket.user_profile?.email?.toLowerCase().includes(searchLower) ||
      ticket.user_profile?.full_name?.toLowerCase().includes(searchLower) ||
      ticket.quote?.iwish_tracking_id?.toLowerCase().includes(searchLower)
    );
  });

  // Handle ticket click
  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  // Show ticket detail view if a ticket is selected
  if (selectedTicketId) {
    return <TicketDetailView ticketId={selectedTicketId} onBack={handleBackToList} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-gray-600 text-sm">Manage customer support requests and inquiries</p>
      </div>

      {/* Compact Stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">Total</p>
                <p className="text-xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <TicketIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">Open</p>
                <p className="text-xl font-bold text-blue-800">{stats.open}</p>
              </div>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-700">In Progress</p>
                <p className="text-xl font-bold text-yellow-800">{stats.in_progress}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700">Resolved</p>
                <p className="text-xl font-bold text-green-800">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Closed</p>
                <p className="text-xl font-bold text-gray-800">{stats.closed}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tickets by subject, description, customer, or tracking ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          <Collapsible open={showAdvancedFilters}>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={status} />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                        <SelectItem key={priority} value={priority}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(TICKET_CATEGORY_LABELS).map(([category, label]) => (
                        <SelectItem key={category} value={category}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-gray-600">
                {tickets.length === 0
                  ? 'No tickets have been created yet.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject & Description</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Related Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TicketRow 
                      key={ticket.id} 
                      ticket={ticket} 
                      onTicketClick={handleTicketClick} 
                      adminUsers={adminUsers}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
