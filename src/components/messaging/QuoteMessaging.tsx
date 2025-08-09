import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

interface QuoteMessagingProps {
  quoteId: string;
  quoteUserId?: string;
}

export const QuoteMessaging: React.FC<QuoteMessagingProps> = ({
  quoteId,
  quoteUserId,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <OptimizedIcon name="MessageCircle" className="h-5 w-5" />
          Quote Communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          <OptimizedIcon name="MessageCircle" className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Quote messaging feature coming soon.</p>
          <p className="text-xs mt-2">Quote ID: {quoteId}</p>
        </div>
      </CardContent>
    </Card>
  );
};