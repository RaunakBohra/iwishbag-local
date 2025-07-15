import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Message } from "./types";
import { Receipt, CheckCircle, XCircle, Eye, MessageSquare } from "lucide-react";
import { useState } from "react";

// Extended Message type for payment proof messages
interface PaymentProofMessage extends Message {
  message_type?: 'payment_proof' | string;
  verification_status?: 'pending' | 'verified' | 'confirmed' | 'rejected';
  admin_notes?: string;
  verified_at?: string;
}
// PaymentProofPreviewModal removed - using new simplified payment management

interface MessageItemProps {
  message: Message;
  currentUserId: string | undefined;
  isAdmin?: boolean;
  onVerificationUpdate?: () => void;
}

export const MessageItem = ({ message, currentUserId, isAdmin, onVerificationUpdate }: MessageItemProps) => {
  const navigate = useNavigate();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const isUserSender = message.sender_id === currentUserId;
  const isUnread = !isUserSender && !message.is_read;
  const paymentProofMessage = message as PaymentProofMessage;
  const isPaymentProof = paymentProofMessage.message_type === 'payment_proof';
  const verificationStatus = paymentProofMessage.verification_status || 'pending';
  
  const handleMessageClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (message.quote_id) {
      if (isAdmin) {
        navigate(`/admin/quotes/${message.quote_id}`);
      } else {
        navigate(`/quote/${message.quote_id}`);
      }
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <div
      key={message.id}
      onClick={handleMessageClick}
      className={cn(
        "rounded-lg p-4 max-w-[80%] w-fit transition-colors",
        isUserSender ? "bg-primary/10" : "bg-muted",
        isUnread && "border-2 border-primary",
        message.quote_id && "cursor-pointer hover:bg-gray-200",
        isPaymentProof && "border-green-500 bg-green-50"
      )}
    >
      <div className="flex items-center gap-2 justify-between w-full">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">
            {isUserSender ? "You" : "Support"}
          </p>
          {isPaymentProof && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1">
                <Receipt className="h-3 w-3" />
                Payment Proof
              </Badge>
              <Badge className={getVerificationStatusColor(verificationStatus)}>
                {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
              </Badge>
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(message.created_at).toLocaleString()}
        </span>
      </div>
      
      <h3 className="font-semibold mt-2">{message.subject}</h3>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">
        {message.content}
      </p>
      
      {/* Attachment Display */}
      {message.attachment_url && message.attachment_file_name && (
        <div className="mt-3 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate">
              📎 {message.attachment_file_name}
            </span>
            <a 
              href={message.attachment_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View
            </a>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      {isPaymentProof && paymentProofMessage.admin_notes && (
        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
          <div className="text-xs text-blue-700 font-medium">Admin Notes:</div>
          <div className="text-sm text-blue-800 mt-1">{paymentProofMessage.admin_notes}</div>
          {paymentProofMessage.verified_at && (
            <div className="text-xs text-blue-600 mt-1">
              Updated: {new Date(paymentProofMessage.verified_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Admin Quick Actions for Payment Proof */}
      {isAdmin && isPaymentProof && verificationStatus === 'pending' && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 hover:bg-blue-50"
            onClick={() => setShowPreviewModal(true)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Review
          </Button>
        </div>
      )}

      {message.quote_id && (
        <p className="text-xs text-primary mt-2">
          Related to Quote #{message.quote_id.substring(0, 8)}
        </p>
      )}
      
      {isUserSender && (
        <div className="flex justify-end mt-2">
          <Badge variant={message.is_read ? "secondary" : "default"}>
            {message.is_read ? "Read" : "Sent"}
          </Badge>
        </div>
      )}

      {/* Payment proof preview now handled in dedicated payment management page */}
    </div>
  );
};