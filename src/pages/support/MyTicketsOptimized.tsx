import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Search, Filter, ChevronDown, ChevronUp, Clock, MessageSquare, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    quote_number?: string;
    quote_total?: number;
  };
  created_at: string;
  updated_at: string;
}

interface TicketInteraction {
  id: string;
  interaction_type: string;
  content: { message: string; [key: string]: any };
  created_at: string;
  user_id: string;
  is_internal: boolean;
}

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: AlertCircle,
    group: 'attention'
  },
  in_progress: {
    label: 'In Progress', 
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-blue-500',
    icon: Clock,
    group: 'active'
  },
  pending: {
    label: 'Waiting for You',
    color: 'bg-slate-50 text-slate-700 border-slate-200', 
    dot: 'bg-amber-500',
    icon: Zap,
    group: 'attention'
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-300', 
    icon: CheckCircle2,
    group: 'resolved'
  },
  closed: {
    label: 'Closed',
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-300',
    icon: CheckCircle2, 
    group: 'resolved'
  }
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-slate-800 text-white text-xs px-2 py-1', icon: '' },
  high: { label: 'High', color: 'bg-slate-600 text-white text-xs px-2 py-1', icon: '' },
  medium: { label: 'Medium', color: 'bg-slate-500 text-white text-xs px-2 py-1', icon: '' },
  low: { label: 'Low', color: 'bg-slate-400 text-white text-xs px-2 py-1', icon: '' }
};

