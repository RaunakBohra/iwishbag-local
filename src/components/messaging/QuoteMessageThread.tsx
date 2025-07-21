// ============================================================================
// QUOTE MESSAGE THREAD - Compact messaging component for admin interface
// Displays quote-specific message conversations with real-time updates
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Paperclip,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Image as ImageIcon,
  FileText,
  Download
} from 'lucide-react';
import { quoteMessageService, SendMessageRequest } from '@/services/QuoteMessageService';
import { fileUploadService } from '@/services/FileUploadService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export interface QuoteMessageThreadProps {
  quoteId: string;
  compact?: boolean;
  maxHeight?: string;
  showComposer?: boolean;
  className?: string;
}

export const QuoteMessageThread: React.FC<QuoteMessageThreadProps> = ({
  quoteId,
  compact = true,
  maxHeight = '300px',
  showComposer = true,
  className
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for message thread
  const { 
    data: messageThread, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['quote-messages', quoteId],
    queryFn: () => quoteMessageService.getMessageThread(quoteId),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (request: SendMessageRequest) => {
      return quoteMessageService.sendMessage(request);
    },
    onSuccess: (result) => {
      if (result.success) {
        setMessage('');
        setAttachments([]);
        setIsComposing(false);
        queryClient.invalidateQueries({ queryKey: ['quote-messages', quoteId] });
        toast({ title: 'Message sent successfully' });
      } else {
        toast({ 
          title: 'Failed to send message', 
          description: result.error,
          variant: 'destructive' 
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Error sending message', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageIds: string[]) => quoteMessageService.markMessagesAsRead(messageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-messages', quoteId] });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageThread?.messages]);

  // Mark unread messages as read when component mounts or messages change
  useEffect(() => {
    if (messageThread?.messages && user) {
      const unreadMessages = messageThread.messages
        .filter(msg => msg.recipient_id === user.id && !msg.is_read)
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate(unreadMessages);
      }
    }
  }, [messageThread?.messages, user?.id]);

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    const request: SendMessageRequest = {
      quoteId,
      content: message.trim() || 'File attachment',
      messageType: attachments.some(f => f.name.toLowerCase().includes('payment')) ? 'payment_proof' : 'general',
      attachments: attachments.length > 0 ? attachments : undefined,
      priority: 'normal'
    };

    sendMessageMutation.mutate(request);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format message timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Get message status icon
  const getStatusIcon = (message: any) => {
    if (message.verification_status === 'verified') {
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    }
    if (message.verification_status === 'rejected') {
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    }
    if (message.message_type === 'payment_proof') {
      return <Clock className="w-3 h-3 text-yellow-500" />;
    }
    return null;
  };

  // Get attachment icon
  const getAttachmentIcon = (fileName: string) => {
    if (fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-4 text-gray-500 text-xs", className)}>
        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-300" />
        <p>Failed to load messages</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Messages List */}
      <div 
        className="flex-1 overflow-y-auto space-y-2 pr-2"
        style={{ maxHeight }}
      >
        {messageThread?.messages && messageThread.messages.length > 0 ? (
          messageThread.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.sender_id === user?.id ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-2 text-xs",
                  msg.sender_id === user?.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-900",
                  msg.is_internal && "border-l-2 border-orange-400"
                )}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-medium",
                    msg.sender_id === user?.id ? "text-blue-100" : "text-gray-600"
                  )}>
                    {msg.sender_name}
                  </span>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(msg)}
                    <span className={cn(
                      "text-xs",
                      msg.sender_id === user?.id ? "text-blue-200" : "text-gray-500"
                    )}>
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                </div>

                {/* Message Content */}
                <div className="text-xs leading-relaxed">
                  {msg.content}
                </div>

                {/* Attachment */}
                {msg.attachment_url && (
                  <div className="mt-2 p-2 rounded border border-opacity-20 border-white">
                    <div className="flex items-center space-x-2">
                      {getAttachmentIcon(msg.attachment_file_name || '')}
                      <span className="text-xs truncate flex-1">
                        {msg.attachment_file_name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => window.open(msg.attachment_url, '_blank')}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Message Type Badge */}
                {msg.message_type === 'payment_proof' && (
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs h-4 px-1 border-white border-opacity-30"
                  >
                    Payment Proof
                  </Badge>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-xs mb-2">No messages yet</p>
            <p className="text-xs text-gray-400">Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      {showComposer && (
        <div className="border-t border-gray-100 pt-2 mt-2">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {attachments.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs"
                  >
                    {getAttachmentIcon(file.name)}
                    <span className="ml-1 truncate max-w-20">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-end space-x-1">
            <div className="flex-1">
              {isComposing ? (
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Ctrl+Enter to send)"
                  className="min-h-[60px] text-xs resize-none"
                  rows={3}
                />
              ) : (
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsComposing(true)}
                  placeholder="Type a message..."
                  className="text-xs"
                />
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || (!message.trim() && attachments.length === 0)}
                className="h-8 px-3"
              >
                {sendMessageMutation.isPending ? (
                  <Clock className="w-3 h-3" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          {isComposing && (
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">Ctrl+Enter to send</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setIsComposing(false);
                  setMessage('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};