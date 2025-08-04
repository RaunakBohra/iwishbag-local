import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Send, 
  Search, 
  RefreshCw, 
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  CreditCard,
  Globe
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SMSMessage = Database['public']['Tables']['sms_messages']['Row'];

export default function SMSDashboard() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  // Form states for sending SMS
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('general');

  useEffect(() => {
    loadMessages();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sms_statistics');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading SMS stats:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading SMS messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SMS messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: 'Error',
        description: 'Please enter phone number and message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: phoneNumber,
          message: message,
          type: messageType,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `SMS sent successfully to ${data.phone}`,
      });

      // Clear form
      setPhoneNumber('');
      setMessage('');
      
      // Reload messages
      await loadMessages();
      await loadStats();
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send SMS',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
      received: { color: 'bg-purple-100 text-purple-800', icon: MessageSquare },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getProviderBadge = (provider: string | null) => {
    if (!provider) return null;
    
    const providerConfig = {
      sparrow: { color: 'bg-orange-100 text-orange-800', label: 'Sparrow SMS' },
      msg91: { color: 'bg-indigo-100 text-indigo-800', label: 'MSG91' },
      twilio: { color: 'bg-blue-100 text-blue-800', label: 'Twilio' },
    };

    const config = providerConfig[provider as keyof typeof providerConfig];
    if (!config) return null;

    return (
      <Badge className={`${config.color} gap-1`}>
        <Globe className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.to_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = filterStatus === 'all' || msg.status === filterStatus;
    const matchesDirection = filterDirection === 'all' || msg.direction === filterDirection;
    
    return matchesSearch && matchesStatus && matchesDirection;
  });

  const characterCount = message.length;
  const smsCount = Math.ceil(characterCount / 160);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SMS Dashboard</h1>
        <Button onClick={loadMessages} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_sent || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent_today || 0}</div>
              <p className="text-xs text-muted-foreground">Credits: {stats.credits_used_today || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.total_failed || 0}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1">
                {stats.provider_stats && Object.entries(stats.provider_stats).map(([provider, count]) => (
                  <div key={provider} className="flex justify-between">
                    <span className="capitalize">{provider}:</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send SMS Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+977 980 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Message Type</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="otp">OTP</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={sendSMS} 
                disabled={sending || !phoneNumber || !message}
                className="w-full"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="message">Message</Label>
              <span className="text-sm text-muted-foreground">
                {characterCount} chars / {smsCount} SMS
              </span>
            </div>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by phone number or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filterDirection} onValueChange={setFilterDirection}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Messages ({filteredMessages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMessage(msg)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {msg.direction === 'sent' ? msg.to_phone : msg.from_phone}
                      </span>
                      {msg.direction === 'sent' ? (
                        <span className="text-sm text-muted-foreground">→ Sent</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">← Received</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(msg.status)}
                      {getProviderBadge(msg.provider)}
                    </div>
                  </div>
                  
                  <p className="text-sm mb-2 line-clamp-2">{msg.message}</p>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}</span>
                    {msg.credits_used && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {msg.credits_used} credit{msg.credits_used > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMessage(null)}>
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>SMS Details</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Direction</Label>
                  <p className="font-medium capitalize">{selectedMessage.direction}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">From</Label>
                  <p className="font-medium">{selectedMessage.from_phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">To</Label>
                  <p className="font-medium">{selectedMessage.to_phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Provider</Label>
                  <div className="mt-1">{getProviderBadge(selectedMessage.provider)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Country</Label>
                  <p className="font-medium">{selectedMessage.country_code || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Credits Used</Label>
                  <p className="font-medium">{selectedMessage.credits_used || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Created At</Label>
                  <p className="font-medium">{format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm:ss a')}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Message</Label>
                <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
              
              {selectedMessage.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{selectedMessage.error_message}</AlertDescription>
                </Alert>
              )}
              
              {selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedMessage.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}