import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompactQuoteListItem } from '@/components/admin/CompactQuoteListItem';
import { CompactQuoteMetrics } from '@/components/admin/CompactQuoteMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuotesListPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all quotes without any status filtering
  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-quotes-list', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200); // Increased limit to show more quotes

      // Apply search filter only
      if (searchTerm) {
        query = query.or(`iwish_tracking_id.ilike.%${searchTerm}%,customer_data->>email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 seconds
  });

  // Calculate metrics (ensure quotes is always an array)
  const safeQuotes = quotes || [];
  const metrics = {
    total: safeQuotes.length,
    pending: safeQuotes.filter(q => q.status === 'pending').length,
    sent: safeQuotes.filter(q => q.status === 'sent').length,
    approved: safeQuotes.filter(q => q.status === 'approved').length,
    paid: safeQuotes.filter(q => q.status === 'paid').length,
    completed: safeQuotes.filter(q => q.status === 'completed').length,
    totalValue: safeQuotes.reduce((sum, q) => sum + (q.final_total_usd || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Quotes</h1>
          <p className="text-gray-600 mt-2">View all quotes regardless of status</p>
        </div>

        {/* Metrics */}
        <CompactQuoteMetrics metrics={metrics} />

        {/* Search Bar */}
        <Card className="mb-6 mt-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search by tracking ID or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => navigate('/quote')}>
                <Plus className="w-4 h-4 mr-2" />
                New Quote
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quote List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading quotes...
              </div>
            ) : safeQuotes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No quotes found
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {safeQuotes.map((quote) => (
                  <CompactQuoteListItem
                    key={quote.id}
                    quote={quote}
                    customerProfile={quote.profiles}
                    onQuoteClick={(quoteId) => navigate(`/admin/quotes/${quoteId}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuotesListPage;