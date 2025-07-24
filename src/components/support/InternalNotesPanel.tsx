import React from 'react';
import { Shield, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TicketReplyWithUser } from '@/types/ticket';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InternalNotesPanelProps {
  replies: TicketReplyWithUser[];
  isLoading?: boolean;
}

export const InternalNotesPanel: React.FC<InternalNotesPanelProps> = ({
  replies,
  isLoading = false,
}) => {
  // Filter to only show internal notes
  const internalNotes = replies.filter((reply) => reply.is_internal);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-orange-600" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-16 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-orange-600" />
            Internal Notes
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {internalNotes.length} {internalNotes.length === 1 ? 'note' : 'notes'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">Private notes visible only to support team members</p>
      </CardHeader>

      <CardContent className="p-0">
        {internalNotes.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No internal notes yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add internal notes to share information with your team
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-4">
              {internalNotes.map((note, index) => (
                <div key={note.id}>
                  <div className="flex items-start gap-3">
                    {/* Author Avatar */}
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-4 w-4 text-orange-600" />
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 min-w-0">
                      {/* Author and Timestamp */}
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {note.user_profile?.full_name || 'Support Team'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(note.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>

                      {/* Note Message */}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="whitespace-pre-wrap text-sm text-gray-800">
                          {note.message}
                        </div>
                      </div>

                      {/* Relative Time */}
                      <div className="mt-2 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {/* Separator (except for last item) */}
                  {index < internalNotes.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default InternalNotesPanel;
