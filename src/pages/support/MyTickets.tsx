import { useState } from 'react';
import { Plus, Ticket, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { TicketDetailView } from '@/components/support/TicketDetailView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUserTickets } from '@/hooks/useTickets';
import { useAuth } from '@/contexts/AuthContext';
import { NewTicketForm } from '@/components/support/NewTicketForm';
import { businessHoursService } from '@/config/businessHours';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
  type TicketWithDetails,
} from '@/types/ticket';
import { formatDistanceToNow } from 'date-fns';

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'open':
      return <Clock className="h-4 w-4" />;
    case 'in_progress':
      return <AlertTriangle className="h-4 w-4" />;
    case 'resolved':
    case 'closed':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const TicketCard = ({ 
  ticket, 
  onTicketClick 
}: { 
  ticket: TicketWithDetails;
  onTicketClick: (ticketId: string) => void;
}) => {
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onTicketClick(ticket.id)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{ticket.subject}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            <Badge
              variant="secondary"
              className={`${TICKET_STATUS_COLORS[ticket.status]} flex items-center gap-1`}
            >
              <StatusIcon status={ticket.status} />
              {TICKET_STATUS_LABELS[ticket.status]}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span className="font-medium">{TICKET_CATEGORY_LABELS[ticket.category]}</span>

            {ticket.quote && (
              <span className="text-blue-600">
                {ticket.quote.iwish_tracking_id
                  ? ticket.quote.iwish_tracking_id
                  : `Order ${ticket.quote.id.slice(0, 8)}...`}
              </span>
            )}
          </div>

          <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const TicketSkeletons = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyState = () => (
  <Card className="text-center py-12">
    <CardContent>
      <Ticket className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">No help requests yet</h3>
      <p className="text-gray-600 mb-6">
        Need help with an order or have questions? Create your first help request to get
        personalized assistance.
      </p>
    </CardContent>
  </Card>
);

export default function MyTicketsPage() {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user } = useAuth();

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

  // Group tickets by status for better organization
  const groupedTickets = tickets.reduce(
    (acc, ticket) => {
      if (!acc[ticket.status]) {
        acc[ticket.status] = [];
      }
      acc[ticket.status].push(ticket);
      return acc;
    },
    {} as Record<string, TicketWithDetails[]>,
  );

  const statusOrder = ['open', 'in_progress', 'resolved', 'closed'];

  // If a ticket is selected, show the detail view
  if (selectedTicketId) {
    const selectedTicket = tickets.find(t => t.id === selectedTicketId);
    if (selectedTicket) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <TicketDetailView 
            ticketId={selectedTicket.id} 
            onBack={handleBackToList}
          />
        </div>
      );
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Help Requests</h1>
          <p className="text-gray-600 mt-2">View and manage your help requests and conversations</p>
        </div>

        <Button onClick={() => setShowNewTicketForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Get Help
        </Button>
      </div>

      {/* Business Hours Status */}
      <div className={`mb-6 p-4 rounded-lg border ${
        businessHoursService.isCurrentlyBusinessHours()
        ? 'bg-green-50 border-green-200' 
        : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${
            businessHoursService.isCurrentlyBusinessHours() 
            ? 'text-green-600' 
            : 'text-orange-600'
          }`} />
          <span className={`font-medium text-sm ${
            businessHoursService.isCurrentlyBusinessHours() 
            ? 'text-green-900' 
            : 'text-orange-900'
          }`}>
            {businessHoursService.isCurrentlyBusinessHours() 
            ? '🟢 Support team is online' 
            : '🔴 Support team is offline'
            }
          </span>
        </div>
        <p className={`text-xs ${
          businessHoursService.isCurrentlyBusinessHours() 
          ? 'text-green-700' 
          : 'text-orange-700'
        }`}>
          {businessHoursService.getAutoResponseMessage()}
        </p>
      </div>

      {/* Stats Cards */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statusOrder.map((status) => {
            const count = groupedTickets[status]?.length || 0;
            return (
              <Card key={status}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS]}
                      </p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <StatusIcon status={status} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-6">
        {isLoading ? (
          <TicketSkeletons />
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-red-600">Error loading tickets. Please try again.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <EmptyState />
        ) : (
          statusOrder.map((status) => {
            const statusTickets = groupedTickets[status];
            if (!statusTickets || statusTickets.length === 0) return null;

            return (
              <div key={status} className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <StatusIcon status={status} />
                  {TICKET_STATUS_LABELS[status as keyof typeof TICKET_STATUS_LABELS]}
                  <span className="text-sm font-normal text-gray-600">
                    ({statusTickets.length})
                  </span>
                </h2>

                <div className="space-y-4">
                  {statusTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} onTicketClick={handleTicketClick} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketForm} onOpenChange={setShowNewTicketForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Get Help</DialogTitle>
          </DialogHeader>
          <NewTicketForm
            onSuccess={handleTicketCreated}
            onCancel={() => setShowNewTicketForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
