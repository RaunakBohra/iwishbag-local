import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Paperclip, X, Check, ChevronsUpDown } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { User } from "./types";

interface NewMessageFormProps {
  sendMessageMutation: UseMutationResult<any, Error, { subject: string; content: string; recipientId?: string | null; attachment?: File | null }, unknown>;
  onCancel: () => void;
  isAdmin?: boolean;
  users?: User[];
  recipientIdLocked?: string | null;
  noCardWrapper?: boolean;
}

export const NewMessageForm = ({ sendMessageMutation, onCancel, isAdmin = false, users = [], recipientIdLocked = null, noCardWrapper = false }: NewMessageFormProps) => {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(recipientIdLocked);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recipientIdLocked) {
      setRecipientId(recipientIdLocked);
    }
  }, [recipientIdLocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (isAdmin && !recipientId) return;
    
    sendMessageMutation.mutate({ subject, content, recipientId: isAdmin ? recipientId : null, attachment }, {
      onSuccess: () => {
        setSubject("");
        setContent("");
        setAttachment(null);
        if (attachmentInputRef.current) {
          attachmentInputRef.current.value = "";
        }
        
        if (!recipientIdLocked) {
          setRecipientId(null);
          onCancel();
        }
      }
    });
  };

  const isSubmitDisabled = sendMessageMutation.isPending || !content.trim() || (isAdmin && !recipientId);

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isAdmin && !recipientIdLocked && (
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient</Label>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className="w-full justify-between font-normal"
              >
                {recipientId
                  ? users.find((user) => user.id === recipientId)?.email
                  : "Select a user to message"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search user email..." />
                <CommandEmpty>No user found.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.email}
                        onSelect={() => {
                          setRecipientId(user.id);
                          setPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            recipientId === user.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {user.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject (Optional)</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter message subject"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="content">Message</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your message"
          rows={5}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="attachment">Attachment</Label>
        <div className="flex items-center gap-2">
          <Input 
            id="attachment" 
            type="file" 
            ref={attachmentInputRef}
            className="hidden" 
            onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
          />
          <Button type="button" variant="outline" onClick={() => attachmentInputRef.current?.click()}>
            <Paperclip className="h-4 w-4 mr-2" />
            Choose File
          </Button>
          {attachment && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{attachment.name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                setAttachment(null);
                if (attachmentInputRef.current) attachmentInputRef.current.value = "";
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Max file size: 5MB.</p>
      </div>

      <div className="flex gap-2">
        <Button 
          type="submit" 
          disabled={isSubmitDisabled}
        >
          <Send className="w-4 h-4 mr-2" />
          {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
        </Button>
        {!recipientIdLocked && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={sendMessageMutation.isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (noCardWrapper) {
    return formBody;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isAdmin ? "Send Message to User" : "Send Message to Support"}</CardTitle>
      </CardHeader>
      <CardContent>
        {formBody}
      </CardContent>
    </Card>
  );
};
