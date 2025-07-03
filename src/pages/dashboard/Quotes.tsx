import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Filter, ArrowLeft, Plus } from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function Quotes() {
  const {
    quotes,
    isLoading,
    searchTerm,
    handleSearchChange,
    isSearching,
  } = useDashboardState();

  const { data: countries } = useAllCountries();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter quotes based on status and search
  const filteredQuotes = quotes?.filter(quote => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && quote.status !== 'pending') return false;
      if (statusFilter === 'sent' && quote.status !== 'sent') return false;
      if (statusFilter === 'approved' && quote.approval_status !== 'approved') return false;
      if (statusFilter === 'rejected' && quote.status !== 'rejected') return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const productMatch = quote.product_name?.toLowerCase().includes(searchLower);
      const productUrlMatch = quote.product_url?.toLowerCase().includes(searchLower);
      const quoteIdMatch = quote.display_id?.toLowerCase().includes(searchLower);
      
      // Get country name for search
      const countryName = countries?.find(c => c.code === quote.country_code)?.name;
      const countryMatch = countryName?.toLowerCase().includes(searchLower);
      
      if (!productMatch && !productUrlMatch && !quoteIdMatch && !countryMatch) return false;
    }
    
    return true;
  }) || [];

  const getStatusColor = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    if (status === 'sent') return 'Sent';
    if (status === 'pending') return 'Pending';
    return status;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Quotes</h1>
            <p className="text-gray-500 text-sm">Manage and track your quote requests</p>
          </div>
        </div>
        <Link to="/quote">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Request Quote
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by requesting your first quote'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/quote">
                <Button>Request Your First Quote</Button>
              </Link>
            )}
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <div key={quote.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {quote.product_name || 'Product Quote'}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Quote #{quote.display_id || quote.id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(quote.status, quote.approval_status)}>
                      {getStatusLabel(quote.status, quote.approval_status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-medium">
                        ${quote.final_total?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-1">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Country:</span>
                      <span className="ml-1">{countries?.find(c => c.code === quote.country_code)?.name || quote.country_code || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Items:</span>
                      <span className="ml-1">{quote.quote_items?.length || 1}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Link to={`/dashboard/quotes/${quote.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  {quote.approval_status === 'approved' && (
                    <Link to={`/checkout/${quote.id}`}>
                      <Button size="sm">
                        Proceed to Checkout
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 