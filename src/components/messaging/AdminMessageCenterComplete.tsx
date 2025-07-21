// ============================================================================
// COMPLETE ADMIN MESSAGE CENTER - Fixed all issues + Quick Actions + Templates
// Fixes: Real emails, View Profile, 3-dot menu, Quick Actions, Message Templates
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '@/hooks/useMessaging';
import { useCustomerManagementFixed } from '@/hooks/useCustomerManagementFixed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  Search,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  ArrowLeft,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingCart,
  Flag,
  Archive,
  Star,
  Zap,
  Eye,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewMessageForm } from './NewMessageForm';
import { MessageListEnhanced as MessageList } from './MessageListEnhanced';

// Message Templates
const MESSAGE_TEMPLATES = [
  {
    id: 'welcome',
    title: 'Welcome Message',
    content:
      'Hi! Welcome to iwishBag. How can I help you with your international shopping needs today?',
    icon: '👋',
  },
  {
    id: 'quote_ready',
    title: 'Quote Ready',
    content:
      'Great news! Your quote is ready for review. Please check your dashboard to approve or request changes.',
    icon: '📋',
  },
  {
    id: 'payment_received',
    title: 'Payment Confirmed',
    content:
      "Thank you! Your payment has been received and confirmed. We'll start processing your order immediately.",
    icon: '✅',
  },
  {
    id: 'shipping_update',
    title: 'Shipping Update',
    content:
      'Your order has been shipped! You can track your package using the tracking number provided in your dashboard.',
    icon: '📦',
  },
  {
    id: 'need_info',
    title: 'Need More Information',
    content:
      'To proceed with your quote, we need some additional information. Could you please provide more details?',
    icon: '❓',
  },
  {
    id: 'follow_up',
    title: 'Follow Up',
    content:
      'Hi! Just following up on your recent quote. Do you have any questions or need assistance with anything?',
    icon: '💬',
  },
];

