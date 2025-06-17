
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Message, User, Conversation } from "@/components/messaging/types";

export const useMessaging = (hasAdminRole: boolean | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['all-users-with-roles'],
    queryFn: async () => {
        const { data, error } = await supabase.functions.invoke('get-users-with-roles');
        if (error) throw error;
        return data.filter((u: any) => u.role !== 'admin');
    },
    enabled: !!hasAdminRole,
  });


  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', user?.id, hasAdminRole],
    queryFn: async () => {
      if (!user || hasAdminRole === undefined) return [];
      
      let query = supabase.from('messages').select('*');

      if (hasAdminRole) {
        query = query.is('quote_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && hasAdminRole !== undefined,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ subject, content, recipientId, attachment }: { subject: string; content: string; recipientId?: string | null; attachment?: File | null }) => {
      if (!user) throw new Error('Not authenticated');

      let attachment_url: string | null = null;
      let attachment_file_name: string | null = null;

      if (attachment) {
        if (attachment.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error("File is too large. Maximum size is 5MB.");
        }

        const fileExt = attachment.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, attachment);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);
        
        attachment_url = urlData.publicUrl;
        attachment_file_name = attachment.name;
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          subject: subject || 'No Subject',
          content,
          attachment_url,
          attachment_file_name,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: hasAdminRole ? "Your message has been sent to the user." : "Your message has been sent to our support team.",
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
      console.error('Error sending message:', error);
    },
  });

  const conversations = useMemo(() => {
    if (!messages || !user || !hasAdminRole || !users) return [];

    const groups: { [key: string]: { userId: string; messages: Message[] } } = {};

    messages.forEach(msg => {
      const otherPartyId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      
      if (otherPartyId && users.some(u => u.id === otherPartyId)) {
        if (!groups[otherPartyId]) {
          groups[otherPartyId] = {
            userId: otherPartyId,
            messages: [],
          };
        }
        groups[otherPartyId].messages.push(msg);
      }
    });

    const conversationArray: Conversation[] = Object.values(groups).map(group => {
      const sortedMessages = group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        ...group,
        messages: sortedMessages,
        lastMessage: sortedMessages[sortedMessages.length - 1],
      };
    });
    
    return conversationArray.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
  }, [messages, user, hasAdminRole, users]);

  const customerConversations = useMemo(() => {
    if (!messages || hasAdminRole) return {};

    const grouped: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const key = message.quote_id || 'general';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(message);
    });

    return grouped;
  }, [messages, hasAdminRole]);

  const defaultAccordionItem = useMemo(() => {
    if (!messages || messages.length === 0 || hasAdminRole) return undefined;

    const lastMessage = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    return lastMessage.quote_id || 'general';
  }, [messages, hasAdminRole]);

  return {
    user,
    messages,
    isLoading,
    users,
    isLoadingUsers,
    sendMessageMutation,
    conversations,
    customerConversations,
    defaultAccordionItem,
  };
}
