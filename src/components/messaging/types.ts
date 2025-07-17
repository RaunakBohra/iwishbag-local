import { Tables } from '@/integrations/supabase/types';

export type Message = Tables<'messages'>;

export interface User {
  id: string;
  email: string;
}

export interface Conversation {
  userId: string;
  messages: Message[];
  lastMessage: Message;
}
