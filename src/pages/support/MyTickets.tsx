import { useState } from 'react';
import { 
  Plus, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Package, 
  ArrowLeft, 
  HelpCircle,
  MessageSquare,
  Search,
  Filter,
  ChevronRight,
  User,
  Calendar,
  Hash,
  Inbox,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserTickets } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { NewTicketForm } from '@/components/support/NewTicketForm';
import { businessHoursService } from '@/config/businessHours';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  CUSTOMER_TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_CATEGORY_LABELS,
  type TicketWithDetails,
} from '@/types/ticket';
import { formatDistanceToNow, format } from 'date-fns';

const StatusIcon = ({ status, className }: { status: string; className?: string }) => {
  const icons = {
    open: <AlertCircle className={className} />,
    in_progress: <Clock className={className} />,
    pending: <Clock className={className} />,
    resolved: <CheckCircle className={className} />,
    closed: <Archive className={className} />,
  };
  return icons[status] || <Clock className={className} />;
};

const getStatusColor = (status: string) => {
  const colors = {
    open: 'text-orange-600 bg-orange-50 border-orange-200',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    resolved: 'text-green-600 bg-green-50 border-green-200',
    closed: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
};

const TicketCard = ({
  ticket,
  onTicketClick,
}: {
  ticket: TicketWithDetails;
  onTicketClick: (ticketId: string) => void;
}) => {
  const isUnread = ticket.status === 'open' || ticket.status === 'in_progress';
  
  return (
    <div
      className={cn(
        "group relative bg-white rounded-lg border transition-all duration-200 cursor-pointer",
        "hover:shadow-md hover:border-gray-300",
        isUnread ? "border-gray-200" : "border-gray-100"
      )}
      onClick={() => onTicketClick(ticket.id)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 text-lg truncate">
                {ticket.subject}
              </h3>
              <Badge 
                variant="outline" 
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border",
                  getStatusColor(ticket.status)
                )}
              >
                <StatusIcon status={ticket.status} className="h-3 w-3" />
                {CUSTOMER_TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
            </div>
            
            {/* Ticket Meta */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {ticket.id.slice(0, 8)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <Inbox className="h-3.5 w-3.5" />
                {TICKET_CATEGORY_LABELS[ticket.category]}
              </span>
            </div>
          </div>
          
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        </div>

        {/* Description Preview */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {ticket.description}
        </p>

        {/* Related Order */}
        {ticket.quote && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
            <Package className="h-4 w-4 text-gray-500" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-600">Related order: </span>
              <span className="text-sm font-medium text-gray-900">
                {ticket.quote.iwish_tracking_id || `#${ticket.quote.id.slice(0, 8)}`}
              </span>
              {ticket.quote.status && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {ticket.quote.status}
                </Badge>
              )}
            </div>
            {ticket.quote.final_total_usd && (
              <span className="text-sm font-medium text-gray-900">
                ${ticket.quote.final_total_usd.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* Latest Message Preview - Coming soon */}
        {/* {ticket.latest_message && (
          <div className="mt-3 flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 line-clamp-1">
                <span className="font-medium">
                  {ticket.latest_message.sender_type === 'customer' ? 'You' : 'Support'}:
                </span>{' '}
                {ticket.latest_message.content}
              </p>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

const TicketSkeletons = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ filter, onCreateTicket }: { filter: string; onCreateTicket: () => void }) => (
  <div className="text-center py-16">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Ticket className="h-10 w-10 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {filter === 'all' ? 'No support tickets yet' : `No ${filter} tickets`}
    </h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">
      {filter === 'all' 
        ? 'Need help with an order or have questions? Create your first support ticket to get personalized assistance from our team.'
        : `You don't have any ${filter} tickets at the moment.`}
    </p>
    {filter === 'all' && (
      <Button onClick={onCreateTicket}>
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Ticket
      </Button>
    )}
  </div>
);

export default function MyTicketsPage() {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: tickets = [], isLoading, error, refetch } = useUserTickets(user?.id);

  const handleTicketCreated = () => {
    setShowNewTicketForm(false);
    refetch();
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  // Filter tickets based on tab and search
  const filteredTickets = tickets.filter(ticket => {
    // Tab filter
    if (activeTab === 'active' && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      return false;
    }
    if (activeTab === 'resolved' && ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query) ||
        (ticket.quote?.iwish_tracking_id?.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Group tickets by status
  const groupedTickets = filteredTickets.reduce(
    (acc, ticket) => {
      const group = (ticket.status === 'resolved' || ticket.status === 'closed') ? 'resolved' : 'active';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(ticket);
      return acc;
    },
    {} as Record<string, TicketWithDetails[]>,
  );

  // Stats
  const stats = {
    total: tickets.length,
    active: tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  // If a ticket is selected, show the detail view
  if (selectedTicketId) {
    const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
    if (selectedTicket) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <TicketDetailView ticketId={selectedTicket.id} onBack={handleBackToList} />
          </div>
        </div>
      );
    }
  }

  const isCurrentlyBusinessHours = businessHoursService.isCurrentlyBusinessHours();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/help')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-gray-600 mt-1">Track and manage your support requests</p>
            </div>
            
            <Button 
              onClick={() => setShowNewTicketForm(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Ticket
            </Button>
          </div>
        </div>

        {/* Business Hours Banner */}
        <div className={cn(
          "p-4 rounded-lg border mb-6 flex items-center justify-between",
          isCurrentlyBusinessHours
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isCurrentlyBusinessHours ? "bg-green-100" : "bg-amber-100"
            )}>
              <Clock className={cn(
                "h-5 w-5",
                isCurrentlyBusinessHours ? "text-green-600" : "text-amber-600"
              )} />
            </div>
            <div>
              <p className={cn(
                "font-medium",
                isCurrentlyBusinessHours ? "text-green-900" : "text-amber-900"
              )}>
                {isCurrentlyBusinessHours 
                  ? "Support team is online"
                  : "Support team is offline"}
              </p>
              <p className={cn(
                "text-sm",
                isCurrentlyBusinessHours ? "text-green-700" : "text-amber-700"
              )}>
                {businessHoursService.getAutoResponseMessage()}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/help')}
            className="text-gray-600"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            View FAQ
          </Button>
        </div>

        {/* Quick Stats */}
        {tickets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tickets</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Resolved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search tickets by subject, ID, or tracking number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {isLoading ? (
            <TicketSkeletons />
          ) : error ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">Error loading tickets. Please try again.</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState filter={activeTab} onCreateTicket={() => setShowNewTicketForm(true)} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onTicketClick={handleTicketClick} />
              ))}
            </div>
          )}
        </div>

        {/* New Ticket Dialog */}
        <Dialog open={showNewTicketForm} onOpenChange={setShowNewTicketForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <NewTicketForm
              onSuccess={handleTicketCreated}
              onCancel={() => setShowNewTicketForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}