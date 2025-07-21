// ============================================================================
// REFACTORED QUOTE MESSAGE THREAD - Uses shared infrastructure
// Replaces the original QuoteMessageThread.tsx with consolidated logic
// ============================================================================

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuoteMessages } from '@/hooks/useQuoteMessages';
import { UnifiedMessageDisplay } from './UnifiedMessageDisplay';
import { AlertTriangle } from 'lucide-react';
import { SendMessageRequest } from '@/services/QuoteMessageService';

export interface QuoteMessageThreadProps {
  quoteId: string;
  compact?: boolean;
  maxHeight?: string;
  showComposer?: boolean;
  className?: string;
}

export const QuoteMessageThreadRefactored: React.FC<QuoteMessageThreadProps> = ({
  quoteId,
  compact = true,
  maxHeight = '300px',
  showComposer = true,
  className,
}) => {
  // Local state for message composition
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isComposing, setIsComposing] = useState(false);

  // Use unified hook for all message operations
  const { messageThread, isLoading, isSendingMessage, error, sendMessage, formatTimestamp } =
    useQuoteMessages(quoteId, {
      compact,
      pollInterval: 30000,
      staleTime: 10000,
      autoMarkRead: true,
    });

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    const request: Omit<SendMessageRequest, 'quoteId'> = {
      content: message.trim() || 'File attachment',
      messageType: attachments.some((f) => f.name.toLowerCase().includes('payment'))
        ? 'payment_proof'
        : 'general',
      attachments: attachments.length > 0 ? attachments : undefined,
      priority: 'normal',
    };

    try {
      await sendMessage(request);
      setMessage('');
      setAttachments([]);
      setIsComposing(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to send message:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files);
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  // Handle attachment removal
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-4 text-gray-500 text-xs', className)}>
        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-300" />
        <p>Failed to load messages</p>
      </div>
    );
  }

  return (
    <UnifiedMessageDisplay
      messages={messageThread?.messages || []}
      variant={compact ? 'compact' : 'full'}
      maxHeight={maxHeight}
      className={className}
      showComposer={showComposer}
      message={message}
      onMessageChange={setMessage}
      attachments={attachments}
      onAttachmentsChange={setAttachments}
      onSendMessage={handleSendMessage}
      onRemoveAttachment={handleRemoveAttachment}
      onFileSelect={handleFileSelect}
      isSending={isSendingMessage}
      isComposing={isComposing}
      onComposingChange={setIsComposing}
      formatTimestamp={formatTimestamp}
    />
  );
};

export default QuoteMessageThreadRefactored;
