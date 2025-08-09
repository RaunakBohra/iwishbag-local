// Simplest working version to show user tickets
import React, { useState } from 'react';
import { Plus, ArrowLeft, HelpCircle, Clock, MessageSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

// Simple ticket interface
interface SimpleUserTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS = {
  open: 'text-blue-600 bg-blue-50 border-blue-200',
  in_progress: 'text-orange-600 bg-orange-50 border-orange-200',
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  resolved: 'text-green-600 bg-green-50 border-green-200',
  closed: 'text-gray-600 bg-gray-50 border-gray-200'
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  pending: 'Waiting for Response',
  resolved: 'Resolved',
  closed: 'Closed'
};

export default function MyTicketsSecureSimplestPage() {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Simple direct query to fetch user tickets
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          description,
          status,
          priority,
          category,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }

      return data as SimpleUserTicket[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleTicketClick = (ticket: SimpleUserTicket) => {
    setSelectedTicketId(ticket.id);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  const handleCreateTicket = () => {
    setShowNewTicketForm(true);
  };

  const handleTicketCreated = () => {
    setShowNewTicketForm(false);
  };

  // Show ticket detail view if selected
  if (selectedTicketId) {
    const ticket = tickets.find(t => t.id === selectedTicketId);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={handleBackToList} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>{ticket?.subject || 'Loading...'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket && (
                <>
                  <div className="flex items-center gap-4">
                    <Badge className={STATUS_COLORS[ticket.status]}>
                      {STATUS_LABELS[ticket.status]}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Priority: {ticket.priority}
                    </span>
                  </div>
                  <p className="text-gray-700">{ticket.description}</p>
                  <div className="text-sm text-gray-500">
                    Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

        {/* Security Status Banner */}
        <Card className="mb-8 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-lg text-green-900">
                  🔒 Secure Support System Active
                </p>
                <p className="text-sm text-green-700">
                  Your data is protected - only you can see your tickets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Support Tickets ({tickets.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading tickets</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No support tickets yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Need help with your order or have questions? Create a support ticket to get assistance from our team.
                </p>
                <Button onClick={handleCreateTicket} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 line-clamp-1 pr-2">
                            {ticket.subject}
                          </h3>
                          <Badge className={`${STATUS_COLORS[ticket.status]} shrink-0`}>
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                          </div>
                          <span>Priority: {ticket.priority}</span>
                          <span>Category: {ticket.category}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Simple Create Ticket Dialog */}
        <Dialog open={showNewTicketForm} onOpenChange={setShowNewTicketForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="p-4 text-center">
              <p className="text-gray-600 mb-4">
                Ticket creation form will be available here
              </p>
              <Button onClick={handleTicketCreated}>
                Close for now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}