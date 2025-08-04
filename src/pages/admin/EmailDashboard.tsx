import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Search, Mail, Send, Inbox, Clock, Eye, Reply, Paperclip, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface EmailMessage {
  id: string;
  message_id: string;
  direction: 'sent' | 'received';
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  subject: string;
  text_body?: string;
  html_body?: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  has_attachments: boolean;
  attachment_count: number;
  size_bytes: number;
  s3_key: string;
  created_at: string;
  sent_at?: string;
  received_at?: string;
  customer_email?: string;
  metadata?: any;
}

export default function EmailDashboard() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('email_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (directionFilter !== 'all') {
        query = query.eq('direction', directionFilter);
      }

      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,from_address.ilike.%${searchTerm}%,text_body.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_messages')
        .update({ status: 'read' })
        .eq('id', emailId);

      if (error) throw error;
      
      setEmails(prev => prev.map(e => 
        e.id === emailId ? { ...e, status: 'read' } : e
      ));
      
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, status: 'read' });
      }
    } catch (error: any) {
      console.error('Error marking email as read:', error);
      toast.error('Failed to mark email as read');
    }
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;

    try {
      setSending(true);
      
      const { data, error } = await supabase.functions.invoke('send-email-ses', {
        body: {
          to: [selectedEmail.from_address],
          subject: `Re: ${selectedEmail.subject}`,
          text: replyText,
          html: `<p>${replyText.replace(/\n/g, '<br>')}</p>`,
          replyTo: 'support@mail.iwishbag.com'
        }
      });

      if (error) throw error;

      toast.success('Reply sent successfully');
      setReplyText('');
      
      // Mark original email as replied
      await supabase
        .from('email_messages')
        .update({ status: 'replied' })
        .eq('id', selectedEmail.id);
      
      setSelectedEmail({ ...selectedEmail, status: 'replied' });
      fetchEmails();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      unread: 'default',
      read: 'secondary',
      replied: 'outline',
      archived: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Dashboard</h1>
        <Button onClick={fetchEmails} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchEmails()}
                className="pl-10"
              />
            </div>
            
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Emails</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchEmails}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emails.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emails.filter(e => e.direction === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emails.filter(e => e.direction === 'received').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emails.filter(e => e.status === 'unread').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email);
                  if (email.status === 'unread') {
                    markAsRead(email.id);
                  }
                }}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  email.status === 'unread' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {email.direction === 'sent' ? (
                        <Send className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Inbox className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium truncate">
                        {email.direction === 'sent' ? `To: ${email.to_addresses.join(', ')}` : email.from_address}
                      </span>
                      {getStatusBadge(email.status)}
                      {email.has_attachments && (
                        <Badge variant="outline">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {email.attachment_count}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{email.subject}</h3>
                    <p className="text-gray-600 line-clamp-2">
                      {email.text_body || 'No preview available'}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatBytes(email.size_bytes)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Detail Sheet */}
      <Sheet open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedEmail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedEmail.direction === 'sent' ? (
                    <Send className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Inbox className="h-5 w-5 text-green-500" />
                  )}
                  {selectedEmail.subject}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">From</p>
                      <p className="font-medium">{selectedEmail.from_address}</p>
                    </div>
                    {getStatusBadge(selectedEmail.status)}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">To</p>
                    <p className="font-medium">{selectedEmail.to_addresses.join(', ')}</p>
                  </div>
                  
                  {selectedEmail.cc_addresses && selectedEmail.cc_addresses.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">CC</p>
                      <p className="font-medium">{selectedEmail.cc_addresses.join(', ')}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">
                      {new Date(selectedEmail.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Size: {formatBytes(selectedEmail.size_bytes)}</span>
                    {selectedEmail.has_attachments && (
                      <span>Attachments: {selectedEmail.attachment_count}</span>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="html" className="w-full">
                  <TabsList>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="raw">Headers</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="html" className="mt-4">
                    {selectedEmail.html_body ? (
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(selectedEmail.html_body) 
                        }}
                      />
                    ) : (
                      <p className="text-gray-500">No HTML content</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-4">
                    <pre className="whitespace-pre-wrap font-sans">
                      {selectedEmail.text_body || 'No text content'}
                    </pre>
                  </TabsContent>
                  
                  <TabsContent value="raw" className="mt-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Message ID:</span> {selectedEmail.message_id}
                      </div>
                      <div>
                        <span className="font-medium">S3 Location:</span> {selectedEmail.s3_key}
                      </div>
                      {selectedEmail.metadata && (
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(selectedEmail.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Reply Section */}
                {selectedEmail.direction === 'received' && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Reply className="h-4 w-4" />
                      Reply
                    </h3>
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={6}
                    />
                    <Button 
                      onClick={sendReply} 
                      disabled={sending || !replyText.trim()}
                      className="w-full"
                    >
                      {sending ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}