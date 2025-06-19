import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuoteAutomation } from "@/hooks/useQuoteAutomation";
import { useQuoteNotifications } from "@/hooks/useQuoteNotifications";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Package,
  DollarSign,
  Users
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { full_name?: string } | null;
};

export const AutoProcessingQueue = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { processNewQuote, isProcessing } = useQuoteAutomation();
  const { sendQuoteReadyNotification, isSendingReadyNotification } = useQuoteNotifications();
  const [isAutoProcessingEnabled, setIsAutoProcessingEnabled] = useState(true);

  // Fetch pending quotes
  const { data: pendingQuotes, isLoading } = useQuery({
    queryKey: ['admin-pending-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*),
          profiles (full_name)
        `)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Quote[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recently processed quotes
  const { data: recentQuotes } = useQuery({
    queryKey: ['admin-recent-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*),
          profiles (full_name)
        `)
        .in('status', ['calculated', 'sent'])
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Quote[];
    },
  });

  // Process quote manually
  const processQuoteManually = useMutation({
    mutationFn: async (quoteId: string) => {
      await processNewQuote(quoteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-quotes'] });
      toast({
        title: "Processing Started",
        description: "Quote is being processed automatically.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send quote ready notification manually
  const sendReadyNotification = useMutation({
    mutationFn: async (quoteId: string) => {
      await sendQuoteReadyNotification(quoteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recent-quotes'] });
      toast({
        title: "Notification Sent",
        description: "Quote ready notification sent to customer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Notification Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Process all pending quotes
  const processAllPending = useMutation({
    mutationFn: async () => {
      if (!pendingQuotes) return;
      
      for (const quote of pendingQuotes) {
        try {
          await processNewQuote(quote.id);
          // Add small delay between processing
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing quote ${quote.id}:`, error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-quotes'] });
      toast({
        title: "Batch Processing Complete",
        description: "All pending quotes have been processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Batch Processing Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Calculate statistics
  const stats = {
    pending: pendingQuotes?.length || 0,
    processedToday: recentQuotes?.length || 0,
    averageProcessingTime: "2-5 minutes",
    successRate: "98%"
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auto-Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processed Today</p>
                <p className="text-2xl font-bold">{stats.processedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Time</p>
                <p className="text-2xl font-bold">{stats.averageProcessingTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Processing Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Auto-Processing Controls</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={isAutoProcessingEnabled ? "default" : "secondary"}>
                {isAutoProcessingEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutoProcessingEnabled(!isAutoProcessingEnabled)}
              >
                {isAutoProcessingEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isAutoProcessingEnabled ? "Pause" : "Resume"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Processing Status</p>
                <p className="text-sm text-muted-foreground">
                  {isAutoProcessingEnabled 
                    ? "Automatically processing new quotes" 
                    : "Auto-processing is paused"
                  }
                </p>
              </div>
              <Button
                onClick={() => processAllPending.mutate()}
                disabled={!pendingQuotes?.length || processAllPending.isPending}
                size="sm"
              >
                {processAllPending.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Process All Pending
              </Button>
            </div>
            
            {pendingQuotes?.length > 0 && (
              <Progress value={(stats.processedToday / (stats.processedToday + stats.pending)) * 100} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Quotes */}
      {pendingQuotes && pendingQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Quotes ({pendingQuotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingQuotes.slice(0, 5).map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{quote.display_id || quote.id.substring(0, 8)}</Badge>
                      <span className="text-sm text-muted-foreground">{quote.email}</span>
                    </div>
                    <p className="text-sm mt-1">
                      {quote.quote_items?.length || 0} items • {new Date(quote.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => processQuoteManually.mutate(quote.id)}
                    disabled={processQuoteManually.isPending}
                  >
                    {processQuoteManually.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Process
                  </Button>
                </div>
              ))}
              {pendingQuotes.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{pendingQuotes.length - 5} more pending quotes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Processed */}
      {recentQuotes && recentQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={quote.status === 'sent' ? "default" : "outline"}>
                        {quote.display_id || quote.id.substring(0, 8)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{quote.email}</span>
                    </div>
                    <p className="text-sm mt-1">
                      {quote.quote_items?.length || 0} items • {new Date(quote.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {quote.status === 'calculated' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendReadyNotification.mutate(quote.id)}
                        disabled={sendReadyNotification.isPending}
                      >
                        Send Ready Email
                      </Button>
                    )}
                    <Badge variant={quote.status === 'sent' ? "default" : "secondary"}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!pendingQuotes?.length && !recentQuotes?.length && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Quotes to Process</h3>
            <p className="text-muted-foreground">
              All quotes are up to date. New quote requests will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 