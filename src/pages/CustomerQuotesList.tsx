import React, { useState, useEffect, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomerQuotesPaginated } from '@/hooks/useQuotes';
import { CustomerPaginationControls } from '@/components/ui/CustomerPaginationControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Calendar, 
  Clock, 
  Search,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { getDestinationCurrency } from '@/utils/originCurrency';
import { useCurrency } from '@/hooks/unified';

// Currency display component with proper conversion
const CurrencyDisplay = memo<{ amount: number; quote: any; fallback?: string }>(({ amount, quote, fallback }) => {
  const { formatAmountWithConversion, getSourceCurrency } = useCurrency({ quote });
  const [displayAmount, setDisplayAmount] = useState(fallback || '...');

  useEffect(() => {
    const updateAmount = async () => {
      try {
        const sourceCurrency = getSourceCurrency(quote);
        const formatted = await formatAmountWithConversion(amount, sourceCurrency);
        setDisplayAmount(formatted);
      } catch (error) {
        console.error('Currency conversion failed:', error);
        const targetCurrency = quote.customer_currency || getDestinationCurrency(quote.destination_country);
        setDisplayAmount(formatCurrency(amount, targetCurrency));
      }
    };

    updateAmount();
  }, [amount, quote, formatAmountWithConversion, getSourceCurrency]);

  return <span>{displayAmount}</span>;
});

export default function CustomerQuotesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL parameters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || 20);

  // Function to update URL parameters
  const updateURL = (updates: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all' || (key === 'page' && value === 1) || (key === 'pageSize' && value === 20)) {
        // Remove default values from URL to keep it clean
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams, { replace: true });
  };

  // Build filters for the paginated query
  const filters = {
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  // Fetch paginated quotes
  const { data: paginatedData, isLoading: loading, refetch } = useCustomerQuotesPaginated(filters, currentPage, pageSize);
  const quotes = paginatedData?.data || [];
  const pagination = paginatedData?.pagination || {
    total: 0,
    page: currentPage,
    pageSize,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    updateURL({ pageSize: newPageSize, page: 1 });
  };

  // Search and filter handlers
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    updateURL({ search: value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    updateURL({ status: value, page: 1 });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      sent: { label: 'Sent', variant: 'default' as const },
      viewed: { label: 'Viewed', variant: 'default' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const },
      expired: { label: 'Expired', variant: 'destructive' as const },
    };

    const config = statusConfig[status] || { label: status, variant: 'default' as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  // Quotes are already filtered by the backend via the paginated query

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Quotes</h1>
          <p className="text-muted-foreground">View and manage your international shipping quotes</p>
        </div>

        {/* Search, Filter and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes by product name or quote number..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          
          <Button onClick={() => navigate('/quote')}>
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>

        {/* Quotes Grid */}
        <div className="grid gap-6">
          {quotes.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by requesting your first quote'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => navigate('/quote')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Request Quote
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            quotes.map((quote) => (
              <Card key={quote.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          Quote #{quote.quote_number || quote.id.slice(0, 8)}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      
                      <div className="text-muted-foreground text-sm mb-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(new Date(quote.created_at), 'MMM d, yyyy')}
                          </div>
                          {quote.expires_at && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Expires {format(new Date(quote.expires_at), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Items Summary */}
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Items</h4>
                          <div className="space-y-2">
                            {quote.items?.slice(0, 2).map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  {item.images?.[0] ? (
                                    <img 
                                      src={item.images[0]} 
                                      alt={item.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantity} • <CurrencyDisplay amount={item.costprice_origin} quote={quote} />
                                  </p>
                                  {item.customer_notes && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <svg className="w-3 h-3 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                      </svg>
                                      <p className="text-xs text-blue-600 truncate" title={item.customer_notes}>
                                        Note: {item.customer_notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {quote.items && quote.items.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{quote.items.length - 2} more item{quote.items.length - 2 !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Total Items:</span>
                              <span>{quote.items?.length || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Shipping:</span>
                              <span>{quote.origin_country} → {quote.destination_country}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold">
                              <span>Total:</span>
                              <span>
                                <CurrencyDisplay amount={quote.total_quote_origincurrency} quote={quote} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/dashboard/quotes/${quote.id}`)}
                      className="ml-4"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.total > 0 && (
          <CustomerPaginationControls
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            total={pagination.total}
            hasNext={pagination.hasNext}
            hasPrev={pagination.hasPrev}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={loading}
            itemType="quotes"
          />
        )}
      </div>
    </div>
  );
}