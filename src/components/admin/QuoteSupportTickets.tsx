import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Clock, CheckCircle, AlertTriangle, User, ExternalLink, Plus } from 'lucide-react';
import { useQuoteTickets } from '@/hooks/useQuoteTickets';
import { formatDistanceToNow } from 'date-fns';
import {
  TICKET_STATUS_COLORS,
  ADMIN_TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
} from '@/types/ticket';
import AdminQuoteTicketModal from './AdminQuoteTicketModal';

interface QuoteSupportTicketsProps {
  quoteId: string;
  quote?: any; // Quote data for the modal
  onTicketClick?: (ticketId: string) => void;
  onTicketCreated?: () => void; // Callback when new ticket is created
}

const StatusIcon = ({ status }: { status: string }) => {
  const iconClass = 'h-3 w-3';
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

export const QuoteSupportTickets: React.FC<QuoteSupportTicketsProps> = ({
  quoteId,
  quote,
  onTicketClick,
  onTicketCreated
}) => {
  // State for admin ticket creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch tickets for this specific quote
  const { data: queryResult, isLoading, error, refetch } = useQuoteTickets(quoteId);
  const { data: quoteTickets = [], ticketCount = 0, isEmpty = true } = queryResult || {};

  const handleTicketCreated = () => {
    // Refresh the tickets list
    refetch();
    
    // Call parent callback if provided
    if (onTicketCreated) {
      onTicketCreated();
    }
  };

  const handleTicketClick = (ticketId: string) => {
    if (onTicketClick) {
      onTicketClick(ticketId);
    } else {
      // Open in support tickets page
      window.open(`/admin/support-tickets/${ticketId}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Support History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Support History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load support tickets</p>
            <p className="text-xs text-gray-400 mt-1">
              Please try refreshing the page
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Support History
            </div>
            {quote && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                disabled={isCreating}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Ticket
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No support tickets for this quote</p>
            <p className="text-xs text-gray-400 mt-1">
              Customer messages will appear here
            </p>
            {quote && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                disabled={isCreating}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Ticket
              </Button>
            )}
          </div>
        </CardContent>
        
        {/* Admin Ticket Creation Modal */}
        {quote && (
          <AdminQuoteTicketModal
            quote={quote}
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleTicketCreated}
            onSubmitting={setIsCreating}
          />
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Support History
            <Badge variant="outline" className="ml-2">
              {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              disabled={isCreating || !quote}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Ticket
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/admin/support-tickets`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quoteTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleTicketClick(ticket.id)}
            >
              <div className="flex-shrink-0 mt-1">
                <div className={`p-1.5 rounded-full ${TICKET_STATUS_COLORS[ticket.status]}`}>
                  <StatusIcon status={ticket.status} />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                      {ticket.subject}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {ticket.description}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${TICKET_PRIORITY_COLORS[ticket.priority]}`}
                    >
                      {TICKET_PRIORITY_LABELS[ticket.priority]}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {ticket.user_profile?.full_name || ticket.user_profile?.email || 'Customer'}
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-1 ${TICKET_STATUS_COLORS[ticket.status]}`}>
                    <StatusIcon status={ticket.status} />
                    <span className="text-xs font-medium">
                      {ADMIN_TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Admin Ticket Creation Modal */}
      {quote && (
        <AdminQuoteTicketModal
          quote={quote}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTicketCreated}
          onSubmitting={setIsCreating}
        />
      )}
    </Card>
  );
};