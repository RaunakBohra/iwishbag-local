
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Message } from "./types";

interface MessageItemProps {
  message: Message;
  currentUserId: string | undefined;
  isAdmin?: boolean;
}

export const MessageItem = ({ message, currentUserId, isAdmin }: MessageItemProps) => {
  const navigate = useNavigate();
  const isUserSender = message.sender_id === currentUserId;
  const isUnread = !isUserSender && !message.is_read;

  const handleMessageClick = () => {
    if (message.quote_id) {
      if (isAdmin) {
        navigate(`/admin/quotes/${message.quote_id}`);
      } else {
        navigate(`/quote/${message.quote_id}`);
      }
    }
  };

  return (
    <div
      key={message.id}
      onClick={handleMessageClick}
      className={cn(
        "rounded-lg p-4 max-w-[80%] w-fit transition-colors",
        isUserSender
          ? "bg-primary/10"
          : "bg-muted",
        isUnread && "border-2 border-primary",
        message.quote_id &&
          "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
      )}
    >
      <div className="flex items-center gap-2 justify-between w-full">
        <p className="font-semibold text-sm">
          {isUserSender ? "You" : "Support"}
        </p>
        <span className="text-xs text-muted-foreground">
          {new Date(message.created_at).toLocaleString()}
        </span>
      </div>
      <h3 className="font-semibold mt-2">{message.subject}</h3>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">
        {message.content}
      </p>
      {message.quote_id && (
        <p className="text-xs text-primary mt-2">
          Related to Quote #{message.quote_id.substring(0, 8)}
        </p>
      )}
      {isUserSender && (
        <div className="flex justify-end mt-2">
          <Badge
            variant={message.is_read ? "secondary" : "default"}
          >
            {message.is_read ? "Read" : "Sent"}
          </Badge>
        </div>
      )}
    </div>
  );
};
