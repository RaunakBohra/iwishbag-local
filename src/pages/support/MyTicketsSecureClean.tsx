// Clean Secure User Support Page
import React, { useState } from 'react';
import { Plus, ArrowLeft, HelpCircle, Clock } from 'lucide-react';
import { UserTicketList } from '@/components/support/UserTicketList';
import { NewTicketForm } from '@/components/support/NewTicketForm';
import type { SecureUserTicket } from '@/types/userSupport';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function MyTicketsSecureCleanPage() {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTicketCreated = () => {
    setShowNewTicketForm(false);
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={handleBackToList} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 mb-4">
                Secure ticket detail view - limited information only
              </p>
              <p className="text-sm text-gray-500">
                Ticket ID: {selectedTicketId}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isCurrentlyBusinessHours = true;

  return (
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
                    🔒 Secure Support System Active
                  </p>
                  <p className={cn(
                    "text-sm",
                    isCurrentlyBusinessHours ? "text-green-700" : "text-amber-700"
                  )}>
                    Enhanced security with user data isolation
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

        {/* User Tickets List - Secure */}
        <UserTicketList
          onTicketClick={handleTicketClick}
          onCreateTicket={handleCreateTicket}
        />

        {/* New Ticket Dialog */}
        <Dialog open={showNewTicketForm} onOpenChange={setShowNewTicketForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <p className="text-gray-600 mt-2">
                Secure ticket creation interface
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