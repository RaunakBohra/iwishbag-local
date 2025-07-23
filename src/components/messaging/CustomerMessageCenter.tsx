import { useState } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { NewMessageForm } from './NewMessageForm';
import { MessageListEnhanced as MessageList } from './MessageListEnhanced';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
export const CustomerMessageCenter = () => {
  const {
    user,
    messages,
    isLoading,
    users,
    sendMessageMutation,
    customerConversations,
    defaultAccordionItem,
  } = useMessaging(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {' '}
      <div className="flex justify-between items-center">
        {' '}
        <div>
          {' '}
          <h1 className="text-2xl font-bold">Message Center</h1>{' '}
          <p className="text-muted-foreground">
            {' '}
            Contact our support team for any questions or assistance{' '}
          </p>{' '}
        </div>{' '}
        <Button onClick={() => setShowNewMessage(!showNewMessage)}>
          {' '}
          <MessageSquare className="w-4 h-4 mr-2" />{' '}
          {showNewMessage ? 'Cancel' : 'New Message'}{' '}
        </Button>{' '}
      </div>{' '}
      {showNewMessage && (
        <NewMessageForm
          sendMessageMutation={sendMessageMutation}
          onCancel={() => setShowNewMessage(false)}
          isAdmin={false}
          users={users || []}
        />
      )}{' '}
      <Card>
        {' '}
        <CardHeader>
          {' '}
          <CardTitle>Your Conversations</CardTitle>{' '}
        </CardHeader>{' '}
        <CardContent>
          {' '}
          {isLoading ? (
            <div className="space-y-4 pt-4">
              {' '}
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  {' '}
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2 "></div>{' '}
                  <div className="h-16 bg-gray-200 rounded w-full "></div>{' '}
                </div>
              ))}{' '}
            </div>
          ) : messages && messages.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue={defaultAccordionItem}
            >
              {' '}
              {Object.entries(customerConversations)
                .sort(([keyA], [keyB]) => {
                  if (keyA === 'general') return -1;
                  if (keyB === 'general') return 1;
                  const lastMessageA =
                    customerConversations[keyA]?.[customerConversations[keyA].length - 1];
                  const lastMessageB =
                    customerConversations[keyB]?.[customerConversations[keyB].length - 1];
                  if (!lastMessageA) return 1;
                  if (!lastMessageB) return -1;
                  return (
                    new Date(lastMessageB.created_at).getTime() -
                    new Date(lastMessageA.created_at).getTime()
                  );
                })
                .map(([key, conversationMessages]) => {
                  if (conversationMessages.length === 0) return null;
                  const title =
                    key === 'general' ? 'General Support' : `Quote #${key.substring(0, 8)}`;
                  return (
                    <AccordionItem value={key} key={key}>
                      {' '}
                      <AccordionTrigger>{title}</AccordionTrigger>{' '}
                      <AccordionContent>
                        {' '}
                        <MessageList
                          messages={conversationMessages}
                          isLoading={false}
                          currentUserId={user?.id}
                          isAdmin={false}
                        />{' '}
                      </AccordionContent>{' '}
                    </AccordionItem>
                  );
                })}{' '}
            </Accordion>
          ) : (
            <div className="text-center py-8">
              {' '}
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />{' '}
              <p className="text-muted-foreground">No messages yet</p>{' '}
              <p className="text-sm text-muted-foreground">
                {' '}
                Click "New Message" to contact our support team{' '}
              </p>{' '}
            </div>
          )}{' '}
        </CardContent>{' '}
      </Card>{' '}
    </div>
  );
};
