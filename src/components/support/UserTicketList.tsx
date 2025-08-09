import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Calendar,
  ChevronRight,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Import ONLY user-safe ticket hooks
import { useUserTicketsSecure } from '@/hooks/useUserTicketsSecure';
import type { SecureUserTicket } from '@/types/userSupport';

// Use the secure user ticket type
type UserTicket = SecureUserTicket;

const USER_STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress', 
  pending: 'Waiting for Response',
  resolved: 'Resolved',
  closed: 'Closed'
};

const USER_STATUS_COLORS = {
  open: 'text-blue-600 bg-blue-50 border-blue-200',
  in_progress: 'text-orange-600 bg-orange-50 border-orange-200', 
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  resolved: 'text-green-600 bg-green-50 border-green-200',
  closed: 'text-gray-600 bg-gray-50 border-gray-200'
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'open':
      return <MessageSquare className="h-4 w-4" />;
    case 'in_progress': 
      return <Clock className="h-4 w-4" />;
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'resolved':
    case 'closed':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

interface UserTicketCardProps {
  ticket: UserTicket;
  onClick: () => void;
}

const UserTicketCard: React.FC<UserTicketCardProps> = ({ ticket, onClick }) => {
  const isActive = ticket.status !== 'resolved' && ticket.status !== 'closed';
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
        isActive ? 'border-l-blue-500 bg-white' : 'border-l-gray-300 bg-gray-50/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Subject and Status */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 line-clamp-1 pr-2">
                {ticket.subject}
              </h3>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 px-2 py-1 text-xs shrink-0 ${USER_STATUS_COLORS[ticket.status]}`}
              >
                <StatusIcon status={ticket.status} />
                {USER_STATUS_LABELS[ticket.status]}
              </Badge>
            </div>
            
            {/* Description Preview */}
            <p className="text-sm text-gray-600 line-clamp-2">
              {ticket.description}
            </p>
            
            {/* Simple Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
              </div>
              {ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-red-600 font-medium">Priority</span>
                </div>
              ) : null}
            </div>
          </div>
          
          <ChevronRight className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="border-l-4 border-l-gray-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-3" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ onCreateTicket }: { onCreateTicket: () => void }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <MessageSquare className="h-8 w-8 text-blue-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      No support tickets yet
    </h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">
      Need help with your order or have questions? Create a support ticket to get assistance from our team.
    </p>
    <Button onClick={onCreateTicket} size="lg" className="bg-blue-600 hover:bg-blue-700">
      <Plus className="mr-2 h-4 w-4" />
      Create Your First Ticket
    </Button>
  </div>
);

interface UserTicketListProps {
  onTicketClick?: (ticket: UserTicket) => void;
  onCreateTicket?: () => void;
}

const UserTicketList: React.FC<UserTicketListProps> = ({
  onTicketClick,
  onCreateTicket
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use secure user-only hook (we'll implement this)
  const { data: tickets = [], isLoading, error } = useUserTicketsSecure(user?.id);

  const activeTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  const handleTicketClick = (ticket: UserTicket) => {
    if (onTicketClick) {
      onTicketClick(ticket);
    }
  };

  const handleCreateTicket = () => {
    if (onCreateTicket) {
      onCreateTicket();
    }
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Unable to load your tickets</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Support Tickets</h1>
          <p className="text-gray-600">Track your support requests and get help</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/help')}
            className="flex items-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Help Center
          </Button>
          <Button onClick={handleCreateTicket} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSkeleton />}

      {/* Empty State */}
      {!isLoading && tickets.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState onCreateTicket={handleCreateTicket} />
          </CardContent>
        </Card>
      )}

      {/* Active Tickets */}
      {!isLoading && activeTickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Active Tickets ({activeTickets.length})
          </h2>
          <div className="space-y-3">
            {activeTickets.map((ticket) => (
              <UserTicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(ticket)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Closed Tickets */}
      {!isLoading && closedTickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolved Tickets ({closedTickets.length})
          </h2>
          <div className="space-y-3">
            {closedTickets.slice(0, 5).map((ticket) => (
              <UserTicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(ticket)}
              />
            ))}
            {closedTickets.length > 5 && (
              <Card className="border-dashed">
                <CardContent className="text-center py-4">
                  <p className="text-gray-500 text-sm">
                    {closedTickets.length - 5} more resolved tickets
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { UserTicketList };
export default UserTicketList;