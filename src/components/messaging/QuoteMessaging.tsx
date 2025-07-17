import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  MessageSquare,
  Paperclip,
  FileText,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import imageCompression from 'browser-image-compression';
import { MessageItem } from './MessageItem';

type Message = Tables<'messages'> & {
  attachment_url?: string | null;
  attachment_file_name?: string | null;
};

interface QuoteMessagingProps {
  quoteId: string;
  quoteUserId: string | null;
}

export const QuoteMessaging = ({ quoteId, quoteUserId }: QuoteMessagingProps) => {
  const { user } = useAuth();
  const { data: isAdmin } = useAdminRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, file }: { content: string; file: File | null }) => {
      if (!user) throw new Error('Not authenticated');
      let attachmentUrl: string | null = null;
      let attachmentFileName: string | null = null;

      if (file) {
        let fileToUpload = file;

        // Only compress image files
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
            initialQuality: 0.85,
          };

          try {
            fileToUpload = await imageCompression(file, options);
            console.log(
              `QuoteMessaging - Original: ${(file.size / 1024 / 1024).toFixed(2)}MB, Compressed: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`,
            );
          } catch (compressionError) {
            console.error('Image compression failed, using original:', compressionError);
          }
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, fileToUpload);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentFileName = file.name;
      }

      const isSenderQuoteOwner = user.id === quoteUserId;
      const recipientId = isSenderQuoteOwner ? null : quoteUserId;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          quote_id: quoteId,
          subject: `Message for Quote #${quoteId.substring(0, 8)}`,
          content,
          attachment_url: attachmentUrl,
          attachment_file_name: attachmentFileName,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setContent('');
      setAttachment(null);
      queryClient.invalidateQueries({ queryKey: ['messages', quoteId] });
      toast({ title: 'Message sent!' });
    },
    onError: (error) => {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachment) return;
    sendMessageMutation.mutate({ content, file: attachment });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files[0].size > 10 * 1024 * 1024) {
        toast({
          title: 'File is too large',
          description: 'Please select a file smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      setAttachment(e.target.files[0]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-expand if there are unread messages
  useEffect(() => {
    if (messages?.some((msg) => !msg.is_read && msg.sender_id !== user?.id)) {
      setIsOpen(true);
    }
  }, [messages, user]);

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Messages
                {messages && messages.length > 0 && (
                  <span className="text-xs text-muted-foreground">({messages.length})</span>
                )}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] px-3">
              <div className="space-y-2 py-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((message: Message) => (
                    <div key={message.id} id={`message-${message.id}`}>
                      <MessageItem
                        message={message}
                        currentUserId={user?.id}
                        isAdmin={isAdmin}
                        onVerificationUpdate={() => {
                          queryClient.invalidateQueries({
                            queryKey: ['messages', quoteId],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ['payment-proof-info', quoteId],
                          });
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                    <MessageSquare className="w-6 h-6 mb-1" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-[11px]">Start the conversation below</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-2 border-t">
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type your message..."
                    rows={1}
                    disabled={sendMessageMutation.isPending}
                    className="min-h-[60px] resize-none text-sm"
                  />
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      id={`file-upload-${quoteId}`}
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={sendMessageMutation.isPending}
                      ref={fileInputRef}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sendMessageMutation.isPending}
                      className="h-8 w-8"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </Button>
                    {attachment && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{attachment.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-background"
                          onClick={() => setAttachment(null)}
                          disabled={sendMessageMutation.isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={sendMessageMutation.isPending || (!content.trim() && !attachment)}
                    className="bg-blue-500 hover:bg-blue-600 h-8 px-3"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
