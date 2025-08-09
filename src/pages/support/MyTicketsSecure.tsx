// Secure User Support Page - Replaces dangerous MyTickets.tsx
// This page uses secure user-only components with limited data access

import { useState } from 'react';
import { SupportSecurityGuard } from '@/components/security/SupportSecurityGuard';
import { Plus, ArrowLeft, HelpCircle, Clock } from 'lucide-react';
import { UserTicketList } from '@/components/support/UserTicketList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { NewTicketForm } from '@/components/support/NewTicketForm';
import { businessHoursService } from '@/config/businessHours';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { SecureUserTicket } from '@/hooks/useUserTicketsSecure';

// Secure user ticket detail component - limited view
const UserTicketDetailSecure = ({ 
  ticketId, 
  onBack 
}: { 
  ticketId: string; 
  onBack: () => void;
}) => {
  // This would be a secure ticket detail view - for now, redirect back
  // In full implementation, this would show limited ticket details only
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
        
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">
              Secure ticket detail view - limited information only
            </p>
            <p className="text-sm text-gray-500">
              Ticket ID: {ticketId}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function MyTicketsSecurePage() {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTicketCreated = () => {
    setShowNewTicketForm(false);
    // UserTicketList will automatically refresh via React Query
  };

  const handleTicketClick = (ticket: SecureUserTicket) => {
    setSelectedTicketId(ticket.id);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  const handleCreateTicket = () => {
    setShowNewTicketForm(true);
  };

  // Show secure ticket detail view if a ticket is selected
  if (selectedTicketId) {
    return (
      <UserTicketDetailSecure 
        ticketId={selectedTicketId} 
        onBack={handleBackToList} 
      />
    );
  }

  const isCurrentlyBusinessHours = businessHoursService.isCurrentlyBusinessHours();

  return (
    <SupportSecurityGuard requireUser>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
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
                My Support Tickets
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Track your support requests</p>
            </div>
            
            <Button 
              onClick={handleCreateTicket}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Ticket
            </Button>
          </div>
        </div>

        {/* Business Hours Banner */}
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

        {/* Secure User Ticket List */}
        <UserTicketList
          onTicketClick={handleTicketClick}
          onCreateTicket={handleCreateTicket}
        />

        {/* New Ticket Dialog */}
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
    </SupportSecurityGuard>
  );
}