export default function MyTicketsOptimizedPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [interactions, setInteractions] = useState<{[key: string]: TicketInteraction[]}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolvedExpanded, setResolvedExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
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
          .order('updated_at', { ascending: false });

        if (error) {
          setError('Failed to load tickets');
          console.error('Error fetching tickets:', error);
        } else {
          setTickets(data || []);
        }
      } catch (err) {
        setError('Failed to load tickets');
        console.error('Exception fetching tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user?.id]);

  // Load interactions for all tickets
  useEffect(() => {
    const loadAllInteractions = async () => {
      if (!tickets.length || !user?.id) return;

      try {
        const { data, error } = await supabase
          .from('support_interactions')
          .select('id, support_id, interaction_type, content, created_at, user_id, is_internal')
          .in('support_id', tickets.map(t => t.id))
          .eq('is_internal', false)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const interactionMap: {[key: string]: TicketInteraction[]} = {};
          data.forEach(interaction => {
            if (!interactionMap[interaction.support_id]) {
              interactionMap[interaction.support_id] = [];
            }
            interactionMap[interaction.support_id].push(interaction);
          });
          setInteractions(interactionMap);
        }
      } catch (err) {
        console.error('Error loading interactions:', err);
      }
    };

    loadAllInteractions();
  }, [tickets, user?.id]);

  // Filter and group tickets
  const { filteredTickets, groupedTickets, stats } = useMemo(() => {
    let filtered = tickets;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = tickets.filter(ticket =>
        ticket.ticket_data.subject.toLowerCase().includes(query) ||
        ticket.ticket_data.description.toLowerCase().includes(query) ||
        ticket.ticket_data.category?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.ticket_data.status === statusFilter);
    }

    // Group tickets
    const grouped = {
      attention: filtered.filter(t => STATUS_CONFIG[t.ticket_data.status as keyof typeof STATUS_CONFIG]?.group === 'attention'),
      active: filtered.filter(t => STATUS_CONFIG[t.ticket_data.status as keyof typeof STATUS_CONFIG]?.group === 'active'),
      resolved: filtered.filter(t => STATUS_CONFIG[t.ticket_data.status as keyof typeof STATUS_CONFIG]?.group === 'resolved')
    };

    // Calculate stats
    const stats = {
      open: tickets.filter(t => t.ticket_data.status === 'open').length,
      in_progress: tickets.filter(t => t.ticket_data.status === 'in_progress').length,
      pending: tickets.filter(t => t.ticket_data.status === 'pending').length,
      resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.ticket_data.status)).length
    };

    return { filteredTickets: filtered, groupedTickets: grouped, stats };
  }, [tickets, searchQuery, statusFilter]);

  // Handle ticket click
  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingInteractions(true);
    
    // Load interactions for selected ticket
    setTimeout(() => {
      setLoadingInteractions(false);
    }, 500);
  };

  // Handle reply
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
        // Refresh interactions
        const { data } = await supabase
          .from('support_interactions')
          .select('id, interaction_type, content, created_at, user_id, is_internal')
          .eq('support_id', selectedTicket.id)
          .eq('is_internal', false)
          .order('created_at', { ascending: true });
        
        if (data) {
          setInteractions(prev => ({ ...prev, [selectedTicket.id]: data }));
        }
      }
    } catch (err) {
      console.error('Exception sending reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const getLastActivity = (ticket: Ticket) => {
    const ticketInteractions = interactions[ticket.id] || [];
    if (ticketInteractions.length > 0) {
      const lastInteraction = ticketInteractions[0]; // Most recent first
      const timeAgo = new Date(lastInteraction.created_at).toLocaleString();
      const isFromUser = lastInteraction.user_id === user?.id;
      return {
        text: isFromUser ? 'You replied' : 'Support replied',
        time: timeAgo,
        preview: lastInteraction.content.message?.substring(0, 80) + '...'
      };
    }
    return {
      text: 'Created',
      time: new Date(ticket.created_at).toLocaleString(),
      preview: ticket.ticket_data.description.substring(0, 80) + '...'
    };
  };

  const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const statusConfig = STATUS_CONFIG[ticket.ticket_data.status as keyof typeof STATUS_CONFIG];
    const priorityConfig = ticket.ticket_data.priority ? PRIORITY_CONFIG[ticket.ticket_data.priority as keyof typeof PRIORITY_CONFIG] : null;
    const lastActivity = getLastActivity(ticket);
    const hasUnread = interactions[ticket.id]?.some(i => i.user_id !== user?.id) || false;

    return (
      <Card 
        className="cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all duration-200 border border-slate-200 bg-white"
        onClick={() => handleTicketClick(ticket)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${statusConfig?.dot}`} />
                <h3 className="font-semibold text-slate-900 truncate">
                  {ticket.ticket_data.subject}
                </h3>
                {hasUnread && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <span>{lastActivity.text}</span>
                <span>•</span>
                <span>{lastActivity.time}</span>
                {priorityConfig && (
                  <>
                    <span>•</span>
                    <Badge className={priorityConfig.color}>
                      {priorityConfig.label}
                    </Badge>
                  </>
                )}
              </div>
              
              <p className="text-sm text-slate-600 line-clamp-2">
                {lastActivity.preview}
              </p>
              
              {ticket.ticket_data.quote_number && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Quote #{ticket.ticket_data.quote_number}
                  </Badge>
                </div>
              )}
            </div>
            
            <Badge className={`ml-3 ${statusConfig?.color} text-xs`}>
              {statusConfig?.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Ticket detail view
  if (selectedTicket) {
    const ticketInteractions = interactions[selectedTicket.id] || [];
    const statusConfig = STATUS_CONFIG[selectedTicket.ticket_data.status as keyof typeof STATUS_CONFIG];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          
          {/* Ticket Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${statusConfig?.dot}`} />
                    <h1 className="text-2xl font-bold text-gray-900">
                      {selectedTicket.ticket_data.subject}
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <Badge className={statusConfig?.color}>
                      {statusConfig?.label}
                    </Badge>
                    {selectedTicket.ticket_data.priority && (
                      <Badge className={PRIORITY_CONFIG[selectedTicket.ticket_data.priority as keyof typeof PRIORITY_CONFIG]?.color}>
                        {PRIORITY_CONFIG[selectedTicket.ticket_data.priority as keyof typeof PRIORITY_CONFIG]?.label}
                      </Badge>
                    )}
                    <span>Created: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Original Message</h3>
                <p className="text-gray-700">{selectedTicket.ticket_data.description}</p>
              </div>

              {/* Quote Context */}
              {selectedTicket.ticket_data.quote_number && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation ({ticketInteractions.length})
              </h2>
              
              {loadingInteractions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading conversation...</p>
                </div>
              ) : ticketInteractions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No replies yet. Be the first to add a comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketInteractions.reverse().map((interaction) => (
                    <div key={interaction.id} className="border-l-4 border-l-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {interaction.user_id === user?.id ? 'You' : 'Support Team'}
                          </span>
                          {interaction.user_id !== user?.id && (
                            <Badge variant="secondary" className="text-xs">Support</Badge>
                          )}
                        </div>
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

  // Main tickets list view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/help')}
            className="text-gray-600 hover:text-gray-900 mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Support Tickets</h1>
              <p className="text-gray-600 mt-1">Track and manage your support requests</p>
            </div>
            
            <Button 
              onClick={() => alert('Create ticket functionality will be available soon')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Ticket
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Waiting for You</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-200">
                Open: {stats.open}
              </Badge>
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-200">
                In Progress: {stats.in_progress}
              </Badge>
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-200">
                Waiting: {stats.pending}
              </Badge>
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                Resolved: {stats.resolved}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ticket Groups */}
        <div className="space-y-6">
          {/* Needs Attention */}
          {groupedTickets.attention.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-slate-400 rounded-full"></div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Needs Your Attention ({groupedTickets.attention.length})
                </h2>
              </div>
              <div className="space-y-3">
                {groupedTickets.attention.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}

          {/* Active/In Progress */}
          {groupedTickets.active.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                <h2 className="text-xl font-semibold text-slate-900">
                  In Progress ({groupedTickets.active.length})
                </h2>
              </div>
              <div className="space-y-3">
                {groupedTickets.active.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}

          {/* Resolved */}
          {groupedTickets.resolved.length > 0 && (
            <div>
              <div 
                className="flex items-center gap-3 mb-4 cursor-pointer"
                onClick={() => setResolvedExpanded(!resolvedExpanded)}
              >
                <div className="w-1 h-6 bg-slate-300 rounded-full"></div>
                <h2 className="text-xl font-semibold text-slate-600">
                  Resolved ({groupedTickets.resolved.length})
                </h2>
                {resolvedExpanded ? 
                  <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                }
              </div>
              {resolvedExpanded && (
                <div className="space-y-3">
                  {groupedTickets.resolved.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {filteredTickets.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-16">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No tickets found' : 'No support tickets yet'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {searchQuery ? 
                    'Try adjusting your search terms or filters.' :
                    'When you create support tickets, they\'ll appear here organized by priority and status.'
                  }
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => alert('Create ticket functionality will be available soon')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Ticket
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}