
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Quote = Tables<'quotes'>;

interface QuoteBreakdownHeaderProps {
  quote: Quote;
}

export const QuoteBreakdownHeader: React.FC<QuoteBreakdownHeaderProps> = ({ quote }) => {
  return (
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
            <CardTitle className="text-xl">Quote Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quote ID: {quote.display_id || quote.id.substring(0, 8)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Requested: {format(new Date(quote.created_at), 'MMM d, yyyy')}
            </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
                <Badge variant={quote.status === 'calculated' ? 'default' : 'secondary'}>
                    {quote.status}
                </Badge>
                {quote.approval_status !== 'pending' && (
                    <Badge variant={quote.approval_status === 'approved' ? 'success' : 'destructive'}>
                    {quote.approval_status}
                    </Badge>
                )}
            </div>
        </div>
      </div>
    </CardHeader>
  );
};
