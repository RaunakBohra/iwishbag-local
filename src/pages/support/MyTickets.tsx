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
  AlertTriangle,
  Zap
} from 'lucide-react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Zap className="h-3 w-3 text-red-600" />;
    case 'high':
      return <AlertTriangle className="h-3 w-3 text-orange-600" />;
    default:
      return null;
  }
};

const TicketCard = ({
  ticket,
  onTicketClick,
}: {
  ticket: TicketWithDetails;
  onTicketClick: (ticketId: string) => void;
}) => {
  const isUnread = ticket.status === 'open' || ticket.status === 'in_progress';
  const isUrgent = ticket.priority === 'urgent' || ticket.priority === 'high';
  
  return (
    <Card 
      className={cn(
        "group relative transition-all duration-200 cursor-pointer hover:shadow-lg",
        "border-l-4",
        isUnread ? "bg-white border-l-blue-500" : "bg-gray-50/50 border-l-gray-300",
        isUrgent && "border-l-red-500"
      )}
      onClick={() => onTicketClick(ticket.id)}
    >
      <CardContent className="p-6">
        {/* Header with Priority Indicator */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {getPriorityIcon(ticket.priority)}
              <h3 className={cn(
                "font-semibold text-lg truncate",
                isUnread ? "text-gray-900" : "text-gray-600"
              )}>
                {ticket.subject}
              </h3>
              <Badge 
                variant="outline" 
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border",
                  getStatusColor(ticket.status)
                )}
              >
                <StatusIcon status={ticket.status} className="h-3 w-3" />
                {CUSTOMER_TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
            </div>
            
            {/* Ticket Meta with Visual Hierarchy */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono">{ticket.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </div>

        {/* Description Preview with Better Typography */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-4 leading-relaxed">
          {ticket.description}
        </p>

        {/* Related Order with Enhanced Design */}
        {ticket.quote && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900">
                  {ticket.quote.iwish_tracking_id || `Order #${ticket.quote.id.slice(0, 8)}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {ticket.quote.status}
                  </Badge>
                  {ticket.quote.destination_country && (
                    <span className="text-xs text-blue-600">
                      → {ticket.quote.destination_country}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {ticket.quote.final_total_origincurrency && (
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-900">
                  ${ticket.quote.final_total_origincurrency.toFixed(2)}
                </p>
                <p className="text-xs text-blue-600">Total</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


const TicketSkeletons = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="border-l-4 border-l-gray-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <div className="flex gap-4 mb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ filter, onCreateTicket }: { filter: string; onCreateTicket: () => void }) => (
  <div className="text-center py-20">
    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Ticket className="h-12 w-12 text-blue-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">
      {filter === 'all' ? 'No support tickets yet' : `No ${filter} tickets`}
    </h3>
    <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
      {filter === 'all' 
        ? 'Need help with an order or have questions? Create your first support ticket to get personalized assistance from our team.'
        : `You don't have any ${filter} tickets at the moment.`}
    </p>
    {filter === 'all' && (
      <Button onClick={onCreateTicket} size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
        <Plus className="mr-2 h-5 w-5" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/help')}
            className="text-gray-600 hover:text-gray-900 mb-6 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Support Tickets
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Track and manage your support requests</p>
            </div>
            
            <Button 
              onClick={() => setShowNewTicketForm(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Ticket
            </Button>
          </div>
        </div>

        {/* Business Hours Banner with Better Design */}
        <Card className={cn(
          "mb-8 border-l-4",
          isCurrentlyBusinessHours
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-l-green-500"
            : "bg-gradient-to-r from-amber-50 to-orange-50 border-l-amber-500"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  isCurrentlyBusinessHours ? "bg-green-100" : "bg-amber-100"
                )}>
                  <Clock className={cn(
                    "h-6 w-6",
                    isCurrentlyBusinessHours ? "text-green-600" : "text-amber-600"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "font-semibold text-lg",
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
                    {isCurrentlyBusinessHours 
                      ? "We typically respond to new tickets within 2-4 hours"
                      : "We'll respond to new tickets by the next business day"}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/help')}
                className="text-gray-600 hover:text-gray-900"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                View FAQ
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Enhanced Search and Filters */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tickets by subject, ID, or tracking number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList className="grid w-full grid-cols-3 h-12">
                  <TabsTrigger value="all" className="text-sm font-medium">All</TabsTrigger>
                  <TabsTrigger value="active" className="text-sm font-medium">Active</TabsTrigger>
                  <TabsTrigger value="resolved" className="text-sm font-medium">Resolved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Tickets List */}
        <div className="space-y-6">
          {isLoading ? (
            <TicketSkeletons />
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4 font-medium">Error loading tickets. Please try again.</p>
                <Button variant="outline" onClick={() => refetch()} className="border-red-300 text-red-600 hover:bg-red-100">
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

        {/* Enhanced New Ticket Dialog */}
        <Dialog open={showNewTicketForm} onOpenChange={setShowNewTicketForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="create-ticket-description">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold">Create Support Ticket</DialogTitle>
              <p id="create-ticket-description" className="text-gray-600 mt-2">
                Describe your issue and we'll get back to you within 24-48 hours
              </p>
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