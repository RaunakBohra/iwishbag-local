import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StandardLoading } from '@/components/patterns';
import { cn } from '@/lib/utils';
import { User, Conversation } from './types';

interface ConversationListProps {
  conversations: Conversation[];
  users: User[];
  currentUserId: string | undefined;
  onSelectConversation: (userId: string) => void;
  isLoading: boolean;
}

export const ConversationList = ({
  conversations,
  users,
  currentUserId,
  onSelectConversation,
  isLoading,
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <StandardLoading 
        isLoading={true}
        config={{ variant: 'skeleton' }}
        loadingText="Loading conversations..."
      >
        <div className="space-y-4" />
      </StandardLoading>
    );
  }

  if (conversations.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No conversations yet.</p>;
  }

  return (
    <div className="space-y-1">
      {conversations.map((convo) => {
        const user = users.find((u) => u.id === convo.userId);
        if (!user) return null;

        const lastMessage = convo.lastMessage;
        const isUnread = !lastMessage.is_read && lastMessage.recipient_id === currentUserId;

        return (
          <div
            key={convo.userId}
            onClick={() => onSelectConversation(convo.userId)}
            className={cn(
              'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted',
              isUnread && 'bg-primary/10',
            )}
          >
            <Avatar>
              <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <div className="flex justify-between items-center">
                <p className={cn('font-semibold', isUnread && 'text-primary')}>{user.email}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(lastMessage.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{lastMessage.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
