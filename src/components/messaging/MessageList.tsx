import { MessageSquare, Paperclip } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { cn } from '@/lib/utils';
import { Message } from './types';

interface MessageListProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  currentUserId: string | undefined;
  isAdmin?: boolean;
}

export const MessageList = ({ messages, isLoading, currentUserId, isAdmin }: MessageListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Click "New Message" to contact our support team
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex flex-col',
            message.sender_id === currentUserId ? 'items-end' : 'items-start',
          )}
        >
          <MessageItem message={message} currentUserId={currentUserId} isAdmin={isAdmin} />
          {message.attachment_url && (
            <div className="mt-2">
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
              >
                <Paperclip className="h-4 w-4" />
                {message.attachment_file_name || 'View Attachment'}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
