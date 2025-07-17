import { useState, useMemo } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { NewMessageForm } from './NewMessageForm';
import { MessageList } from './MessageList';
import { ConversationList } from './ConversationList';

export const AdminMessageCenter = () => {
  const { user, isLoading, users, isLoadingUsers, sendMessageMutation, conversations } =
    useMessaging(true);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedConversationMessages = useMemo(() => {
    if (!selectedUserId) return [];
    return conversations.find((c) => c.userId === selectedUserId)?.messages || [];
  }, [selectedUserId, conversations]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId || !users) return null;
    return users.find((u) => u.id === selectedUserId);
  }, [selectedUserId, users]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {selectedUserId ? (
        <div>
          <Button variant="ghost" onClick={() => setSelectedUserId(null)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to conversations
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Conversation with {selectedUser?.email}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-[70vh]">
              <div className="flex-1 overflow-y-auto pr-4 mb-4">
                <MessageList
                  messages={selectedConversationMessages}
                  isLoading={isLoading}
                  currentUserId={user?.id}
                  isAdmin={true}
                />
              </div>
              <NewMessageForm
                sendMessageMutation={sendMessageMutation}
                onCancel={() => {}}
                isAdmin={true}
                users={users || []}
                recipientIdLocked={selectedUserId}
                noCardWrapper={true}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Message Center</h1>
              <p className="text-muted-foreground">Communicate with users</p>
            </div>
            <Button onClick={() => setShowNewMessage(!showNewMessage)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              {showNewMessage ? 'Cancel' : 'New Message'}
            </Button>
          </div>

          {showNewMessage && (
            <NewMessageForm
              sendMessageMutation={sendMessageMutation}
              onCancel={() => setShowNewMessage(false)}
              isAdmin={true}
              users={users || []}
            />
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationList
                conversations={conversations}
                users={users || []}
                onSelectConversation={setSelectedUserId}
                isLoading={isLoading || isLoadingUsers}
                currentUserId={user?.id}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
