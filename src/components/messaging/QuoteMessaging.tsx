import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare, Paperclip, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { useAdminRole } from "@/hooks/useAdminRole";
type Message = Tables<'messages'> & {
  attachment_url?: string | null;
  attachment_file_name?: string | null;
};
interface QuoteMessagingProps {
  quoteId: string;
  quoteUserId: string | null;
}
export const QuoteMessaging = ({
  quoteId,
  quoteUserId
}: QuoteMessagingProps) => {
  const {
    user
  } = useAuth();
  const {
    data: isAdmin
  } = useAdminRole();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const {
    data: messages,
    isLoading
  } = useQuery({
    queryKey: ['messages', quoteId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('messages').select('*').eq('quote_id', quoteId).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId
  });
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      file
    }: {
      content: string;
      file: File | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      let attachmentUrl: string | null = null;
      let attachmentFileName: string | null = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        const {
          error: uploadError
        } = await supabase.storage.from('message-attachments').upload(filePath, file);
        if (uploadError) {
          throw uploadError;
        }
        const {
          data: urlData
        } = supabase.storage.from('message-attachments').getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentFileName = file.name;
      }
      const isSenderQuoteOwner = user.id === quoteUserId;
      const recipientId = isSenderQuoteOwner ? null : quoteUserId;
      const {
        data,
        error
      } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: recipientId,
        quote_id: quoteId,
        subject: `Message for Quote #${quoteId.substring(0, 8)}`,
        content,
        attachment_url: attachmentUrl,
        attachment_file_name: attachmentFileName
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setContent("");
      setAttachment(null);
      queryClient.invalidateQueries({
        queryKey: ['messages', quoteId]
      });
      toast({
        title: "Message sent!"
      });
    },
    onError: error => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachment) return;
    sendMessageMutation.mutate({
      content,
      file: attachment
    });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files[0].size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File is too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }
      setAttachment(e.target.files[0]);
    }
  };
  return <div className="space-y-4 pt-4">
      <h3 className="text-lg font-semibold">Messages</h3>
      <div className="border rounded-lg p-4 h-96 flex flex-col space-y-4 overflow-y-auto bg-gray-50/50">
        {isLoading ? <p>Loading messages...</p> : messages && messages.length > 0 ? messages.map((message: Message) => {
        const isUserSender = message.sender_id === user?.id;
        return <div key={message.id} className={cn("rounded-lg p-3 max-w-[80%] w-fit text-sm shadow-sm", isUserSender ? "bg-primary text-primary-foreground self-end" : "bg-muted self-start")}>
                <p className="font-semibold text-xs mb-1">
                  {isUserSender ? "You" : isAdmin ? "Customer" : "Support"}
                </p>
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                {message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" download={message.attachment_file_name || true} className={cn("mt-2 flex items-center gap-2 text-sm p-2 rounded-md transition-colors", isUserSender ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-background/50 hover:bg-background/80")}>
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{message.attachment_file_name || 'View Attachment'}</span>
                    </a>}
                <p className="text-xs text-right mt-2 opacity-70">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>;
      }) : <div className="flex flex-col items-center justify-center h-full text-muted-foreground my-0 py-[24px] px-0 mx-0 rounded-none">
             <MessageSquare className="w-10 h-10 mb-2" />
             <p>No messages for this quote yet.</p>
             <p className="text-xs">Start the conversation below.</p>
           </div>}
      </div>
      <div className="space-y-2">
        <div className="flex gap-2 items-end">
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Type your message..." rows={2} disabled={sendMessageMutation.isPending} className="bg-white" />
           <input type="file" id={`file-upload-${quoteId}`} className="hidden" onChange={handleFileChange} disabled={sendMessageMutation.isPending} />
          <Button asChild variant="outline" size="icon" disabled={sendMessageMutation.isPending}>
              <label htmlFor={`file-upload-${quoteId}`} className="cursor-pointer flex items-center justify-center h-full w-full px-0 py-[10px] my-[3px] mx-0 bg-transparent">
                <Paperclip className="h-4 w-4" />
              </label>
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={sendMessageMutation.isPending || !content.trim() && !attachment} className="py-0">
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
        {attachment && <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
            <FileText className="w-4 h-4" />
            <span className="truncate">{attachment.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setAttachment(null)} disabled={sendMessageMutation.isPending}>
              <X className="w-4 h-4" />
            </Button>
          </div>}
      </div>
    </div>;
};