// ============================================================================
// ENHANCED MESSAGE ITEM - Professional message display with rich status indicators
// Zero performance impact, improved visual hierarchy and status display
// ============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Eye,
  FileText,
  Download,
  MessageSquare,
  User,
  Shield,
} from 'lucide-react';
import { Message } from './types';

// Extended Message type for enhanced features
interface EnhancedMessage extends Message {
  message_type?: 'payment_proof' | 'quote_related' | 'general' | string;
  verification_status?: 'pending' | 'verified' | 'confirmed' | 'rejected';
  admin_notes?: string;
  verified_at?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  sender_name?: string;
  sender_role?: 'admin' | 'customer' | 'moderator';
}

interface MessageItemEnhancedProps {
  message: Message;
  currentUserId: string | undefined;
  isAdmin?: boolean;
  onVerificationUpdate?: () => void;
  showAvatar?: boolean;
  compact?: boolean;
}

export const MessageItemEnhanced = ({
  message,
  currentUserId,
  isAdmin = false,
  onVerificationUpdate,
  showAvatar = true,
  compact = false,
}: MessageItemEnhancedProps) => {
  const navigate = useNavigate();
  const enhancedMessage = message as EnhancedMessage;
  const isUserSender = message.sender_id === currentUserId;
  const isUnread = !isUserSender && !message.is_read;

  // Message type detection
  const isPaymentProof = enhancedMessage.message_type === 'payment_proof';
  const isQuoteRelated = message.quote_id || enhancedMessage.message_type === 'quote_related';
  const priority = enhancedMessage.priority || 'normal';

  // Status and verification
  const verificationStatus = enhancedMessage.verification_status || 'pending';
  const senderName =
    enhancedMessage.sender_name || (isUserSender ? 'You' : isAdmin ? 'Customer' : 'Support Team');
  const senderRole =
    enhancedMessage.sender_role || (isUserSender && isAdmin ? 'admin' : 'customer');

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  // Get status icon
  const getStatusIcon = () => {
    if (isPaymentProof) {
      switch (verificationStatus) {
        case 'verified':
        case 'confirmed':
          return <CheckCircle2 className="w-3 h-3 text-green-500" />;
        case 'rejected':
          return <AlertCircle className="w-3 h-3 text-red-500" />;
        default:
          return <Clock className="w-3 h-3 text-yellow-500" />;
      }
    }

    if (isUserSender) {
      return message.is_read ? (
        <CheckCircle2 className="w-3 h-3 text-green-500" title="Read" />
      ) : (
        <Clock className="w-3 h-3 text-gray-400" title="Sent" />
      );
    }

    return isUnread ? (
      <AlertCircle className="w-3 h-3 text-blue-500" title="Unread" />
    ) : (
      <CheckCircle2 className="w-3 h-3 text-gray-400" title="Read" />
    );
  };

  // Get priority indicator
  const getPriorityIndicator = () => {
    switch (priority) {
      case 'urgent':
        return <div className="w-1 h-full bg-red-500 rounded-full absolute left-0 top-0" />;
      case 'high':
        return <div className="w-1 h-full bg-orange-500 rounded-full absolute left-0 top-0" />;
      case 'low':
        return <div className="w-1 h-full bg-gray-300 rounded-full absolute left-0 top-0" />;
      default:
        return null;
    }
  };

  // Get message type badge
  const getMessageTypeBadge = () => {
    if (isPaymentProof) {
      return (
        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
          <Receipt className="w-3 h-3 mr-1" />
          Payment Proof
        </Badge>
      );
    }

    if (isQuoteRelated) {
      return (
        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
          <FileText className="w-3 h-3 mr-1" />
          Quote #{message.quote_id?.substring(0, 8)}
        </Badge>
      );
    }

    return null;
  };

  // Get verification status badge
  const getVerificationBadge = () => {
    if (!isPaymentProof) return null;

    const statusConfig = {
      pending: { color: 'bg-yellow-50 border-yellow-200 text-yellow-800', label: 'Pending Review' },
      verified: { color: 'bg-green-50 border-green-200 text-green-800', label: 'Verified' },
      confirmed: { color: 'bg-blue-50 border-blue-200 text-blue-800', label: 'Confirmed' },
      rejected: { color: 'bg-red-50 border-red-200 text-red-800', label: 'Rejected' },
    };

    const config =
      statusConfig[verificationStatus as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant="outline" className={cn('text-xs', config.color)}>
        {config.label}
      </Badge>
    );
  };

  // Handle message click
  const handleMessageClick = (e: React.MouseEvent) => {
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

  return (
    <div
      className={cn(
        'relative flex gap-3 transition-all duration-200',
        compact ? 'py-2' : 'py-3',
        isUnread && 'bg-blue-50/50',
        message.quote_id && 'cursor-pointer hover:bg-gray-50',
        'group',
      )}
      onClick={handleMessageClick}
    >
      {/* Priority Indicator */}
      {getPriorityIndicator()}

      {/* Avatar */}
      {showAvatar && (
        <Avatar className={cn(compact ? 'w-8 h-8' : 'w-10 h-10', 'flex-shrink-0')}>
          <AvatarImage src="" alt={senderName} />
          <AvatarFallback
            className={cn(
              'font-semibold text-sm',
              isUserSender
                ? 'bg-blue-100 text-blue-700'
                : senderRole === 'admin'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700',
            )}
          >
            {isUserSender ? (
              senderRole === 'admin' ? (
                <Shield className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )
            ) : (
              senderName.substring(0, 2).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'font-semibold truncate',
                compact ? 'text-sm' : 'text-base',
                isUserSender ? 'text-blue-700' : 'text-gray-900',
              )}
            >
              {senderName}
            </span>

            {senderRole === 'admin' && !isUserSender && (
              <Badge
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 text-xs px-1.5 py-0.5"
              >
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}

            {getMessageTypeBadge()}
            {getVerificationBadge()}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusIcon()}
            <span className={cn('text-gray-500', compact ? 'text-xs' : 'text-sm')}>
              {formatTimestamp(message.created_at)}
            </span>
          </div>
        </div>

        {/* Subject (if exists and not compact) */}
        {message.subject && message.subject !== 'No Subject' && !compact && (
          <h4 className="font-medium text-gray-900 mb-1">{message.subject}</h4>
        )}

        {/* Message Content */}
        <div
          className={cn(
            'text-gray-700 whitespace-pre-wrap',
            compact ? 'text-sm' : 'text-base',
            'leading-relaxed',
          )}
        >
          {message.content}
        </div>

        {/* Attachment */}
        {message.attachment_url && message.attachment_file_name && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {message.attachment_file_name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-auto p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(message.attachment_url, '_blank');
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {isPaymentProof && enhancedMessage.admin_notes && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-amber-800">Admin Notes</div>
                <div className="text-sm text-amber-700 mt-1">{enhancedMessage.admin_notes}</div>
                {enhancedMessage.verified_at && (
                  <div className="text-xs text-amber-600 mt-2">
                    Updated: {formatTimestamp(enhancedMessage.verified_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && isPaymentProof && verificationStatus === 'pending' && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                // Handle review action
                if (onVerificationUpdate) onVerificationUpdate();
              }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Review Payment
            </Button>
          </div>
        )}

        {/* Quote Link */}
        {message.quote_id && (
          <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
            <MessageSquare className="w-3 h-3" />
            <span>Related to Quote #{message.quote_id.substring(0, 8)}</span>
          </div>
        )}

        {/* Unread Indicator */}
        {isUnread && (
          <div className="mt-2">
            <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">New Message</Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItemEnhanced;
