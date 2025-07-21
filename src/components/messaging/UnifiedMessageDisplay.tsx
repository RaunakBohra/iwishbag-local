// ============================================================================
// UNIFIED MESSAGE DISPLAY - Consolidates message rendering logic
// Replaces duplicate rendering in QuoteMessaging and QuoteMessageThread
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageDisplayProps {
  // Data
  messages: any[];

  // Layout variants
  variant: 'compact' | 'full' | 'embedded';
  maxHeight?: string;
  className?: string;

  // Message composer
  showComposer?: boolean;
  message: string;
  onMessageChange: (message: string) => void;
  attachments: File[];
  onAttachmentsChange: (attachments: File[]) => void;

  // Actions
  onSendMessage: () => void;
  onRemoveAttachment: (index: number) => void;
  onFileSelect: (files: FileList) => void;

  // States
  isSending: boolean;
  isComposing: boolean;
  onComposingChange: (composing: boolean) => void;

  // Utilities
  formatTimestamp: (timestamp: string) => string;
}

export const UnifiedMessageDisplay: React.FC<MessageDisplayProps> = ({
  messages,
  variant = 'full',
  maxHeight = '300px',
  className,
  showComposer = true,
  message,
  onMessageChange,
  attachments,
  onAttachmentsChange,
  onSendMessage,
  onRemoveAttachment,
  onFileSelect,
  isSending,
  isComposing,
  onComposingChange,
  formatTimestamp,
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart auto-scroll - only scroll if user was at bottom
  useEffect(() => {
    if (messagesEndRef.current && messages?.length > 0) {
      const container = messagesEndRef.current.parentElement;
      if (container && variant !== 'compact') {
        const isAtBottom =
          Math.abs(container.scrollTop + container.clientHeight - container.scrollHeight) <= 10;

        if (isAtBottom) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest',
          });
        }
      }
    }
  }, [messages, variant]);

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

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSendMessage();
    }
  };

  // Handle file selection
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileSelect(e.target.files);
    }
  };

  // Style variants
  const containerClasses = cn(
    'flex flex-col',
    variant === 'compact' && 'text-xs',
    variant === 'full' && 'text-sm',
    className,
  );

  const messageClasses = (msg: any) =>
    cn(
      'rounded-lg p-2',
      variant === 'compact' ? 'text-xs' : 'text-sm',
      msg.sender_id === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900',
      msg.is_internal && 'border-l-2 border-orange-400',
    );

  const renderMessage = (msg: any) => (
    <div
      key={msg.id}
      className={cn('flex', msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}
    >
      <div className={cn(messageClasses(msg), 'max-w-[80%]')}>
        {/* Message Header */}
        <div className="flex items-center justify-between mb-1">
          <span
            className={cn(
              variant === 'compact' ? 'text-xs' : 'text-sm',
              'font-medium',
              msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-600',
            )}
          >
            {msg.sender_name}
          </span>
          <div className="flex items-center space-x-1">
            {getStatusIcon(msg)}
            <span
              className={cn(
                variant === 'compact' ? 'text-xs' : 'text-sm',
                msg.sender_id === user?.id ? 'text-blue-200' : 'text-gray-500',
              )}
            >
              {formatTimestamp(msg.created_at)}
            </span>
          </div>
        </div>

        {/* Message Content */}
        <div className={cn(variant === 'compact' ? 'text-xs' : 'text-sm', 'leading-relaxed')}>
          {msg.content}
        </div>

        {/* Attachment */}
        {msg.attachment_url && (
          <div className="mt-2 p-2 rounded border border-opacity-20 border-white">
            <div className="flex items-center space-x-2">
              {getAttachmentIcon(msg.attachment_file_name || '')}
              <span
                className={cn(variant === 'compact' ? 'text-xs' : 'text-sm', 'truncate flex-1')}
              >
                {msg.attachment_file_name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className={variant === 'compact' ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}
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
            className={cn(
              'mt-1 border-white border-opacity-30',
              variant === 'compact' ? 'text-xs h-4 px-1' : 'text-sm h-5 px-2',
            )}
          >
            Payment Proof
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className={containerClasses}>
      {/* Messages List */}
      <div
        className={cn('flex-1 overflow-y-auto space-y-2', variant === 'compact' ? 'pr-1' : 'pr-2')}
        style={{ maxHeight }}
      >
        {messages && messages.length > 0 ? (
          messages.map(renderMessage)
        ) : (
          <div className={cn('text-center py-6 text-gray-500', variant === 'compact' && 'py-4')}>
            <p className={variant === 'compact' ? 'text-xs mb-2' : 'text-sm mb-2'}>
              No messages yet
            </p>
            <p className={cn('text-gray-400', variant === 'compact' ? 'text-xs' : 'text-sm')}>
              Start the conversation!
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      {showComposer && (
        <div
          className={cn('border-t border-gray-100 mt-2', variant === 'compact' ? 'pt-2' : 'pt-3')}
        >
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className={variant === 'compact' ? 'mb-2' : 'mb-3'}>
              <div className="flex flex-wrap gap-1">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center bg-gray-100 rounded px-2 py-1',
                      variant === 'compact' ? 'text-xs' : 'text-sm',
                    )}
                  >
                    {getAttachmentIcon(file.name)}
                    <span
                      className={cn(
                        'ml-1 truncate',
                        variant === 'compact' ? 'max-w-20' : 'max-w-32',
                      )}
                    >
                      {file.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => onRemoveAttachment(index)}
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
                  onChange={(e) => onMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Ctrl+Enter to send)"
                  className={cn(
                    'resize-none',
                    variant === 'compact' ? 'min-h-[60px] text-xs' : 'min-h-[80px] text-sm',
                  )}
                  rows={variant === 'compact' ? 3 : 4}
                />
              ) : (
                <Input
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => onComposingChange(true)}
                  placeholder="Type a message..."
                  className={variant === 'compact' ? 'text-xs' : 'text-sm'}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
              />

              <Button
                size="sm"
                variant="ghost"
                className={variant === 'compact' ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0'}
                onClick={handleFileClick}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                onClick={onSendMessage}
                disabled={isSending || (!message.trim() && attachments.length === 0)}
                className={variant === 'compact' ? 'h-8 px-3' : 'h-9 px-4'}
              >
                {isSending ? <Clock className="w-3 h-3" /> : <Send className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Composer Footer */}
          {isComposing && (
            <div className="flex justify-between items-center mt-1">
              <p className={cn('text-gray-500', variant === 'compact' ? 'text-xs' : 'text-sm')}>
                Ctrl+Enter to send
              </p>
              <Button
                size="sm"
                variant="ghost"
                className={cn(variant === 'compact' ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-sm')}
                onClick={() => {
                  onComposingChange(false);
                  onMessageChange('');
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

export default UnifiedMessageDisplay;
