import { useState, useMemo } from 'react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { useUserRoles } from '@/hooks/useUserRoles';
import { businessHoursService } from '@/config/businessHours';
import {
  TicketIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  Timer,
  XCircle,
} from 'lucide-react';
import { TicketSearchAndFilterPanel, type TicketSearchFilters } from '@/components/admin/TicketSearchAndFilterPanel';
import { SLABadge, SLASummaryCard, SLAWarningAlert } from '@/components/admin/SLAIndicator';
import { useSLASummary, useSLAMonitoring } from '@/hooks/useSLA';
import { CriticalBreachAlert, BreachStatsCards } from '@/components/admin/SLABreachAlerts';
import { useBreachMonitoring } from '@/hooks/useSLABreaches';
import { Button } from '@/components/ui/button';
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
import { useSLAStatus, useSLAUtils } from '@/hooks/useSLA';
import { useManualAssignTicket } from '@/hooks/useAutoAssignment';
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
  const { data: slaStatus } = useSLAStatus(ticket);
  const { formatTimeRemaining } = useSLAUtils();
  const manualAssignMutation = useManualAssignTicket();

  const handleStatusChange = (status: TicketStatus) => {
    updateStatusMutation.mutate({ ticketId: ticket.id, status });
  };

  const handleAssign = (assignedTo: string) => {
    const assigned_to = assignedTo === 'unassigned' ? null : assignedTo;
    assignTicketMutation.mutate({ ticketId: ticket.id, adminUserId: assigned_to });
  };

  const handleAutoAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    manualAssignMutation.mutate(ticket.id);
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

      <TableCell>
        {slaStatus ? (
          <div className="space-y-1">
            {/* Response SLA Badge */}
            {slaStatus.response_sla.deadline && (
              <SLABadge
                status={slaStatus.response_sla.status}
                timeRemaining={formatTimeRemaining(slaStatus.response_sla.time_remaining)}
                type="response"
              />
            )}
            {/* Resolution SLA Badge */}
            {slaStatus.resolution_sla.deadline && (
              <SLABadge
                status={slaStatus.resolution_sla.status}
                timeRemaining={formatTimeRemaining(slaStatus.resolution_sla.time_remaining)}
                type="resolution"
              />
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-400">-</div>
        )}
      </TableCell>

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
          {!ticket.assigned_to && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAutoAssign}
              disabled={manualAssignMutation.isPending}
              title="Auto-assign using rules"
            >
              ⚡
            </Button>
          )}
        </div>
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
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Enhanced filters state
  const [filters, setFilters] = useState<TicketSearchFilters>({
    searchText: '',
    statuses: [],
    priorities: [],
    categories: [],
    assignedTo: [],
    assignmentStatus: 'all',
    slaStatus: 'all',
    hasOrder: null,
    countries: [],
  });
  
  const { users: adminUsers = [], user } = useUserRoles();
  
  // Business hours status
  const isBusinessHours = businessHoursService.isCurrentlyBusinessHours();

  // Convert enhanced filters to legacy format for the API
  const legacyFilters: TicketFilters = useMemo(() => {
    const converted: TicketFilters = {};
    
    if (filters.statuses && filters.statuses.length > 0) {
      converted.status = filters.statuses;
    }
    if (filters.priorities && filters.priorities.length > 0) {
      converted.priority = filters.priorities;
    }
    if (filters.categories && filters.categories.length > 0) {
      converted.category = filters.categories;
    }
    
    // Handle assignment status
    if (filters.assignmentStatus === 'mine' && user?.id) {
      converted.assigned_to = user.id;
    } else if (filters.assignmentStatus === 'unassigned') {
      converted.assigned_to = 'unassigned';
    } else if (filters.assignmentStatus === 'assigned') {
      converted.assigned_to = 'assigned';
    }
    
    return converted;
  }, [filters, user?.id]);

  const { data: tickets = [], isLoading } = useAdminTickets(legacyFilters);
  const { data: stats } = useTicketStats();
  const { data: slaStats } = useSLASummary();
  const { summary: slaMonitoring, breachedTickets } = useSLAMonitoring();
  
  // Initialize breach monitoring (background task)
  useBreachMonitoring(true);

  // Filter tickets by search term and other client-side filters
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Apply search text filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter((ticket) =>
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.user_profile?.email?.toLowerCase().includes(searchLower) ||
        ticket.user_profile?.full_name?.toLowerCase().includes(searchLower) ||
        ticket.quote?.iwish_tracking_id?.toLowerCase().includes(searchLower)
      );
    }

    // Apply order filter
    if (filters.hasOrder !== null) {
      filtered = filtered.filter((ticket) => {
        const hasQuote = !!ticket.quote;
        return filters.hasOrder ? hasQuote : !hasQuote;
      });
    }

    // Apply country filter
    if (filters.countries && filters.countries.length > 0) {
      filtered = filtered.filter((ticket) =>
        ticket.quote?.destination_country && 
        filters.countries.includes(ticket.quote.destination_country)
      );
    }

    return filtered;
  }, [tickets, filters]);

  // Handle ticket click
  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  // Prepare filter options for the filter panel
  const availableStatuses = Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
    count: stats ? stats[value as keyof typeof stats] || 0 : 0
  }));

  const availablePriorities = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
    count: tickets.filter(t => t.priority === value).length
  }));

  const availableCategories = Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
    count: tickets.filter(t => t.category === value).length
  }));

  const availableAssignees = adminUsers
    .filter(user => user.role === 'admin' || user.role === 'moderator')
    .map(user => ({
      id: user.id,
      name: user.full_name || user.email,
      email: user.email,
      role: user.role,
      count: tickets.filter(t => t.assigned_to === user.id).length
    }));

  const availableCountries = [...new Set(tickets
    .filter(t => t.quote?.destination_country)
    .map(t => t.quote!.destination_country))]
    .map(country => ({
      value: country,
      label: country,
      count: tickets.filter(t => t.quote?.destination_country === country).length
    }));

  // Filter handlers
  const handleFiltersChange = (newFilters: TicketSearchFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    // Search is handled automatically via the filteredTickets useMemo
    // This could trigger additional API calls in the future if needed
  };

  const handleReset = () => {
    setFilters({
      searchText: '',
      statuses: [],
      priorities: [],
      categories: [],
      assignedTo: [],
      assignmentStatus: 'all',
      slaStatus: 'all',
      hasOrder: null,
      countries: [],
    });
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

      {/* Critical Breach Alert */}
      <CriticalBreachAlert />
      
      {/* SLA Warning Alert */}
      {slaStats && (slaStats.response_sla_breached > 0 || slaStats.resolution_sla_breached > 0) && (
        <SLAWarningAlert
          breachedCount={slaStats.response_sla_breached + slaStats.resolution_sla_breached}
          criticalCount={0} // We'll calculate this in a future enhancement
        />
      )}

      {/* Compact Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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
          
          {/* Business Hours Status Card */}
          <div className={`bg-gradient-to-r ${
            isBusinessHours 
            ? 'from-green-50 to-green-100 border-green-200' 
            : 'from-orange-50 to-orange-100 border-orange-200'
          } rounded-lg p-3 border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${
                  isBusinessHours ? 'text-green-700' : 'text-orange-700'
                }`}>
                  Support
                </p>
                <p className={`text-lg font-bold ${
                  isBusinessHours ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {isBusinessHours ? 'Online' : 'Offline'}
                </p>
              </div>
              <Clock className={`h-5 w-5 ${
                isBusinessHours ? 'text-green-600' : 'text-orange-600'
              }`} />
            </div>
          </div>

          {/* SLA Summary Cards */}
          {slaStats && (
            <>
              <SLASummaryCard
                title="Response SLA Met"
                value={slaStats.response_sla_met}
                total={slaStats.total_tickets}
                icon={CheckCircle}
                status={slaStats.response_sla_breached > 0 ? 'warning' : 'good'}
              />
              <SLASummaryCard
                title="Resolution SLA Met"
                value={slaStats.resolution_sla_met}
                total={slaStats.total_tickets}
                icon={Timer}
                status={slaStats.resolution_sla_breached > 0 ? 'warning' : 'good'}
              />
            </>
          )}
        </div>
      )}

      {/* Breach Statistics */}
      <BreachStatsCards />

      {/* Enhanced Search and Filter Panel */}
      <TicketSearchAndFilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        onReset={handleReset}
        availableStatuses={availableStatuses}
        availablePriorities={availablePriorities}
        availableCategories={availableCategories}
        availableAssignees={availableAssignees}
        availableCountries={availableCountries}
        isLoading={isLoading}
        resultsCount={filteredTickets.length}
      />

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
                    <TableHead>SLA Status</TableHead>
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
