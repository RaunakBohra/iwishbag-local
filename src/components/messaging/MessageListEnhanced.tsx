// ============================================================================
// ENHANCED MESSAGE LIST - Professional message thread display
// Uses enhanced MessageItem with better visual hierarchy and status indicators
// ============================================================================

import React from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { MessageItemEnhanced } from './MessageItemEnhanced';
import { cn } from '@/lib/utils';
import { Message } from './types';

interface MessageListEnhancedProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
  isAdmin?: boolean;
  onVerificationUpdate?: () => void;
  compact?: boolean;
  showAvatars?: boolean;
  className?: string;
}

export const MessageListEnhanced = ({
  messages,
  isLoading,
  currentUserId,
  isAdmin = false,
  onVerificationUpdate,
  compact = false,
  showAvatars = true,
  className,
}: MessageListEnhancedProps) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4 p-4', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading messages...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!messages || messages.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          {isAdmin
            ? 'Customer messages will appear here when they start a conversation'
            : 'Start the conversation by sending your first message'}
        </p>
      </div>
    );
  }

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  // Format date header
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const messageGroups = groupMessagesByDate(messages);
  const sortedDates = Object.keys(messageGroups).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return (
    <div className={cn('space-y-1', className)}>
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Header */}
          {!compact && (
            <div className="flex items-center justify-center py-4">
              <div className="bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-gray-600">{formatDateHeader(date)}</span>
              </div>
            </div>
          )}

          {/* Messages for this date */}
          <div className="space-y-1">
            {messageGroups[date].map((message, index) => {
              // Check if we should show avatar (first message from sender in a sequence)
              const prevMessage = index > 0 ? messageGroups[date][index - 1] : null;
              const showAvatar =
                showAvatars &&
                (!prevMessage ||
                  prevMessage.sender_id !== message.sender_id ||
                  new Date(message.created_at).getTime() -
                    new Date(prevMessage.created_at).getTime() >
                    300000); // 5 minutes

              return (
                <div
                  key={message.id}
                  className={cn(
                    'px-4 py-1 border-l-2 border-transparent hover:border-gray-200 hover:bg-gray-50',
                    'transition-colors duration-150',
                  )}
                >
                  <MessageItemEnhanced
                    message={message}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onVerificationUpdate={onVerificationUpdate}
                    showAvatar={showAvatar}
                    compact={compact}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageListEnhanced;