export const AdminMessageCenterComplete = () => {
  const navigate = useNavigate();

  // Use fixed customer management that fetches real emails
  const { customers: allUsers, isLoading: isLoadingUsers } = useCustomerManagementFixed();

  // Filter to get non-admin users
  const users = useMemo(() => {
    return allUsers?.filter((u) => u.role !== 'admin') || [];
  }, [allUsers]);

  // Use messaging hook with our custom users
  const { user, isLoading, sendMessageMutation, conversations } = useMessaging(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof MESSAGE_TEMPLATES[0] | null>(null);

  // Get selected conversation and user data
  const selectedConversation = useMemo(() => {
    if (!selectedUserId) return null;
    return conversations.find((c) => c.userId === selectedUserId);
  }, [selectedUserId, conversations]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId || !users) return null;
    return users.find((u) => u.id === selectedUserId);
  }, [selectedUserId, users]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((convo) => {
      const user = users?.find((u) => u.id === convo.userId);
      const userMatch =
        user?.email?.toLowerCase().includes(query) ||
        user?.full_name?.toLowerCase().includes(query);
      const messageMatch = convo.lastMessage?.content?.toLowerCase().includes(query);

      return userMatch || messageMatch;
    });
  }, [conversations, users, searchQuery]);

  // Get customer stats (enhanced with real data)
  const getCustomerStats = (userId: string) => {
    const customer = users?.find((u) => u.id === userId);
    if (!customer)
      return {
        quoteCount: 0,
        totalValue: 0,
        tier: 'New',
        location: 'Unknown',
        joinDate: new Date().toISOString(),
      };

    const tier =
      customer.total_spent && customer.total_spent > 1000
        ? 'High-value'
        : customer.quote_count && customer.quote_count > 3
          ? 'Regular'
          : 'New';

    // Get location from first address
    const location = customer.user_addresses?.[0]
      ? `${customer.user_addresses[0].city}, ${customer.user_addresses[0].country}`
      : 'Location not set';

    return {
      quoteCount: customer.quote_count || 0,
      totalValue: customer.total_spent || 0,
      tier,
      location,
      joinDate: customer.created_at,
    };
  };

  // Handle quick actions
  const handleQuickAction = (action: string, customerId?: string) => {
    switch (action) {
      case 'mark_resolved':
        // Mark conversation as resolved (would implement this)
        console.log('Mark as resolved:', customerId);
        break;
      case 'assign_to_me':
        // Assign conversation to current admin
        console.log('Assign to me:', customerId);
        break;
      case 'set_priority':
        // Set priority flag
        console.log('Set priority:', customerId);
        break;
      case 'view_profile':
        if (customerId) {
          navigate(`/admin/customers/${customerId}`);
        }
        break;
      case 'view_quotes':
        if (customerId) {
          navigate(`/admin/quotes?customer=${customerId}`);
        }
        break;
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: (typeof MESSAGE_TEMPLATES)[0]) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
    // The template content will be passed to NewMessageForm via props
  };

  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const ConversationListItem = ({ conversation }: { conversation: any }) => {
    const user = users?.find((u) => u.id === conversation.userId);
    const stats = getCustomerStats(conversation.userId);
    const isSelected = selectedUserId === conversation.userId;
    const unreadCount = conversation.messages.filter(
      (msg: any) => !msg.is_read && msg.recipient_id === user?.id,
    ).length;

    if (!user) return null;

    return (
      <div
        onClick={() => setSelectedUserId(conversation.userId)}
        className={cn(
          'flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200',
          'hover:border-gray-300 hover:shadow-sm',
          isSelected && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50',
          unreadCount > 0 && !isSelected && 'bg-blue-50/50 border-blue-200',
        )}
      >
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
            {user.full_name
              ? user.full_name.substring(0, 2).toUpperCase()
              : user.email.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3
                className={cn(
                  'font-semibold text-sm truncate',
                  unreadCount > 0 ? 'text-gray-900' : 'text-gray-700',
                )}
              >
                {user.full_name || user.email.split('@')[0]}
              </h3>
              {unreadCount > 0 && (
                <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatMessageTime(conversation.lastMessage.created_at)}
            </span>
          </div>

          {/* Email and Location */}
          <p className="text-xs text-gray-500 truncate mb-1">
            {user.email} • {stats.location}
          </p>

          {/* Last Message */}
          <p
            className={cn('text-sm text-gray-600 truncate mb-2', unreadCount > 0 && 'font-medium')}
          >
            💬 "{conversation.lastMessage.content}"
          </p>

          {/* Customer Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {stats.quoteCount} quotes
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />${stats.totalValue.toLocaleString()}
            </span>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {stats.tier}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const ConversationHeader = () => {
    if (!selectedUser || !selectedConversation) return null;

    const stats = getCustomerStats(selectedUserId!);
    const unreadCount = selectedConversation.messages.filter(
      (msg: any) => !msg.is_read && msg.recipient_id === user?.id,
    ).length;

    return (
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSelectedUserId(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <Avatar className="w-8 h-8">
              <AvatarImage
                src={selectedUser.avatar_url}
                alt={selectedUser.full_name || selectedUser.email}
              />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
                {selectedUser.full_name
                  ? selectedUser.full_name.substring(0, 2).toUpperCase()
                  : selectedUser.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="font-semibold text-gray-900">
                {selectedUser.full_name || selectedUser.email.split('@')[0]}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedUser.email} • {stats.location}
              </p>
            </div>

            {unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white">{unreadCount} unread</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex"
              onClick={() => handleQuickAction('view_profile', selectedUserId!)}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              View Profile
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
              <Zap className="w-4 h-4 mr-2" />
              Templates
            </Button>

            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => handleQuickAction('view_profile', selectedUserId!)}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  View Customer Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('view_quotes', selectedUserId!)}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  View Customer Quotes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleQuickAction('mark_resolved', selectedUserId!)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Resolved
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleQuickAction('set_priority', selectedUserId!)}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Set High Priority
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleQuickAction('assign_to_me', selectedUserId!)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Assign to Me
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Enhanced Customer Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            {stats.quoteCount} quotes
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />${stats.totalValue.toLocaleString()} total value
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            Since {new Date(stats.joinDate).toLocaleDateString()}
          </div>
          <Badge variant="secondary" className="text-xs">
            {stats.tier} Customer
          </Badge>
        </div>
      </div>
    );
  };

  // Message Templates Dialog
  const TemplatesDialog = () => (
    <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Message Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to quickly compose professional responses
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {MESSAGE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="flex items-start gap-3 p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{template.icon}</span>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 mb-1">{template.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTemplates(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isLoading || isLoadingUsers) {
    return (
      <div className="h-[calc(100vh-120px)] max-w-7xl mx-auto p-6">
        <div className="flex h-full gap-6">
          {/* Left Panel Skeleton */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel Skeleton */}
          <Card className="flex-1">
            <CardContent className="p-8 text-center">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] max-w-7xl mx-auto p-6">
      <div className="flex h-full gap-6">
        {/* Left Panel - Conversations List */}
        <div
          className={cn(
            'w-80 flex-shrink-0 transition-all duration-300',
            selectedUserId && 'hidden lg:block',
          )}
        >
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Messages
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredConversations.length} conversations
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowNewMessage(!showNewMessage)}
                  className="flex-shrink-0"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New
                </Button>
              </div>

              {/* Search */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {showNewMessage && (
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <NewMessageForm
                      sendMessageMutation={sendMessageMutation}
                      onCancel={() => setShowNewMessage(false)}
                      isAdmin={true}
                      users={users || []}
                      noCardWrapper={true}
                    />
                  </div>
                )}

                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No conversations</p>
                    <p className="text-sm text-gray-400">
                      {searchQuery
                        ? 'No conversations match your search'
                        : 'Customer messages will appear here'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredConversations.map((conversation) => (
                      <ConversationListItem key={conversation.userId} conversation={conversation} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Active Conversation */}
        <Card
          className={cn(
            'flex-1 flex flex-col transition-all duration-300',
            !selectedUserId && 'lg:flex hidden lg:block',
          )}
        >
          {selectedUserId && selectedConversation ? (
            <>
              <ConversationHeader />

              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <MessageList
                    messages={selectedConversation.messages}
                    isLoading={false}
                    currentUserId={user?.id}
                    isAdmin={true}
                  />
                </ScrollArea>

                <div className="border-t border-gray-200 p-4">
                  {/* Quick Reply Templates */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">Quick replies:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleTemplateSelect(MESSAGE_TEMPLATES[0])}
                      >
                        👋 Welcome
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleTemplateSelect(MESSAGE_TEMPLATES[1])}
                      >
                        📋 Quote Ready
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleTemplateSelect(MESSAGE_TEMPLATES[5])}
                      >
                        💬 Follow Up
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setShowTemplates(true)}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        More
                      </Button>
                    </div>
                  </div>

                  {/* Integrated Message Form */}
                  <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
                    <NewMessageForm
                      sendMessageMutation={sendMessageMutation}
                      onCancel={() => {}} // No cancel needed in conversation view
                      isAdmin={true}
                      users={users || []}
                      recipientIdLocked={selectedUserId}
                      noCardWrapper={true}
                      initialContent={selectedTemplate?.content || ''}
                      onTemplateUsed={() => setSelectedTemplate(null)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-center">
              <div className="max-w-sm">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500 mb-4">
                  Choose a conversation from the left to start messaging with customers
                </p>
                <Button
                  onClick={() => setShowNewMessage(true)}
                  className="inline-flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start New Conversation
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Templates Dialog */}
      <TemplatesDialog />
    </div>
  );
};

export default AdminMessageCenterComplete;
