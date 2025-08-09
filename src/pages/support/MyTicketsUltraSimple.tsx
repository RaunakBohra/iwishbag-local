// Ultra-Simple Support Page - Minimal Dependencies
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Ticket {
  id: string;
  ticket_data: {
    subject: string;
    description: string;
    status: string;
    priority?: string;
    category?: string;
  };
  created_at: string;
  updated_at: string;
}

interface TicketInteraction {
  id: string;
  interaction_type: string;
  content: {
    message: string;
    [key: string]: any;
  };
  created_at: string;
  user_id: string;
  is_internal: boolean;
}

export default function MyTicketsUltraSimplePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [interactions, setInteractions] = useState<TicketInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Simple useEffect to fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('support_system')
          .select('id, ticket_data, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('system_type', 'ticket')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tickets:', error);
          setError('Failed to load tickets');
        } else {
          setTickets(data || []);
        }
      } catch (err) {
        console.error('Exception fetching tickets:', err);
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [user?.id]);

  // Auto-select ticket based on URL parameters (e.g., from quote page)
  useEffect(() => {
    const quoteId = searchParams.get('quote');
    if (quoteId && tickets.length > 0 && !selectedTicket) {
      // Find the most recent ticket for this quote
      const quoteTicket = tickets.find(ticket => 
        ticket.ticket_data?.quote_number && 
        (ticket.ticket_data.quote_number === quoteId || 
         (typeof ticket === 'object' && 'quote_id' in ticket && ticket.quote_id === quoteId))
      );
      
      if (quoteTicket) {
        handleTicketClick(quoteTicket);
      }
    }
  }, [tickets, searchParams, selectedTicket]);

  // Function to load ticket interactions
  const loadTicketInteractions = async (ticketId: string) => {
    setLoadingInteractions(true);
    try {
      const { data, error } = await supabase
        .from('support_interactions')
        .select('id, interaction_type, content, created_at, user_id, is_internal')
        .eq('support_id', ticketId)
        .eq('is_internal', false) // Only show non-internal interactions to users
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading interactions:', error);
      } else {
        setInteractions(data || []);
      }
    } catch (err) {
      console.error('Exception loading interactions:', err);
    } finally {
      setLoadingInteractions(false);
    }
  };

  // Function to handle ticket click
  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    loadTicketInteractions(ticket.id);
  };

  // Function to send reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user?.id) return;
    
    setSendingReply(true);
    try {
      const { error } = await supabase
        .from('support_interactions')
        .insert({
          support_id: selectedTicket.id,
          user_id: user.id,
          interaction_type: 'reply',
          content: { message: replyText.trim() },
          is_internal: false
        });

      if (error) {
        console.error('Error sending reply:', error);
        alert('Failed to send reply. Please try again.');
      } else {
        setReplyText('');
        // Reload interactions to show the new reply
        loadTicketInteractions(selectedTicket.id);
      }
    } catch (err) {
      console.error('Exception sending reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  // Function to go back to ticket list
  const handleBackToList = () => {
    setSelectedTicket(null);
    setInteractions([]);
    setReplyText('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your tickets...</p>
        </div>
      </div>
    );
  }

  // Show ticket detail view if a ticket is selected
  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={handleBackToList} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Tickets
          </Button>
          
          {/* Ticket Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTicket.ticket_data.subject}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedTicket.ticket_data.status === 'open' ? 'bg-blue-100 text-blue-700' :
                      selectedTicket.ticket_data.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                      selectedTicket.ticket_data.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedTicket.ticket_data.status}
                    </span>
                    {selectedTicket.ticket_data.priority && (
                      <span>Priority: {selectedTicket.ticket_data.priority}</span>
                    )}
                    {selectedTicket.ticket_data.category && (
                      <span>Category: {selectedTicket.ticket_data.category}</span>
                    )}
                    <span>Created: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Original Message</h3>
                <p className="text-gray-700">{selectedTicket.ticket_data.description}</p>
              </div>

              {/* Quote Context (if available) */}
              {selectedTicket.ticket_data.quote_number && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-blue-900 mb-2">Related Quote</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Quote #:</span>
                      <span className="ml-2 font-medium">{selectedTicket.ticket_data.quote_number}</span>
                    </div>
                    {selectedTicket.ticket_data.quote_total && (
                      <div>
                        <span className="text-blue-600">Total:</span>
                        <span className="ml-2 font-medium">${selectedTicket.ticket_data.quote_total}</span>
                      </div>
                    )}
                    {selectedTicket.ticket_data.quote_status && (
                      <div>
                        <span className="text-blue-600">Status:</span>
                        <span className="ml-2 font-medium capitalize">{selectedTicket.ticket_data.quote_status}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
              
              {loadingInteractions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading conversation...</p>
                </div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No replies yet. Be the first to add a comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="border-l-4 border-l-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {interaction.user_id === user?.id ? 'You' : 'Support Team'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(interaction.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{interaction.content.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Reply</h3>
              <div className="space-y-4">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full p-3 border border-gray-300 rounded-md resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={sendingReply}
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setReplyText('')}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sendingReply ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Simple Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/help')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Support Tickets</h1>
              <p className="text-gray-600 mt-1">View and manage your support requests</p>
            </div>
            
            <Button 
              onClick={() => alert('Ticket creation will be available soon')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </div>
        </div>


        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tickets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Tickets ({tickets.length})</h2>
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets yet</h3>
                <p className="text-gray-600 mb-6">
                  When you create support tickets, they'll appear here.
                </p>
                <Button 
                  onClick={() => alert('Ticket creation coming soon')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTicketClick(ticket)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {ticket.ticket_data.subject}
                      </h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {ticket.ticket_data.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Status: {ticket.ticket_data.status}</span>
                        {ticket.ticket_data.priority && <span>Priority: {ticket.ticket_data.priority}</span>}
                        {ticket.ticket_data.category && <span>Category: {ticket.ticket_data.category}</span>}
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.ticket_data.status === 'open' ? 'bg-blue-100 text-blue-700' :
                        ticket.ticket_data.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {ticket.ticket_data.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}